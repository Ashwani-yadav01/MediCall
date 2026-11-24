import uuid
from datetime import date, datetime, timezone
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.doctor import Doctor
from app.models.slot import AvailabilitySlot
from app.models.appointment import Appointment
from app.repositories.doctor_repository import DoctorRepository
from app.repositories.slot_repository import SlotRepository
from app.repositories.appointment_repository import AppointmentRepository
from app.schemas.appointment import normalize_phone_number, mask_phone_number

SPECIALITY_SYNONYMS = {
    "neurologist": "Neurology",
    "neurology": "Neurology",
    "neuro": "Neurology",
    "cardiologist": "Cardiology",
    "cardiology": "Cardiology",
    "cardio": "Cardiology",
    "heart": "Cardiology",
    "heart doctor": "Cardiology",
    "dermatologist": "Dermatology",
    "dermatology": "Dermatology",
    "derm": "Dermatology",
    "skin": "Dermatology",
    "skin doctor": "Dermatology",
    "pediatrician": "Pediatrics",
    "pediatrics": "Pediatrics",
    "pediatric": "Pediatrics",
    "child": "Pediatrics",
    "child doctor": "Pediatrics",
    "orthopedic": "Orthopedics",
    "orthopedics": "Orthopedics",
    "orthopedist": "Orthopedics",
    "bone": "Orthopedics",
    "ortho": "Orthopedics",
    "psychiatrist": "Psychiatry",
    "psychiatry": "Psychiatry",
    "mental": "Psychiatry",
    "ophthalmologist": "Ophthalmology",
    "ophthalmology": "Ophthalmology",
    "eye": "Ophthalmology",
    "eye doctor": "Ophthalmology",
    "endocrinologist": "Endocrinology",
    "endocrinology": "Endocrinology",
    "diabetes": "Endocrinology",
    "thyroid": "Endocrinology",
    "general medicine": "General Medicine",
    "physician": "General Medicine",
    "general physician": "General Medicine",
    "internal medicine": "General Medicine",
    "gp": "General Medicine",
}

def normalize_speciality(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    cleaned = val.lower().strip()
    return SPECIALITY_SYNONYMS.get(cleaned, val.strip())


class AppointmentError(Exception):
    def __init__(self, message: str, code: str = "APPOINTMENT_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class SlotNotFoundError(AppointmentError):
    def __init__(self, message: str = "Selected appointment slot was not found."):
        super().__init__(message, "SLOT_NOT_FOUND")


class SlotNotAvailableError(AppointmentError):
    def __init__(self, message: str = "This appointment slot is already booked or unavailable."):
        super().__init__(message, "SLOT_NOT_AVAILABLE")


class DoubleBookingError(AppointmentError):
    def __init__(self, message: str = "Double booking conflict detected. This slot was just reserved."):
        super().__init__(message, "DOUBLE_BOOKING_PREVENTED")


class PhoneConfirmationRequiredError(AppointmentError):
    def __init__(self, message: str = "Caller phone number must be verbally verified before proceeding."):
        super().__init__(message, "PHONE_CONFIRMATION_REQUIRED")


class ConfirmationRequiredError(AppointmentError):
    def __init__(self, message: str = "Explicit caller confirmation is required before modifying appointments."):
        super().__init__(message, "CONFIRMATION_REQUIRED")


class AppointmentNotFoundError(AppointmentError):
    def __init__(self, message: str = "No appointment found matching the provided details."):
        super().__init__(message, "APPOINTMENT_NOT_FOUND")


class UnauthorizedCancellationError(AppointmentError):
    def __init__(self, message: str = "You cannot cancel an appointment that does not belong to your verified phone number."):
        super().__init__(message, "UNAUTHORIZED_CANCELLATION")


class AppointmentService:
    def __init__(self, db: Session):
        self.db = db
        self.doctor_repo = DoctorRepository(db)
        self.slot_repo = SlotRepository(db)
        self.appointment_repo = AppointmentRepository(db)

    def check_doctor_availability(
        self,
        doctor_name: Optional[str] = None,
        speciality: Optional[str] = None,
        slot_date: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Tool 1: Queries actual database for available slots.
        Filters by doctor, speciality, and date.
        Never returns already booked slots.
        """
        doctor_id = None
        matched_doctor = None

        if doctor_name:
            matched_doctor = self.doctor_repo.get_by_name(doctor_name)
            if matched_doctor:
                doctor_id = matched_doctor.id

        parsed_date: Optional[date] = None
        if slot_date:
            if isinstance(slot_date, str):
                try:
                    parsed_date = date.fromisoformat(slot_date.strip())
                except ValueError:
                    parsed_date = None
            elif isinstance(slot_date, date):
                parsed_date = slot_date

        canonical_speciality = normalize_speciality(speciality)

        slots = self.slot_repo.get_available_slots(
            doctor_id=doctor_id,
            slot_date=parsed_date,
            speciality=canonical_speciality
        )

        # Structure response
        available_list = []
        for s in slots:
            available_list.append({
                "slot_id": s.id,
                "doctor_id": s.doctor.id,
                "doctor_name": s.doctor.name,
                "speciality": s.doctor.speciality,
                "qualification": s.doctor.qualification,
                "consultation_fee": s.doctor.consultation_fee,
                "date": s.appointment_date.isoformat(),
                "start_time": s.start_time,
                "end_time": s.end_time,
            })

        return {
            "success": True,
            "count": len(available_list),
            "doctor_filter": doctor_name,
            "speciality_filter": speciality,
            "date_filter": parsed_date.isoformat() if parsed_date else None,
            "available_slots": available_list,
        }

    def book_appointment(
        self,
        phone_number: str,
        doctor_id: int,
        slot_id: int,
        patient_name: Optional[str] = "Caller",
        confirmation_status: bool = True
    ) -> Dict[str, Any]:
        """
        Tool 2: Book an appointment.
        - Requires phone number confirmed verbally
        - Requires explicit confirmation
        - Validates slot exists and is available
        - Uses database transaction with double-booking prevention
        - Generates unique appointment reference
        """
        if not confirmation_status:
            raise ConfirmationRequiredError("Appointment booking was not verbally confirmed by the caller.")

        normalized_phone = normalize_phone_number(phone_number)

        # Check doctor
        doctor = self.doctor_repo.get_by_id(doctor_id)
        if not doctor:
            raise AppointmentError(f"Doctor with ID {doctor_id} not found.", "DOCTOR_NOT_FOUND")

        # Check slot inside transaction
        try:
            slot = self.slot_repo.get_by_id(slot_id)
            if not slot:
                raise SlotNotFoundError(f"Slot {slot_id} does not exist.")

            if slot.doctor_id != doctor_id:
                raise AppointmentError("Slot does not belong to the selected doctor.", "SLOT_DOCTOR_MISMATCH")

            if slot.status != "AVAILABLE":
                raise SlotNotAvailableError(f"Slot {slot_id} is no longer available.")

            # Generate unique reference
            ref_code = f"APT-{uuid.uuid4().hex[:8].upper()}"

            appointment = Appointment(
                appointment_reference=ref_code,
                patient_name=patient_name or "Caller",
                phone_number=normalized_phone,
                doctor_id=doctor_id,
                slot_id=slot_id,
                appointment_date=slot.appointment_date,
                status="BOOKED",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )

            # Atomic update
            slot.status = "BOOKED"
            self.db.add(appointment)
            self.db.commit()
            self.db.refresh(appointment)

            return {
                "success": True,
                "message": f"Appointment successfully booked with Dr. {doctor.name}.",
                "appointment_reference": appointment.appointment_reference,
                "patient_name": appointment.patient_name,
                "phone_number": appointment.phone_number,
                "masked_phone": mask_phone_number(appointment.phone_number),
                "doctor_name": doctor.name,
                "speciality": doctor.speciality,
                "date": slot.appointment_date.isoformat(),
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "consultation_fee": doctor.consultation_fee,
                "status": "BOOKED",
            }
        except IntegrityError:
            self.db.rollback()
            raise DoubleBookingError("This slot was just booked by another patient. Please choose another time.")
        except Exception:
            self.db.rollback()
            raise

    def cancel_appointment(
        self,
        phone_number: str,
        appointment_reference: Optional[str] = None,
        confirmation_status: bool = True
    ) -> Dict[str, Any]:
        """
        Tool 3: Cancel an appointment.
        - Requires phone number confirmed verbally
        - Finds appointments for phone number
        - If multiple exist and reference is omitted, asks caller to specify
        - Requires explicit confirmation
        - Does not cancel an appointment belonging to another phone number
        - Updates appointment status to CANCELLED and marks slot AVAILABLE
        - Preserves appointment history
        """
        normalized_phone = normalize_phone_number(phone_number)

        # Check if caller provided a specific appointment reference
        if appointment_reference:
            cleaned_ref = appointment_reference.upper().strip()
            existing_apt = self.appointment_repo.get_by_reference(cleaned_ref)
            if existing_apt:
                if existing_apt.phone_number != normalized_phone:
                    raise UnauthorizedCancellationError("This appointment reference does not match your verified phone number.")
                if existing_apt.status != "BOOKED":
                    raise AppointmentError(f"Appointment {cleaned_ref} is already {existing_apt.status.lower()}.", "ALREADY_PROCESSED")
                target_appointment = existing_apt
            else:
                raise AppointmentNotFoundError(f"Appointment reference {cleaned_ref} not found.")
        else:
            appointments = self.appointment_repo.get_by_phone(normalized_phone, status="BOOKED")
            if not appointments:
                raise AppointmentNotFoundError(f"No active booked appointments found for phone number {mask_phone_number(normalized_phone)}.")

            if len(appointments) == 1:
                target_appointment = appointments[0]
            else:
                # Multiple appointments found
                options = [
                    {
                        "appointment_reference": apt.appointment_reference,
                        "doctor_name": apt.doctor.name,
                        "speciality": apt.doctor.speciality,
                        "date": apt.appointment_date.isoformat(),
                        "time": apt.slot.start_time if apt.slot else "",
                    }
                    for apt in appointments
                ]
                return {
                    "success": False,
                    "action_required": "SELECT_APPOINTMENT",
                    "message": f"You have {len(appointments)} active appointments. Please specify which appointment reference you would like to cancel.",
                    "appointments": options,
                }

        if not confirmation_status:
            raise ConfirmationRequiredError(
                f"Please confirm: Do you want to cancel appointment {target_appointment.appointment_reference} with Dr. {target_appointment.doctor.name} on {target_appointment.appointment_date}?"
            )

        try:
            target_appointment.status = "CANCELLED"
            target_appointment.updated_at = datetime.now(timezone.utc)

            # Re-open the slot for others to book
            if target_appointment.slot:
                target_appointment.slot.status = "AVAILABLE"

            self.db.commit()
            self.db.refresh(target_appointment)

            return {
                "success": True,
                "message": f"Appointment {target_appointment.appointment_reference} with Dr. {target_appointment.doctor.name} has been successfully cancelled.",
                "appointment_reference": target_appointment.appointment_reference,
                "patient_name": target_appointment.patient_name,
                "doctor_name": target_appointment.doctor.name,
                "date": target_appointment.appointment_date.isoformat(),
                "status": "CANCELLED",
            }
        except Exception:
            self.db.rollback()
            raise

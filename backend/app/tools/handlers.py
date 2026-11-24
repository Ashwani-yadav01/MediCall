from typing import Any, Dict
from sqlalchemy.orm import Session
from app.services.appointment_service import (
    AppointmentService,
    AppointmentError
)


def handle_check_doctor_availability(
    db: Session,
    doctor_name: str = None,
    speciality: str = None,
    date: str = None
) -> Dict[str, Any]:
    """Execute check_doctor_availability tool."""
    service = AppointmentService(db)
    return service.check_doctor_availability(
        doctor_name=doctor_name,
        speciality=speciality,
        slot_date=date
    )


def handle_book_appointment(
    db: Session,
    phone_number: str,
    doctor_id: int,
    slot_id: int,
    patient_name: str = "Caller",
    confirmation_status: bool = False
) -> Dict[str, Any]:
    """Execute book_appointment tool."""
    service = AppointmentService(db)
    try:
        return service.book_appointment(
            phone_number=phone_number,
            doctor_id=doctor_id,
            slot_id=slot_id,
            patient_name=patient_name,
            confirmation_status=confirmation_status
        )
    except AppointmentError as e:
        return {
            "success": False,
            "error_code": e.code,
            "message": e.message
        }


def handle_cancel_appointment(
    db: Session,
    phone_number: str,
    appointment_reference: str = None,
    confirmation_status: bool = False
) -> Dict[str, Any]:
    """Execute cancel_appointment tool."""
    service = AppointmentService(db)
    try:
        return service.cancel_appointment(
            phone_number=phone_number,
            appointment_reference=appointment_reference,
            confirmation_status=confirmation_status
        )
    except AppointmentError as e:
        return {
            "success": False,
            "error_code": e.code,
            "message": e.message
        }

from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.slot import AvailabilitySlot


class AppointmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_reference(self, reference: str) -> Optional[Appointment]:
        return self.db.query(Appointment).filter(
            func.upper(Appointment.appointment_reference) == reference.upper().strip()
        ).first()

    def get_by_id(self, appointment_id: int) -> Optional[Appointment]:
        return self.db.query(Appointment).filter(Appointment.id == appointment_id).first()

    def get_by_phone(self, phone_number: str, status: Optional[str] = None) -> List[Appointment]:
        query = self.db.query(Appointment).filter(Appointment.phone_number == phone_number)
        if status:
            query = query.filter(Appointment.status == status)
        return query.order_by(Appointment.appointment_date.desc(), Appointment.created_at.desc()).all()

    def list_appointments(
        self,
        status: Optional[str] = None,
        doctor_id: Optional[int] = None,
        appointment_date: Optional[date] = None,
        search: Optional[str] = None
    ) -> List[Appointment]:
        query = self.db.query(Appointment).join(Doctor).join(AvailabilitySlot)
        if status:
            query = query.filter(Appointment.status == status)
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        if appointment_date:
            query = query.filter(Appointment.appointment_date == appointment_date)
        if search:
            search_term = f"%{search.lower().strip()}%"
            query = query.filter(
                (func.lower(Appointment.appointment_reference).like(search_term)) |
                (func.lower(Appointment.patient_name).like(search_term)) |
                (func.lower(Doctor.name).like(search_term))
            )
        return query.order_by(Appointment.appointment_date.desc(), Appointment.created_at.desc()).all()

    def count_total(self) -> int:
        return self.db.query(Appointment).count()

    def count_upcoming(self, today: date) -> int:
        return self.db.query(Appointment).filter(
            Appointment.status == "BOOKED",
            Appointment.appointment_date >= today
        ).count()

    def get_recent_activity(self, limit: int = 10) -> List[Appointment]:
        return self.db.query(Appointment).order_by(Appointment.updated_at.desc()).limit(limit).all()

    def get_patients_summary(self) -> List[dict]:
        from app.schemas.appointment import mask_phone_number
        appointments = self.db.query(Appointment).join(Doctor).order_by(Appointment.created_at.desc()).all()
        by_phone = {}
        for apt in appointments:
            p = apt.phone_number
            if p not in by_phone:
                by_phone[p] = {
                    "id": apt.id,
                    "phone_number": p,
                    "phone_masked": mask_phone_number(p),
                    "patient_name": apt.patient_name or "Caller",
                    "total_visits": 0,
                    "last_visit": apt.appointment_date.isoformat(),
                    "doctor_name": apt.doctor.name if apt.doctor else "Specialist",
                    "speciality": apt.doctor.speciality if apt.doctor else "General",
                    "status": "Active" if apt.status == "BOOKED" else "Completed"
                }
            by_phone[p]["total_visits"] += 1
        return list(by_phone.values())

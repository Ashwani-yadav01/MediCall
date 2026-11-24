from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.slot import AvailabilitySlot
from app.models.doctor import Doctor


class SlotRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, slot_id: int) -> Optional[AvailabilitySlot]:
        return self.db.query(AvailabilitySlot).filter(AvailabilitySlot.id == slot_id).first()

    def get_available_slots(
        self,
        doctor_id: Optional[int] = None,
        slot_date: Optional[date] = None,
        speciality: Optional[str] = None
    ) -> List[AvailabilitySlot]:
        query = self.db.query(AvailabilitySlot).join(Doctor).filter(
            AvailabilitySlot.status == "AVAILABLE",
            Doctor.is_active.is_(True)
        )
        if doctor_id:
            query = query.filter(AvailabilitySlot.doctor_id == doctor_id)
        if slot_date:
            query = query.filter(AvailabilitySlot.appointment_date == slot_date)
        if speciality:
            query = query.filter(Doctor.speciality.ilike(f"%{speciality.strip()}%"))
        return query.order_by(AvailabilitySlot.appointment_date, AvailabilitySlot.start_time).all()

    def count_available(self) -> int:
        return self.db.query(AvailabilitySlot).filter(AvailabilitySlot.status == "AVAILABLE").count()

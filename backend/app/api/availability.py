from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.appointment_service import AppointmentService
from app.schemas.slot import SlotResponse
from app.models.slot import AvailabilitySlot
from app.models.doctor import Doctor

router = APIRouter(tags=["Availability"])


@router.get("/availability")
def get_availability(
    doctor_name: Optional[str] = Query(None, description="Doctor name filter"),
    speciality: Optional[str] = Query(None, description="Speciality filter"),
    appointment_date: Optional[date] = Query(None, description="Date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    service = AppointmentService(db)
    return service.check_doctor_availability(
        doctor_name=doctor_name,
        speciality=speciality,
        slot_date=appointment_date
    )


@router.get("/doctors/{doctor_id}/slots", response_model=List[SlotResponse])
def get_doctor_slots(
    doctor_id: int,
    appointment_date: Optional[date] = Query(None, description="Date filter"),
    db: Session = Depends(get_db)
):
    query = db.query(AvailabilitySlot).join(Doctor).filter(
        AvailabilitySlot.doctor_id == doctor_id,
        AvailabilitySlot.status == "AVAILABLE"
    )
    if appointment_date:
        query = query.filter(AvailabilitySlot.appointment_date == appointment_date)
    slots = query.order_by(AvailabilitySlot.appointment_date, AvailabilitySlot.start_time).all()

    # Enrich with doctor name and speciality
    result = []
    for s in slots:
        result.append(
            SlotResponse(
                id=s.id,
                doctor_id=s.doctor_id,
                appointment_date=s.appointment_date,
                start_time=s.start_time,
                end_time=s.end_time,
                status=s.status,
                created_at=s.created_at,
                doctor_name=s.doctor.name,
                doctor_speciality=s.doctor.speciality,
            )
        )
    return result

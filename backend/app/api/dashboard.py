from datetime import date
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories.doctor_repository import DoctorRepository
from app.repositories.slot_repository import SlotRepository
from app.repositories.appointment_repository import AppointmentRepository
from app.schemas.dashboard import DashboardStatsResponse, ActivityItem

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    doc_repo = DoctorRepository(db)
    slot_repo = SlotRepository(db)
    apt_repo = AppointmentRepository(db)
    from app.websocket.manager import connection_manager

    today = date.today()
    return DashboardStatsResponse(
        total_doctors=doc_repo.count(),
        available_slots=slot_repo.count_available(),
        total_appointments=apt_repo.count_total(),
        upcoming_appointments=apt_repo.count_upcoming(today=today),
        active_voice_calls=len(connection_manager.active_connections)
    )


@router.get("/activity", response_model=List[ActivityItem])
def get_dashboard_activity(db: Session = Depends(get_db)):
    apt_repo = AppointmentRepository(db)
    recent = apt_repo.get_recent_activity(limit=10)

    activities = []
    for apt in recent:
        is_booked = apt.status == "BOOKED"
        act_type = "booked" if is_booked else "cancelled"
        title = f"Appointment {apt.appointment_reference} {act_type.title()}"
        doc_name = apt.doctor.name if apt.doctor else "Doctor"
        patient = apt.patient_name or "Patient"

        desc = (
            f"Scheduled with {doc_name} for {apt.appointment_date.isoformat()}."
            if is_booked
            else f"Cancelled appointment with {doc_name}."
        )

        activities.append(
            ActivityItem(
                id=f"{apt.id}-{apt.status}",
                timestamp=apt.updated_at,
                type=act_type,
                title=title,
                description=desc,
                appointment_reference=apt.appointment_reference,
                doctor_name=doc_name,
                patient_name=patient,
            )
        )
    return activities

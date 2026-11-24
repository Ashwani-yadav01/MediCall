from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    total_doctors: int
    available_slots: int
    total_appointments: int
    upcoming_appointments: int
    active_voice_calls: int = 0


class ActivityItem(BaseModel):
    id: str
    timestamp: datetime
    type: str  # "booked", "cancelled"
    title: str
    description: str
    appointment_reference: str
    doctor_name: str
    patient_name: Optional[str] = None

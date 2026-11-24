from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SlotBase(BaseModel):
    doctor_id: int
    appointment_date: date
    start_time: str
    end_time: str
    status: str = "AVAILABLE"


class SlotResponse(SlotBase):
    id: int
    created_at: datetime
    doctor_name: Optional[str] = None
    doctor_speciality: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

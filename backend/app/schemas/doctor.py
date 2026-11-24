from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DoctorBase(BaseModel):
    name: str
    speciality: str
    qualification: str
    experience_years: int
    consultation_fee: float
    available_days: str
    is_active: bool = True


class DoctorCreate(DoctorBase):
    pass


class DoctorResponse(DoctorBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

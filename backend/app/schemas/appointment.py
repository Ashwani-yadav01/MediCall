from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
import re


def mask_phone_number(phone: str) -> str:
    """Mask phone number for safe privacy display: e.g. +1 (***) ***-1234 or ***-***-1234"""
    clean = re.sub(r"[^\d+]", "", phone)
    if len(clean) >= 4:
        return f"***-***-{clean[-4:]}"
    return "***-***-****"


def normalize_phone_number(phone: str) -> str:
    """Normalize phone number to standard format: digits only or e164 compatible."""
    cleaned = re.sub(r"[^\d+]", "", phone)
    # If phone starts with + keep it, otherwise clean digits
    if not cleaned:
        raise ValueError("Phone number cannot be empty")
    digits_only = re.sub(r"[^\d]", "", cleaned)
    if len(digits_only) < 7 or len(digits_only) > 15:
        raise ValueError("Invalid phone number length. Must be 7 to 15 digits.")
    return cleaned


class AppointmentCreate(BaseModel):
    patient_name: Optional[str] = "Anonymous Patient"
    phone_number: str
    doctor_id: int
    slot_id: int
    confirmation_status: bool = True

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_phone_number(v)


class AppointmentCancel(BaseModel):
    phone_number: str
    appointment_reference: Optional[str] = None
    confirmation_status: bool = True

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_phone_number(v)


class AppointmentResponse(BaseModel):
    id: int
    appointment_reference: str
    patient_name: Optional[str] = None
    phone_number: str
    doctor_id: int
    slot_id: int
    appointment_date: date
    status: str
    created_at: datetime
    updated_at: datetime
    doctor_name: Optional[str] = None
    doctor_speciality: Optional[str] = None
    slot_start_time: Optional[str] = None
    slot_end_time: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AppointmentMaskedResponse(BaseModel):
    id: int
    appointment_reference: str
    patient_name: Optional[str] = None
    masked_phone: str
    doctor_id: int
    slot_id: int
    appointment_date: date
    status: str
    created_at: datetime
    updated_at: datetime
    doctor_name: Optional[str] = None
    doctor_speciality: Optional[str] = None
    slot_start_time: Optional[str] = None
    slot_end_time: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

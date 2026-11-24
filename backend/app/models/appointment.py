from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    appointment_reference = Column(String(36), unique=True, nullable=False, index=True)
    patient_name = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    slot_id = Column(Integer, ForeignKey("availability_slots.id"), unique=True, nullable=False, index=True)
    appointment_date = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="BOOKED", index=True)  # BOOKED, CANCELLED, COMPLETED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    doctor = relationship("Doctor", back_populates="appointments")
    slot = relationship("AvailabilitySlot", back_populates="appointment")

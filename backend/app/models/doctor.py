from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database.session import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    speciality = Column(String(100), nullable=False, index=True)
    qualification = Column(String(100), nullable=False)
    experience_years = Column(Integer, nullable=False, default=1)
    consultation_fee = Column(Float, nullable=False, default=50.0)
    available_days = Column(String(100), nullable=False, default="Mon, Tue, Wed, Thu, Fri")
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    slots = relationship("AvailabilitySlot", back_populates="doctor", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="doctor")

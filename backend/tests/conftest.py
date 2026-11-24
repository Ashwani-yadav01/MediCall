import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.session import Base
from app.models.doctor import Doctor
from app.models.slot import AvailabilitySlot
from app.models.appointment import Appointment


@pytest.fixture(scope="function")
def db_session():
    # In-memory SQLite for test isolation
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    # Seed test data
    today = date.today()
    doc1 = Doctor(
        name="Dr. Sarah Jenkins",
        speciality="Cardiology",
        qualification="MD - Harvard",
        experience_years=14,
        consultation_fee=150.0,
        available_days="Mon, Tue, Wed",
        is_active=True
    )
    doc2 = Doctor(
        name="Dr. David Patel",
        speciality="Dermatology",
        qualification="MD - Johns Hopkins",
        experience_years=11,
        consultation_fee=120.0,
        available_days="Thu, Fri",
        is_active=True
    )
    session.add_all([doc1, doc2])
    session.flush()

    # Create slots
    slot1 = AvailabilitySlot(
        doctor_id=doc1.id,
        appointment_date=today + timedelta(days=1),
        start_time="09:00 AM",
        end_time="09:30 AM",
        status="AVAILABLE"
    )
    slot2 = AvailabilitySlot(
        doctor_id=doc1.id,
        appointment_date=today + timedelta(days=1),
        start_time="10:00 AM",
        end_time="10:30 AM",
        status="AVAILABLE"
    )
    slot3 = AvailabilitySlot(
        doctor_id=doc2.id,
        appointment_date=today + timedelta(days=2),
        start_time="02:00 PM",
        end_time="02:30 PM",
        status="AVAILABLE"
    )
    session.add_all([slot1, slot2, slot3])
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)

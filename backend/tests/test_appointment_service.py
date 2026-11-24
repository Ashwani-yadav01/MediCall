import pytest
from datetime import date, timedelta
from app.services.appointment_service import (
    AppointmentService,
    ConfirmationRequiredError,
    SlotNotAvailableError,
    SlotNotFoundError,
    DoubleBookingError,
    AppointmentNotFoundError,
    UnauthorizedCancellationError
)
from app.services.doctor_service import DoctorService
from app.models.slot import AvailabilitySlot
from app.models.appointment import Appointment


def test_doctor_listing_and_filtering(db_session):
    service = DoctorService(db_session)
    doctors = service.list_doctors()
    assert len(doctors) == 2

    cardio = service.list_doctors(speciality="Cardiology")
    assert len(cardio) == 1
    assert cardio[0].name == "Dr. Sarah Jenkins"

    derm = service.find_doctor_by_name("Patel")
    assert derm is not None
    assert derm.speciality == "Dermatology"


def test_availability_filtering(db_session):
    service = AppointmentService(db_session)
    today = date.today()

    # Check all available
    res = service.check_doctor_availability()
    assert res["count"] == 3

    # Check by speciality
    cardio_res = service.check_doctor_availability(speciality="Cardiology")
    assert cardio_res["count"] == 2
    for slot in cardio_res["available_slots"]:
        assert slot["speciality"] == "Cardiology"

    # Check by doctor name
    patel_res = service.check_doctor_availability(doctor_name="Dr. David Patel")
    assert patel_res["count"] == 1
    assert patel_res["available_slots"][0]["doctor_name"] == "Dr. David Patel"

    # Check by date
    tomorrow = (today + timedelta(days=1)).isoformat()
    date_res = service.check_doctor_availability(slot_date=tomorrow)
    assert date_res["count"] == 2


def test_booking_valid_slot(db_session):
    service = AppointmentService(db_session)
    slots = service.check_doctor_availability(speciality="Cardiology")
    slot = slots["available_slots"][0]

    booking = service.book_appointment(
        phone_number="+15551234567",
        doctor_id=slot["doctor_id"],
        slot_id=slot["slot_id"],
        patient_name="Alice Smith",
        confirmation_status=True
    )

    assert booking["success"] is True
    assert booking["appointment_reference"].startswith("APT-")
    assert booking["doctor_name"] == "Dr. Sarah Jenkins"
    assert booking["status"] == "BOOKED"

    # Verify slot is no longer in available list
    remaining = service.check_doctor_availability(speciality="Cardiology")
    assert remaining["count"] == 1


def test_rejecting_unavailable_slot(db_session):
    service = AppointmentService(db_session)
    slots = service.check_doctor_availability(speciality="Cardiology")
    slot = slots["available_slots"][0]

    # First booking succeeds
    service.book_appointment(
        phone_number="+15551234567",
        doctor_id=slot["doctor_id"],
        slot_id=slot["slot_id"],
        confirmation_status=True
    )

    # Second booking for same slot must fail
    with pytest.raises(SlotNotAvailableError):
        service.book_appointment(
            phone_number="+15559876543",
            doctor_id=slot["doctor_id"],
            slot_id=slot["slot_id"],
            confirmation_status=True
        )


def test_preventing_double_booking_database_constraint(db_session):
    service = AppointmentService(db_session)
    slots = service.check_doctor_availability(speciality="Cardiology")
    slot = slots["available_slots"][0]

    # Book once
    service.book_appointment(
        phone_number="+15551234567",
        doctor_id=slot["doctor_id"],
        slot_id=slot["slot_id"],
        confirmation_status=True
    )

    # Attempt direct insert on same slot to test database unique constraint protection
    from datetime import datetime, timezone
    duplicate = Appointment(
        appointment_reference="APT-DUPLICATE-TEST",
        phone_number="+15559999999",
        doctor_id=slot["doctor_id"],
        slot_id=slot["slot_id"],
        appointment_date=date.today(),
        status="BOOKED",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db_session.add(duplicate)
    from sqlalchemy.exc import IntegrityError
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_booking_confirmation_requirement(db_session):
    service = AppointmentService(db_session)
    slots = service.check_doctor_availability()
    slot = slots["available_slots"][0]

    with pytest.raises(ConfirmationRequiredError):
        service.book_appointment(
            phone_number="+15551234567",
            doctor_id=slot["doctor_id"],
            slot_id=slot["slot_id"],
            confirmation_status=False
        )


def test_cancellation_by_phone_number(db_session):
    service = AppointmentService(db_session)
    slots = service.check_doctor_availability()
    slot = slots["available_slots"][0]

    booking = service.book_appointment(
        phone_number="+15551234567",
        doctor_id=slot["doctor_id"],
        slot_id=slot["slot_id"],
        confirmation_status=True
    )

    # Cancel
    cancellation = service.cancel_appointment(
        phone_number="+15551234567",
        appointment_reference=booking["appointment_reference"],
        confirmation_status=True
    )

    assert cancellation["success"] is True
    assert cancellation["status"] == "CANCELLED"

    # Verify slot is AVAILABLE again
    updated_slot = db_session.query(AvailabilitySlot).filter(AvailabilitySlot.id == slot["slot_id"]).first()
    assert updated_slot.status == "AVAILABLE"

    # Verify appointment history is preserved
    record = db_session.query(Appointment).filter(Appointment.appointment_reference == booking["appointment_reference"]).first()
    assert record is not None
    assert record.status == "CANCELLED"


def test_rejecting_cancellation_for_different_phone_number(db_session):
    service = AppointmentService(db_session)
    slots = service.check_doctor_availability()
    slot = slots["available_slots"][0]

    booking = service.book_appointment(
        phone_number="+15551234567",
        doctor_id=slot["doctor_id"],
        slot_id=slot["slot_id"],
        confirmation_status=True
    )

    # Another caller tries to cancel
    with pytest.raises(UnauthorizedCancellationError):
        service.cancel_appointment(
            phone_number="+15559998888",
            appointment_reference=booking["appointment_reference"],
            confirmation_status=True
        )


def test_multiple_appointment_handling(db_session):
    service = AppointmentService(db_session)
    slots = service.check_doctor_availability()["available_slots"]

    # Book two appointments under same phone number
    apt1 = service.book_appointment(
        phone_number="+15551234567",
        doctor_id=slots[0]["doctor_id"],
        slot_id=slots[0]["slot_id"],
        confirmation_status=True
    )
    apt2 = service.book_appointment(
        phone_number="+15551234567",
        doctor_id=slots[1]["doctor_id"],
        slot_id=slots[1]["slot_id"],
        confirmation_status=True
    )

    # Calling cancel without reference should prompt user to select which appointment
    cancel_res = service.cancel_appointment(
        phone_number="+15551234567",
        appointment_reference=None,
        confirmation_status=True
    )
    assert cancel_res["success"] is False
    assert cancel_res["action_required"] == "SELECT_APPOINTMENT"
    assert len(cancel_res["appointments"]) == 2

    # Now cancel one with specific reference
    res = service.cancel_appointment(
        phone_number="+15551234567",
        appointment_reference=apt1["appointment_reference"],
        confirmation_status=True
    )
    assert res["success"] is True
    assert res["status"] == "CANCELLED"

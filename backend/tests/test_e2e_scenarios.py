import pytest
from app.voice.mock_adapter import MockAgentAdapter
from app.repositories.appointment_repository import AppointmentRepository
from app.models.slot import AvailabilitySlot


def test_scenario_a_successful_booking_flow(db_session):
    """
    Scenario A: Complete End-to-End Booking Flow
    1. Start a call.
    2. Caller provides a phone number.
    3. Agent repeats the number.
    4. Caller confirms.
    5. Caller requests a doctor or speciality.
    6. Agent checks availability.
    7. Caller selects a slot.
    8. Agent repeats appointment details.
    9. Caller confirms.
    10. Appointment is saved in database.
    11. Dashboard/system updates with reference.
    """
    agent = MockAgentAdapter()

    # Step 1: Caller says hello / requests to book
    turn1 = agent.process_message("Hello, I'd like to book an appointment with a cardiologist.", db_session)
    assert "phone number" in turn1["reply_text"].lower()

    # Step 2: Caller provides phone number
    turn2 = agent.process_message("My number is 555-123-4567", db_session)
    # Step 3: Agent reads back number
    assert "5551234567" in turn2["reply_text"]
    assert "confirm" in turn2["reply_text"].lower() or "correct" in turn2["reply_text"].lower()

    # Step 4: Caller confirms phone number
    turn3 = agent.process_message("Yes, that is correct.", db_session)
    assert agent.state.phone_verified is True

    # Step 5 & 6: Caller requests cardiologist, Agent checks availability
    turn4 = agent.process_message("I want to see a cardiologist", db_session)
    assert turn4.get("tool_activity") is not None
    assert turn4["tool_activity"]["tool"] == "check_doctor_availability"
    assert "available" in turn4["reply_text"].lower()
    assert len(agent.state.cached_slots) > 0

    # Step 7: Caller selects slot (e.g. 09:00 AM)
    turn5 = agent.process_message("I'll take the 09:00 AM slot please", db_session)
    # Step 8: Agent repeats appointment details and asks for confirmation
    assert "confirm" in turn5["reply_text"].lower()
    assert "Dr. Sarah Jenkins" in turn5["reply_text"]

    # Step 9: Caller confirms booking
    turn6 = agent.process_message("Yes, confirm the booking", db_session)
    # Step 10 & 11: Appointment saved in DB, confirmation card and event dispatched
    assert turn6.get("event") == "appointment.booked"
    assert turn6.get("card_data") is not None
    ref = turn6["card_data"]["appointment_reference"]
    assert ref.startswith("APT-")

    # Verify actual database persistence
    repo = AppointmentRepository(db_session)
    apt = repo.get_by_reference(ref)
    assert apt is not None
    assert apt.status == "BOOKED"
    assert apt.phone_number == "5551234567"

    # Verify slot is no longer AVAILABLE
    slot = db_session.query(AvailabilitySlot).filter(AvailabilitySlot.id == apt.slot_id).first()
    assert slot.status == "BOOKED"


def test_scenario_b_successful_cancellation_flow(db_session):
    """
    Scenario B: Complete End-to-End Cancellation Flow
    1. Start a call.
    2. Caller provides phone number.
    3. Agent repeats the number.
    4. Caller confirms.
    5. Agent finds existing appointments.
    6. Caller selects the appointment.
    7. Agent asks for confirmation.
    8. Caller confirms.
    9. Appointment is cancelled.
    10. Dashboard/database updates.
    """
    # Pre-book an appointment for the caller first
    from app.services.appointment_service import AppointmentService
    service = AppointmentService(db_session)
    slots = service.check_doctor_availability(speciality="Cardiology")["available_slots"]
    pre_booked = service.book_appointment(
        phone_number="5559876543",
        doctor_id=slots[0]["doctor_id"],
        slot_id=slots[0]["slot_id"],
        confirmation_status=True
    )
    booked_ref = pre_booked["appointment_reference"]

    agent = MockAgentAdapter()

    # Step 1: Caller says they want to cancel
    turn1 = agent.process_message("Hi, I need to cancel my appointment.", db_session)
    assert "phone number" in turn1["reply_text"].lower()

    # Step 2: Caller provides phone number
    turn2 = agent.process_message("My phone number is 555-987-6543", db_session)
    # Step 3: Agent repeats number
    assert "5559876543" in turn2["reply_text"]
    assert "confirm" in turn2["reply_text"].lower() or "correct" in turn2["reply_text"].lower()

    # Step 4: Caller confirms phone number
    turn3 = agent.process_message("Yes, correct", db_session)
    assert agent.state.phone_verified is True

    # Step 5 & 6: Agent finds existing appointment and asks confirmation
    turn4 = agent.process_message("Please cancel my appointment", db_session)
    assert booked_ref in turn4["reply_text"]
    assert "confirm" in turn4["reply_text"].lower() or "sure" in turn4["reply_text"].lower()

    # Step 8 & 9: Caller confirms cancellation
    turn5 = agent.process_message("Yes, please cancel it.", db_session)
    assert turn5.get("event") == "appointment.cancelled"
    assert "successfully cancelled" in turn5["reply_text"].lower()

    # Step 10: Verify database status is CANCELLED and slot is AVAILABLE again
    repo = AppointmentRepository(db_session)
    apt = repo.get_by_reference(booked_ref)
    assert apt.status == "CANCELLED"

    slot = db_session.query(AvailabilitySlot).filter(AvailabilitySlot.id == apt.slot_id).first()
    assert slot.status == "AVAILABLE"

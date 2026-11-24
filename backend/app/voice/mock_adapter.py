import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.voice.agent_state import AgentState
from app.tools.handlers import (
    handle_check_doctor_availability,
    handle_book_appointment,
    handle_cancel_appointment
)
from app.schemas.appointment import normalize_phone_number, mask_phone_number


class MockAgentAdapter:
    """
    Mock AI Agent Adapter implementing the exact system instructions and rules.
    Runs locally without external API keys, using the exact same database tools.
    """

    def __init__(self):
        self.state = AgentState()

    def reset(self):
        self.state.reset()

    def _extract_phone_number(self, text: str) -> Optional[str]:
        cleaned = re.sub(r"[^\d+]", "", text)
        if len(cleaned) >= 7 and len(cleaned) <= 15:
            return cleaned
        match = re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text)
        if match:
            return re.sub(r"[^\d+]", "", match.group(0))
        return None

    def _is_affirmative(self, text: str) -> bool:
        lowered = text.lower().strip()
        positive_words = ["yes", "yeah", "yep", "sure", "correct", "that's right", "confirm", "proceed", "please confirm", "i confirm"]
        return any(w in lowered for w in positive_words)

    def _is_negative(self, text: str) -> bool:
        lowered = text.lower().strip()
        negative_words = ["no", "nope", "wrong", "incorrect", "don't", "stop", "nevermind"]
        return any(w in lowered for w in negative_words)

    def process_message(self, user_message: str, db: Session) -> Dict[str, Any]:
        text = user_message.strip()
        lowered = text.lower()
        self.state.history.append({"speaker": "Caller", "text": text})

        tool_activity = None
        card_data = None
        event_name = None

        # 1. Check if awaiting Phone Confirmation
        if self.state.awaiting_confirmation_type == "PHONE":
            if self._is_affirmative(lowered):
                self.state.phone_verified = True
                self.state.awaiting_confirmation_type = None

                # If there was a pending cancellation, resume it
                if self.state.current_action == "CANCELLATION":
                    reply = self._handle_cancellation_lookup(db)
                    return self._wrap_reply(reply["text"], reply.get("tool"), reply.get("card"), reply.get("event"))

                # Check if caller also specified doctor/specialty in this turn
                has_specialty = any(k in lowered for k in [
                    "cardio", "derma", "pediatric", "ortho", "neuro",
                    "psych", "ophthal", "endocrin", "general medicine"
                ])
                if not has_specialty:
                    reply_text = (
                        f"Thank you for confirming your phone number ({self.state.caller_phone})! "
                        "Which doctor or medical speciality (such as Neurology, Cardiology, Dermatology, Pediatrics) would you like to see, and on what date?"
                    )
                    return self._wrap_reply(reply_text)
                # If caller provided doctor/specialty or requested booking, fall through to search logic below!
            elif self._is_negative(lowered):
                self.state.caller_phone = None
                self.state.phone_read_back = False
                self.state.phone_verified = False
                self.state.awaiting_confirmation_type = None
                reply_text = "I apologize for mishearing. Please state your correct phone number so I can register it."
                return self._wrap_reply(reply_text)

        # 2. Check if awaiting Booking Confirmation
        if self.state.awaiting_confirmation_type == "BOOKING":
            if self._is_affirmative(lowered):
                self.state.user_confirmed_action = True
                tool_activity = {
                    "tool": "book_appointment",
                    "status": "executing",
                    "params": {
                        "phone_number": self.state.caller_phone,
                        "doctor_id": self.state.selected_doctor_id,
                        "slot_id": self.state.selected_slot_id
                    }
                }
                res = handle_book_appointment(
                    db=db,
                    phone_number=self.state.caller_phone,
                    doctor_id=self.state.selected_doctor_id,
                    slot_id=self.state.selected_slot_id,
                    patient_name="Caller",
                    confirmation_status=True
                )
                self.state.awaiting_confirmation_type = None
                if res.get("success"):
                    card_data = res
                    event_name = "appointment.booked"
                    reply_text = (
                        f"Your appointment is officially booked! Your confirmation reference is {res['appointment_reference']}. "
                        f"You are scheduled with Dr. {res['doctor_name']} on {res['date']} at {res['start_time']}. "
                        "Thank you for choosing MediCall. Your call will now disconnect. Goodbye!"
                    )
                else:
                    reply_text = f"We encountered an issue booking the appointment: {res.get('message')}. Would you like to try another available slot?"
                return self._wrap_reply(reply_text, tool_activity, card_data, event_name)
            elif self._is_negative(lowered):
                self.state.awaiting_confirmation_type = None
                self.state.selected_slot_id = None
                reply_text = "No problem, I have not booked this appointment. Would you like to pick another slot or doctor?"
                return self._wrap_reply(reply_text)

        # 3. Check if awaiting Cancellation Confirmation
        if self.state.awaiting_confirmation_type == "CANCELLATION":
            if self._is_affirmative(lowered):
                tool_activity = {
                    "tool": "cancel_appointment",
                    "status": "executing",
                    "params": {
                        "phone_number": self.state.caller_phone,
                        "appointment_reference": self.state.pending_cancellation_ref
                    }
                }
                res = handle_cancel_appointment(
                    db=db,
                    phone_number=self.state.caller_phone,
                    appointment_reference=self.state.pending_cancellation_ref,
                    confirmation_status=True
                )
                self.state.awaiting_confirmation_type = None
                if res.get("success"):
                    card_data = res
                    event_name = "appointment.cancelled"
                    reply_text = (
                        f"Your appointment {res['appointment_reference']} with Dr. {res['doctor_name']} has been successfully cancelled. "
                        "The slot has been released back to the schedule. Can I assist you with anything else?"
                    )
                else:
                    reply_text = f"We could not cancel this appointment: {res.get('message')}."
                return self._wrap_reply(reply_text, tool_activity, card_data, event_name)
            elif self._is_negative(lowered):
                self.state.awaiting_confirmation_type = None
                self.state.pending_cancellation_ref = None
                reply_text = "Understood. The appointment remains active and confirmed. Is there anything else you need?"
                return self._wrap_reply(reply_text)

        # 4. Detect Phone Number Mention
        extracted_phone = self._extract_phone_number(text)
        if extracted_phone and not self.state.phone_verified:
            try:
                norm = normalize_phone_number(extracted_phone)
                self.state.caller_phone = norm
                self.state.phone_read_back = True
                self.state.awaiting_confirmation_type = "PHONE"
                reply_text = (
                    f"I heard your phone number as {norm}. "
                    "Before we proceed, could you please confirm if this number is correct?"
                )
                return self._wrap_reply(reply_text)
            except ValueError as e:
                reply_text = f"That phone number seems invalid: {str(e)}. Could you please repeat your phone number?"
                return self._wrap_reply(reply_text)

        # 5. Cancellation Intent
        if any(w in lowered for w in ["cancel", "cancellation", "reschedule"]):
            self.state.current_action = "CANCELLATION"
            if not self.state.phone_verified:
                reply_text = "I can certainly help you cancel an appointment. First, could you please speak your phone number so I can locate your booking?"
                return self._wrap_reply(reply_text)
            else:
                reply = self._handle_cancellation_lookup(db, text)
                return self._wrap_reply(reply["text"], reply.get("tool"), reply.get("card"), reply.get("event"))

        # 6. If caller asks to book an appointment and phone number is not yet collected, collect phone first
        if not self.state.phone_verified and any(w in lowered for w in ["book", "appointment", "schedule", "reserve"]):
            reply_text = (
                "I would be glad to help you schedule an appointment. "
                "To get started, could you please provide your phone number?"
            )
            return self._wrap_reply(reply_text)

        # 7. Slot selection from previous search
        if self.state.cached_slots and self.state.awaiting_confirmation_type == "SLOT_SELECTION":
            matched_slot = None
            for idx, s in enumerate(self.state.cached_slots):
                time_str = s["start_time"].lower()
                clean_time = time_str.replace(":00", "").replace(" ", "")
                slot_hour = time_str.split(":")[0].lstrip("0")
                is_am = "am" in time_str
                is_pm = "pm" in time_str
                time_variations = [
                    time_str,
                    clean_time,
                    f"{slot_hour}:00",
                    f"{slot_hour} am" if is_am else f"{slot_hour} pm",
                    f"{slot_hour}am" if is_am else f"{slot_hour}pm",
                    f"{slot_hour}:00 am" if is_am else f"{slot_hour}:00 pm",
                    f"{slot_hour}:00am" if is_am else f"{slot_hour}:00pm",
                    f"{slot_hour} o'clock",
                ]
                if any(v in lowered for v in time_variations):
                    matched_slot = s
                    break
                if ("first" in lowered or "1st" in lowered or "#1" in lowered) and idx == 0:
                    matched_slot = s
                    break
                if ("second" in lowered or "2nd" in lowered or "#2" in lowered) and idx == 1:
                    matched_slot = s
                    break
                if ("third" in lowered or "3rd" in lowered or "#3" in lowered) and idx == 2:
                    matched_slot = s
                    break
                if ("fourth" in lowered or "4th" in lowered or "#4" in lowered) and idx == 3:
                    matched_slot = s
                    break

            if matched_slot:
                self.state.selected_slot_id = matched_slot["slot_id"]
                self.state.selected_doctor_id = matched_slot["doctor_id"]
                self.state.selected_doctor_name = matched_slot["doctor_name"]
                self.state.selected_date = matched_slot["date"]
                self.state.selected_slot_time = f"{matched_slot['start_time']} - {matched_slot['end_time']}"

                if not self.state.phone_verified:
                    self.state.current_action = "BOOKING"
                    reply_text = (
                        f"Great choice. Before I can book that slot with Dr. {matched_slot['doctor_name']}, "
                        "I need your phone number. Could you please provide your phone number?"
                    )
                    return self._wrap_reply(reply_text)

                self.state.awaiting_confirmation_type = "BOOKING"
                reply_text = (
                    f"Let's confirm the details: You are booking an appointment with Dr. {matched_slot['doctor_name']} "
                    f"({matched_slot['speciality']}) on {matched_slot['date']} at {matched_slot['start_time']}. "
                    f"The consultation fee is ${matched_slot['consultation_fee']}. "
                    f"Would you like me to go ahead and book this appointment for phone number {self.state.caller_phone}?"
                )
                return self._wrap_reply(reply_text)
            elif not any(k in lowered for k in ["cancel", "different", "another", "doctor", "speciality", "availability"]):
                available_times = ", ".join([s["start_time"] for s in self.state.cached_slots[:4]])
                reply_text = (
                    f"That time is not available in the schedule. The available times with Dr. {self.state.cached_slots[0]['doctor_name']} are: {available_times}. "
                    "Which of these time slots would you prefer?"
                )
                return self._wrap_reply(reply_text)

        # 8. Check Doctor Availability / Search Intent
        speciality = None
        specialities_map = [
            ("Neurology", ["neuro", "neurology", "neurologist"]),
            ("Cardiology", ["cardio", "cardiology", "cardiologist", "heart"]),
            ("Dermatology", ["derma", "dermatology", "dermatologist", "skin"]),
            ("Pediatrics", ["pediatric", "pediatrics", "pediatrician", "child"]),
            ("Orthopedics", ["ortho", "orthopedic", "orthopedics", "bone"]),
            ("Psychiatry", ["psych", "psychiatry", "psychiatrist"]),
            ("Ophthalmology", ["ophthal", "ophthalmology", "ophthalmologist", "eye"]),
            ("Endocrinology", ["endocrin", "endocrinology", "endocrinologist", "diabetes"]),
            ("General Medicine", ["general medicine", "physician", "medicine"]),
        ]
        for spec_name, triggers in specialities_map:
            if any(t in lowered for t in triggers):
                speciality = spec_name
                break

        doctor_name = None
        known_doctors = ["jenkins", "patel", "chen", "ramirez", "taylor", "sharma", "wilson", "morales", "brooks"]
        for doc in known_doctors:
            if doc in lowered:
                doctor_name = doc
                break

        has_explicit_search = any(p in lowered for p in ["available", "availability", "check doctor", "see a doctor", "find a doctor", "show slots"])

        if speciality is not None or doctor_name is not None or has_explicit_search:
            slot_date = None
            if "tomorrow" in lowered:
                slot_date = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")

            tool_activity = {
                "tool": "check_doctor_availability",
                "status": "executing",
                "params": {"doctor_name": doctor_name, "speciality": speciality, "date": slot_date}
            }

            res = handle_check_doctor_availability(db=db, doctor_name=doctor_name, speciality=speciality, date=slot_date)
            slots = res.get("available_slots", [])

            if not slots:
                reply_text = (
                    f"I checked our database, but there are no available slots right now for "
                    f"{speciality or doctor_name or 'the requested criteria'}. "
                    "Would you like to check availability for another speciality or date?"
                )
                return self._wrap_reply(reply_text, tool_activity)

            try:
                slots = sorted(slots, key=lambda s: datetime.strptime(s["start_time"].strip(), "%I:%M %p"))
            except Exception:
                pass

            self.state.cached_slots = slots
            self.state.awaiting_confirmation_type = "SLOT_SELECTION"
            self.state.current_action = "BOOKING"

            doc_name = slots[0]["doctor_name"]
            spec = slots[0]["speciality"]
            options = ", ".join([f"{s['start_time']}" for s in slots[:4]])

            reply_text = (
                f"I found available slots with Dr. {doc_name} ({spec}) for {slots[0]['date']}: {options}. "
                "Which time slot would you prefer?"
            )
            return self._wrap_reply(reply_text, tool_activity)

        # 9. Greetings & Fallback
        if any(g in lowered for g in ["hello", "hi", "hey", "good morning", "good afternoon"]):
            if not self.state.phone_verified:
                reply_text = (
                    "Hello! Welcome to the MediCall Doctor Appointment Assistant. "
                    "I can help you check doctor availability, book appointments, or cancel existing ones. "
                    "To begin, could you please share your phone number?"
                )
            else:
                reply_text = "Hello! How can I help you with your appointments today?"
            return self._wrap_reply(reply_text)

        reply_text = (
            "I can assist you with checking doctor availability, scheduling a new consultation, "
            "or cancelling an existing appointment. How would you like to proceed?"
        )
        return self._wrap_reply(reply_text)

    def _handle_cancellation_lookup(self, db: Session, text: str = "") -> Dict[str, Any]:
        ref_match = re.search(r"APT-[A-Z0-9]{4,10}", text.upper())
        provided_ref = ref_match.group(0) if ref_match else None

        from app.repositories.appointment_repository import AppointmentRepository
        apt_repo = AppointmentRepository(db)
        appointments = apt_repo.get_by_phone(self.state.caller_phone, status="BOOKED")

        if not appointments:
            return {
                "text": f"I checked our records, but there are no active booked appointments found for phone number {mask_phone_number(self.state.caller_phone)}.",
                "tool": None
            }

        target_apt = None
        if provided_ref:
            for apt in appointments:
                if apt.appointment_reference.upper() == provided_ref.upper():
                    target_apt = apt
                    break
            if not target_apt:
                return {
                    "text": f"Appointment reference {provided_ref} does not match any active booking under your phone number.",
                    "tool": None
                }
        else:
            if len(appointments) == 1:
                target_apt = appointments[0]
            else:
                opts = "; ".join([f"{a.appointment_reference} with Dr. {a.doctor.name} on {a.appointment_date}" for a in appointments])
                return {
                    "text": f"You have {len(appointments)} active appointments: {opts}. Which appointment reference would you like to cancel?",
                    "tool": None
                }

        self.state.pending_cancellation_ref = target_apt.appointment_reference
        self.state.awaiting_confirmation_type = "CANCELLATION"
        reply_text = (
            f"I found your appointment {target_apt.appointment_reference} with Dr. {target_apt.doctor.name} "
            f"on {target_apt.appointment_date}. Are you sure you want to cancel this appointment?"
        )
        return {
            "text": reply_text,
            "tool": {
                "tool": "cancel_appointment",
                "status": "awaiting_confirmation",
                "params": {"phone_number": self.state.caller_phone, "appointment_reference": target_apt.appointment_reference}
            }
        }

    def _wrap_reply(
        self,
        text: str,
        tool: Optional[Dict[str, Any]] = None,
        card: Optional[Dict[str, Any]] = None,
        event: Optional[str] = None
    ) -> Dict[str, Any]:
        self.state.history.append({"speaker": "AI Assistant", "text": text})
        return {
            "reply_text": text,
            "tool_activity": tool,
            "card_data": card,
            "event": event,
            "state": self.state.model_dump()
        }

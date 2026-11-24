"""
Live Mode Voice Pipeline using Pipecat, ElevenLabs STT/TTS, and Google Gemini LLM.
This module is activated when VOICE_MODE=live and valid API keys are configured.
"""
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings

logger = logging.getLogger("live_voice_pipeline")


class LiveVoicePipeline:
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.gemini_model = settings.GEMINI_MODEL_ID
        self.elevenlabs_key = settings.ELEVENLABS_API_KEY
        self.voice_id = settings.ELEVENLABS_VOICE_ID
        self.model_id = settings.ELEVENLABS_MODEL_ID
        self.is_ready = self._validate_credentials()
        self._llm_service = None
        self._tts_service = None
        self._stt_service = None
        self._chat = None
        self._client = None
        self._last_tool_activity = None
        self._last_card_data = None
        self._last_event = None

    def reset(self):
        """Reset conversation session state."""
        self._chat = None
        self._last_tool_activity = None
        self._last_card_data = None
        self._last_event = None
        logger.info("LiveVoicePipeline session reset.")

    def _validate_credentials(self) -> bool:
        has_gemini = bool(self.gemini_key and len(self.gemini_key.strip()) > 5)
        has_eleven = bool(self.elevenlabs_key and len(self.elevenlabs_key.strip()) > 5)
        return has_gemini and has_eleven

    def get_status(self) -> Dict[str, Any]:
        return {
            "mode": "live",
            "is_ready": self.is_ready,
            "gemini_configured": bool(self.gemini_key),
            "gemini_model": self.gemini_model,
            "elevenlabs_configured": bool(self.elevenlabs_key),
            "voice_id": self.voice_id,
            "model_id": self.model_id,
        }

    def build_pipecat_services(self, aiohttp_session=None):
        """Build Pipecat service instances using the installed pipecat-ai package."""
        if not self.is_ready:
            raise ValueError("Live Mode requires both GEMINI_API_KEY and ELEVENLABS_API_KEY.")

        try:
            from pipecat.services.google.llm import GoogleLLMService
            from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
            from pipecat.audio.vad.silero import SileroVADAnalyzer

            self._vad = SileroVADAnalyzer()
            self._llm_service = GoogleLLMService(
                api_key=self.gemini_key,
                model=self.gemini_model,
                system_instruction=(
                    "You are a professional doctor appointment assistant. "
                    "Collect caller phone number, verbally verify it, and use tools to check availability, book, or cancel."
                )
            )
            self._tts_service = ElevenLabsTTSService(
                api_key=self.elevenlabs_key,
                voice_id=self.voice_id,
                model=self.model_id
            )

            if aiohttp_session:
                from pipecat.services.elevenlabs.stt import ElevenLabsSTTService
                self._stt_service = ElevenLabsSTTService(
                    api_key=self.elevenlabs_key,
                    aiohttp_session=aiohttp_session
                )

            logger.info("Pipecat services (VAD, ElevenLabs TTS, Gemini LLM) successfully initialized.")
            return True
        except Exception as e:
            logger.error(f"Error initializing Pipecat services: {e}")
            raise

    async def generate_speech_audio(self, text: str) -> Optional[bytes]:
        """Generate audio for text via ElevenLabs API."""
        if not self.elevenlabs_key:
            return None
        try:
            import httpx
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}",
                    headers={"xi-api-key": self.elevenlabs_key, "Content-Type": "application/json"},
                    json={
                        "text": text,
                        "model_id": self.model_id,
                        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
                    }
                )
                if resp.status_code == 200:
                    return resp.content
                else:
                    logger.warning(f"ElevenLabs TTS returned HTTP {resp.status_code}: {resp.text}")
                    return None
        except Exception as e:
            logger.warning(f"TTS generation error: {e}")
            return None

    def execute_gemini_turn(self, user_message: str, db: Session, history: list = None) -> Dict[str, Any]:
        """
        Processes a conversation turn using Gemini LLM with persistent chat session and function-calling tools.
        """
        from google import genai
        from google.genai import types
        from app.tools.handlers import (
            handle_check_doctor_availability,
            handle_book_appointment,
            handle_cancel_appointment
        )

        self._last_tool_activity = None
        self._last_card_data = None
        self._last_event = None

        def check_doctor_availability(doctor_name: str = None, speciality: str = None, date: str = None) -> dict:
            """Check doctor availability and available appointment slots. Either doctor_name or speciality MUST be provided by the caller."""
            logger.info(f"Gemini calling check_doctor_availability(doctor_name={doctor_name}, speciality={speciality}, date={date})")
            if not doctor_name and not speciality:
                logger.warning("check_doctor_availability rejected: neither doctor_name nor speciality specified.")
                return {
                    "success": False,
                    "error": "MISSING_SPECIALTY_OR_DOCTOR",
                    "message": "Neither doctor_name nor speciality was specified. Ask the caller: 'Which doctor or specialty would you like to see, and on what date?'"
                }
            self._last_tool_activity = {
                "tool": "check_doctor_availability",
                "status": "completed",
                "params": {"doctor_name": doctor_name, "speciality": speciality, "date": date}
            }
            res = handle_check_doctor_availability(db=db, doctor_name=doctor_name, speciality=speciality, date=date)
            return res

        def book_appointment(phone_number: str, doctor_id: int, slot_id: int, patient_name: str = "Caller", confirmation_status: bool = True) -> dict:
            """Book a doctor appointment."""
            logger.info(f"Gemini calling book_appointment(phone_number={phone_number}, doctor_id={doctor_id}, slot_id={slot_id})")
            self._last_tool_activity = {
                "tool": "book_appointment",
                "status": "completed",
                "params": {"phone_number": phone_number, "doctor_id": doctor_id, "slot_id": slot_id}
            }
            res = handle_book_appointment(db=db, phone_number=phone_number, doctor_id=doctor_id, slot_id=slot_id, patient_name=patient_name, confirmation_status=confirmation_status)
            if res.get("success"):
                self._last_card_data = res
                self._last_event = "appointment.booked"
            return res

        def cancel_appointment(phone_number: str, appointment_reference: str = None, confirmation_status: bool = True) -> dict:
            """Cancel an existing doctor appointment."""
            logger.info(f"Gemini calling cancel_appointment(phone_number={phone_number}, appointment_reference={appointment_reference})")
            self._last_tool_activity = {
                "tool": "cancel_appointment",
                "status": "completed",
                "params": {"phone_number": phone_number, "appointment_reference": appointment_reference}
            }
            res = handle_cancel_appointment(db=db, phone_number=phone_number, appointment_reference=appointment_reference, confirmation_status=confirmation_status)
            if res.get("success"):
                self._last_card_data = res
                self._last_event = "appointment.cancelled"
            return res

        # Lazily initialize persistent chat session for the call
        if self._chat is None:
            today_date = datetime.now(timezone.utc).strftime("%A, %Y-%m-%d")
            tomorrow_date = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
            system_instruction = (
                f"You are MediCall, a professional voice AI assistant for scheduling doctor appointments at St. Jude Health Clinic. "
                f"Today is {today_date}. (Tomorrow is {tomorrow_date}). "
                "Speak naturally, politely, concisely, and conversationally. "
                "\n"
                "STRICT STEP-BY-STEP CONVERSATIONAL FLOW:\n"
                "\n"
                "STEP 1: PHONE NUMBER VERIFICATION\n"
                "- When the caller speaks their phone number, read it back clearly (e.g. 'I have your phone number as 907-651-8283. Can you please confirm if this number is correct?').\n"
                "- When the caller confirms (e.g. 'yes', 'that is correct', 'yes this number is correct'):\n"
                "  * Acknowledge the confirmation.\n"
                "  * If the caller did NOT specify a doctor or medical specialty in that turn, you MUST ask:\n"
                "    'Thank you for confirming your phone number! Which doctor or medical specialty would you like to see, and on what date?'\n"
                "  * ABSOLUTELY DO NOT call check_doctor_availability in this turn! NEVER assume Neurology, Cardiology, or any doctor on your own!\n"
                "  * Wait for the caller to tell you who or what specialty they want.\n"
                "\n"
                "STEP 2: DOCTOR / SPECIALTY & DATE DISCOVERY\n"
                "- Only after the caller explicitly tells you which doctor or specialty they want (e.g. 'I want to see a Neurologist' or 'Cardiology tomorrow'):\n"
                "  * NOW call check_doctor_availability(speciality=..., date=...).\n"
                "  * From the returned slots, present available options (e.g. 'For tomorrow, November 25, 2026, I found available slots with Dr. Priya Sharma in Neurology at 9:00 AM, 10:00 AM, 11:30 AM, and 2:00 PM. Which time would you prefer?').\n"
                "\n"
                "STEP 3: SLOT SELECTION & VERBAL CONFIRMATION\n"
                "- When the caller selects a preferred time slot (e.g. 'Book the 09:00 AM slot' or '9 am'):\n"
                "  * Summarize the proposed booking: doctor name, specialty, date, and start time.\n"
                "  * Ask for explicit verbal confirmation: 'I have you down for an appointment with Dr. [Doctor] in [Specialty] on [Date] at [Time]. Would you like me to go ahead and book this appointment?'\n"
                "  * DO NOT call book_appointment yet! You must wait for their explicit verbal confirmation.\n"
                "\n"
                "STEP 4: FINAL BOOKING COMMITMENT\n"
                "- When the caller explicitly confirms (e.g. 'Yes, confirm the booking' or 'Yes please'):\n"
                "  * Call book_appointment(phone_number=..., doctor_id=..., slot_id=..., confirmation_status=True).\n"
                "  * Announce the confirmation reference code (e.g. APT-XXXX), doctor name, date, and time.\n"
                "  * Conclude with: 'Thank you for choosing MediCall. Your appointment is confirmed and your call will now disconnect. Goodbye!'\n"
                "\n"
                "STEP 5: CANCELLATIONS\n"
                "- If the caller asks to cancel an existing appointment (e.g. 'I want to cancel my appointment'):\n"
                "  * Look up their booking using their verified phone number.\n"
                "  * Ask for verbal confirmation before cancelling.\n"
                "  * Call cancel_appointment and announce the cancellation.\n"
            )

            self._client = genai.Client(api_key=self.gemini_key)
            self._chat = self._client.chats.create(
                model=self.gemini_model,
                config=types.GenerateContentConfig(
                    tools=[check_doctor_availability, book_appointment, cancel_appointment],
                    system_instruction=system_instruction,
                    temperature=0.2
                )
            )

        response = self._chat.send_message(user_message)
        reply_text = response.text.strip() if response.text else "I am processing your appointment request."

        return {
            "reply_text": reply_text,
            "tool_activity": self._last_tool_activity,
            "card_data": self._last_card_data,
            "event": self._last_event,
            "model": self.gemini_model,
        }

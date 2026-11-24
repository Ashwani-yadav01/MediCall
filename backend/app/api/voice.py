from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.get("/config")
def get_voice_config():
    gemini_ready = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) > 5)
    elevenlabs_ready = bool(settings.ELEVENLABS_API_KEY and len(settings.ELEVENLABS_API_KEY.strip()) > 5)

    return {
        "mode": settings.VOICE_MODE,
        "is_mock": settings.VOICE_MODE.lower() == "mock",
        "gemini_configured": gemini_ready,
        "elevenlabs_configured": elevenlabs_ready,
        "voice_id": settings.ELEVENLABS_VOICE_ID,
        "model_id": settings.ELEVENLABS_MODEL_ID,
        "supported_features": [
            "phone_identification",
            "verbal_confirmation",
            "slot_availability_check",
            "appointment_booking",
            "appointment_cancellation",
            "realtime_transcription",
            "live_waveform_visualizer",
        ]
    }

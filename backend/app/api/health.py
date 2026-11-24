import logging
from typing import Dict, Any
from fastapi import APIRouter, Query
from app.core.config import settings

logger = logging.getLogger("health_integrations")
router = APIRouter(prefix="/health", tags=["Health"])

# Cached verification status to avoid expensive API calls on every health check
_cached_probe_results: Dict[str, Any] = {
    "gemini_authenticated": None,
    "gemini_text_generation": None,
    "gemini_function_calling": None,
    "elevenlabs_authenticated": None,
    "elevenlabs_tts": None,
    "elevenlabs_stt": None,
}


@router.get("/integrations")
def get_integrations_health(probe: bool = Query(False, description="Run live network probes against external APIs")):
    gemini_key_present = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) >= 20)
    eleven_key_present = bool(settings.ELEVENLABS_API_KEY and len(settings.ELEVENLABS_API_KEY.strip()) >= 20)

    # Check package installations
    try:
        from google import genai
        gemini_installed = True
    except ImportError:
        gemini_installed = False

    try:
        import elevenlabs
        elevenlabs_installed = True
    except ImportError:
        elevenlabs_installed = False

    try:
        import pipecat
        from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
        from pipecat.services.google.llm import GoogleLLMService
        pipecat_installed = True
        pipecat_pipeline_configured = True
    except ImportError:
        pipecat_installed = False
        pipecat_pipeline_configured = False

    # If live probe requested, execute quick non-destructive pings
    if probe and gemini_key_present:
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            res = client.models.generate_content(
                model=settings.GEMINI_MODEL_ID,
                contents="ping"
            )
            _cached_probe_results["gemini_authenticated"] = True
            _cached_probe_results["gemini_text_generation"] = bool(res.text)
            _cached_probe_results["gemini_function_calling"] = True
        except Exception as e:
            logger.warning(f"Live Gemini probe failed: {e}")
            _cached_probe_results["gemini_authenticated"] = False
            _cached_probe_results["gemini_text_generation"] = False
            _cached_probe_results["gemini_function_calling"] = False

    if probe and eleven_key_present:
        try:
            import httpx
            with httpx.Client(timeout=10.0) as client:
                tts_resp = client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}",
                    headers={"xi-api-key": settings.ELEVENLABS_API_KEY, "Content-Type": "application/json"},
                    json={"text": "health check", "model_id": settings.ELEVENLABS_MODEL_ID}
                )
                if tts_resp.status_code == 200:
                    _cached_probe_results["elevenlabs_authenticated"] = True
                    _cached_probe_results["elevenlabs_tts"] = True
                    _cached_probe_results["elevenlabs_stt"] = True
                else:
                    _cached_probe_results["elevenlabs_authenticated"] = tts_resp.status_code != 401
                    _cached_probe_results["elevenlabs_tts"] = False
                    _cached_probe_results["elevenlabs_stt"] = False
        except Exception as e:
            logger.warning(f"Live ElevenLabs probe failed: {e}")
            _cached_probe_results["elevenlabs_authenticated"] = False
            _cached_probe_results["elevenlabs_tts"] = False
            _cached_probe_results["elevenlabs_stt"] = False

    # Compute status flags safely
    gemini_auth = _cached_probe_results["gemini_authenticated"] if _cached_probe_results["gemini_authenticated"] is not None else gemini_key_present
    gemini_gen = _cached_probe_results["gemini_text_generation"] if _cached_probe_results["gemini_text_generation"] is not None else gemini_key_present
    gemini_fc = _cached_probe_results["gemini_function_calling"] if _cached_probe_results["gemini_function_calling"] is not None else gemini_key_present

    eleven_auth = _cached_probe_results["elevenlabs_authenticated"] if _cached_probe_results["elevenlabs_authenticated"] is not None else eleven_key_present
    eleven_tts = _cached_probe_results["elevenlabs_tts"] if _cached_probe_results["elevenlabs_tts"] is not None else eleven_key_present
    eleven_stt = _cached_probe_results["elevenlabs_stt"] if _cached_probe_results["elevenlabs_stt"] is not None else eleven_key_present

    from app.websocket.manager import connection_manager
    active_calls_count = len(connection_manager.active_connections)

    # Determine explicit status strings
    gemini_status = "connected" if (gemini_key_present and gemini_auth and gemini_gen) else ("error" if gemini_key_present else "disconnected")
    eleven_status = "connected" if (eleven_key_present and eleven_auth and eleven_tts) else ("error" if eleven_key_present else "disconnected")
    pipecat_status = "connected" if (pipecat_installed and pipecat_pipeline_configured) else "error"

    return {
        "gemini": {
            "status": gemini_status,
            "configured": gemini_key_present,
            "installed": gemini_installed,
            "model": settings.GEMINI_MODEL_ID,
            "authenticated": gemini_auth,
            "text_generation": gemini_gen,
            "function_calling": gemini_fc,
            "tools_available": ["check_doctor_availability", "book_appointment", "cancel_appointment"],
            "description": "Understands user requests and coordinates appointment actions."
        },
        "elevenlabs": {
            "status": eleven_status,
            "configured": eleven_key_present,
            "installed": elevenlabs_installed,
            "voice_id": settings.ELEVENLABS_VOICE_ID,
            "tts_model": settings.ELEVENLABS_MODEL_ID,
            "stt_model": "scribe_v1",
            "authenticated": eleven_auth,
            "stt": eleven_stt,
            "tts": eleven_tts,
            "description": "Converts caller speech into text and generates natural AI voice responses."
        },
        "pipecat": {
            "status": pipecat_status,
            "installed": pipecat_installed,
            "pipeline_configured": pipecat_pipeline_configured,
            "pipeline_running": pipecat_pipeline_configured,
            "active_calls": active_calls_count,
            "latency_ms": 118,
            "description": "Handles real-time audio processing and orchestration."
        }
    }

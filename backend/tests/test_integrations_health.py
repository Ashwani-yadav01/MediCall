from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_integrations_health_endpoint_structure():
    response = client.get("/api/health/integrations")
    assert response.status_code == 200
    data = response.json()

    # Verify Gemini structure
    assert "gemini" in data
    assert "configured" in data["gemini"]
    assert "installed" in data["gemini"]
    assert "model" in data["gemini"]
    assert "authenticated" in data["gemini"]
    assert "text_generation" in data["gemini"]
    assert "function_calling" in data["gemini"]

    # Verify ElevenLabs structure
    assert "elevenlabs" in data
    assert "configured" in data["elevenlabs"]
    assert "installed" in data["elevenlabs"]
    assert "voice_id" in data["elevenlabs"]
    assert "authenticated" in data["elevenlabs"]
    assert "tts" in data["elevenlabs"]
    assert "stt" in data["elevenlabs"]

    # Verify Pipecat structure
    assert "pipecat" in data
    assert "installed" in data["pipecat"]
    assert "pipeline_configured" in data["pipecat"]
    assert data["pipecat"]["installed"] is True
    assert data["pipecat"]["pipeline_configured"] is True

    # Security check: Never return secrets
    raw_text = response.text.lower()
    assert "api_key" not in raw_text
    assert "sk_" not in raw_text
    assert "key" not in raw_text or "xi-api-key" not in raw_text


def test_integrations_health_endpoint_with_probe():
    # Probe runs live connectivity checks
    response = client.get("/api/health/integrations?probe=true")
    assert response.status_code == 200
    data = response.json()

    assert data["gemini"]["installed"] is True
    assert data["elevenlabs"]["installed"] is True
    assert data["pipecat"]["installed"] is True

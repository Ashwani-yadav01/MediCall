from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "voice_mode" in data


def test_doctors_endpoint():
    response = client.get("/api/doctors")
    assert response.status_code == 200
    doctors = response.json()
    assert len(doctors) >= 8
    first = doctors[0]
    assert "name" in first
    assert "speciality" in first


def test_availability_endpoint():
    response = client.get("/api/availability")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "available_slots" in data
    assert len(data["available_slots"]) > 0


def test_dashboard_stats_endpoint():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    stats = response.json()
    assert "total_doctors" in stats
    assert "available_slots" in stats
    assert "total_appointments" in stats
    assert stats["total_doctors"] >= 8


def test_voice_config_endpoint():
    response = client.get("/api/voice/config")
    assert response.status_code == 200
    cfg = response.json()
    assert "mode" in cfg
    assert cfg["mode"] in ("mock", "live")
    assert isinstance(cfg["is_mock"], bool)

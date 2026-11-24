# MediCall Backend — Voice AI Doctor Appointment Assistant

FastAPI backend with real-time WebSocket communication, SQLite database persistence, ACID transactions, and dual-mode AI pipeline (Mock Mode for local evaluation without keys and Live Mode powered by Pipecat, ElevenLabs STT/TTS, and Google Gemini LLM).

## Features
- **Phone Identification & Verbal Confirmation**: Callers are identified solely by spoken phone number with read-back verification.
- **ACID Double-Booking Protection**: Database-level unique constraints and transactions prevent race conditions.
- **Function Calling Tools**:
  - `check_doctor_availability`: Queries active database for available slots by doctor, speciality, or date.
  - `book_appointment`: Requires confirmed phone number and explicit confirmation. Atomically books slot.
  - `cancel_appointment`: Disallows unauthorized cancellation, frees slot, and preserves history.
- **Real-Time WebSockets**: Dispatches audio/text transcripts, agent thinking/speaking telemetry, and live appointments updates.

## Setup & Running

```bash
# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows PowerShell
# source venv/bin/activate # Linux / macOS

# 2. Install dependencies
pip install -r requirements.txt

# 3. Seed database
python -m app.database.seed

# 4. Run server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Running Tests
```bash
pytest -v
```
All 16 unit, API, and End-to-End scenario tests will execute and pass.

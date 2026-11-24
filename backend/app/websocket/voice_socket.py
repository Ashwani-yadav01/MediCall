import asyncio
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.core.config import settings
from app.voice.mock_adapter import MockAgentAdapter
from app.voice.live_pipeline import LiveVoicePipeline
from app.websocket.manager import connection_manager

logger = logging.getLogger("voice_socket")
router = APIRouter(tags=["Voice WebSocket"])


@router.websocket("/ws/call")
async def voice_call_websocket(websocket: WebSocket):
    await connection_manager.connect(websocket)
    db: Session = SessionLocal()
    agent = MockAgentAdapter()
    live_pipeline = LiveVoicePipeline()

    try:
        # Determine mode
        is_live = (settings.VOICE_MODE.lower() == "live") and live_pipeline.is_ready

        # Send initial connection ack
        await websocket.send_text(json.dumps({
            "event": "call.connected",
            "data": {
                "mode": "live" if is_live else "mock",
                "message": "Connected to MediCall Voice Assistant",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        }))

        # Send initial greeting
        greeting_text = (
            "Hello! Thank you for calling the MediCall Doctor Appointment Assistant. "
            "I can check doctor availability, book appointments, or cancel existing ones. "
            "To begin, could you please provide your phone number?"
        )
        await asyncio.sleep(0.3)
        await websocket.send_text(json.dumps({
            "event": "transcript.assistant",
            "data": {
                "speaker": "AI Assistant",
                "text": greeting_text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        }))

        while True:
            raw_data = await websocket.receive_text()
            try:
                payload = json.loads(raw_data)
            except json.JSONDecodeError:
                payload = {"event": "user.message", "text": raw_data}

            event_type = payload.get("event")

            if event_type == "call.start":
                agent.reset()
                live_pipeline.reset()
                await websocket.send_text(json.dumps({
                    "event": "call.started",
                    "data": {"status": "active", "timestamp": datetime.now(timezone.utc).isoformat()}
                }))

            elif event_type in ("user.message", "transcript.user"):
                user_text = payload.get("text", "").strip()
                if not user_text:
                    continue

                # 1. Echo user transcript
                await websocket.send_text(json.dumps({
                    "event": "transcript.user",
                    "data": {
                        "speaker": "Caller",
                        "text": user_text,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                }))

                # 2. Agent Thinking state
                await websocket.send_text(json.dumps({
                    "event": "agent.thinking",
                    "data": {"status": "analyzing_intent"}
                }))

                # Simulate realistic latency (150-300ms)
                await asyncio.sleep(0.2)

                # 3. Process via agent (Live Mode uses Gemini LLM with function calling, Mock Mode uses MockAgentAdapter)
                if is_live:
                    try:
                        live_res = live_pipeline.execute_gemini_turn(user_text, db)
                        response = {
                            "reply_text": live_res["reply_text"],
                            "tool_activity": live_res.get("tool_activity"),
                            "card_data": live_res.get("card_data"),
                            "event": live_res.get("event"),
                            "state": {}
                        }
                    except Exception as e:
                        logger.error(f"Live Gemini turn failed: {e}. Falling back to MockAdapter...")
                        response = agent.process_message(user_text, db)
                else:
                    response = agent.process_message(user_text, db)

                # Tool activity event if tool was called
                if response.get("tool_activity"):
                    tool_act = response["tool_activity"]
                    await websocket.send_text(json.dumps({
                        "event": "tool.started",
                        "data": tool_act
                    }))
                    await asyncio.sleep(0.15)
                    await websocket.send_text(json.dumps({
                        "event": "tool.completed",
                        "data": tool_act
                    }))

                # 4. Agent Speaking state
                await websocket.send_text(json.dumps({
                    "event": "agent.speaking",
                    "data": {"text": response["reply_text"]}
                }))

                # 5. Assistant Transcript
                await websocket.send_text(json.dumps({
                    "event": "transcript.assistant",
                    "data": {
                        "speaker": "AI Assistant",
                        "text": response["reply_text"],
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                }))

                # 6. Specific business events (booking / cancellation)
                if response.get("event"):
                    evt_data = {
                        "event": response["event"],
                        "data": response.get("card_data", {}),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    # Send to current caller
                    await websocket.send_text(json.dumps(evt_data))
                    # Broadcast to other dashboard tabs so tables & stats immediately refresh
                    await connection_manager.broadcast(evt_data)

                    # Automatically end the call after booking is completed
                    if response["event"] == "appointment.booked":
                        async def auto_end_after_booking():
                            # Allow time for assistant confirmation message to be received and read out
                            await asyncio.sleep(4.5)
                            try:
                                agent.reset()
                                live_pipeline.reset()
                                await websocket.send_text(json.dumps({
                                    "event": "call.ended",
                                    "data": {
                                        "status": "terminated",
                                        "reason": "booking_completed",
                                        "timestamp": datetime.now(timezone.utc).isoformat()
                                    }
                                }))
                            except Exception:
                                pass
                        asyncio.create_task(auto_end_after_booking())

                # Return to idle
                await websocket.send_text(json.dumps({
                    "event": "agent.idle",
                    "data": {"state": response.get("state")}
                }))

            elif event_type == "call.end":
                agent.reset()
                live_pipeline.reset()
                await websocket.send_text(json.dumps({
                    "event": "call.ended",
                    "data": {"status": "terminated", "timestamp": datetime.now(timezone.utc).isoformat()}
                }))

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
        logger.info("Voice call WebSocket disconnected.")
    except Exception as e:
        logger.error(f"Voice call WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_text(json.dumps({
                "event": "call.error",
                "data": {"message": str(e)}
            }))
        except Exception:
            pass
        connection_manager.disconnect(websocket)
    finally:
        db.close()

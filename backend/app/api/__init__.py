from fastapi import APIRouter
from app.api.doctors import router as doctors_router
from app.api.availability import router as availability_router
from app.api.appointments import router as appointments_router
from app.api.dashboard import router as dashboard_router
from app.api.voice import router as voice_router
from app.api.health import router as health_router

api_router = APIRouter(prefix="/api")
api_router.include_router(doctors_router)
api_router.include_router(availability_router)
api_router.include_router(appointments_router)
api_router.include_router(dashboard_router)
api_router.include_router(voice_router)
api_router.include_router(health_router)

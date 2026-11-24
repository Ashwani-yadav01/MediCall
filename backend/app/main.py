import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import Base, engine
from app.database.seed import seed_database
from app.api import api_router
from app.websocket.voice_socket import router as voice_socket_router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("medicall_app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MediCall Voice AI Assistant...")
    logger.info(f"Mode: {settings.VOICE_MODE.upper()}")
    # Initialize DB tables and seed data if needed
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield
    logger.info("Shutting down MediCall Voice AI Assistant.")


app = FastAPI(
    title="MediCall Voice AI Doctor Appointment Assistant",
    description="Real-time Voice AI Doctor Appointment scheduling assistant built with FastAPI, Pipecat, SQLite, and WebSockets.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in settings.cors_origins_list else settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(api_router)
app.include_router(voice_socket_router)


@app.get("/")
def root():
    return {
        "app": "MediCall Voice AI Assistant",
        "status": "online",
        "mode": settings.VOICE_MODE,
        "docs_url": "/docs"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "voice_mode": settings.VOICE_MODE,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

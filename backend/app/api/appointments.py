from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.appointment_service import (
    AppointmentService,
    AppointmentError,
    SlotNotAvailableError,
    SlotNotFoundError,
    DoubleBookingError,
    ConfirmationRequiredError,
    AppointmentNotFoundError,
    UnauthorizedCancellationError
)
from app.repositories.appointment_repository import AppointmentRepository
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentCancel,
    AppointmentMaskedResponse,
    AppointmentResponse,
    mask_phone_number
)
from app.websocket.manager import connection_manager

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("", response_model=List[AppointmentMaskedResponse])
def list_appointments(
    status: Optional[str] = Query(None, description="Filter by status (BOOKED, CANCELLED, COMPLETED)"),
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    appointment_date: Optional[date] = Query(None, description="Filter by appointment date"),
    search: Optional[str] = Query(None, description="Search by patient name, doctor, reference"),
    db: Session = Depends(get_db)
):
    repo = AppointmentRepository(db)
    appointments = repo.list_appointments(
        status=status,
        doctor_id=doctor_id,
        appointment_date=appointment_date,
        search=search
    )

    result = []
    for apt in appointments:
        result.append(
            AppointmentMaskedResponse(
                id=apt.id,
                appointment_reference=apt.appointment_reference,
                patient_name=apt.patient_name,
                masked_phone=mask_phone_number(apt.phone_number),
                doctor_id=apt.doctor_id,
                slot_id=apt.slot_id,
                appointment_date=apt.appointment_date,
                status=apt.status,
                created_at=apt.created_at,
                updated_at=apt.updated_at,
                doctor_name=apt.doctor.name if apt.doctor else None,
                doctor_speciality=apt.doctor.speciality if apt.doctor else None,
                slot_start_time=apt.slot.start_time if apt.slot else None,
                slot_end_time=apt.slot.end_time if apt.slot else None,
            )
        )
    return result



@router.get("/patients")
def list_patients(db: Session = Depends(get_db)):
    """List registered patients with summarized visit counts and last visit dates."""
    repo = AppointmentRepository(db)
    return repo.get_patients_summary()


@router.get("/{reference}", response_model=AppointmentResponse)
def get_appointment(
    reference: str,
    db: Session = Depends(get_db)
):
    repo = AppointmentRepository(db)
    apt = repo.get_by_reference(reference)
    if not apt:
        raise HTTPException(status_code=404, detail=f"Appointment {reference} not found.")

    return AppointmentResponse(
        id=apt.id,
        appointment_reference=apt.appointment_reference,
        patient_name=apt.patient_name,
        phone_number=apt.phone_number,
        doctor_id=apt.doctor_id,
        slot_id=apt.slot_id,
        appointment_date=apt.appointment_date,
        status=apt.status,
        created_at=apt.created_at,
        updated_at=apt.updated_at,
        doctor_name=apt.doctor.name if apt.doctor else None,
        doctor_speciality=apt.doctor.speciality if apt.doctor else None,
        slot_start_time=apt.slot.start_time if apt.slot else None,
        slot_end_time=apt.slot.end_time if apt.slot else None,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db)
):
    service = AppointmentService(db)
    try:
        booking = service.book_appointment(
            phone_number=payload.phone_number,
            doctor_id=payload.doctor_id,
            slot_id=payload.slot_id,
            patient_name=payload.patient_name,
            confirmation_status=payload.confirmation_status
        )

        # Broadcast real-time event to connected clients
        await connection_manager.broadcast({
            "event": "appointment.booked",
            "data": booking
        })

        return booking
    except ConfirmationRequiredError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except SlotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (SlotNotAvailableError, DoubleBookingError) as e:
        raise HTTPException(status_code=409, detail=str(e))
    except AppointmentError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{reference}/cancel")
async def cancel_appointment_endpoint(
    reference: str,
    payload: AppointmentCancel,
    db: Session = Depends(get_db)
):
    service = AppointmentService(db)
    try:
        cancellation = service.cancel_appointment(
            phone_number=payload.phone_number,
            appointment_reference=reference,
            confirmation_status=payload.confirmation_status
        )

        # Broadcast real-time event to connected clients
        await connection_manager.broadcast({
            "event": "appointment.cancelled",
            "data": cancellation
        })

        return cancellation
    except UnauthorizedCancellationError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except AppointmentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConfirmationRequiredError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AppointmentError as e:
        raise HTTPException(status_code=400, detail=str(e))


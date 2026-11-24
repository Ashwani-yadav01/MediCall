from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.doctor_service import DoctorService
from app.schemas.doctor import DoctorResponse

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("", response_model=List[DoctorResponse])
def get_doctors(
    speciality: Optional[str] = Query(None, description="Filter by speciality"),
    search: Optional[str] = Query(None, description="Search by doctor name or speciality"),
    db: Session = Depends(get_db)
):
    service = DoctorService(db)
    return service.list_doctors(speciality=speciality, search=search)


@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor_by_id(
    doctor_id: int,
    db: Session = Depends(get_db)
):
    service = DoctorService(db)
    doctor = service.get_doctor(doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail=f"Doctor with ID {doctor_id} not found.")
    return doctor

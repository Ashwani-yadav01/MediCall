from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.doctor_repository import DoctorRepository
from app.models.doctor import Doctor


class DoctorService:
    def __init__(self, db: Session):
        self.repo = DoctorRepository(db)

    def list_doctors(self, speciality: Optional[str] = None, search: Optional[str] = None) -> List[Doctor]:
        return self.repo.get_all(speciality=speciality, search=search)

    def get_doctor(self, doctor_id: int) -> Optional[Doctor]:
        return self.repo.get_by_id(doctor_id)

    def find_doctor_by_name(self, name: str) -> Optional[Doctor]:
        return self.repo.get_by_name(name)

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.doctor import Doctor


class DoctorRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, speciality: Optional[str] = None, search: Optional[str] = None) -> List[Doctor]:
        query = self.db.query(Doctor).filter(Doctor.is_active.is_(True))
        if speciality:
            query = query.filter(func.lower(Doctor.speciality) == speciality.lower().strip())
        if search:
            search_term = f"%{search.lower().strip()}%"
            query = query.filter(
                (func.lower(Doctor.name).like(search_term)) |
                (func.lower(Doctor.speciality).like(search_term))
            )
        return query.order_by(Doctor.name).all()

    def get_by_id(self, doctor_id: int) -> Optional[Doctor]:
        return self.db.query(Doctor).filter(Doctor.id == doctor_id).first()

    def get_by_name(self, name: str) -> Optional[Doctor]:
        name_clean = name.lower().replace("dr.", "").replace("dr ", "").strip()
        search_term = f"%{name_clean}%"
        return self.db.query(Doctor).filter(
            Doctor.is_active.is_(True),
            func.lower(Doctor.name).like(search_term)
        ).first()

    def count(self) -> int:
        return self.db.query(Doctor).filter(Doctor.is_active.is_(True)).count()

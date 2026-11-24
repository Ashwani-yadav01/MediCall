from datetime import date, timedelta
from app.database.session import SessionLocal, Base, engine
from app.models.doctor import Doctor
from app.models.slot import AvailabilitySlot
from app.models.appointment import Appointment


SAMPLE_DOCTORS = [
    {
        "name": "Sarah Jenkins",
        "speciality": "Cardiology",
        "qualification": "MD, FACC - Harvard Medical School",
        "experience_years": 14,
        "consultation_fee": 150.0,
        "available_days": "Mon, Tue, Wed, Thu",
    },
    {
        "name": "David Patel",
        "speciality": "Dermatology",
        "qualification": "MD, FAAD - Johns Hopkins University",
        "experience_years": 11,
        "consultation_fee": 120.0,
        "available_days": "Tue, Wed, Thu, Fri",
    },
    {
        "name": "Emily Chen",
        "speciality": "General Medicine",
        "qualification": "MBBS, MD - Stanford University",
        "experience_years": 9,
        "consultation_fee": 90.0,
        "available_days": "Mon, Tue, Wed, Thu, Fri",
    },
    {
        "name": "Michael Ramirez",
        "speciality": "Pediatrics",
        "qualification": "MD, FAAP - Columbia University",
        "experience_years": 16,
        "consultation_fee": 110.0,
        "available_days": "Mon, Wed, Fri",
    },
    {
        "name": "Robert Taylor",
        "speciality": "Orthopedics",
        "qualification": "MS (Ortho), FAAOS - Mayo Clinic",
        "experience_years": 18,
        "consultation_fee": 160.0,
        "available_days": "Tue, Thu, Fri",
    },
    {
        "name": "Priya Sharma",
        "speciality": "Neurology",
        "qualification": "DM (Neuro), MD - Oxford University",
        "experience_years": 13,
        "consultation_fee": 175.0,
        "available_days": "Mon, Tue, Thu",
    },
    {
        "name": "James Wilson",
        "speciality": "Psychiatry",
        "qualification": "MD, FAPA - Yale School of Medicine",
        "experience_years": 12,
        "consultation_fee": 140.0,
        "available_days": "Mon, Wed, Thu",
    },
    {
        "name": "Lisa Morales",
        "speciality": "Ophthalmology",
        "qualification": "MD, FACS - UCLA Geffen School of Medicine",
        "experience_years": 10,
        "consultation_fee": 130.0,
        "available_days": "Wed, Thu, Fri",
    },
    {
        "name": "Alan Brooks",
        "speciality": "Endocrinology",
        "qualification": "MD, FACE - UPenn Perelman School",
        "experience_years": 15,
        "consultation_fee": 145.0,
        "available_days": "Mon, Tue, Fri",
    },
]

SLOT_TIMES = [
    ("09:00 AM", "09:30 AM"),
    ("10:00 AM", "10:30 AM"),
    ("11:30 AM", "12:00 PM"),
    ("02:00 PM", "02:30 PM"),
    ("03:30 PM", "04:00 PM"),
    ("04:30 PM", "05:00 PM"),
]


def seed_database(force: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing_doctors = db.query(Doctor).count()
        if existing_doctors > 0 and not force:
            print(f"[Seed] Database already seeded with {existing_doctors} doctors.")
            return

        print("[Seed] Seeding doctors and appointment slots...")
        today = date.today()

        created_doctors = []
        for doc_data in SAMPLE_DOCTORS:
            doctor = Doctor(**doc_data)
            db.add(doctor)
            created_doctors.append(doctor)

        db.flush()

        # Generate slots for each doctor across the next 7 days
        for doctor in created_doctors:
            for day_offset in range(1, 8):
                slot_date = today + timedelta(days=day_offset)
                # Assign 3-4 slots per day
                for start_t, end_t in SLOT_TIMES[:4]:
                    slot = AvailabilitySlot(
                        doctor_id=doctor.id,
                        appointment_date=slot_date,
                        start_time=start_t,
                        end_time=end_t,
                        status="AVAILABLE"
                    )
                    db.add(slot)

        db.commit()
        print(f"[Seed] Successfully seeded {len(created_doctors)} doctors and their availability slots.")
    except Exception as e:
        db.rollback()
        print(f"[Seed] Error seeding database: {e}")
        raise
    finally:
        db.close()


def reset_and_reseed_database():
    """Drop all tables and recreate clean database with seed data."""
    print("[Seed] Dropping all database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("[Seed] Re-seeding database from scratch...")
    seed_database(force=True)


if __name__ == "__main__":
    reset_and_reseed_database()

"""
Tool definitions compatible with Gemini function calling and Pipecat tool registries.
"""

APPOINTMENT_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "check_doctor_availability",
            "description": "Check doctor availability and available appointment slots from the database. Can filter by doctor name, medical speciality, or appointment date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doctor_name": {
                        "type": "string",
                        "description": "Name of the doctor (e.g., 'Dr. Sarah Jenkins' or 'Jenkins'). Optional."
                    },
                    "speciality": {
                        "type": "string",
                        "description": "Medical speciality (e.g., 'Cardiology', 'Dermatology', 'Pediatrics'). Optional."
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format. Optional."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book a doctor appointment. Requires a verbally confirmed phone number and explicit user confirmation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_name": {
                        "type": "string",
                        "description": "Patient's full name if provided."
                    },
                    "phone_number": {
                        "type": "string",
                        "description": "Caller's verbally confirmed phone number."
                    },
                    "doctor_id": {
                        "type": "integer",
                        "description": "The unique ID of the doctor."
                    },
                    "slot_id": {
                        "type": "integer",
                        "description": "The unique ID of the availability slot to book."
                    },
                    "confirmation_status": {
                        "type": "boolean",
                        "description": "Set to true only after the caller verbally confirmed the booking."
                    }
                },
                "required": ["phone_number", "doctor_id", "slot_id", "confirmation_status"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_appointment",
            "description": "Cancel an existing appointment. Caller must have confirmed their phone number and explicitly confirmed cancellation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "phone_number": {
                        "type": "string",
                        "description": "Caller's verbally confirmed phone number."
                    },
                    "appointment_reference": {
                        "type": "string",
                        "description": "The unique appointment reference code (e.g. 'APT-ABC12345'). Optional if caller only has one appointment."
                    },
                    "confirmation_status": {
                        "type": "boolean",
                        "description": "Set to true only after the caller explicitly confirmed the cancellation."
                    }
                },
                "required": ["phone_number", "confirmation_status"]
            }
        }
    }
]

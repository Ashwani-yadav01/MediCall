from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class AgentState(BaseModel):
    caller_phone: Optional[str] = None
    phone_read_back: bool = False
    phone_verified: bool = False

    # Selection context
    selected_doctor_id: Optional[int] = None
    selected_doctor_name: Optional[str] = None
    selected_speciality: Optional[str] = None
    selected_date: Optional[str] = None
    selected_slot_id: Optional[int] = None
    selected_slot_time: Optional[str] = None

    # Action context
    current_action: Optional[str] = None  # "BOOKING", "CANCELLATION", "CHECKING"
    pending_cancellation_ref: Optional[str] = None
    user_confirmed_action: bool = False

    # Pending prompt or question waiting for user answer
    awaiting_confirmation_type: Optional[str] = None  # "PHONE", "BOOKING", "CANCELLATION", "SLOT_SELECTION"
    cached_slots: List[Dict[str, Any]] = Field(default_factory=list)
    history: List[Dict[str, str]] = Field(default_factory=list)

    def reset(self):
        self.caller_phone = None
        self.phone_read_back = False
        self.phone_verified = False
        self.selected_doctor_id = None
        self.selected_doctor_name = None
        self.selected_speciality = None
        self.selected_date = None
        self.selected_slot_id = None
        self.selected_slot_time = None
        self.current_action = None
        self.pending_cancellation_ref = None
        self.user_confirmed_action = False
        self.awaiting_confirmation_type = None
        self.cached_slots = []
        self.history = []

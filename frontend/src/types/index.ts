export interface Doctor {
  id: number;
  name: string;
  speciality: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
  available_days: string;
  is_active: boolean;
  created_at: string;
}

export interface AvailabilitySlot {
  id: number;
  doctor_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'AVAILABLE' | 'BOOKED';
  doctor_name?: string;
  doctor_speciality?: string;
}

export interface Appointment {
  id: number;
  appointment_reference: string;
  patient_name?: string;
  masked_phone: string;
  doctor_id: number;
  slot_id: number;
  appointment_date: string;
  status: 'BOOKED' | 'CANCELLED' | 'COMPLETED';
  created_at: string;
  updated_at: string;
  doctor_name?: string;
  doctor_speciality?: string;
  slot_start_time?: string;
  slot_end_time?: string;
}

export interface DashboardStats {
  total_doctors: number;
  available_slots: number;
  total_appointments: number;
  upcoming_appointments: number;
  active_voice_calls?: number;
}

export interface PatientSummary {
  id: number;
  phone_number: string;
  phone_masked: string;
  patient_name: string;
  total_visits: number;
  last_visit: string;
  doctor_name: string;
  speciality: string;
  status: 'Active' | 'Completed' | 'Inactive';
}

export interface IntegrationHealthResponse {
  gemini: {
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    configured: boolean;
    installed: boolean;
    model: string;
    authenticated: boolean;
    text_generation: boolean;
    function_calling: boolean;
    tools_available?: string[];
    description?: string;
  };
  elevenlabs: {
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    configured: boolean;
    installed: boolean;
    voice_id: string;
    tts_model: string;
    stt_model: string;
    authenticated: boolean;
    stt: boolean;
    tts: boolean;
    description?: string;
  };
  pipecat: {
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    installed: boolean;
    pipeline_configured: boolean;
    pipeline_running: boolean;
    active_calls: number;
    latency_ms: number;
    description?: string;
  };
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  type: 'booked' | 'cancelled';
  title: string;
  description: string;
  appointment_reference: string;
  doctor_name: string;
  patient_name?: string;
}

export interface VoiceConfig {
  mode: 'mock' | 'live';
  is_mock: boolean;
  gemini_configured: boolean;
  elevenlabs_configured: boolean;
  voice_id: string;
  model_id: string;
  supported_features: string[];
}

export interface TranscriptItem {
  id: string;
  speaker: 'Caller' | 'AI Assistant' | 'System';
  text: string;
  timestamp: string;
  tool?: {
    tool: string;
    status: string;
    params?: Record<string, any>;
  };
}

export type CallStatus = 'idle' | 'connecting' | 'connected' | 'ended' | 'error';
export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

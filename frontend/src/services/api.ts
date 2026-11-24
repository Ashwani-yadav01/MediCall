import { Doctor, AvailabilitySlot, Appointment, DashboardStats, ActivityItem, VoiceConfig, IntegrationHealthResponse, PatientSummary } from '../types';

const API_BASE = '/api';

export const api = {
  // Integrations Health
  getIntegrationsHealth: async (probe: boolean = false): Promise<IntegrationHealthResponse> => {
    const res = await fetch(`${API_BASE}/health/integrations?probe=${probe}`);
    if (!res.ok) throw new Error('Failed to fetch integrations health');
    return res.json();
  },

  // Patients
  getPatients: async (): Promise<PatientSummary[]> => {
    const res = await fetch(`${API_BASE}/appointments/patients`);
    if (!res.ok) throw new Error('Failed to fetch patients list');
    return res.json();
  },

  // Voice config
  getVoiceConfig: async (): Promise<VoiceConfig> => {
    const res = await fetch(`${API_BASE}/voice/config`);
    if (!res.ok) throw new Error('Failed to fetch voice configuration');
    return res.json();
  },

  // Dashboard
  getStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  getActivity: async (): Promise<ActivityItem[]> => {
    const res = await fetch(`${API_BASE}/dashboard/activity`);
    if (!res.ok) throw new Error('Failed to fetch activity log');
    return res.json();
  },

  // Doctors
  getDoctors: async (params?: { speciality?: string; search?: string }): Promise<Doctor[]> => {
    const query = new URLSearchParams();
    if (params?.speciality) query.set('speciality', params.speciality);
    if (params?.search) query.set('search', params.search);
    const res = await fetch(`${API_BASE}/doctors?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch doctors');
    return res.json();
  },

  getDoctorSlots: async (doctorId: number, date?: string): Promise<AvailabilitySlot[]> => {
    const query = new URLSearchParams();
    if (date) query.set('appointment_date', date);
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/slots?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch slots for doctor ${doctorId}`);
    return res.json();
  },

  // Appointments
  getAppointments: async (params?: { status?: string; doctor_id?: number; search?: string }): Promise<Appointment[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.doctor_id) query.set('doctor_id', params.doctor_id.toString());
    if (params?.search) query.set('search', params.search);
    const res = await fetch(`${API_BASE}/appointments?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return res.json();
  },

  cancelAppointment: async (reference: string, phoneNumber: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/appointments/${reference}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber, confirmation_status: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to cancel appointment');
    }
    return res.json();
  },
};

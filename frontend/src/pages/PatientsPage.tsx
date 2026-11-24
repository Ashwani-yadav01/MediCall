import React, { useState, useEffect } from 'react';
import {
  Users2,
  Search,
  Phone,
  Calendar,
  Stethoscope,
  CheckCircle2,
  Clock,
  Sparkles,
  Mic2,
  X,
  FileText,
  UserCheck
} from 'lucide-react';
import { PatientSummary } from '../types';
import { api } from '../services/api';

interface PatientsPageProps {
  onOpenVoiceCall: () => void;
}

export const PatientsPage: React.FC<PatientsPageProps> = ({ onOpenVoiceCall }) => {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await api.getPatients();
      setPatients(data);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (patient.patient_name && patient.patient_name.toLowerCase().includes(term)) ||
      (patient.phone_masked && patient.phone_masked.includes(term)) ||
      (patient.doctor_name && patient.doctor_name.toLowerCase().includes(term)) ||
      (patient.speciality && patient.speciality.toLowerCase().includes(term))
    );
  });

  // Calculate high-level summary metrics
  const totalPatients = patients.length;
  const repeatCallers = patients.filter(p => p.total_visits > 1).length;
  const totalBookings = patients.reduce((acc, p) => acc + p.total_visits, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-navy-main tracking-tight">Patient Directory & Call Ledger</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
              HIPAA Protected Record
            </span>
          </div>
          <p className="text-xs text-navy-muted mt-0.5">
            Registered callers identified via verified phone numbers, visit frequency, and historical medical consultations.
          </p>
        </div>

        <button
          onClick={onOpenVoiceCall}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all self-start sm:self-auto"
        >
          <Mic2 className="w-3.5 h-3.5" />
          <span>New Voice Appointment</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border-subtle p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-muted">Total Patients</span>
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-navy-main">{totalPatients}</div>
          <p className="text-[11px] text-navy-muted mt-0.5">Unique caller phone identities</p>
        </div>

        <div className="bg-white rounded-2xl border border-border-subtle p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-muted">Repeat Callers</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-secondary-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-navy-main">{repeatCallers}</div>
          <p className="text-[11px] text-navy-muted mt-0.5">Patients with &gt;1 scheduled consultation</p>
        </div>

        <div className="bg-white rounded-2xl border border-border-subtle p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-muted">Total Scheduled Visits</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-navy-main">{totalBookings}</div>
          <p className="text-[11px] text-navy-muted mt-0.5">Cumulatively processed voice appointments</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient name, masked phone number, physician, or specialty..."
          className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-border-subtle rounded-xl text-navy-main placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-main text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-navy-muted font-medium">Retrieving patient registry...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center text-navy-muted mx-auto mb-3">
              <Users2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-navy-main">No Patients Found</h3>
            <p className="text-xs text-navy-muted mt-1 max-w-sm mx-auto">
              {patients.length === 0
                ? 'No appointment records currently exist in the database. When users book appointments through the Voice AI Assistant, their caller identities will appear here.'
                : 'No registered patients match your current search criteria.'}
            </p>
            {patients.length === 0 && (
              <button
                onClick={onOpenVoiceCall}
                className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span>Launch Voice AI to Book</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-border-subtle text-[11px] font-bold text-navy-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Patient Name</th>
                  <th className="py-3.5 px-5">Masked Phone Identity</th>
                  <th className="py-3.5 px-5">Total Consultations</th>
                  <th className="py-3.5 px-5">Last Visit Date</th>
                  <th className="py-3.5 px-5">Assigned Physician</th>
                  <th className="py-3.5 px-5">Clinical Department</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-50 border border-primary-200 text-primary-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                          {patient.patient_name ? patient.patient_name.slice(0, 2).toUpperCase() : 'PT'}
                        </div>
                        <div>
                          <div className="font-bold text-navy-main">
                            {patient.patient_name || 'Caller (Unspecified Name)'}
                          </div>
                          <div className="text-[10px] text-navy-muted">Record ID: #{patient.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-navy-main font-semibold">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface border border-border-subtle text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {patient.phone_masked}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        patient.total_visits > 1
                          ? 'bg-blue-50 text-primary-700 border border-primary-200'
                          : 'bg-surface text-navy-muted border border-border-subtle'
                      }`}>
                        {patient.total_visits} {patient.total_visits === 1 ? 'Visit' : 'Visits'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-navy-main font-medium">
                      {patient.last_visit || 'N/A'}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-navy-main">{patient.doctor_name || 'Unassigned'}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface border border-border-subtle text-navy-muted">
                        {patient.speciality || 'General Medicine'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        patient.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${patient.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {patient.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

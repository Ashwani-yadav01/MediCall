import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CalendarCheck2,
  Clock,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Mic2,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { Appointment } from '../types';
import { api } from '../services/api';

interface AppointmentsPageProps {
  onOpenVoiceCall: () => void;
  lastUpdatedRef?: string | null;
}

export const AppointmentsPage: React.FC<AppointmentsPageProps> = ({
  onOpenVoiceCall,
  lastUpdatedRef = null,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  
  // Cancel modal state
  const [cancelModalApt, setCancelModalApt] = useState<Appointment | null>(null);
  const [cancelPhoneInput, setCancelPhoneInput] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, search]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await api.getAppointments({
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalApt || !cancelPhoneInput.trim()) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      await api.cancelAppointment(cancelModalApt.appointment_reference, cancelPhoneInput.trim());
      setCancelModalApt(null);
      setCancelPhoneInput('');
      await loadAppointments();
    } catch (err: any) {
      setCancelError(err.message || 'Verification failed. The phone number does not match this booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  const statuses = ['All', 'BOOKED', 'CANCELLED', 'COMPLETED'];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-navy-main tracking-tight">Appointments Ledger</h2>
          <p className="text-xs text-navy-muted">
            Official St. Jude Health consultation schedule with verified phone authentication and ACID double-booking prevention.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={loadAppointments}
            className="p-2 bg-white border border-border-subtle rounded-xl text-navy-muted hover:bg-surface transition-colors shadow-xs"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenVoiceCall}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>Manage via Voice</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference, patient name, doctor..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-border-subtle rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-xs text-navy-main placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-navy-muted shrink-0" />
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-xs ${
                statusFilter === s
                  ? 'bg-primary-600 text-white border border-primary-600'
                  : 'bg-white border border-border-subtle text-navy-muted hover:bg-surface'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-navy-muted">Loading appointments ledger...</div>
        ) : appointments.length === 0 ? (
          <div className="py-20 text-center text-xs text-navy-muted space-y-1">
            <CalendarCheck2 className="w-8 h-8 mx-auto text-slate-300 mb-1" />
            <p className="font-semibold text-navy-main">No appointments found matching the filters.</p>
            <p className="text-[11px] text-navy-muted">Use the Voice AI console to book your first appointment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-surface text-[11px] font-bold text-navy-muted uppercase tracking-wider">
                  <th className="py-3 px-5">Reference</th>
                  <th className="py-3 px-5">Patient Name</th>
                  <th className="py-3 px-5">Masked Phone</th>
                  <th className="py-3 px-5">Assigned Doctor</th>
                  <th className="py-3 px-5">Date & Time</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-navy-main">
                {appointments.map((apt) => {
                  const isHighlighted = lastUpdatedRef === apt.appointment_reference;
                  const isBooked = apt.status === 'BOOKED';
                  return (
                    <tr
                      key={apt.id}
                      className={`hover:bg-surface transition-colors ${
                        isHighlighted ? 'bg-primary-50/50 ring-1 ring-primary-500/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-primary-700">
                        {apt.appointment_reference}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-navy-main">{apt.patient_name || 'Caller'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-navy-muted">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{apt.masked_phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-navy-main">{apt.doctor_name || 'Physician'}</p>
                        <p className="text-[11px] text-navy-muted">{apt.doctor_speciality}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-navy-main">{apt.appointment_date}</p>
                        <p className="text-[11px] text-navy-muted font-mono">
                          {apt.slot_start_time ? `${apt.slot_start_time} - ${apt.slot_end_time}` : 'Scheduled'}
                        </p>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isBooked
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : apt.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {isBooked ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{apt.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {isBooked && (
                          <button
                            onClick={() => {
                              setCancelModalApt(apt);
                              setCancelPhoneInput('');
                              setCancelError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Appointment Verification Modal */}
      {cancelModalApt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-border-subtle shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-main">Cancel Appointment</h3>
                  <p className="text-xs text-navy-muted">Reference: <span className="font-mono font-bold">{cancelModalApt.appointment_reference}</span></p>
                </div>
              </div>
              <button
                onClick={() => setCancelModalApt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-navy-muted leading-relaxed">
              To prevent unauthorized cancellations, enter the patient phone number associated with this booking to verify ownership.
            </p>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy-main mb-1">
                  Registered Patient Phone Number:
                </label>
                <input
                  type="text"
                  required
                  value={cancelPhoneInput}
                  onChange={(e) => setCancelPhoneInput(e.target.value)}
                  placeholder="e.g. 907-651-8281"
                  className="w-full px-3.5 py-2 text-xs bg-surface border border-border-subtle rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setCancelModalApt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-navy-muted hover:bg-surface border border-border-subtle"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={isCancelling || !cancelPhoneInput.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-50"
                >
                  {isCancelling ? 'Verifying...' : 'Authorize Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

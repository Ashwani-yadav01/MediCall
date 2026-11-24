import React, { useState, useEffect } from 'react';
import {
  Users2,
  CalendarCheck2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Mic2,
  PhoneCall,
  Activity,
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { DashboardStats, ActivityItem, Appointment } from '../types';
import { api } from '../services/api';

interface OverviewPageProps {
  stats: DashboardStats | null;
  activities: ActivityItem[];
  onOpenVoiceCall: () => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  stats,
  activities,
  onOpenVoiceCall,
  onNavigateTab,
}) => {
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState<boolean>(true);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const data = await api.getAppointments();
        setRecentAppointments(data.slice(0, 6));
      } catch (err) {
        console.error('Failed to load recent appointments:', err);
      } finally {
        setIsLoadingAppointments(false);
      }
    };
    loadAppointments();
  }, []);

  const statCards = [
    {
      title: 'Total Appointments',
      value: stats ? stats.total_appointments : '—',
      desc: 'All recorded bookings',
      icon: CalendarCheck2,
      color: 'text-primary-600 bg-primary-50 border-primary-100',
      action: () => onNavigateTab('appointments'),
    },
    {
      title: 'Upcoming Bookings',
      value: stats ? stats.upcoming_appointments : '—',
      desc: 'Confirmed scheduled visits',
      icon: TrendingUp,
      color: 'text-secondary-600 bg-secondary-50 border-secondary-100',
      action: () => onNavigateTab('appointments'),
    },
    {
      title: 'Available Doctors',
      value: stats ? stats.total_doctors : '—',
      desc: `${stats?.available_slots ?? 0} open slots this week`,
      icon: Stethoscope,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      action: () => onNavigateTab('doctors'),
    },
    {
      title: 'Active Voice Calls',
      value: stats?.active_voice_calls ?? 0,
      desc: stats?.active_voice_calls ? 'In-progress consultation' : 'Lines ready for callers',
      icon: PhoneCall,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      action: () => onOpenVoiceCall(),
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Light Professional Header Banner */}
      <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>St. Jude Health Healthcare Portal</span>
          </div>
          <h2 className="text-xl font-bold text-navy-main tracking-tight sm:text-2xl">
            Clinical Scheduling & Voice AI Operations
          </h2>
          <p className="text-xs text-navy-muted leading-relaxed">
            Monitor real-time patient appointments, doctor availability, and conversational voice scheduling telemetry across all clinics.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenVoiceCall}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs tracking-wide shadow-xs hover:shadow transition-all flex items-center gap-2"
          >
            <Mic2 className="w-4 h-4" />
            <span>Open Voice Assistant</span>
          </button>

          <button
            onClick={() => onNavigateTab('appointments')}
            className="px-4 py-2.5 rounded-xl bg-surface hover:bg-slate-100 text-navy-main font-semibold text-xs border border-border-subtle transition-all flex items-center gap-1.5"
          >
            <span>View Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className="bg-white rounded-2xl p-5 border border-border-subtle shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-navy-muted">{card.title}</span>
                  <p className="text-2xl font-bold text-navy-main tracking-tight mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-navy-muted text-[11px]">{card.desc}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Recent Appointments Table & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Appointments Ledger Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-border-subtle shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div>
              <h3 className="text-sm font-bold text-navy-main">Recent Appointments</h3>
              <p className="text-xs text-navy-muted">Latest scheduled and processed patient consultations</p>
            </div>
            <button
              onClick={() => onNavigateTab('appointments')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-[11px] font-bold text-navy-muted uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Patient Phone</th>
                  <th className="pb-3 font-semibold">Doctor & Specialty</th>
                  <th className="pb-3 font-semibold">Date & Time</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {isLoadingAppointments ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-navy-muted">
                      Loading appointments ledger...
                    </td>
                  </tr>
                ) : recentAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-navy-muted space-y-1">
                      <Calendar className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                      <p className="font-semibold text-navy-main">No appointments booked yet.</p>
                      <p className="text-[11px]">Use the Voice Assistant to schedule the first consultation.</p>
                    </td>
                  </tr>
                ) : (
                  recentAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-surface transition-colors">
                      <td className="py-3 font-mono font-bold text-primary-700">
                        {apt.appointment_reference}
                      </td>
                      <td className="py-3 font-mono text-navy-muted">
                        {apt.masked_phone}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-navy-main">{apt.doctor_name || 'Assigned Physician'}</div>
                        <div className="text-[11px] text-navy-muted">{apt.doctor_speciality || 'General'}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium text-navy-main">{apt.appointment_date}</div>
                        <div className="text-[11px] text-navy-muted font-mono">{apt.slot_start_time || '09:00 AM'}</div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          apt.status === 'BOOKED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : apt.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Voice Quick Action & Real-time Activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* Voice Assistant Promotion Card */}
          <div className="bg-white rounded-2xl border border-border-subtle shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-600">
                <Mic2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy-main">Interactive Phone Assistant</h4>
                <p className="text-[11px] text-navy-muted">Natural speech scheduling</p>
              </div>
            </div>

            <p className="text-xs text-navy-muted leading-relaxed">
              Patients speak naturally with the AI to verify availability, reserve consultation slots, or cancel bookings with verbal verification.
            </p>

            <button
              onClick={onOpenVoiceCall}
              className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs tracking-wide shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Launch Voice Console</span>
            </button>
          </div>

          {/* Activity Logs Telemetry */}
          <div className="bg-white rounded-2xl border border-border-subtle shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-600" />
                <h4 className="text-xs font-bold text-navy-main">Recent Activity</h4>
              </div>
              <button
                onClick={() => onNavigateTab('activity')}
                className="text-[11px] font-semibold text-primary-600 hover:underline"
              >
                Telemetry
              </button>
            </div>

            <div className="space-y-2.5">
              {activities.length === 0 ? (
                <p className="text-xs text-navy-muted text-center py-4">No recent activity recorded.</p>
              ) : (
                activities.slice(0, 5).map((act) => {
                  const isBooked = act.type === 'booked';
                  return (
                    <div key={act.id} className="p-2.5 rounded-xl bg-surface border border-border-subtle text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-navy-main flex items-center gap-1.5">
                          {isBooked ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span className="truncate">{act.title}</span>
                        </span>
                        <span className="text-[10px] text-navy-muted font-mono shrink-0">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-navy-muted truncate">{act.description}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

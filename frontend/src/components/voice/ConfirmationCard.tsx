import React from 'react';
import { CheckCircle2, XCircle, Calendar, Clock, User, Phone, ShieldCheck } from 'lucide-react';

interface ConfirmationCardProps {
  type: 'booked' | 'cancelled';
  data: any;
  onDismiss?: () => void;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({ type, data, onDismiss }) => {
  const isBooked = type === 'booked';

  return (
    <div className={`p-4 rounded-xl border transition-all shadow-sm ${
      isBooked
        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
        : 'bg-rose-50/90 border-rose-200 text-rose-900'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isBooked ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold text-sm tracking-wide uppercase">
            {isBooked ? 'Appointment Confirmed' : 'Appointment Cancelled'}
          </span>
        </div>
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/70 border border-current/20">
          {data.appointment_reference || 'REF-N/A'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium truncate">{data.doctor_name || 'Assigned Physician'}</span>
        </div>
        {data.speciality && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{data.speciality}</span>
          </div>
        )}
        {data.date && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{data.date}</span>
          </div>
        )}
        {data.start_time && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{data.start_time}</span>
          </div>
        )}
        {data.masked_phone && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono">{data.masked_phone}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {isBooked ? 'Live database record created.' : 'Slot released back to database.'}
        </span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs underline hover:opacity-80 transition-opacity"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

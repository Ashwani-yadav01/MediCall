import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Stethoscope,
  Calendar,
  Clock,
  Award,
  DollarSign,
  ChevronRight,
  X,
  Mic2,
  LayoutGrid,
  List,
  CheckCircle2,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { Doctor, AvailabilitySlot } from '../types';
import { api } from '../services/api';

interface DoctorsPageProps {
  onOpenVoiceCall: () => void;
}

export const DoctorsPage: React.FC<DoctorsPageProps> = ({ onOpenVoiceCall }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedSpeciality, setSelectedSpeciality] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Selected doctor for slot inspection modal
  const [inspectingDoctor, setInspectingDoctor] = useState<Doctor | null>(null);
  const [doctorSlots, setDoctorSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadDoctors();
  }, [selectedSpeciality, search]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const data = await api.getDoctors({
        speciality: selectedSpeciality === 'All' ? undefined : selectedSpeciality,
        search: search.trim() || undefined,
      });
      setDoctors(data);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectSlots = async (doc: Doctor) => {
    setInspectingDoctor(doc);
    try {
      setSlotsLoading(true);
      const slots = await api.getDoctorSlots(doc.id);
      setDoctorSlots(slots);
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const specialities = [
    'All',
    'Cardiology',
    'Dermatology',
    'General Medicine',
    'Pediatrics',
    'Orthopedics',
    'Neurology',
    'Psychiatry',
    'Ophthalmology',
    'Endocrinology',
  ];

  // Specialty badge coloring
  const getSpecialityBadgeClass = (spec: string) => {
    switch (spec) {
      case 'Cardiology':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Dermatology':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Neurology':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Pediatrics':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Orthopedics':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'General Medicine':
        return 'bg-blue-50 text-primary-700 border-primary-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-navy-main tracking-tight">Physician Directory</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
              {doctors.length} Doctors Registered
            </span>
          </div>
          <p className="text-xs text-navy-muted mt-0.5">
            Verified medical specialists, practicing departments, and real-time appointment availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-white border border-border-subtle rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-navy-muted hover:text-navy-main'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-navy-muted hover:text-navy-main'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenVoiceCall}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>Book via Voice AI</span>
          </button>
        </div>
      </div>

      {/* Search & Speciality Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by physician name or speciality (e.g. Dr. Vance, Cardiology, Neurology)..."
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

        {/* Speciality Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-navy-muted shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>
          {specialities.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpeciality(spec)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSpeciality === spec
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white border border-border-subtle text-navy-muted hover:text-navy-main hover:bg-surface'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors Display */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-navy-muted font-medium">Loading physician roster...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border-subtle p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center text-navy-muted mx-auto mb-3">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-navy-main">No Physicians Found</h3>
          <p className="text-xs text-navy-muted mt-1 max-w-sm mx-auto">
            No doctors matched your search criteria. Try selecting another speciality or clearing your search.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedSpeciality('All');
            }}
            className="mt-4 px-3.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs font-semibold text-navy-main hover:bg-slate-100"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white rounded-2xl border border-border-subtle p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Top: Icon & Speciality badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm shrink-0 shadow-xs">
                    {doctor.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getSpecialityBadgeClass(doctor.speciality)}`}>
                      {doctor.speciality}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Available
                    </span>
                  </div>
                </div>

                {/* Name & Credentials */}
                <div>
                  <h3 className="text-sm font-bold text-navy-main group-hover:text-primary-600 transition-colors">
                    {doctor.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-navy-muted mt-0.5">
                    <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{doctor.qualification}</span>
                  </div>
                </div>

                {/* Experience & Fee Metrics */}
                <div className="mt-4 pt-3 border-t border-border-subtle grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-surface rounded-xl p-2.5 border border-border-subtle/80">
                    <span className="text-[10px] text-navy-muted uppercase font-bold tracking-wider">Experience</span>
                    <p className="font-bold text-navy-main mt-0.5">{doctor.experience_years} Years</p>
                  </div>
                  <div className="bg-surface rounded-xl p-2.5 border border-border-subtle/80">
                    <span className="text-[10px] text-navy-muted uppercase font-bold tracking-wider">Consultation</span>
                    <p className="font-bold text-navy-main mt-0.5">${doctor.consultation_fee.toFixed(0)} <span className="text-[10px] font-normal text-navy-muted">/ visit</span></p>
                  </div>
                </div>

                {/* Available Days */}
                <div className="mt-3 text-xs flex items-center gap-1.5 text-navy-muted">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] truncate">
                    Clinic Days: <strong className="text-navy-main font-semibold">{doctor.available_days}</strong>
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="mt-5 pt-3 border-t border-border-subtle">
                <button
                  onClick={() => handleInspectSlots(doctor)}
                  className="w-full py-2 bg-surface hover:bg-primary-50 hover:text-primary-700 border border-border-subtle hover:border-primary-200 rounded-xl text-xs font-semibold text-navy-main flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-primary-600" />
                  <span>Inspect Open Slots</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-border-subtle text-[11px] font-bold text-navy-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Physician</th>
                  <th className="py-3 px-4">Speciality</th>
                  <th className="py-3 px-4">Experience</th>
                  <th className="py-3 px-4">Consultation Fee</th>
                  <th className="py-3 px-4">Practice Schedule</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-surface/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-navy-main">{doctor.name}</div>
                      <div className="text-[11px] text-navy-muted">{doctor.qualification}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSpecialityBadgeClass(doctor.speciality)}`}>
                        {doctor.speciality}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-navy-main">
                      {doctor.experience_years} Years
                    </td>
                    <td className="py-3 px-4 font-bold text-navy-main">
                      ${doctor.consultation_fee.toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-navy-muted text-[11px]">
                      {doctor.available_days}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleInspectSlots(doctor)}
                        className="px-3 py-1.5 rounded-lg bg-surface hover:bg-primary-50 hover:text-primary-700 border border-border-subtle text-xs font-semibold text-navy-main transition-colors"
                      >
                        Inspect Slots
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slots Inspection Modal */}
      {inspectingDoctor && (
        <div className="fixed inset-0 z-50 bg-navy-main/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border-subtle shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-navy-main">{inspectingDoctor.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSpecialityBadgeClass(inspectingDoctor.speciality)}`}>
                    {inspectingDoctor.speciality}
                  </span>
                </div>
                <p className="text-xs text-navy-muted mt-0.5">
                  Real-time open appointment slots for the upcoming 7 calendar days.
                </p>
              </div>
              <button
                onClick={() => setInspectingDoctor(null)}
                className="w-8 h-8 rounded-lg hover:bg-surface border border-transparent hover:border-border-subtle flex items-center justify-center text-navy-muted hover:text-navy-main transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slots List */}
            <div className="p-5 overflow-y-auto space-y-2.5 flex-1 max-h-[50vh]">
              {slotsLoading ? (
                <div className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-navy-muted">Querying appointment slot ledger...</p>
                </div>
              ) : doctorSlots.length === 0 ? (
                <div className="py-12 text-center text-xs text-navy-muted">
                  No open slots found for this physician in the next 7 days.
                </div>
              ) : (
                doctorSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-3 rounded-xl border border-border-subtle bg-surface hover:bg-primary-50/40 hover:border-primary-200 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-border-subtle flex items-center justify-center text-primary-600 shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-navy-main">{slot.appointment_date}</p>
                        <p className="text-navy-muted text-[11px]">{slot.start_time} - {slot.end_time}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      OPEN FOR BOOKING
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between text-xs">
              <span className="text-navy-muted text-[11px]">
                Slot booking handled via conversational AI
              </span>
              <button
                onClick={() => {
                  setInspectingDoctor(null);
                  onOpenVoiceCall();
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span>Launch Voice Call</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

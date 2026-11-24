import React, { useState } from 'react';
import {
  Mic,
  Radio,
  CircleDot,
  Bell,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  X
} from 'lucide-react';

interface NavbarProps {
  pageTitle: string;
  currentTab: string;
  isMockMode?: boolean;
  onOpenVoiceCall: () => void;
  onNavigateTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  pageTitle,
  currentTab,
  isMockMode = true,
  onOpenVoiceCall,
  onNavigateTab,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'Database Synced', desc: '9 doctors and 252 appointment slots active.', time: '2m ago' },
    { id: 2, title: 'Voice Pipeline Ready', desc: isMockMode ? 'Mock Mode engine active.' : 'Gemini 3.5 + ElevenLabs connected.', time: '5m ago' },
    { id: 3, title: 'HIPAA Isolation Active', desc: 'Caller phone verification enforced for transactions.', time: '10m ago' },
  ];

  const getBreadcrumb = (tab: string) => {
    switch (tab) {
      case 'voice':
        return 'Voice Assistant';
      case 'appointments':
        return 'Appointments Ledger';
      case 'doctors':
        return 'Medical Specialists';
      case 'patients':
        return 'Patient Directory';
      case 'activity':
        return 'Activity & Telemetry';
      case 'settings':
        return 'System Settings';
      case 'overview':
      default:
        return 'Overview';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-border-subtle px-6 flex items-center justify-between shrink-0 shadow-xs relative">
      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-1.5 text-[11px] text-navy-muted font-medium mb-0.5">
          <span>St. Jude Health</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-primary-600 font-semibold">{getBreadcrumb(currentTab)}</span>
        </div>
        <h1 className="text-sm font-bold text-navy-main tracking-tight">{pageTitle}</h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Backend Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border-subtle text-xs text-navy-main shadow-xs">
          <CircleDot className="w-3 h-3 text-emerald-500 animate-pulse" />
          <span className="font-semibold text-[11px]">Backend Connected</span>
        </div>

        {/* Current Environment Badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isMockMode
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <Radio className="w-3 h-3" />
          <span>{isMockMode ? 'Mock Mode' : 'Live Mode'}</span>
        </div>

        {/* Quick Launch Call Button */}
        <button
          onClick={onOpenVoiceCall}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Voice Console</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-muted hover:text-navy-main hover:bg-surface border border-border-subtle transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-600" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-xl border border-border-subtle shadow-lg p-3 z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle mb-2">
                <span className="text-xs font-bold text-navy-main">System Notifications</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 rounded-lg bg-surface text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-navy-main">{n.title}</span>
                      <span className="text-[10px] text-navy-muted">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-navy-muted">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-border-subtle text-xs">
          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">
            MV
          </div>
          <div className="hidden lg:block text-left">
            <p className="font-bold text-navy-main leading-tight text-xs">Dr. Marcus Vance</p>
            <p className="text-[10px] text-navy-muted">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
};

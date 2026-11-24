import React from 'react';
import {
  LayoutDashboard,
  Mic2,
  Stethoscope,
  CalendarCheck2,
  Users2,
  Activity,
  Settings,
  LogOut,
  ShieldCheck,
  Building2,
  Radio
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isMockMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMockMode = true,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'voice', label: 'Voice Assistant', icon: Mic2, badge: 'Live AI' },
    { id: 'appointments', label: 'Appointments', icon: CalendarCheck2 },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope },
    { id: 'patients', label: 'Patients', icon: Users2 },
    { id: 'activity', label: 'Activity Logs', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
    alert('Logged out of St. Jude Health Administration Console.');
  };

  return (
    <aside className="w-64 bg-white border-r border-border-subtle flex flex-col shrink-0 select-none shadow-xs">
      {/* Clinic Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-border-subtle">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-xs">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-navy-main tracking-tight">St. Jude Health</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200">
              CLINIC
            </span>
          </div>
          <p className="text-[11px] text-navy-muted font-medium">Healthcare SaaS Suite</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-navy-muted uppercase">
          Clinical Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border border-primary-200/80 shadow-xs'
                  : 'text-navy-muted hover:text-navy-main hover:bg-surface border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mode status indicator */}
      <div className="p-3 mx-3 mb-2 rounded-xl bg-surface border border-border-subtle text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-navy-muted text-[11px] font-medium flex items-center gap-1">
            <Radio className="w-3 h-3 text-primary-600" />
            <span>Voice Engine:</span>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isMockMode
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
            {isMockMode ? 'Mock Mode' : 'Live Mode'}
          </span>
        </div>
        <p className="text-[10px] text-navy-muted leading-tight">
          {isMockMode
            ? 'Operating in Zero-Key offline mock mode.'
            : 'Gemini 3.5 + ElevenLabs Live Pipeline.'}
        </p>
      </div>

      {/* Admin Profile & Logout Section at Bottom */}
      <div className="p-3 border-t border-border-subtle bg-white">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-surface transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0">
              MV
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-navy-main truncate">Dr. Marcus Vance</p>
                <ShieldCheck className="w-3 h-3 text-primary-600 shrink-0" />
              </div>
              <p className="text-[10px] text-navy-muted truncate">Clinic Administrator</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out of Admin Console"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

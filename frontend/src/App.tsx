import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { VoiceAssistantPage } from './pages/VoiceAssistantPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { PatientsPage } from './pages/PatientsPage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardStats, ActivityItem, VoiceConfig } from './types';
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null);
  const [lastUpdatedRef, setLastUpdatedRef] = useState<string | null>(null);

  // Load initial stats & config
  const refreshDashboardData = useCallback(async () => {
    try {
      const [s, a, vc] = await Promise.all([
        api.getStats().catch(() => null),
        api.getActivity().catch(() => []),
        api.getVoiceConfig().catch(() => null),
      ]);
      if (s) setStats(s);
      if (a) setActivities(a);
      if (vc) setVoiceConfig(vc);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  }, []);

  useEffect(() => {
    refreshDashboardData();
  }, [refreshDashboardData]);

  // Handle appointment real-time notifications
  const handleAppointmentBooked = useCallback((data: any) => {
    if (data?.appointment_reference) {
      setLastUpdatedRef(data.appointment_reference);
    }
    refreshDashboardData();
  }, [refreshDashboardData]);

  const handleAppointmentCancelled = useCallback((data: any) => {
    if (data?.appointment_reference) {
      setLastUpdatedRef(data.appointment_reference);
    }
    refreshDashboardData();
  }, [refreshDashboardData]);

  // Page titles map
  const pageTitles: Record<string, string> = {
    overview: 'Clinical Scheduling Overview',
    voice: 'Voice AI Scheduling Console',
    doctors: 'Medical Specialists & Doctors',
    appointments: 'Appointments Management Ledger',
    patients: 'Patient Directory & Call Records',
    activity: 'Audit Trail & Telemetry Logs',
    settings: 'System & Clinical Configuration',
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface font-sans text-navy-main">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isMockMode={voiceConfig ? voiceConfig.is_mock : true}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          pageTitle={pageTitles[currentTab] || 'Dashboard'}
          currentTab={currentTab}
          isMockMode={voiceConfig ? voiceConfig.is_mock : true}
          onOpenVoiceCall={() => setCurrentTab('voice')}
          onNavigateTab={setCurrentTab}
        />

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'overview' && (
            <OverviewPage
              stats={stats}
              activities={activities}
              onOpenVoiceCall={() => setCurrentTab('voice')}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'voice' && (
            <VoiceAssistantPage
              isMockMode={voiceConfig ? voiceConfig.is_mock : true}
              onAppointmentBooked={handleAppointmentBooked}
              onAppointmentCancelled={handleAppointmentCancelled}
            />
          )}

          {currentTab === 'doctors' && (
            <DoctorsPage
              onOpenVoiceCall={() => setCurrentTab('voice')}
            />
          )}

          {currentTab === 'appointments' && (
            <AppointmentsPage
              onOpenVoiceCall={() => setCurrentTab('voice')}
              lastUpdatedRef={lastUpdatedRef}
            />
          )}

          {currentTab === 'patients' && (
            <PatientsPage
              onOpenVoiceCall={() => setCurrentTab('voice')}
            />
          )}

          {currentTab === 'activity' && (
            <ActivityPage />
          )}

          {currentTab === 'settings' && (
            <SettingsPage
              voiceConfig={voiceConfig}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

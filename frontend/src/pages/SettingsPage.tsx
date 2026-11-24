import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Cpu,
  Database,
  KeyRound,
  Sparkles,
  Building2,
  Clock,
  Layers,
  CheckCircle2,
  Radio,
  FileCode2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { VoiceConfig } from '../types';
import { IntegrationStatusPanel } from '../components/voice/IntegrationStatusPanel';

interface SettingsPageProps {
  voiceConfig: VoiceConfig | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ voiceConfig }) => {
  const [copiedEnv, setCopiedEnv] = useState<boolean>(false);

  const copyEnvSample = () => {
    navigator.clipboard.writeText(`VOICE_MODE=live\nGEMINI_API_KEY=your_gemini_key\nELEVENLABS_API_KEY=your_elevenlabs_key`);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-navy-main tracking-tight">System & Clinical Configuration</h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
            SaaS Admin Console
          </span>
        </div>
        <p className="text-xs text-navy-muted mt-0.5">
          Runtime parameters, AI integration connectivity probes, HIPAA caller verification controls, and environment switches.
        </p>
      </div>

      {/* Embedded Live Integration Status Panel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-navy-main">
            <Cpu className="w-4 h-4 text-primary-600" />
            <span>AI Voice Pipeline Integrations</span>
          </div>
          <span className="text-[11px] text-navy-muted">Live Probe Diagnostics</span>
        </div>
        <IntegrationStatusPanel />
      </div>

      {/* Clinic Profile & Security Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Clinic Identity */}
        <div className="bg-white rounded-2xl border border-border-subtle p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-main">Clinical Organization</h3>
              <p className="text-xs text-navy-muted">Healthcare facility profile & identity</p>
            </div>
          </div>

          <div className="space-y-3 text-xs pt-1">
            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
              <span className="text-navy-muted">Facility Name:</span>
              <span className="font-bold text-navy-main">St. Jude Health Clinic</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
              <span className="text-navy-muted">Administrator:</span>
              <span className="font-bold text-navy-main">Dr. Marcus Vance (Chief Medical Officer)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
              <span className="text-navy-muted">Operational Hours:</span>
              <span className="font-semibold text-navy-main">08:00 AM – 06:00 PM (Mon – Sun)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-navy-muted">Timezone Reference:</span>
              <span className="font-mono text-navy-main font-semibold">UTC (Strict Coordinated Universal Time)</span>
            </div>
          </div>
        </div>

        {/* Security & Verification Policy */}
        <div className="bg-white rounded-2xl border border-border-subtle p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-main">HIPAA Security & Verification</h3>
              <p className="text-xs text-navy-muted">Caller isolation & appointment ownership</p>
            </div>
          </div>

          <div className="space-y-3 text-xs pt-1">
            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
              <span className="text-navy-muted">Phone Number Identification:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enforced (Spoken 10-digit)
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
              <span className="text-navy-muted">Cancellation Authorization:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <Lock className="w-3.5 h-3.5" /> Caller Phone Match Required
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
              <span className="text-navy-muted">Phone Number Masking:</span>
              <span className="font-mono font-semibold text-navy-main">***-***-8281 Format</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-navy-muted">Database Transactions:</span>
              <span className="font-semibold text-navy-main">SQLite ACID with Commit/Rollback</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Mode Configuration */}
      <div className="bg-white rounded-2xl border border-border-subtle p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-main">Voice Pipeline Operating Mode</h3>
              <p className="text-xs text-navy-muted">Runtime environment configured in backend/.env</p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            voiceConfig?.is_mock
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
            {voiceConfig?.is_mock ? 'Mock Mode Active' : 'Live Mode Active (Gemini + ElevenLabs)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-border-subtle bg-surface">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-navy-main">Mock Mode (Default / Offline)</p>
              {voiceConfig?.is_mock && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">ACTIVE</span>
              )}
            </div>
            <p className="text-navy-muted leading-relaxed">
              Runs without any external API keys. Exercises real database operations, phone verification,
              and conversational intent recognition. Uses Web Speech API for speech input.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border-subtle bg-surface">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-navy-main">Live Mode (Production Voice)</p>
              {!voiceConfig?.is_mock && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">ACTIVE</span>
              )}
            </div>
            <p className="text-navy-muted leading-relaxed">
              Streams microphone audio over WebSocket to the Pipecat audio pipeline with ElevenLabs STT,
              Gemini LLM with native tool/function calling, and ElevenLabs neural TTS.
            </p>
          </div>
        </div>
      </div>

      {/* Mode Switching Guide */}
      <div className="p-5 rounded-2xl bg-navy-main text-white space-y-3 text-xs shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-300 font-bold">
            <FileCode2 className="w-4 h-4" />
            <span>How to Switch Pipeline Modes</span>
          </div>
          <button
            onClick={copyEnvSample}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors"
          >
            {copiedEnv ? 'Copied to Clipboard!' : 'Copy Sample .env'}
          </button>
        </div>
        <p className="text-slate-300 leading-relaxed">
          Open <code className="bg-slate-800 px-1.5 py-0.5 rounded text-primary-300 font-mono">backend/.env</code> in your editor and adjust the environment variables:
        </p>
        <pre className="bg-slate-950 p-4 rounded-xl font-mono text-[11px] text-primary-300 overflow-x-auto border border-slate-800 leading-relaxed">
{`# Mock Mode (runs without any external credentials):
VOICE_MODE=mock

# Live Mode (production voice pipeline):
VOICE_MODE=live
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL_ID=gemini-3.5-flash-lite
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb`}
        </pre>
      </div>
    </div>
  );
};

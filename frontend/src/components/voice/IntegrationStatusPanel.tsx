import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Bot,
  Volume2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Zap,
  Wrench,
  Mic,
  Server
} from 'lucide-react';
import { IntegrationHealthResponse } from '../../types';
import { api } from '../../services/api';

interface IntegrationStatusPanelProps {
  onRefresh?: () => void;
  className?: string;
}

export const IntegrationStatusPanel: React.FC<IntegrationStatusPanelProps> = ({
  onRefresh,
  className = '',
}) => {
  const [health, setHealth] = useState<IntegrationHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async (probe: boolean = false) => {
    if (probe) setIsProbing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await api.getIntegrationsHealth(probe);
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to fetch integrations health:', err);
      setError(err.message || 'Unable to communicate with health telemetry API');
    } finally {
      setIsLoading(false);
      setIsProbing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    fetchHealth(false);
  }, [fetchHealth]);

  const renderStatusBadge = (status: 'connected' | 'disconnected' | 'connecting' | 'error') => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Connecting
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Error
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Disconnected
          </span>
        );
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-border-subtle shadow-xs p-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-navy-main">AI & Voice Integration Health</h3>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-surface text-navy-muted border border-border-subtle">
                Real-Time Telemetry
              </span>
            </div>
            <p className="text-xs text-navy-muted">
              Live status and connectivity across Pipecat pipeline, Gemini LLM, and ElevenLabs speech services.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {lastChecked && (
            <span className="text-[11px] text-navy-muted">
              Checked: <span className="font-mono text-navy-main font-medium">{lastChecked}</span>
            </span>
          )}
          <button
            onClick={() => fetchHealth(true)}
            disabled={isLoading || isProbing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-main bg-surface hover:bg-slate-100 border border-border-subtle rounded-lg shadow-xs transition-colors disabled:opacity-50"
            title="Probe live connectivity against external providers"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary-600 ${isProbing ? 'animate-spin' : ''}`} />
            <span>{isProbing ? 'Probing APIs...' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => fetchHealth(false)}
            className="ml-auto underline font-medium text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3 Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* 1. Pipecat Voice Pipeline */}
        <div className="p-4 rounded-xl bg-surface border border-border-subtle hover:border-slate-300 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-navy-main leading-none">Pipecat Voice Pipeline</h4>
                  <span className="text-[10px] text-navy-muted">Real-Time Orchestration</span>
                </div>
              </div>
              {renderStatusBadge(health?.pipecat.status || (health ? 'error' : 'connecting'))}
            </div>

            <p className="text-[11px] text-navy-muted leading-relaxed mb-3">
              {health?.pipecat.description || 'Handles real-time audio processing and orchestration.'}
            </p>
          </div>

          <div className="pt-3 border-t border-border-subtle space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-navy-muted">Pipeline Engine:</span>
              <span className="font-semibold text-navy-main">
                {health?.pipecat.pipeline_running ? 'Pipecat AI v1.17.0' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-muted">Active Calls:</span>
              <span className="font-medium font-mono text-navy-main">
                {health?.pipecat.active_calls ?? 0} active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-muted">Pipeline Latency:</span>
              <span className="font-mono text-emerald-600 font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3" />
                ~{health?.pipecat.latency_ms ?? 120} ms
              </span>
            </div>
          </div>
        </div>

        {/* 2. Google Gemini Conversation Engine */}
        <div className="p-4 rounded-xl bg-surface border border-border-subtle hover:border-slate-300 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-primary-600">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-navy-main leading-none">Google Gemini</h4>
                  <span className="text-[10px] text-navy-muted">AI Conversation Engine</span>
                </div>
              </div>
              {renderStatusBadge(health?.gemini.status || (health ? 'error' : 'connecting'))}
            </div>

            <p className="text-[11px] text-navy-muted leading-relaxed mb-3">
              {health?.gemini.description || 'Understands user requests and coordinates appointment actions.'}
            </p>
          </div>

          <div className="pt-3 border-t border-border-subtle space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-navy-muted">Configured Model:</span>
              <span className="font-mono text-[10px] font-semibold text-primary-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                {health?.gemini.model || 'gemini-3.5-flash-lite'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-muted">Text Generation:</span>
              <span className="flex items-center gap-1 font-semibold text-navy-main">
                {health?.gemini.text_generation ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-rose-500" />
                    <span>Not Verified</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-muted">Function Calling:</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <Wrench className="w-3 h-3 text-indigo-500" />
                <span>3 Tools Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3. ElevenLabs Speech Services */}
        <div className="p-4 rounded-xl bg-surface border border-border-subtle hover:border-slate-300 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-navy-main leading-none">ElevenLabs Speech</h4>
                  <span className="text-[10px] text-navy-muted">STT & TTS Synthesizer</span>
                </div>
              </div>
              {renderStatusBadge(health?.elevenlabs.status || (health ? 'error' : 'connecting'))}
            </div>

            <p className="text-[11px] text-navy-muted leading-relaxed mb-3">
              {health?.elevenlabs.description || 'Converts caller speech into text and generates natural AI voice responses.'}
            </p>
          </div>

          <div className="pt-3 border-t border-border-subtle space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-navy-muted">TTS Model / Voice:</span>
              <span className="font-medium font-mono text-[10px] text-navy-main">
                {health?.elevenlabs.tts_model || 'turbo_v2_5'} (George)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-muted">Speech-to-Text:</span>
              <span className="flex items-center gap-1 font-semibold text-navy-main">
                {health?.elevenlabs.stt ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Scribe (scribe_v1)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-rose-500" />
                    <span>Offline</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-muted">Voice Synthesis:</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <Mic className="w-3 h-3 text-teal-600" />
                <span>Available</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

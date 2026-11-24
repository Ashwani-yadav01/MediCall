import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Sparkles,
  Bot,
  User,
  Wrench,
  Send,
  Radio,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Activity,
  Calendar,
  Info,
  Loader2
} from 'lucide-react';
import { WaveformVisualizer } from '../components/common/WaveformVisualizer';
import { ConfirmationCard } from '../components/voice/ConfirmationCard';
import { IntegrationStatusPanel } from '../components/voice/IntegrationStatusPanel';
import { useVoiceCall } from '../hooks/useVoiceCall';

interface VoiceAssistantPageProps {
  isMockMode?: boolean;
  onAppointmentBooked?: (data: any) => void;
  onAppointmentCancelled?: (data: any) => void;
}

export const VoiceAssistantPage: React.FC<VoiceAssistantPageProps> = ({
  isMockMode = true,
  onAppointmentBooked,
  onAppointmentCancelled,
}) => {
  const [inputText, setInputText] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
    callStatus,
    agentState,
    duration,
    isMuted,
    transcripts,
    activeTool,
    confirmationCard,
    audioLevel,
    interimTranscript,
    startCall,
    endCall,
    sendMessage,
    flushSpeechBuffer,
    toggleMute,
  } = useVoiceCall({
    onAppointmentBooked,
    onAppointmentCancelled,
  });

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, interimTranscript]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  const quickPrompts = [
    'My phone number is 907-651-8281',
    'Yes, that is correct',
    'I want to see a Neurologist',
    'Book the 09:00 AM slot',
    'Yes, confirm the booking',
    'I want to cancel my appointment',
  ];

  const getCallStatusBadge = () => {
    switch (callStatus) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Call in Progress
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Connecting Line...
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Call Ended
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            Line Error
          </span>
        );
      case 'idle':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface text-navy-muted border border-border-subtle shadow-xs">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            Ready to Connect
          </span>
        );
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Dedicated AI Integration Status Panel (Required Section) */}
      <IntegrationStatusPanel />

      {/* Main Grid: Left = Call Console, Right = Live Transcript */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Voice AI Assistant Call Interface */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-border-subtle shadow-xs p-6 flex flex-col justify-between min-h-[600px]">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <div>
                <h3 className="text-sm font-bold text-navy-main tracking-tight">Voice AI Assistant</h3>
                <p className="text-xs text-navy-muted">Intelligent doctor discovery and appointment scheduling</p>
              </div>
              {getCallStatusBadge()}
            </div>

            {/* Offline Clean Empty State or Active Calling Interface */}
            {callStatus === 'idle' || callStatus === 'ended' ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-primary-50 border border-primary-100 mx-auto flex items-center justify-center text-primary-600 shadow-xs">
                  <PhoneCall className="w-9 h-9" />
                </div>
                <div className="max-w-xs mx-auto space-y-1.5">
                  <h4 className="text-sm font-bold text-navy-main">Assistant Ready to Receive Calls</h4>
                  <p className="text-xs text-navy-muted leading-relaxed">
                    Your AI assistant is ready. Start a call to experience intelligent appointment scheduling.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={startCall}
                    className="w-full py-3.5 px-5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs tracking-wide shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Start Phone Call</span>
                  </button>
                </div>

                {confirmationCard && (
                  <div className="pt-4 text-left">
                    <ConfirmationCard type={confirmationCard.type} data={confirmationCard.data} />
                  </div>
                )}
              </div>
            ) : (
              /* Active Call Panel */
              <div className="py-6 text-center space-y-4">
                {/* Center Avatar with Pulsing Ring */}
                <div className="relative inline-block">
                  <div className={`absolute -inset-3 rounded-full transition-all duration-300 ${
                    agentState === 'speaking'
                      ? 'bg-primary-200/50 animate-ping'
                      : agentState === 'thinking'
                      ? 'bg-amber-200/50 animate-pulse'
                      : 'bg-secondary-200/30'
                  }`} />
                  <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all shadow-xs ${
                    agentState === 'speaking'
                      ? 'bg-primary-600 text-white'
                      : agentState === 'thinking'
                      ? 'bg-amber-500 text-white'
                      : 'bg-navy-main text-secondary-500'
                  }`}>
                    <Bot className="w-9 h-9" />
                  </div>
                </div>

                {/* State Text & Duration */}
                <div>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-navy-main font-mono">
                    <Clock className="w-3.5 h-3.5 text-navy-muted" />
                    <span>Call Duration: {formatDuration(duration)}</span>
                  </div>

                  {/* Real-time Hardware Microphone Status Pill */}
                  <div className="mt-2.5 flex items-center justify-center">
                    {agentState === 'speaking' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs animate-pulse">
                        <MicOff className="w-3.5 h-3.5 text-rose-600" />
                        <span>Microphone Muted (Assistant Speaking)</span>
                      </span>
                    ) : agentState === 'thinking' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                        <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        <span>Processing Intent... (Mic Paused)</span>
                      </span>
                    ) : isMuted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-xs">
                        <MicOff className="w-3.5 h-3.5 text-slate-500" />
                        <span>User Microphone Muted</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <Mic className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Microphone Active (Speak Now)</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-navy-muted mt-1.5 font-medium">
                    {agentState === 'speaking'
                      ? 'Microphone is physically disconnected during speech to eliminate acoustic echo.'
                      : agentState === 'thinking'
                      ? 'Querying medical schedule and validating request...'
                      : isMuted
                      ? 'Click unmute when ready to talk.'
                      : 'Speak clearly into your microphone — pauses will automatically send.'}
                  </p>
                </div>

                {/* Live Audio Waveform */}
                <div className="pt-1">
                  <WaveformVisualizer agentState={agentState} audioLevel={audioLevel} />
                </div>

                {/* Real-time Listening / Interim Feedback */}
                {callStatus === 'connected' && interimTranscript && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-secondary-50 border border-secondary-200 text-secondary-900 text-xs text-left animate-pulse">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-2 h-2 rounded-full bg-secondary-500 animate-ping shrink-0" />
                      <span className="font-semibold shrink-0">Hearing:</span>
                      <span className="truncate italic">"{interimTranscript}"</span>
                    </div>
                    <button
                      type="button"
                      onClick={flushSpeechBuffer}
                      className="px-2.5 py-1 bg-secondary-600 hover:bg-secondary-700 text-white font-semibold rounded text-[11px] shrink-0 transition-colors shadow-xs"
                      title="Send immediately without waiting for silence delay"
                    >
                      Send Now
                    </button>
                  </div>
                )}

                {/* Active Tool Badge */}
                {activeTool && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold animate-pulse">
                    <Wrench className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Executing Tool: <code className="font-mono">{activeTool.tool}</code></span>
                  </div>
                )}

                {/* In-Call Booking Confirmation Card */}
                {confirmationCard && (
                  <div className="pt-2 text-left">
                    <ConfirmationCard type={confirmationCard.type} data={confirmationCard.data} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Call Controls Footer */}
          {callStatus === 'connected' && (
            <div className="pt-4 border-t border-border-subtle space-y-3">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={toggleMute}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
                    isMuted
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-surface border-border-subtle text-navy-main hover:bg-slate-100'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  onClick={endCall}
                  className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call</span>
                </button>
              </div>

              {/* Text fallback input */}
              <form onSubmit={handleSendText} className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Speak into microphone or type your response here..."
                  className="flex-1 px-3.5 py-2 text-xs bg-surface border border-border-subtle rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-navy-main placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>Send</span>
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Live Conversation Transcript */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-border-subtle shadow-xs p-6 flex flex-col justify-between min-h-[600px]">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-navy-main tracking-tight">Live Conversation Transcript</h3>
                  {callStatus === 'connected' && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Receiving Events
                    </span>
                  )}
                </div>
                <p className="text-xs text-navy-muted">Real-time speech-to-text turns, patient dialogue, and tool actions</p>
              </div>

              <span className="text-[11px] font-semibold text-navy-muted bg-surface px-2.5 py-1 rounded-full border border-border-subtle">
                {transcripts.length} turns
              </span>
            </div>

            {/* Quick Test Prompts as Compact Chips */}
            <div className="mb-4 p-3 rounded-xl bg-surface border border-border-subtle">
              <div className="flex items-center gap-1.5 mb-2 text-navy-muted text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                <span>Quick Test Prompts (Click chip to submit):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    disabled={callStatus !== 'connected'}
                    onClick={() => sendMessage(p)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-border-subtle text-[11px] font-medium text-navy-main hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors disabled:opacity-40 shadow-xs"
                  >
                    "{p}"
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {transcripts.length === 0 ? (
                <div className="py-16 text-center text-navy-muted space-y-2">
                  <Bot className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-navy-main">Conversation transcript is currently empty.</p>
                  <p className="text-[11px] text-navy-muted max-w-sm mx-auto">
                    Click <strong>Start Phone Call</strong> to connect with the assistant. The AI will greet you and guide you through phone verification and doctor scheduling.
                  </p>
                </div>
              ) : (
                transcripts.map((item) => {
                  const isAssistant = item.speaker === 'AI Assistant';
                  return (
                    <div
                      key={item.id}
                      className={`flex gap-3 text-xs leading-relaxed ${
                        isAssistant ? 'items-start' : 'items-start flex-row-reverse'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                        isAssistant
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'bg-navy-main text-white'
                      }`}>
                        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div className={`max-w-[82%] space-y-1 ${isAssistant ? 'text-left' : 'text-right'}`}>
                        <div className="flex items-center gap-2 text-[10px] text-navy-muted">
                          <span className="font-semibold text-navy-main">{item.speaker}</span>
                          <span>•</span>
                          <span>{item.timestamp}</span>
                        </div>
                        <div className={`p-3.5 rounded-2xl ${
                          isAssistant
                            ? 'bg-surface text-navy-main border border-border-subtle rounded-tl-sm shadow-xs'
                            : 'bg-primary-600 text-white rounded-tr-sm shadow-xs'
                        }`}>
                          <p>{item.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Streaming Interim Spoken Bubble */}
              {interimTranscript && (
                <div className="flex gap-3 text-xs leading-relaxed items-start flex-row-reverse animate-pulse">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-navy-main text-secondary-500 border border-secondary-400/50 shadow-xs">
                    <Mic className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="max-w-[82%] space-y-1 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-secondary-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 animate-ping" />
                      <span>Speaking now...</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-secondary-600/90 text-white rounded-tr-sm shadow-xs border border-secondary-400/30">
                      <p className="italic">"{interimTranscript}"</p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Thinking Indicator */}
              {agentState === 'thinking' && (
                <div className="flex gap-3 text-xs items-center">
                  <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="text-[11px] text-navy-muted italic flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    <span>AI Assistant is analyzing request & checking schedule...</span>
                  </div>
                </div>
              )}

              <div ref={transcriptEndRef} />
            </div>
          </div>

          {/* Footer Security Notice */}
          <div className="pt-4 border-t border-border-subtle flex items-center gap-2 text-[11px] text-navy-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" />
            <span>
              All transactions strictly enforce database isolation, verbal phone verification, and double-booking locks.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

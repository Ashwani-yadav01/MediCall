import { useState, useEffect, useRef, useCallback } from 'react';
import { CallStatus, AgentState, TranscriptItem } from '../types';

interface UseVoiceCallOptions {
  onAppointmentBooked?: (data: any) => void;
  onAppointmentCancelled?: (data: any) => void;
  silenceDelayMs?: number; // Delay after caller stops talking before sending turn (default: 1500ms)
}

/**
 * Detects whether recognized user speech is just an echo of the assistant's previous utterance.
 */
function isLikelyEcho(userText: string, lastAssistantText: string): boolean {
  if (!userText || !lastAssistantText) return false;
  const cleanUser = userText.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const cleanAssistant = lastAssistantText.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

  if (!cleanUser || !cleanAssistant) return false;

  // If user text is a direct multi-word substring of the assistant's speech
  if (cleanAssistant.includes(cleanUser) && cleanUser.length > 8) {
    return true;
  }

  // Check word overlap ratio
  const userWords = cleanUser.split(/\s+/).filter(w => w.length > 2);
  if (userWords.length >= 4) {
    const matchingWords = userWords.filter(w => cleanAssistant.includes(w));
    if (matchingWords.length / userWords.length >= 0.8) {
      return true;
    }
  }

  return false;
}

export function useVoiceCall(options?: UseVoiceCallOptions) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [activeTool, setActiveTool] = useState<{ tool: string; status: string } | null>(null);
  const [confirmationCard, setConfirmationCard] = useState<{ type: 'booked' | 'cancelled'; data: any } | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const shouldListenRef = useRef<boolean>(false);
  const callStatusRef = useRef<CallStatus>('idle');
  const isMutedRef = useRef<boolean>(false);
  const autoEndOnSpeechEndRef = useRef<boolean>(false);
  const endCallRef = useRef<() => void>(() => {});
  const speechWatchdogRef = useRef<number | null>(null);
  const acousticDelayTimerRef = useRef<number | null>(null);
  const lastAssistantSpeechRef = useRef<string>('');

  // Buffer for accumulating speech before silence timer fires
  const speechBufferRef = useRef<string>('');
  const interimRef = useRef<string>('');
  const silenceTimerRef = useRef<number | null>(null);
  const silenceDelay = options?.silenceDelayMs ?? 1500; // 1.5 seconds breathing room

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Duration Timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Audio waveform animation simulation
  useEffect(() => {
    let interval: number;
    if (callStatus === 'connected') {
      interval = window.setInterval(() => {
        if (agentState === 'speaking') {
          setAudioLevel(0.4 + Math.random() * 0.6);
        } else if (interimTranscript) {
          setAudioLevel(0.3 + Math.random() * 0.5);
        } else if (agentState === 'listening') {
          setAudioLevel(0.08 + Math.random() * 0.15);
        } else {
          setAudioLevel(0.04);
        }
      }, 100);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [callStatus, agentState, interimTranscript]);

  // Completely abort and teardown the browser speech recognition instance
  const stopMicrophone = useCallback(() => {
    shouldListenRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    speechBufferRef.current = '';
    interimRef.current = '';
    setInterimTranscript('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort(); // Immediately cut off microphone audio track
      } catch (e) {
        // Recognition already stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  // Dispatch the accumulated spoken text to the server
  const flushSpeechBuffer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const completeText = (speechBufferRef.current + (interimRef.current ? ' ' + interimRef.current : '')).trim();
    speechBufferRef.current = '';
    interimRef.current = '';
    setInterimTranscript('');

    if (!completeText) return;

    // Check for acoustic echo feedback loop from assistant's previous speech
    if (isLikelyEcho(completeText, lastAssistantSpeechRef.current)) {
      console.warn('[Acoustic Echo Guard] Suppressed speaker feedback loop:', completeText);
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Immediately stop microphone while the server processes the message
      stopMicrophone();
      setAgentState('thinking');

      wsRef.current.send(JSON.stringify({
        event: 'user.message',
        text: completeText
      }));
    }
  }, [stopMicrophone]);

  // Start a fresh, clean Web Speech API recognition session
  const startMicrophone = useCallback(() => {
    // Safety check: Never start microphone if assistant is speaking, user is muted, or line is idle
    if (
      !shouldListenRef.current ||
      isSpeakingRef.current ||
      isMutedRef.current ||
      callStatusRef.current !== 'connected' ||
      (typeof window !== 'undefined' && (window.speechSynthesis?.speaking || window.speechSynthesis?.pending))
    ) {
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser.');
      return;
    }

    // Stop any existing instance first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        // Strict guard: if assistant is speaking or microphone is disabled, drop ALL audio packets immediately
        if (
          !shouldListenRef.current ||
          isSpeakingRef.current ||
          isMutedRef.current ||
          (typeof window !== 'undefined' && (window.speechSynthesis?.speaking || window.speechSynthesis?.pending))
        ) {
          speechBufferRef.current = '';
          interimRef.current = '';
          setInterimTranscript('');
          return;
        }

        let currentInterim = '';
        let newFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcriptPiece = res[0].transcript;
          if (res.isFinal) {
            newFinal += ' ' + transcriptPiece;
          } else {
            currentInterim += transcriptPiece;
          }
        }

        if (newFinal.trim()) {
          speechBufferRef.current = (speechBufferRef.current + ' ' + newFinal).trim();
        }
        interimRef.current = currentInterim;

        const displayPreview = (speechBufferRef.current + (currentInterim ? ' ' + currentInterim : '')).trim();

        // Check if the current preview is an echo of assistant's words
        if (isLikelyEcho(displayPreview, lastAssistantSpeechRef.current)) {
          console.warn('[Acoustic Echo Guard] Suppressed interim speaker echo:', displayPreview);
          speechBufferRef.current = '';
          interimRef.current = '';
          setInterimTranscript('');
          return;
        }

        setInterimTranscript(displayPreview);

        // Reset silence debounce timer: wait breathing room before dispatching turn
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = window.setTimeout(() => {
          flushSpeechBuffer();
        }, silenceDelay);
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('SpeechRecognition error:', e.error);
        }
      };

      recognition.onend = () => {
        // Only restart if call is connected, shouldListen is active, assistant is not speaking, and user is not muted
        if (
          callStatusRef.current === 'connected' &&
          shouldListenRef.current &&
          !isSpeakingRef.current &&
          !isMutedRef.current &&
          !(typeof window !== 'undefined' && window.speechSynthesis?.speaking)
        ) {
          try {
            recognition.start();
          } catch (err) {
            // Already started or busy
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Could not start browser speech recognition:', err);
    }
  }, [flushSpeechBuffer, silenceDelay]);

  // Browser Text-To-Speech (SpeechSynthesis) with Physical Mic Cutoff
  const speakAssistantText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // 1. Physically kill the microphone IMMEDIATELY before sound begins
      stopMicrophone();
      isSpeakingRef.current = true;
      shouldListenRef.current = false;
      lastAssistantSpeechRef.current = text;
      setAgentState('speaking');

      if (speechWatchdogRef.current) {
        clearTimeout(speechWatchdogRef.current);
        speechWatchdogRef.current = null;
      }
      if (acousticDelayTimerRef.current) {
        clearTimeout(acousticDelayTimerRef.current);
        acousticDelayTimerRef.current = null;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const handleSpeechComplete = () => {
        if (speechWatchdogRef.current) {
          clearTimeout(speechWatchdogRef.current);
          speechWatchdogRef.current = null;
        }

        // Acoustic settling delay: Keep mic OFF for 700ms after speech ends to allow room echo to decay
        acousticDelayTimerRef.current = window.setTimeout(() => {
          // Double-check speech synthesis has actually stopped
          if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
            acousticDelayTimerRef.current = window.setTimeout(handleSpeechComplete, 300);
            return;
          }

          speechBufferRef.current = '';
          interimRef.current = '';
          setInterimTranscript('');

          if (autoEndOnSpeechEndRef.current) {
            autoEndOnSpeechEndRef.current = false;
            setTimeout(() => {
              endCallRef.current();
            }, 600);
          } else if (callStatusRef.current === 'connected') {
            isSpeakingRef.current = false;
            shouldListenRef.current = true;
            setAgentState('listening');
            startMicrophone(); // Turn on microphone ONLY now
          }
        }, 700);
      };

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        shouldListenRef.current = false;
        setAgentState('speaking');
      };

      utterance.onend = handleSpeechComplete;
      utterance.onerror = handleSpeechComplete;

      // Watchdog timeout to prevent speech synthesis hang on long utterances
      const estimatedDurationMs = Math.max(5000, (text.split(' ').length / 2) * 1000 + 4000);
      speechWatchdogRef.current = window.setTimeout(() => {
        if (isSpeakingRef.current) {
          console.warn('[Speech Watchdog] Forcing speech completion handler after timeout');
          handleSpeechComplete();
        }
      }, estimatedDurationMs);

      window.speechSynthesis.speak(utterance);
    }
  }, [startMicrophone, stopMicrophone]);

  // Connect Call
  const startCall = useCallback(() => {
    setCallStatus('connecting');
    setAgentState('speaking'); // Start in speaking/connecting mode so mic is muted for greeting
    setTranscripts([]);
    setConfirmationCard(null);
    setActiveTool(null);
    setInterimTranscript('');
    speechBufferRef.current = '';
    interimRef.current = '';
    isSpeakingRef.current = true;
    shouldListenRef.current = false;

    // Ensure mic is fully off during connection
    stopMicrophone();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/call`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setCallStatus('connected');
      // Microphone remains OFF until assistant speaks the initial greeting
      ws.send(JSON.stringify({ event: 'call.start' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { event: evtType, data } = msg;

        if (evtType === 'transcript.assistant') {
          // Assistant spoke: immediately mute microphone and read out text
          stopMicrophone();
          isSpeakingRef.current = true;
          shouldListenRef.current = false;
          setAgentState('speaking');

          setTranscripts(prev => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              speaker: 'AI Assistant',
              text: data.text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }
          ]);
          speakAssistantText(data.text);
        } else if (evtType === 'transcript.user') {
          setTranscripts(prev => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              speaker: 'Caller',
              text: data.text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }
          ]);
        } else if (evtType === 'agent.thinking') {
          // Immediately silence microphone while agent is analyzing
          stopMicrophone();
          setAgentState('thinking');
        } else if (evtType === 'agent.speaking') {
          stopMicrophone();
          isSpeakingRef.current = true;
          shouldListenRef.current = false;
          setAgentState('speaking');
        } else if (evtType === 'agent.idle') {
          if (!isSpeakingRef.current && callStatusRef.current === 'connected') {
            shouldListenRef.current = true;
            setAgentState('listening');
            startMicrophone();
          }
        } else if (evtType === 'tool.started') {
          setActiveTool({ tool: data.tool, status: 'Executing' });
        } else if (evtType === 'tool.completed') {
          setActiveTool(null);
        } else if (evtType === 'appointment.booked') {
          setConfirmationCard({ type: 'booked', data });
          autoEndOnSpeechEndRef.current = true;
          if (options?.onAppointmentBooked) options.onAppointmentBooked(data);

          // Safety timeout in case speech synthesis is not active/supported
          setTimeout(() => {
            if (autoEndOnSpeechEndRef.current) {
              autoEndOnSpeechEndRef.current = false;
              endCallRef.current();
            }
          }, 8000);
        } else if (evtType === 'appointment.cancelled') {
          setConfirmationCard({ type: 'cancelled', data });
          if (options?.onAppointmentCancelled) options.onAppointmentCancelled(data);
        } else if (evtType === 'call.ended') {
          if (isSpeakingRef.current) {
            autoEndOnSpeechEndRef.current = true;
          } else {
            endCall();
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onerror = (e) => {
      console.error('Voice WebSocket error:', e);
      setCallStatus('error');
    };

    ws.onclose = () => {
      setCallStatus('ended');
      setAgentState('idle');
      stopMicrophone();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [options, speakAssistantText, startMicrophone, stopMicrophone]);

  // End Call
  const endCall = useCallback(() => {
    autoEndOnSpeechEndRef.current = false;
    isSpeakingRef.current = false;
    shouldListenRef.current = false;

    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
    if (acousticDelayTimerRef.current) {
      clearTimeout(acousticDelayTimerRef.current);
      acousticDelayTimerRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'call.end' }));
      wsRef.current.close();
    }

    stopMicrophone();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCallStatus('ended');
    setAgentState('idle');
  }, [stopMicrophone]);

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  // Send message immediately
  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    stopMicrophone();
    setAgentState('thinking');

    wsRef.current.send(JSON.stringify({
      event: 'user.message',
      text: text.trim()
    }));
  }, [stopMicrophone]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const nextMute = !prev;
      if (nextMute) {
        stopMicrophone();
      } else if (!isSpeakingRef.current && callStatusRef.current === 'connected') {
        shouldListenRef.current = true;
        setAgentState('listening');
        startMicrophone();
      }
      return nextMute;
    });
  }, [startMicrophone, stopMicrophone]);

  return {
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
  };
}

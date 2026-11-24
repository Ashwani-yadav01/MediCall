import React from 'react';
import { AgentState } from '../../types';

interface WaveformVisualizerProps {
  agentState: AgentState;
  audioLevel: number;
  className?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  agentState,
  audioLevel,
  className = '',
}) => {
  const bars = 24;

  return (
    <div className={`flex items-center justify-center gap-1.5 h-16 px-4 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => {
        // Compute pseudo wave heights based on sine pattern and audioLevel
        const offset = Math.sin((i / bars) * Math.PI) * 0.8 + 0.2;
        const dynamicMultiplier = agentState === 'speaking' || agentState === 'listening'
          ? Math.max(0.15, audioLevel * offset * (0.8 + Math.sin(Date.now() / 150 + i) * 0.4))
          : 0.12;
        const heightPct = Math.min(100, Math.max(12, dynamicMultiplier * 100));

        // Color based on agent state
        let barColor = 'bg-slate-200';
        if (agentState === 'speaking') {
          barColor = 'bg-primary-600';
        } else if (agentState === 'listening') {
          barColor = 'bg-secondary-600';
        } else if (agentState === 'thinking') {
          barColor = 'bg-amber-500 animate-pulse';
        }

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-100 ease-out ${barColor}`}
            style={{
              height: `${heightPct}%`,
            }}
          />
        );
      })}
    </div>
  );
};

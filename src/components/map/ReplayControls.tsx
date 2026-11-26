'use client';
import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const SPEEDS = [1, 4, 10];

export default function ReplayControls({
  currentTime,
  minTime,
  maxTime,
  playing,
  speed,
  onToggle,
  onSeek,
  onReset,
  onSpeedChange,
  trackCount,
}: {
  currentTime: number;
  minTime: number;
  maxTime: number;
  playing: boolean;
  speed: number;
  onToggle: () => void;
  onSeek: (t: number) => void;
  onReset: () => void;
  onSpeedChange: (s: number) => void;
  trackCount: number;
}) {
  const range = Math.max(1, maxTime - minTime);
  const progress = ((currentTime - minTime) / range) * 100;

  return (
    <div className="px-4 sm:px-6 py-3 border-t border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] bg-[color-mix(in_srgb,var(--bg-card)_80%,transparent)] flex items-center gap-3 sm:gap-4 flex-wrap z-[500]">
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggle}
          data-testid="replay-play-btn"
          className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-[var(--accent-cyan-soft)] flex items-center justify-center hover:bg-cyan-600/30 transition-all"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={onReset}
          className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--bg-elevated)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] text-[var(--chrome-text-400)] flex items-center justify-center hover:text-[var(--chrome-text-200)] transition-all"
          title="Reset"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={progress}
        onChange={(e) => onSeek(minTime + (Number(e.target.value) / 100) * range)}
        data-testid="replay-scrubber"
        className="flex-1 min-w-[120px] accent-cyan-500 h-1.5"
      />

      <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--chrome-text-500)] shrink-0">
        <span className="text-[var(--chrome-text-300)]">{new Date(currentTime).toLocaleString()}</span>
        <span>{trackCount} active</span>
        <div className="flex items-center gap-1 bg-[color-mix(in_srgb,var(--bg-main)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-lg p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                speed === s ? 'bg-cyan-600/20 text-[var(--accent-cyan-soft)]' : 'text-[var(--chrome-text-600)] hover:text-[var(--chrome-text-300)]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

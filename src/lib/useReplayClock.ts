import { useEffect, useRef, useState } from 'react';

// Drives a playhead timestamp across [minTime, maxTime] over `durationMs` of
// wall-clock time (at speed=1x), via requestAnimationFrame so it stays smooth
// regardless of how far apart the real event timestamps are (hours or days).
export function useReplayClock(minTime: number, maxTime: number, durationMs = 40_000) {
  const [currentTime, setCurrentTime] = useState(minTime);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number>();
  const lastFrameRef = useRef<number | undefined>(undefined);

  // Reset the playhead whenever the underlying data range changes (e.g. a
  // refetch shifts min/max), so it doesn't get stuck outside the new bounds.
  useEffect(() => {
    setCurrentTime(minTime);
    setPlaying(false);
  }, [minTime, maxTime]);

  useEffect(() => {
    if (!playing) {
      lastFrameRef.current = undefined;
      return;
    }
    const range = Math.max(1, maxTime - minTime);

    const step = (ts: number) => {
      if (lastFrameRef.current == null) lastFrameRef.current = ts;
      const dt = ts - lastFrameRef.current;
      lastFrameRef.current = ts;
      setCurrentTime((t) => {
        const next = t + (dt / durationMs) * range * speed;
        if (next >= maxTime) {
          setPlaying(false);
          return maxTime;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, minTime, maxTime, speed, durationMs]);

  const toggle = () => {
    setPlaying((p) => {
      if (!p && currentTime >= maxTime) setCurrentTime(minTime);
      return !p;
    });
  };

  const seek = (t: number) => {
    setPlaying(false);
    setCurrentTime(Math.min(maxTime, Math.max(minTime, t)));
  };

  const reset = () => {
    setPlaying(false);
    setCurrentTime(minTime);
  };

  return { currentTime, playing, speed, setSpeed, toggle, seek, reset };
}

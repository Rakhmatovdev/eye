'use client';
import { useEffect, useRef, useState } from 'react';
import type { Detection } from './api';

export type LiveConnStatus = 'connecting' | 'live' | 'offline';

const SEVERITY_CONFIDENCE: Record<string, number> = {
  critical: 0.97,
  high: 0.85,
  medium: 0.65,
  low: 0.4,
};

let liveCounter = 0;

function resolveWsUrl(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `ws://${host}:8080/ws`;
}

function toDetection(frame: { type: string; data: any }): Detection | null {
  const now = new Date().toISOString();
  liveCounter += 1;

  if (frame.type === 'detection' && frame.data) {
    const d = frame.data;
    return {
      id: d.id ?? `live-det-${Date.now()}-${liveCounter}`,
      sensor_id: d.sensor_id ?? '',
      sensor_name: d.sensor_name ?? 'Unknown sensor',
      entity_id: d.entity_id ?? '',
      entity_name: d.entity_name ?? 'Unidentified',
      kind: d.kind ?? 'motion',
      confidence: typeof d.confidence === 'number' ? d.confidence : 0.5,
      lat: typeof d.lat === 'number' ? d.lat : 0,
      lng: typeof d.lng === 'number' ? d.lng : 0,
      area: d.area ?? '',
      timestamp: d.timestamp ?? now,
    };
  }

  if (frame.type === 'threat' && frame.data) {
    const t = frame.data;
    return {
      id: `live-threat-${Date.now()}-${liveCounter}`,
      sensor_id: '',
      sensor_name: t.source ?? 'Threat intel feed',
      entity_id: '',
      entity_name: t.indicator ?? 'Unknown indicator',
      kind: 'threat',
      confidence: SEVERITY_CONFIDENCE[t.severity as string] ?? 0.5,
      lat: 0,
      lng: 0,
      area: t.description ?? '',
      timestamp: now,
    };
  }

  return null;
}

/**
 * Connects to the backend's unauthenticated live WebSocket (`/ws`) and
 * exposes a rolling list of `detection`/`threat` frames plus the connection
 * status, so pages can prepend real-time items onto their seeded demo data.
 * Guarded for React 18 StrictMode double-invoke: the socket is opened and
 * torn down inside the effect's cleanup.
 */
export function useLiveFeed(maxItems = 20) {
  const [items, setItems] = useState<Detection[]>([]);
  const [status, setStatus] = useState<LiveConnStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(resolveWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) setStatus('live');
      };

      ws.onmessage = (ev) => {
        if (cancelled) return;
        try {
          const frame = JSON.parse(ev.data);
          const detection = toDetection(frame);
          if (detection) {
            setItems((prev) => [detection, ...prev].slice(0, maxItems));
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => {
        if (!cancelled) setStatus('offline');
      };

      ws.onclose = () => {
        if (!cancelled) setStatus((prev) => (prev === 'live' ? 'offline' : prev));
      };
    } catch {
      setStatus('offline');
    }

    return () => {
      cancelled = true;
      wsRef.current = null;
      ws?.close();
    };
  }, [maxItems]);

  return { items, status };
}

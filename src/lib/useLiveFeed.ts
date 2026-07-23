'use client';
import { useEffect, useRef, useState } from 'react';
import type { Detection, Alert, AlertSeverity } from './api';
import { useAuthStore } from '../store/authStore';

export type LiveConnStatus = 'connecting' | 'live' | 'offline';

const SEVERITY_CONFIDENCE: Record<string, number> = {
  critical: 0.97,
  high: 0.85,
  medium: 0.65,
  low: 0.4,
};

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

let liveCounter = 0;

// `/ws` requires a JWT — pass the current access token as a query param so
// the backend can authenticate the upgrade request (tokenless connections
// are rejected). Reconnects always read the *latest* token from the store.
function resolveWsUrl(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const base = `ws://${host}:8080/ws`;
  const token = useAuthStore.getState().token;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
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

// New backend frame kind: `{type: "alert", data: <Alert>}`. Field names
// already match the FE `Alert` shape 1:1 (see lib/api.ts), so this just
// tolerates missing fields rather than remapping anything.
function toAlert(frame: { type: string; data: any }): Alert | null {
  if (frame.type !== 'alert' || !frame.data) return null;
  const a = frame.data;
  liveCounter += 1;
  return {
    id: a.id ?? `live-alert-${Date.now()}-${liveCounter}`,
    rule_id: a.rule_id ?? '',
    rule_name: a.rule_name ?? '',
    severity: (a.severity as AlertSeverity) ?? 'low',
    title: a.title ?? 'Alert',
    message: a.message ?? '',
    entity_id: a.entity_id || undefined,
    threat_id: a.threat_id || undefined,
    detection_id: a.detection_id || undefined,
    acknowledged: !!a.acknowledged,
    ack_by: a.ack_by || undefined,
    ack_at: a.ack_at || undefined,
    created_at: a.created_at ?? new Date().toISOString(),
  };
}

/**
 * Connects to the backend's authenticated live WebSocket (`/ws?token=...`)
 * and exposes a rolling list of `detection`/`threat` frames plus the
 * connection status, so pages can prepend real-time items onto their seeded
 * demo data. Reconnects automatically on close/error with exponential
 * backoff (1s → 2s → 4s → ... capped at 30s), resetting the backoff after
 * every successful open. Guarded for React 18 StrictMode double-invoke and
 * SSR: the socket (and any pending reconnect timer) is opened/cleared inside
 * the effect's cleanup, and the connect path only runs client-side.
 *
 * Also exposes a rolling list of `alert` frames (new backend addition) as
 * `alerts`, independent of `items` — existing detection/threat consumers
 * that only destructure `{ items, status }` are unaffected.
 */
export function useLiveFeed(maxItems = 20) {
  const [items, setItems] = useState<Detection[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [status, setStatus] = useState<LiveConnStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = INITIAL_BACKOFF_MS;

    const scheduleReconnect = () => {
      if (cancelled) return;
      reconnectTimer = setTimeout(() => {
        if (cancelled) return;
        connect();
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      }, backoff);
    };

    const connect = () => {
      if (cancelled) return;
      setStatus('connecting');

      try {
        ws = new WebSocket(resolveWsUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          backoff = INITIAL_BACKOFF_MS; // reset after a successful open
          setStatus('live');
        };

        ws.onmessage = (ev) => {
          if (cancelled) return;
          try {
            const frame = JSON.parse(ev.data);
            const detection = toDetection(frame);
            if (detection) {
              setItems((prev) => [detection, ...prev].slice(0, maxItems));
            }
            const alert = toAlert(frame);
            if (alert) {
              setAlerts((prev) => [alert, ...prev].slice(0, maxItems));
            }
          } catch {
            // ignore malformed frames
          }
        };

        ws.onerror = () => {
          if (!cancelled) setStatus('offline');
          // `onclose` always follows `onerror` for a failed connection, so
          // the reconnect is scheduled there (once) rather than here too.
        };

        ws.onclose = () => {
          if (cancelled) return;
          setStatus('offline');
          scheduleReconnect();
        };
      } catch {
        if (!cancelled) {
          setStatus('offline');
          scheduleReconnect();
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current = null;
      ws?.close();
    };
  }, [maxItems]);

  return { items, status, alerts };
}

'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { MapCanvasProps } from './types';

declare global {
  interface Window {
    ymaps?: any;
  }
}

let loader: Promise<any> | null = null;

function loadYandexMaps(apiKey: string, language: 'ru_RU' | 'en_US'): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Yandex Maps requires a browser'));
  if (window.ymaps) {
    return new Promise((resolve, reject) => window.ymaps!.ready(() => resolve(window.ymaps), reject));
  }
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'yandex-maps-api';
    script.async = true;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=${language}`;
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error('Yandex Maps API did not initialize'));
        return;
      }
      window.ymaps.ready(() => resolve(window.ymaps), reject);
    };
    script.onerror = () => reject(new Error('Yandex Maps API could not be loaded'));
    document.head.appendChild(script);
  }).catch((error) => {
    loader = null;
    throw error;
  });
  return loader;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const ENTITY_PRESET: Record<string, string> = {
  person: 'islands#blueCircleDotIcon',
  organization: 'islands#violetCircleDotIcon',
  location: 'islands#darkGreenCircleDotIcon',
  vehicle: 'islands#orangeCircleDotIcon',
  phone: 'islands#lightBlueCircleDotIcon',
  transaction: 'islands#redCircleDotIcon',
};

interface YandexGeoMapProps extends MapCanvasProps {
  apiKey: string;
  language?: 'ru_RU' | 'en_US';
  onError?: (message: string) => void;
}

export default function YandexGeoMap({
  apiKey,
  language = 'ru_RU',
  points,
  sensors = [],
  livePoints = [],
  focus,
  userLocation,
  measurePoints = [],
  geofencePoints = [],
  radiusAnalysis,
  onMapClick,
  onError,
}: YandexGeoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mapsRef = useRef<any>(null);
  const clickRef = useRef(onMapClick);
  const fittedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    clickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    let cancelled = false;
    let map: any = null;
    setReady(false);

    loadYandexMaps(apiKey, language)
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return;
        mapsRef.current = ymaps;
        const center = points.length
          ? [
              points.reduce((sum, point) => sum + point.lat, 0) / points.length,
              points.reduce((sum, point) => sum + point.lng, 0) / points.length,
            ]
          : [41.3, 69.24];
        map = new ymaps.Map(
          containerRef.current,
          {
            center,
            zoom: points.length === 1 ? 13 : 6,
            controls: [
              'zoomControl',
              'searchControl',
              'geolocationControl',
              'typeSelector',
              'trafficControl',
              'fullscreenControl',
              'rulerControl',
            ],
          },
          { suppressMapOpenBlock: true }
        );
        map.events.add('click', (event: any) => {
          const coordinates = event.get('coords');
          clickRef.current?.({ lat: coordinates[0], lng: coordinates[1] });
        });
        mapRef.current = map;
        setReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) onError?.(error instanceof Error ? error.message : 'Yandex Maps error');
      });

    return () => {
      cancelled = true;
      fittedRef.current = false;
      mapRef.current = null;
      mapsRef.current = null;
      if (map) map.destroy();
    };
  // The map must not be recreated whenever points change; objects are synced below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, language, onError]);

  useEffect(() => {
    const map = mapRef.current;
    const ymaps = mapsRef.current;
    if (!ready || !map || !ymaps) return;

    const clusterer = new ymaps.Clusterer({
      preset: 'islands#invertedVioletClusterIcons',
      groupByCoordinates: false,
      clusterDisableClickZoom: false,
      clusterOpenBalloonOnClick: true,
    });
    const entityMarkers = points.map((point) => new ymaps.Placemark(
      [point.lat, point.lng],
      {
        hintContent: escapeHtml(point.name),
        balloonContentHeader: escapeHtml(point.name),
        balloonContentBody: [
          `<b>${escapeHtml(point.type)} · ${escapeHtml(point.classification)}</b>`,
          point.address ? `<div>${escapeHtml(point.address)}</div>` : '',
          point.risk_score != null ? `<div>risk: ${escapeHtml(point.risk_score)}</div>` : '',
          `<small>${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}</small>`,
        ].join(''),
      },
      { preset: ENTITY_PRESET[point.type] || 'islands#blueCircleDotIcon' }
    ));
    clusterer.add(entityMarkers);
    map.geoObjects.add(clusterer);

    const overlays = new ymaps.GeoObjectCollection();
    sensors.forEach((sensor) => {
      const color = sensor.status === 'online' ? '#10b981' : sensor.status === 'degraded' ? '#f59e0b' : '#ef4444';
      overlays.add(new ymaps.Circle(
        [[sensor.lat, sensor.lng], sensor.coverage_radius],
        { hintContent: `${escapeHtml(sensor.name)} · ${escapeHtml(sensor.status)}` },
        { strokeColor: color, strokeOpacity: 0.8, strokeWidth: 2, fillColor: `${color}18` }
      ));
      overlays.add(new ymaps.Placemark(
        [sensor.lat, sensor.lng],
        {
          hintContent: escapeHtml(sensor.name),
          balloonContentHeader: escapeHtml(sensor.name),
          balloonContentBody: `<b>${escapeHtml(sensor.type)} · ${escapeHtml(sensor.status)}</b><div>${escapeHtml(sensor.area)}</div><small>coverage ${(sensor.coverage_radius / 1000).toFixed(1)} km</small>`,
        },
        { preset: sensor.status === 'offline' ? 'islands#redDotIcon' : 'islands#greenDotIcon' }
      ));
    });

    livePoints.forEach((point) => {
      overlays.add(new ymaps.Placemark(
        [point.lat, point.lng],
        {
          hintContent: `LIVE · ${escapeHtml(point.name)}`,
          balloonContentHeader: escapeHtml(point.name),
          balloonContentBody: `<b>LIVE · ${escapeHtml(point.kind)}</b><div>${Math.round(point.confidence * 100)}% confidence</div><div>${escapeHtml(point.area)}</div><small>${escapeHtml(new Date(point.timestamp).toLocaleString())}</small>`,
        },
        { preset: 'islands#redCircleDotIconWithCaption', iconCaptionMaxWidth: '120' }
      ));
    });

    if (userLocation) {
      overlays.add(new ymaps.Circle(
        [[userLocation.lat, userLocation.lng], 35],
        { hintContent: 'GPS' },
        { strokeColor: '#0ea5e9', fillColor: '#38bdf833', strokeWidth: 2 }
      ));
      overlays.add(new ymaps.Placemark(
        [userLocation.lat, userLocation.lng],
        { hintContent: 'GPS' },
        { preset: 'islands#lightBlueCircleDotIcon' }
      ));
    }

    measurePoints.forEach((point, index) => {
      overlays.add(new ymaps.Placemark(
        [point.lat, point.lng],
        { iconContent: String(index + 1) },
        { preset: 'islands#yellowStretchyIcon' }
      ));
    });
    if (measurePoints.length === 2) {
      overlays.add(new ymaps.Polyline(
        measurePoints.map((point) => [point.lat, point.lng]),
        {},
        { strokeColor: '#facc15', strokeWidth: 4, strokeStyle: 'dash' }
      ));
    }

    geofencePoints.forEach((point, index) => {
      overlays.add(new ymaps.Placemark(
        [point.lat, point.lng],
        { iconContent: String(index + 1) },
        { preset: 'islands#violetStretchyIcon' }
      ));
    });
    if (geofencePoints.length >= 3) {
      overlays.add(new ymaps.Polygon(
        [geofencePoints.map((point) => [point.lat, point.lng])],
        { hintContent: 'Geofence' },
        { strokeColor: '#a855f7', strokeWidth: 3, strokeStyle: 'dash', fillColor: '#9333ea2a' }
      ));
    } else if (geofencePoints.length === 2) {
      overlays.add(new ymaps.Polyline(
        geofencePoints.map((point) => [point.lat, point.lng]),
        {},
        { strokeColor: '#a855f7', strokeWidth: 3, strokeStyle: 'dash' }
      ));
    }
    if (radiusAnalysis) {
      overlays.add(new ymaps.Circle(
        [[radiusAnalysis.center.lat, radiusAnalysis.center.lng], radiusAnalysis.radiusMeters],
        { hintContent: `${radiusAnalysis.radiusMeters} m` },
        { strokeColor: '#0ea5e9', strokeWidth: 3, strokeStyle: 'dash', fillColor: '#0ea5e922' }
      ));
    }
    map.geoObjects.add(overlays);

    if (!fittedRef.current && points.length > 1) {
      const bounds = clusterer.getBounds();
      if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 60 });
      fittedRef.current = true;
    }

    return () => {
      map.geoObjects.remove(clusterer);
      map.geoObjects.remove(overlays);
    };
  }, [geofencePoints, livePoints, measurePoints, points, radiusAnalysis, ready, sensors, userLocation]);

  useEffect(() => {
    if (ready && focus && mapRef.current) {
      mapRef.current.setCenter([focus.lat, focus.lng], focus.zoom ?? 15, { duration: 350 });
    }
  }, [focus, ready]);

  return (
    <div className="h-full w-full relative bg-[#07090f]">
      <div ref={containerRef} className="h-full w-full" aria-label="Yandex geographic map" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-main)] text-xs font-mono text-[var(--chrome-text-500)]">
          Yandex Maps…
        </div>
      )}
    </div>
  );
}

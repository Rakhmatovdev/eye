'use client';
import React, { FormEvent, useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  Cctv,
  Copy,
  Crosshair,
  Download,
  Filter,
  Hexagon,
  History,
  Layers3,
  Map as MapIcon,
  MapPin,
  Radio,
  Ruler,
  ScanSearch,
  Search,
  Trash2,
  X as CloseIcon,
} from 'lucide-react';
import DataBoundary from '../../components/common/DataBoundary';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import ReplayControls from '../../components/map/ReplayControls';
import { type Entity } from '../../data/mockEntities';
import { entitiesApi, sensorsApi } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { useLiveFeed } from '../../lib/useLiveFeed';
import { useReplayClock } from '../../lib/useReplayClock';
import { useLocaleStore } from '../../store/localeStore';
import {
  buildMapGeoJSON,
  findLocalMapFeature,
  formatMapArea,
  formatMapDistance,
  haversineDistanceMeters,
  pointInPolygon,
  polygonAreaSquareMeters,
} from '../../components/map/mapUtils';
import type {
  Basemap,
  GeoPoint,
  LiveMapPoint,
  MapCoordinate,
  MapFocus,
  RadiusAnalysis,
  SensorPoint,
} from '../../components/map/types';
import type { ReplayTrack } from '../../components/map/ReplayMap';

type MapProvider = 'yandex' | 'osm';
type AnalysisTool = 'none' | 'measure' | 'geofence' | 'radius';

function MapLoading() {
  const t = useT();
  return (
    <div className="h-full w-full flex items-center justify-center text-[var(--chrome-text-500)] font-mono text-xs bg-[var(--bg-main)]">
      {t('map_loading')}
    </div>
  );
}

const GeoMap = dynamic(() => import('../../components/map/GeoMap'), {
  ssr: false,
  loading: () => <MapLoading />,
});

const YandexGeoMap = dynamic(() => import('../../components/map/YandexGeoMap'), {
  ssr: false,
  loading: () => <MapLoading />,
});

const ReplayMap = dynamic(() => import('../../components/map/ReplayMap'), {
  ssr: false,
  loading: () => <MapLoading />,
});

function toPoints(entities: Entity[]): GeoPoint[] {
  return entities
    .filter((entity) => entity.geo && Number.isFinite(entity.geo.lat) && Number.isFinite(entity.geo.lng))
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      classification: entity.classification,
      lat: entity.geo!.lat,
      lng: entity.geo!.lng,
      address: entity.geo!.address,
      risk_score: entity.risk_score,
    }));
}

export default function MapPage() {
  const t = useT();
  const locale = useLocaleStore((state) => state.locale);
  const yandexApiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ?? '';
  const hasYandex = yandexApiKey.length > 0;
  const [provider, setProvider] = useState<MapProvider>(hasYandex ? 'yandex' : 'osm');
  const [basemap, setBasemap] = useState<Basemap>('dark');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showSensors, setShowSensors] = useState(true);
  const [showLive, setShowLive] = useState(true);
  const [replayMode, setReplayMode] = useState(false);
  const [activeTool, setActiveTool] = useState<AnalysisTool>('none');
  const [measurePoints, setMeasurePoints] = useState<MapCoordinate[]>([]);
  const [geofencePoints, setGeofencePoints] = useState<MapCoordinate[]>([]);
  const [radiusCenter, setRadiusCenter] = useState<MapCoordinate | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(1_000);
  const [clickedCoordinate, setClickedCoordinate] = useState<MapCoordinate | null>(null);
  const [userLocation, setUserLocation] = useState<MapCoordinate | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);
  const [mapError, setMapError] = useState('');
  const [copied, setCopied] = useState(false);

  const sourceQ = useQuery({
    queryKey: ['entities', 'map'],
    queryFn: () => entitiesApi.list(),
  });
  const sensorsQ = useQuery({ queryKey: ['sensors', 'map'], queryFn: () => sensorsApi.list() });
  const detectionsQ = useQuery({
    queryKey: ['sensors', 'detections', 'replay'],
    queryFn: () => sensorsApi.detections({ limit: 200 }),
    enabled: replayMode,
  });
  const { items: liveItems, status: liveStatus } = useLiveFeed(100);

  const source: Entity[] = sourceQ.data ?? [];
  const sensorSrc = sensorsQ.data ?? [];
  const detectionSrc = detectionsQ.data ?? [];
  const allPoints = useMemo(() => toPoints(source), [source]);

  const tracks: ReplayTrack[] = useMemo(() => {
    const byEntity = new Map<string, ReplayTrack>();
    for (const detection of detectionSrc) {
      if (!detection.entity_id || !Number.isFinite(detection.lat) || !Number.isFinite(detection.lng)) continue;
      const timestamp = new Date(detection.timestamp).getTime();
      if (!Number.isFinite(timestamp)) continue;
      if (!byEntity.has(detection.entity_id)) {
        byEntity.set(detection.entity_id, {
          id: detection.entity_id,
          name: detection.entity_name || detection.entity_id,
          positions: [],
        });
      }
      byEntity.get(detection.entity_id)!.positions.push({
        lat: detection.lat,
        lng: detection.lng,
        timestamp,
        sensorName: detection.sensor_name,
      });
    }
    const result = Array.from(byEntity.values());
    result.forEach((track) => track.positions.sort((a, b) => a.timestamp - b.timestamp));
    return result;
  }, [detectionSrc]);

  const allTimestamps = tracks.flatMap((track) => track.positions.map((position) => position.timestamp));
  const minTime = allTimestamps.length ? Math.min(...allTimestamps) : Date.now() - 3_600_000;
  const maxTime = allTimestamps.length ? Math.max(...allTimestamps) : Date.now();
  const replayClock = useReplayClock(minTime, maxTime);
  const activeTrackCount = tracks.filter((track) =>
    track.positions.some((position) => position.timestamp <= replayClock.currentTime)
  ).length;

  const points = useMemo(
    () => typeFilter === 'all' ? allPoints : allPoints.filter((point) => point.type === typeFilter),
    [allPoints, typeFilter]
  );

  const allSensors: SensorPoint[] = useMemo(
    () => sensorSrc.map((sensor) => ({
      id: sensor.id,
      name: sensor.name,
      type: sensor.type,
      status: sensor.status,
      lat: sensor.lat,
      lng: sensor.lng,
      area: sensor.area,
      coverage_radius: sensor.coverage_radius,
    })),
    [sensorSrc]
  );
  const sensors = showSensors ? allSensors : [];

  const livePoints: LiveMapPoint[] = useMemo(() => showLive
    ? liveItems
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng) && (item.lat !== 0 || item.lng !== 0))
        .map((item) => ({
          id: item.id,
          name: item.entity_name || item.sensor_name,
          kind: item.kind,
          confidence: item.confidence,
          lat: item.lat,
          lng: item.lng,
          area: item.area,
          timestamp: item.timestamp,
        }))
    : [], [liveItems, showLive]);

  const types = useMemo(() => Array.from(new Set(allPoints.map((point) => point.type))).sort(), [allPoints]);
  const measuredDistance = measurePoints.length === 2
    ? formatMapDistance(haversineDistanceMeters(measurePoints[0], measurePoints[1]))
    : null;
  const geofenceArea = geofencePoints.length >= 3
    ? formatMapArea(polygonAreaSquareMeters(geofencePoints))
    : null;
  const radiusAnalysis: RadiusAnalysis | null = useMemo(
    () => radiusCenter ? { center: radiusCenter, radiusMeters } : null,
    [radiusCenter, radiusMeters]
  );
  const analysisCoordinates = useMemo(() => [
    ...points.map((point) => ({ lat: point.lat, lng: point.lng })),
    ...sensors.map((sensor) => ({ lat: sensor.lat, lng: sensor.lng })),
    ...livePoints.map((point) => ({ lat: point.lat, lng: point.lng })),
  ], [livePoints, points, sensors]);
  const geofenceHits = geofencePoints.length >= 3
    ? analysisCoordinates.filter((point) => pointInPolygon(point, geofencePoints)).length
    : 0;
  const radiusHits = radiusAnalysis
    ? analysisCoordinates.filter((point) =>
        haversineDistanceMeters(point, radiusAnalysis.center) <= radiusAnalysis.radiusMeters
      ).length
    : 0;

  const handleMapClick = useCallback((coordinate: MapCoordinate) => {
    setClickedCoordinate(coordinate);
    setCopied(false);
    if (activeTool === 'measure') {
      setMeasurePoints((current) => current.length >= 2 ? [coordinate] : [...current, coordinate]);
    } else if (activeTool === 'geofence') {
      setGeofencePoints((current) => [...current, coordinate]);
    } else if (activeTool === 'radius') {
      setRadiusCenter(coordinate);
    }
  }, [activeTool]);

  const toggleAnalysisTool = (tool: Exclude<AnalysisTool, 'none'>) => {
    setActiveTool((current) => current === tool ? 'none' : tool);
    if (tool === 'measure') setMeasurePoints([]);
    if (tool === 'geofence') setGeofencePoints([]);
    if (tool === 'radius') setRadiusCenter(null);
  };

  const clearAnalysis = () => {
    setActiveTool('none');
    setMeasurePoints([]);
    setGeofencePoints([]);
    setRadiusCenter(null);
  };

  const exportGeoJSON = () => {
    const geojson = buildMapGeoJSON({ points, sensors, livePoints, geofencePoints, radiusAnalysis });
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `koz-map-${new Date().toISOString().slice(0, 10)}.geojson`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSearchStatus(t('map_exported'));
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const result = findLocalMapFeature(searchQuery, allPoints, allSensors);
    if (!result) {
      setSearchStatus(t('map_search_no_result'));
      return;
    }
    if (result.kind === 'sensor') setShowSensors(true);
    else setTypeFilter('all');
    setFocus({ lat: result.lat, lng: result.lng, zoom: 16 });
    setSearchStatus(result.label);
  };

  const locateUser = () => {
    if (!navigator.geolocation) {
      setSearchStatus(t('map_location_unavailable'));
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinate = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(coordinate);
        setFocus({ ...coordinate, zoom: 16 });
        setSearchStatus(t('map_location_found'));
        setLocationBusy(false);
      },
      () => {
        setSearchStatus(t('map_location_denied'));
        setLocationBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  };

  const copyCoordinate = async () => {
    if (!clickedCoordinate) return;
    await navigator.clipboard.writeText(`${clickedCoordinate.lat.toFixed(6)}, ${clickedCoordinate.lng.toFixed(6)}`);
    setCopied(true);
  };

  const handleYandexError = useCallback((message: string) => {
    setMapError(message);
    setProvider('osm');
  }, []);

  const actionClass = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono border transition-all';

  return (
    <WorkspaceLayout>
      <DataBoundary queries={[sourceQ, ...(showSensors ? [sensorsQ] : []), ...(replayMode ? [detectionsQ] : [])]}>
        <div className="h-full flex flex-col">
          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] z-[500]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-lg font-bold font-mono tracking-wide text-[var(--chrome-text-white)] uppercase flex items-center gap-2">
                  <MapIcon size={17} className="text-[var(--accent-cyan-soft)]" /> {t('nav_map')}
                </h1>
                <p className="text-[var(--chrome-text-500)] text-xs font-mono mt-0.5">{t('map_subtitle')}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[var(--chrome-text-600)] flex items-center gap-1">
                  <MapPin size={11} /> {points.length} {t('map_pins_label')} · {sensors.length} {t('map_sensors_label')}
                </span>
                <button
                  onClick={() => setReplayMode((value) => !value)}
                  data-testid="replay-toggle-btn"
                  className={`${actionClass} ${replayMode
                    ? 'text-[var(--accent-cyan-soft)] border-cyan-500/40 bg-cyan-500/10'
                    : 'text-[var(--chrome-text-500)] border-[var(--chrome-border-800)] bg-[var(--bg-main)]'}`}
                >
                  {replayMode ? <CloseIcon size={13} /> : <History size={13} />} {t('map_replay_btn')}
                </button>
              </div>
            </div>

            {!replayMode && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <form onSubmit={handleSearch} className="flex min-w-[240px] flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--chrome-text-600)]" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={t('map_search_placeholder')}
                      className="w-full bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-l-xl pl-9 pr-3 py-2 text-xs text-[var(--chrome-text-300)] focus:outline-none focus:border-cyan-500/50 font-mono"
                    />
                  </div>
                  <button className="px-3 rounded-r-xl border border-l-0 border-[var(--chrome-border-800)] bg-cyan-500/10 text-[var(--accent-cyan-soft)] text-xs font-mono">
                    {t('map_search')}
                  </button>
                </form>

                <div className="flex items-center gap-1.5 text-[var(--chrome-text-600)]"><Filter size={13} /></div>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl px-3 py-2 text-xs text-[var(--chrome-text-300)] focus:outline-none font-mono capitalize"
                  aria-label={t('common_all_types')}
                >
                  <option value="all">{t('common_all_types')}</option>
                  {types.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>

                <select
                  value={provider}
                  onChange={(event) => {
                    setProvider(event.target.value as MapProvider);
                    setMapError('');
                  }}
                  className="bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl px-3 py-2 text-xs text-[var(--chrome-text-300)] focus:outline-none font-mono"
                  aria-label={t('map_provider')}
                >
                  <option value="yandex" disabled={!hasYandex}>Yandex Maps</option>
                  <option value="osm">OpenStreetMap</option>
                </select>

                {provider === 'osm' && (
                  <label className="relative">
                    <Layers3 size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--chrome-text-600)] pointer-events-none" />
                    <select
                      value={basemap}
                      onChange={(event) => setBasemap(event.target.value as Basemap)}
                      className="bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl pl-8 pr-3 py-2 text-xs text-[var(--chrome-text-300)] focus:outline-none font-mono"
                      aria-label={t('map_basemap')}
                    >
                      <option value="street">{t('map_basemap_street')}</option>
                      <option value="dark">{t('map_basemap_dark')}</option>
                      <option value="topographic">{t('map_basemap_topographic')}</option>
                    </select>
                  </label>
                )}

                <button
                  onClick={() => setShowSensors((value) => !value)}
                  className={`${actionClass} ${showSensors
                    ? 'text-[var(--accent-emerald-soft)] border-emerald-500/40 bg-emerald-500/10'
                    : 'text-[var(--chrome-text-500)] border-[var(--chrome-border-800)] bg-[var(--bg-main)]'}`}
                >
                  <Cctv size={13} /> {t('map_sensors_btn')}
                </button>
                <button
                  onClick={() => setShowLive((value) => !value)}
                  className={`${actionClass} ${showLive
                    ? 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                    : 'text-[var(--chrome-text-500)] border-[var(--chrome-border-800)] bg-[var(--bg-main)]'}`}
                >
                  <Radio size={13} /> {t('map_live')}
                </button>
                <button
                  onClick={() => toggleAnalysisTool('measure')}
                  className={`${actionClass} ${activeTool === 'measure'
                    ? 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10'
                    : 'text-[var(--chrome-text-500)] border-[var(--chrome-border-800)] bg-[var(--bg-main)]'}`}
                >
                  <Ruler size={13} /> {t('map_measure')}
                </button>
                <button
                  onClick={() => toggleAnalysisTool('geofence')}
                  className={`${actionClass} ${activeTool === 'geofence'
                    ? 'text-purple-300 border-purple-500/40 bg-purple-500/10'
                    : 'text-[var(--chrome-text-500)] border-[var(--chrome-border-800)] bg-[var(--bg-main)]'}`}
                >
                  <Hexagon size={13} /> {t('map_geofence')}
                </button>
                <button
                  onClick={() => toggleAnalysisTool('radius')}
                  className={`${actionClass} ${activeTool === 'radius'
                    ? 'text-sky-300 border-sky-500/40 bg-sky-500/10'
                    : 'text-[var(--chrome-text-500)] border-[var(--chrome-border-800)] bg-[var(--bg-main)]'}`}
                >
                  <ScanSearch size={13} /> {t('map_radius')}
                </button>
                {activeTool === 'radius' && (
                  <select
                    value={radiusMeters}
                    onChange={(event) => setRadiusMeters(Number(event.target.value))}
                    className="bg-[var(--bg-main)] border border-sky-500/40 rounded-xl px-2 py-2 text-xs text-sky-300 focus:outline-none font-mono"
                    aria-label={t('map_radius')}
                  >
                    <option value={500}>500 m</option>
                    <option value={1000}>1 km</option>
                    <option value={5000}>5 km</option>
                    <option value={10000}>10 km</option>
                    <option value={25000}>25 km</option>
                  </select>
                )}
                {(measurePoints.length > 0 || geofencePoints.length > 0 || radiusCenter) && (
                  <button
                    onClick={clearAnalysis}
                    className={`${actionClass} text-[var(--chrome-text-500)] border-[var(--chrome-border-800)] bg-[var(--bg-main)]`}
                    title={t('map_clear_analysis')}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <button
                  onClick={locateUser}
                  disabled={locationBusy}
                  className={`${actionClass} text-[var(--chrome-text-300)] border-[var(--chrome-border-800)] bg-[var(--bg-main)] disabled:opacity-50`}
                >
                  <Crosshair size={13} /> {locationBusy ? t('map_locating') : t('map_locate')}
                </button>
                <button
                  onClick={exportGeoJSON}
                  className={`${actionClass} text-[var(--chrome-text-300)] border-[var(--chrome-border-800)] bg-[var(--bg-main)]`}
                >
                  <Download size={13} /> GeoJSON
                </button>
              </div>
            )}
            {(searchStatus || mapError || (!hasYandex && !replayMode)) && (
              <div className="mt-2 text-[10px] font-mono text-[var(--chrome-text-500)] flex gap-3 flex-wrap">
                {searchStatus && <span>{searchStatus}</span>}
                {mapError && <span className="text-amber-400">{t('map_yandex_error')}: {mapError}</span>}
                {!hasYandex && !replayMode && <span>{t('map_yandex_key_missing')}</span>}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 relative">
            {replayMode ? (
              tracks.length > 0 ? (
                <ReplayMap tracks={tracks} currentTime={replayClock.currentTime} />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[var(--chrome-text-500)] font-mono text-xs">
                  {t('map_replay_no_data')}
                </div>
              )
            ) : provider === 'yandex' && hasYandex ? (
              <YandexGeoMap
                apiKey={yandexApiKey}
                language={locale === 'en' ? 'en_US' : 'ru_RU'}
                points={points}
                sensors={sensors}
                livePoints={livePoints}
                focus={focus}
                userLocation={userLocation}
                measureMode={activeTool === 'measure'}
                measurePoints={measurePoints}
                geofencePoints={geofencePoints}
                radiusAnalysis={radiusAnalysis}
                onMapClick={handleMapClick}
                onError={handleYandexError}
              />
            ) : (
              <GeoMap
                points={points}
                sensors={sensors}
                livePoints={livePoints}
                basemap={basemap}
                focus={focus}
                userLocation={userLocation}
                measureMode={activeTool === 'measure'}
                measurePoints={measurePoints}
                geofencePoints={geofencePoints}
                radiusAnalysis={radiusAnalysis}
                onMapClick={handleMapClick}
              />
            )}

            {!replayMode && (
              <div className="map-status-panel">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-[var(--chrome-text-300)]">{provider === 'yandex' ? 'Yandex Maps' : 'OpenStreetMap'}</span>
                  <span className={`flex items-center gap-1 ${liveStatus === 'live' ? 'text-emerald-400' : liveStatus === 'connecting' ? 'text-amber-400' : 'text-rose-400'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${liveStatus === 'live' ? 'bg-emerald-400 map-live-dot' : liveStatus === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                    {t(`map_live_${liveStatus}` as 'map_live_live' | 'map_live_connecting' | 'map_live_offline')}
                  </span>
                </div>
                <div className="mt-1 text-[var(--chrome-text-500)]">
                  {livePoints.length} {t('map_live_points')}
                </div>
                {activeTool === 'measure' && (
                  <div className="mt-2 text-yellow-300">
                    {measuredDistance ? `${t('map_distance')}: ${measuredDistance}` : t('map_measure_hint')}
                  </div>
                )}
                {activeTool === 'geofence' && (
                  <div className="mt-2 text-purple-300">
                    {geofenceArea
                      ? `${t('map_area')}: ${geofenceArea} · ${t('map_objects_in_zone')}: ${geofenceHits}`
                      : t('map_geofence_hint')}
                  </div>
                )}
                {activeTool === 'radius' && (
                  <div className="mt-2 text-sky-300">
                    {radiusCenter
                      ? `${formatMapDistance(radiusMeters)} · ${t('map_nearby_objects')}: ${radiusHits}`
                      : t('map_radius_hint')}
                  </div>
                )}
                {clickedCoordinate && (
                  <button onClick={copyCoordinate} className="mt-2 flex items-center gap-1.5 text-[var(--accent-cyan-soft)] hover:text-cyan-300">
                    <Copy size={11} />
                    {clickedCoordinate.lat.toFixed(6)}, {clickedCoordinate.lng.toFixed(6)}
                    <span className="text-[var(--chrome-text-600)]">· {copied ? t('map_copied') : t('map_copy')}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {replayMode && tracks.length > 0 && (
            <ReplayControls
              currentTime={replayClock.currentTime}
              minTime={minTime}
              maxTime={maxTime}
              playing={replayClock.playing}
              speed={replayClock.speed}
              onToggle={replayClock.toggle}
              onSeek={replayClock.seek}
              onReset={replayClock.reset}
              onSpeedChange={replayClock.setSpeed}
              trackCount={activeTrackCount}
            />
          )}
        </div>
      </DataBoundary>
    </WorkspaceLayout>
  );
}

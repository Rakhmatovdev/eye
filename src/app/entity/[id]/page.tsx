'use client';
import React, { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DataBoundary from '../../../components/common/DataBoundary';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import ReportModal from '../../../components/common/ReportModal';
import AttachmentsPanel from '../../../components/common/AttachmentsPanel';
import { entitiesApi, sensorsApi, timelineApi, watchlistApi, reportsApi, attachmentsApi } from '../../../lib/api';
import { apiErrorMessage } from '../../../lib/apiClient';
import { useT, type TKey } from '../../../lib/i18n';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { type Entity, type EntityType, type ClassificationLevel } from '../../../data/mockEntities';
import {
  ArrowLeft, ShieldAlert, MapPin, ScanFace, Clock, Share2, Cctv, AlertCircle, Gauge,
  Pencil, Trash2, Plus, X, Bookmark, BookmarkCheck, FileText, Paperclip, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ENTITY_TYPES: EntityType[] = ['person', 'organization', 'vehicle', 'location', 'phone', 'document', 'transaction'];
const CLASSIFICATIONS: ClassificationLevel[] = ['public', 'internal', 'confidential', 'secret'];
const ENTITY_TYPE_KEY: Record<EntityType, TKey> = {
  person: 'entity_type_person',
  organization: 'entity_type_organization',
  vehicle: 'entity_type_vehicle',
  location: 'entity_type_location',
  phone: 'entity_type_phone',
  document: 'entity_type_document',
  transaction: 'entity_type_transaction',
};
const CLASSIFICATION_KEY: Record<ClassificationLevel, TKey> = {
  public: 'entity_class_public',
  internal: 'entity_class_internal',
  confidential: 'entity_class_confidential',
  secret: 'entity_class_secret',
};

export default function EntityDossierPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useT();
  const id = String(params.id);

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [actionError, setActionError] = useState('');

  const entityQ = useQuery({ queryKey: ['entity', id], queryFn: () => entitiesApi.get(id) });
  const sightQ = useQuery({ queryKey: ['sightings', id], queryFn: () => sensorsApi.detections({ entityId: id }) });
  const evQ = useQuery({ queryKey: ['entity-events', id], queryFn: () => timelineApi.list({ entityId: id }) });
  const connQ = useQuery({ queryKey: ['entity-conn', id], queryFn: () => entitiesApi.expand(id) });
  // Same queryKey AttachmentsPanel below uses — react-query dedupes this to
  // one shared cache entry/request, so this is just reading the count for
  // the section header, not a second network call.
  const attachQ = useQuery({ queryKey: ['attachments', 'entities', id], queryFn: () => attachmentsApi.list('entities', id) });
  const resolutionQ = useQuery({ queryKey: ['resolution-candidates', id], queryFn: () => entitiesApi.resolutionCandidates(id), retry: false });
  const watchlistQ = useQuery({ queryKey: ['watchlist'], queryFn: () => watchlistApi.list(), retry: false });
  const isWatchlisted = !!watchlistQ.data?.some((w) => w.entity_id === id);

  const addWatchlistM = useMutation({
    mutationFn: () => watchlistApi.add(id),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
    onError: (err) => {
      // A 409 just means it's already watchlisted — refresh so the button
      // flips to the "on watchlist" state instead of surfacing an error.
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      if (axios.isAxiosError(err) && err.response?.status === 409) return;
      setActionError(apiErrorMessage(err, t('watchlist_add_error')));
    },
  });

  const reportM = useMutation({ mutationFn: () => reportsApi.entity(id) });
  const handleOpenReport = () => {
    setShowReport(true);
    reportM.mutate();
  };

  // Dossier content comes only from authenticated API results.
  const entity = entityQ.data;
  const sightings = sightQ.data ?? [];
  const events = evQ.data ?? [];
  const connections = connQ.data;
  const attachments = attachQ.data ?? [];
  const candidates = resolutionQ.data ?? [];

  const updateM = useMutation({
    mutationFn: (input: { type: string; classification: string; properties: Record<string, unknown> }) =>
      entitiesApi.update(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['entity', id], updated);
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      setShowEdit(false);
      setActionError('');
    },
    onError: (err) => setActionError(apiErrorMessage(err, t('entity_update_error'))),
  });

  const deleteM = useMutation({
    mutationFn: () => entitiesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      router.push('/search');
    },
    onError: (err) => {
      setActionError(apiErrorMessage(err, t('entity_delete_error')));
      setShowDeleteConfirm(false);
    },
  });

  if (entityQ.isPending || entityQ.isError) {
    return <WorkspaceLayout><DataBoundary queries={[entityQ]} /></WorkspaceLayout>;
  }
  if (!entity) {
    return (
      <WorkspaceLayout>
        <div className="h-full flex flex-col items-center justify-center text-[var(--chrome-text-500)] gap-3 font-mono">
          <AlertCircle size={30} />
          <p className="text-sm">{t('entity_not_found_prefix')} <span className="text-[var(--chrome-text-300)]">{id}</span> {t('entity_not_found_suffix')}</p>
          <Link href="/search" className="text-[var(--accent-cyan-soft)] text-xs hover:underline flex items-center gap-1">
            <ArrowLeft size={12} /> {t('entity_back_to_search')}
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  const neighbors =
    connections?.edges.map((e) => {
      const otherId = e.source === id ? e.target : e.source;
      const node = connections.nodes.find((n) => n.id === otherId);
      return { id: otherId, name: node?.name ?? otherId, type: node?.type ?? 'entity', rel: e.type };
    }) ?? [];

  return (
    <WorkspaceLayout>
      <DataBoundary queries={[sightQ, evQ, connQ, attachQ]}>
      <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto max-w-5xl mx-auto">
        <Link href="/search" className="text-[var(--chrome-text-500)] text-xs hover:text-[var(--accent-cyan-soft)] flex items-center gap-1 font-mono w-fit">
          <ArrowLeft size={12} /> {t('entity_back')}
        </Link>

        {/* Identity header */}
        <div className="header-gradient-card border border-[color-mix(in_srgb,var(--chrome-border-800)_80%,transparent)] rounded-2xl p-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-600/15 border border-cyan-500/30 flex items-center justify-center text-[var(--accent-cyan-soft)]">
              <ScanFace size={26} />
            </div>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-[var(--accent-cyan-soft)]">{entity.type}</div>
              <h1 className="text-2xl font-bold text-[var(--chrome-text-white)] font-mono">{entity.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-xxs font-mono text-[var(--chrome-text-500)]">
                <span className="flex items-center gap-1"><ShieldAlert size={11} /> {entity.classification}</span>
                <span>{t('entity_id_prefix')} {entity.id}</span>
                {entity.source && <span>{t('entity_src_prefix')} {entity.source}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <button
                data-testid="entity-watchlist-btn"
                data-watchlisted={isWatchlisted}
                onClick={() => !isWatchlisted && addWatchlistM.mutate()}
                disabled={isWatchlisted || addWatchlistM.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xxs font-bold font-mono transition-all border ${
                  isWatchlisted
                    ? 'bg-amber-500/10 border-amber-500/30 text-[var(--accent-amber-soft)] cursor-default'
                    : 'bg-[color-mix(in_srgb,var(--chrome-bg-800)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--chrome-bg-700)_60%,transparent)] border-[color-mix(in_srgb,var(--chrome-border-700)_60%,transparent)] text-[var(--chrome-text-300)] disabled:opacity-40'
                }`}
              >
                {isWatchlisted ? <BookmarkCheck size={11} /> : <Bookmark size={11} />}
                {isWatchlisted ? t('watchlist_on_watchlist') : t('watchlist_add_btn')}
              </button>
              <button
                data-testid="entity-report-btn"
                onClick={handleOpenReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[color-mix(in_srgb,var(--chrome-bg-800)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--chrome-bg-700)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-700)_60%,transparent)] text-[var(--chrome-text-300)] rounded-xl text-xxs font-bold font-mono transition-all"
              >
                <FileText size={11} /> {t('report_btn')}
              </button>
              <button
                onClick={() => { setActionError(''); setShowEdit(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[color-mix(in_srgb,var(--chrome-bg-800)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--chrome-bg-700)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-700)_60%,transparent)] text-[var(--chrome-text-300)] rounded-xl text-xxs font-bold font-mono transition-all"
              >
                <Pencil size={11} /> {t('common_edit')}
              </button>
              <button
                onClick={() => { setActionError(''); setShowDeleteConfirm(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-[var(--accent-red-soft)] rounded-xl text-xxs font-bold font-mono transition-all"
              >
                <Trash2 size={11} /> {t('common_delete')}
              </button>
            </div>
            {entity.risk_score != null && (
              <div className="text-right">
                <div className="text-[9px] font-mono uppercase tracking-widest text-[var(--chrome-text-500)] flex items-center gap-1 justify-end"><Gauge size={11} /> {t('entity_risk_label')}</div>
                <div className={`text-3xl font-bold font-mono ${
                  entity.risk_score >= 80 ? 'text-[var(--accent-red-soft)]' : entity.risk_score >= 50 ? 'text-[var(--accent-amber-soft)]' : 'text-[var(--accent-emerald-soft)]'
                }`}>{entity.risk_score}</div>
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <div className="bg-red-500/10 border border-red-500/20 text-[var(--accent-red-soft)] px-4 py-2.5 rounded-xl text-xs font-semibold font-mono">
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attributes */}
          <Section title={t('entity_section_attributes')} icon={AlertCircle}>
            <div className="grid grid-cols-1 gap-1.5">
              {Object.entries(entity.properties).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs font-mono border-b border-[color-mix(in_srgb,var(--chrome-border-800)_40%,transparent)] py-1.5">
                  <span className="text-[var(--chrome-text-500)] capitalize">{k.split('_').join(' ')}</span>
                  <span data-testid="entity-attr-value" className="text-[var(--chrome-text-300)] text-right max-w-[60%] truncate">{String(v)}</span>
                </div>
              ))}
              {entity.geo && (
                <div className="flex justify-between text-xs font-mono py-1.5">
                  <span className="text-[var(--chrome-text-500)] flex items-center gap-1"><MapPin size={11} /> {t('entity_location_label')}</span>
                  <span className="text-[var(--chrome-text-300)]">{entity.geo.lat.toFixed(4)}, {entity.geo.lng.toFixed(4)}</span>
                </div>
              )}
            </div>
          </Section>

          {/* Sightings — the "find person" trace */}
          <Section title={`${t('entity_section_sightings')} (${sightings.length})`} icon={Cctv}>
            {sightings.length === 0 ? (
              <Empty text={t('entity_empty_sightings')} />
            ) : (
              <div className="space-y-2">
                {sightings.map((d) => (
                  <div key={d.id} className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_50%,transparent)] rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-[var(--chrome-text-300)] truncate flex items-center gap-1">
                        <Cctv size={11} className="text-[var(--accent-cyan-soft)]" /> {d.sensor_name}
                      </div>
                      <div className="text-xxs font-mono text-[var(--chrome-text-500)] mt-0.5 flex items-center gap-1">
                        <MapPin size={10} /> {d.area} · {d.kind.replace('_', ' ')}
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                      d.confidence >= 0.85 ? 'text-[var(--accent-emerald-soft)] border-emerald-500/30 bg-emerald-500/10' :
                      d.confidence >= 0.7 ? 'text-[var(--accent-amber-soft)] border-amber-500/30 bg-amber-500/10' :
                      'text-[var(--chrome-text-400)] border-[color-mix(in_srgb,var(--chrome-border-600)_30%,transparent)] bg-[color-mix(in_srgb,var(--chrome-bg-500)_10%,transparent)]'
                    }`}>{(d.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Connections */}
          <Section title={`${t('entity_section_connections')} (${neighbors.length})`} icon={Share2}>
            {neighbors.length === 0 ? (
              <Empty text={t('entity_empty_connections')} />
            ) : (
              <div className="flex flex-wrap gap-2">
                {neighbors.map((n) => (
                  <Link key={n.id + n.rel} href={`/entity/${n.id}`}
                    className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_50%,transparent)] hover:border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-mono transition-all">
                    <span className="text-[var(--chrome-text-200)]">{n.name}</span>
                    <span className="text-[var(--chrome-text-600)] ml-2">{n.rel.replace('_', ' ')}</span>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          {/* Timeline */}
          <Section title={`${t('entity_section_timeline')} (${events.length})`} icon={Clock}>
            {events.length === 0 ? (
              <Empty text={t('entity_empty_timeline')} />
            ) : (
              <div className="space-y-2">
                {[...events].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).map((ev) => (
                  <div key={ev.id} className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_50%,transparent)] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--accent-cyan-soft)]">{ev.type}</span>
                      <span className="text-xxs font-mono text-[var(--chrome-text-600)]">{new Date(ev.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs font-mono text-[var(--chrome-text-200)] mt-1">{ev.title}</div>
                    {ev.location && <div className="text-xxs font-mono text-[var(--chrome-text-500)] mt-0.5 flex items-center gap-1"><MapPin size={10} /> {ev.location}</div>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Attachments */}
          <Section title={`${t('entity_section_attachments')} (${attachments.length})`} icon={Paperclip}>
            <AttachmentsPanel subjectType="entities" subjectId={id} />
          </Section>

          {/* Entity Resolution / Duplicate Candidates */}
          <Section title={`${t('entity_section_resolution')} (${candidates.length})`} icon={Sparkles}>
            {candidates.length === 0 ? (
              <Empty text={t('entity_empty_resolution')} />
            ) : (
              <div className="space-y-3">
                {candidates.map((cand) => (
                  <div key={cand.candidate_id} className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_50%,transparent)] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <Link href={`/entity/${cand.candidate_id}`} className="text-xs font-bold font-mono text-[var(--accent-cyan-soft)] hover:underline">
                          {cand.candidate_label}
                        </Link>
                        <span className="text-[10px] font-mono text-[var(--chrome-text-500)] ml-2 uppercase">({cand.candidate_type})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                          cand.confidence >= 0.85 ? 'text-[var(--accent-emerald-soft)] border-emerald-500/40 bg-emerald-500/10' :
                          'text-[var(--accent-amber-soft)] border-amber-500/40 bg-amber-500/10'
                        }`}>
                          {(cand.confidence * 100).toFixed(0)}% {t('entity_match_confidence')}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--chrome-text-400)] px-1.5 py-0.5 rounded bg-[var(--bg-main)] border border-[var(--chrome-border-800)]">
                          {cand.recommendation === 'auto_merge' ? t('entity_resolution_auto_merge') : t('entity_resolution_manual')}
                        </span>
                      </div>
                    </div>
                    {cand.factors && cand.factors.length > 0 && (
                      <div className="text-xxs font-mono space-y-1 bg-[var(--bg-main)] p-2 rounded-lg border border-[var(--chrome-border-800)]">
                        {cand.factors.map((f, idx) => (
                          <div key={idx} className="flex justify-between text-[var(--chrome-text-400)]">
                            <span className="capitalize">{f.feature.replace('_', ' ')}:</span>
                            <span className="text-[var(--chrome-text-200)] font-semibold">{f.matched_value || f.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {showEdit && (
        <EditEntityModal
          entity={entity}
          isPending={updateM.isPending}
          onCancel={() => setShowEdit(false)}
          onSave={(input) => updateM.mutate(input)}
          t={t}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title={t('entity_delete_title')}
          message={`${t('entity_delete_message_prefix')}${entity.name}${t('entity_delete_message_suffix')}`}
          isPending={deleteM.isPending}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => deleteM.mutate()}
        />
      )}

      {showReport && (
        <ReportModal
          title={`${t('report_title')} — ${entity.name}`}
          filename={`${entity.id}-report.md`}
          markdown={reportM.data?.markdown ?? null}
          generatedAt={reportM.data?.generated_at}
          isLoading={reportM.isPending}
          isError={reportM.isError}
          onClose={() => setShowReport(false)}
          onDownloadPdf={() => reportsApi.entityPdf(entity.id)}
          onDownloadCsv={() => reportsApi.entityCsv(entity.id)}
        />
      )}
    </DataBoundary>
    </WorkspaceLayout>
  );
}

/* -------------------------------- Edit modal ------------------------------ */

type TFn = (key: TKey) => string;

interface EditEntityInput {
  type: string;
  classification: string;
  properties: Record<string, unknown>;
}

function EditEntityModal({
  entity,
  isPending,
  onCancel,
  onSave,
  t,
}: {
  entity: Entity;
  isPending: boolean;
  onCancel: () => void;
  onSave: (input: EditEntityInput) => void;
  t: TFn;
}) {
  const [label, setLabel] = useState(entity.name);
  const [type, setType] = useState<string>(entity.type);
  const [classification, setClassification] = useState<string>(entity.classification);
  const [rows, setRows] = useState<Array<{ key: string; value: string }>>(
    Object.entries(entity.properties).map(([key, value]) => ({ key, value: String(value) }))
  );

  const updateRow = (i: number, patch: Partial<{ key: string; value: string }>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const addRow = () => setRows((prev) => [...prev, { key: '', value: '' }]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reconstruct the raw `properties` payload: start from anything the UI
    // doesn't expose for editing (geo/tags/risk_score) so those survive the
    // round-trip, then layer in the edited name + key/value rows.
    const properties: Record<string, unknown> = {};
    if (entity.geo) {
      properties.lat = entity.geo.lat;
      properties.lng = entity.geo.lng;
      if (entity.geo.address) properties.address = entity.geo.address;
    }
    if (entity.tags.length > 0) properties.tags = entity.tags;
    if (entity.risk_score != null) properties.risk_score = entity.risk_score;
    properties.name = label;
    for (const row of rows) {
      const key = row.key.trim();
      if (!key) continue;
      properties[key] = row.value;
    }
    onSave({ type, classification, properties });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--chrome-border-800)] rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-[var(--chrome-text-white)]">{t('common_edit')} {t('entity_edit_modal_suffix')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xxs font-semibold text-[var(--chrome-text-500)] uppercase tracking-wider mb-1.5">{t('entity_field_label')}</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl text-xs text-[var(--chrome-text-200)] focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xxs font-semibold text-[var(--chrome-text-500)] uppercase tracking-wider mb-1.5">{t('entity_field_type')}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl text-xs text-[var(--chrome-text-200)] focus:outline-none"
              >
                {ENTITY_TYPES.map((tp) => (
                  <option key={tp} value={tp}>{t(ENTITY_TYPE_KEY[tp])}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xxs font-semibold text-[var(--chrome-text-500)] uppercase tracking-wider mb-1.5">{t('entity_field_classification')}</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl text-xs text-[var(--chrome-text-200)] focus:outline-none"
              >
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>{t(CLASSIFICATION_KEY[c])}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xxs font-semibold text-[var(--chrome-text-500)] uppercase tracking-wider">{t('entity_field_properties')}</label>
              <button type="button" onClick={addRow} className="flex items-center gap-1 text-[10px] text-[var(--accent-cyan-soft)] hover:underline">
                <Plus size={11} /> {t('entity_add_btn')}
              </button>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={row.key}
                    onChange={(e) => updateRow(i, { key: e.target.value })}
                    placeholder={t('entity_key_placeholder')}
                    className="w-1/3 px-2 py-1.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-lg text-xxs text-[var(--chrome-text-300)] focus:outline-none"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => updateRow(i, { value: e.target.value })}
                    placeholder={t('entity_value_placeholder')}
                    className="flex-1 px-2 py-1.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-lg text-xxs text-[var(--chrome-text-300)] focus:outline-none"
                  />
                  <button type="button" onClick={() => removeRow(i)} className="p-1.5 text-[var(--chrome-text-600)] hover:text-[var(--accent-red-soft)]">
                    <X size={13} />
                  </button>
                </div>
              ))}
              {rows.length === 0 && <p className="text-xxs text-[var(--chrome-text-600)] font-mono">{t('entity_no_properties')}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono disabled:opacity-40 transition-all"
            >
              {t('common_save')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-[var(--chrome-text-500)] hover:text-[var(--chrome-text-300)] rounded-xl text-xs font-semibold font-mono transition-all"
            >
              {t('common_cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="bg-[color-mix(in_srgb,var(--bg-card)_50%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl p-5">
      <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--chrome-text-300)] flex items-center gap-2 mb-3">
        <Icon size={14} className="text-[var(--accent-cyan-soft)]" /> {title}
      </h2>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-[var(--chrome-text-600)] font-mono py-4 text-center">{text}</p>;
}

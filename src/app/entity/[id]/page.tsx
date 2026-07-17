'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import { entitiesApi, sensorsApi, timelineApi } from '../../../lib/api';
import { apiErrorMessage } from '../../../lib/apiClient';
import { useT, type TKey } from '../../../lib/i18n';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { mockEntities, type Entity, type EntityType, type ClassificationLevel } from '../../../data/mockEntities';
import { mockEvents } from '../../../data/mockEvents';
import { mockDetections } from '../../../data/mockSensors';
import {
  ArrowLeft, ShieldAlert, MapPin, ScanFace, Clock, Share2, Cctv, AlertCircle, Gauge,
  Pencil, Trash2, Plus, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ENTITY_TYPES: EntityType[] = ['person', 'organization', 'vehicle', 'location', 'phone', 'document', 'transaction'];
const CLASSIFICATIONS: ClassificationLevel[] = ['public', 'internal', 'confidential', 'secret'];

export default function EntityDossierPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useT();
  const id = String(params.id);

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState('');

  const entityQ = useQuery({ queryKey: ['entity', id], queryFn: () => entitiesApi.get(id) });
  const sightQ = useQuery({ queryKey: ['sightings', id], queryFn: () => sensorsApi.detections({ entityId: id }) });
  const evQ = useQuery({ queryKey: ['entity-events', id], queryFn: () => timelineApi.list({ entityId: id }) });
  const connQ = useQuery({ queryKey: ['entity-conn', id], queryFn: () => entitiesApi.expand(id) });

  // Fallbacks so the dossier still renders if the API is unreachable.
  const entity = entityQ.data ?? mockEntities.find((e) => e.id === id);
  const sightings = sightQ.isError ? mockDetections.filter((d) => d.entity_id === id) : sightQ.data ?? [];
  const events = evQ.isError ? mockEvents.filter((e) => e.entity_id === id) : evQ.data ?? [];
  const connections = connQ.data;

  const updateM = useMutation({
    mutationFn: (input: { type: string; classification: string; properties: Record<string, unknown> }) =>
      entitiesApi.update(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['entity', id], updated);
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      setShowEdit(false);
      setActionError('');
    },
    onError: (err) => setActionError(apiErrorMessage(err, 'Failed to update entity.')),
  });

  const deleteM = useMutation({
    mutationFn: () => entitiesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      router.push('/search');
    },
    onError: (err) => {
      setActionError(apiErrorMessage(err, 'Failed to delete entity.'));
      setShowDeleteConfirm(false);
    },
  });

  if (!entity) {
    return (
      <WorkspaceLayout>
        <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3 font-mono">
          <AlertCircle size={30} />
          <p className="text-sm">Entity <span className="text-gray-300">{id}</span> not found.</p>
          <Link href="/search" className="text-cyan-400 text-xs hover:underline flex items-center gap-1">
            <ArrowLeft size={12} /> Back to search
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
      <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto max-w-5xl mx-auto">
        <Link href="/search" className="text-gray-500 text-xs hover:text-cyan-400 flex items-center gap-1 font-mono w-fit">
          <ArrowLeft size={12} /> back
        </Link>

        {/* Identity header */}
        <div className="bg-gradient-to-br from-[#0e1220] to-[#0c0e18] border border-gray-800/80 rounded-2xl p-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-600/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ScanFace size={26} />
            </div>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-cyan-400">{entity.type}</div>
              <h1 className="text-2xl font-bold text-white font-mono">{entity.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-xxs font-mono text-gray-500">
                <span className="flex items-center gap-1"><ShieldAlert size={11} /> {entity.classification}</span>
                <span>id: {entity.id}</span>
                {entity.source && <span>src: {entity.source}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setActionError(''); setShowEdit(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/60 text-gray-300 rounded-xl text-xxs font-bold font-mono transition-all"
              >
                <Pencil size={11} /> {t('common_edit')}
              </button>
              <button
                onClick={() => { setActionError(''); setShowDeleteConfirm(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-xxs font-bold font-mono transition-all"
              >
                <Trash2 size={11} /> {t('common_delete')}
              </button>
            </div>
            {entity.risk_score != null && (
              <div className="text-right">
                <div className="text-[9px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-1 justify-end"><Gauge size={11} /> risk</div>
                <div className={`text-3xl font-bold font-mono ${
                  entity.risk_score >= 80 ? 'text-red-400' : entity.risk_score >= 50 ? 'text-amber-400' : 'text-emerald-400'
                }`}>{entity.risk_score}</div>
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono">
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attributes */}
          <Section title="Attributes" icon={AlertCircle}>
            <div className="grid grid-cols-1 gap-1.5">
              {Object.entries(entity.properties).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs font-mono border-b border-gray-800/40 py-1.5">
                  <span className="text-gray-500 capitalize">{k.split('_').join(' ')}</span>
                  <span className="text-gray-300 text-right max-w-[60%] truncate">{String(v)}</span>
                </div>
              ))}
              {entity.geo && (
                <div className="flex justify-between text-xs font-mono py-1.5">
                  <span className="text-gray-500 flex items-center gap-1"><MapPin size={11} /> location</span>
                  <span className="text-gray-300">{entity.geo.lat.toFixed(4)}, {entity.geo.lng.toFixed(4)}</span>
                </div>
              )}
            </div>
          </Section>

          {/* Sightings — the "find person" trace */}
          <Section title={`Sightings (${sightings.length})`} icon={Cctv}>
            {sightings.length === 0 ? (
              <Empty text="No sensor detections for this entity." />
            ) : (
              <div className="space-y-2">
                {sightings.map((d) => (
                  <div key={d.id} className="bg-[#0e1220]/60 border border-gray-800/50 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-gray-300 truncate flex items-center gap-1">
                        <Cctv size={11} className="text-cyan-400" /> {d.sensor_name}
                      </div>
                      <div className="text-xxs font-mono text-gray-500 mt-0.5 flex items-center gap-1">
                        <MapPin size={10} /> {d.area} · {d.kind.replace('_', ' ')}
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                      d.confidence >= 0.85 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                      d.confidence >= 0.7 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                      'text-gray-400 border-gray-600/30 bg-gray-500/10'
                    }`}>{(d.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Connections */}
          <Section title={`Connections (${neighbors.length})`} icon={Share2}>
            {neighbors.length === 0 ? (
              <Empty text="No linked entities." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {neighbors.map((n) => (
                  <Link key={n.id + n.rel} href={`/entity/${n.id}`}
                    className="bg-[#0e1220]/60 border border-gray-800/50 hover:border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-mono transition-all">
                    <span className="text-gray-200">{n.name}</span>
                    <span className="text-gray-600 ml-2">{n.rel.replace('_', ' ')}</span>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          {/* Timeline */}
          <Section title={`Timeline (${events.length})`} icon={Clock}>
            {events.length === 0 ? (
              <Empty text="No recorded events." />
            ) : (
              <div className="space-y-2">
                {[...events].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).map((ev) => (
                  <div key={ev.id} className="bg-[#0e1220]/60 border border-gray-800/50 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-400">{ev.type}</span>
                      <span className="text-xxs font-mono text-gray-600">{new Date(ev.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-200 mt-1">{ev.title}</div>
                    {ev.location && <div className="text-xxs font-mono text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={10} /> {ev.location}</div>}
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
          title="Delete entity?"
          message={`This permanently deletes "${entity.name}" and its relationships. This cannot be undone.`}
          isPending={deleteM.isPending}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => deleteM.mutate()}
        />
      )}
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
      <div className="w-full max-w-lg bg-[#0c0e17] border border-gray-800 rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-white">{t('common_edit')} entity</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none"
              >
                {ENTITY_TYPES.map((tp) => (
                  <option key={tp} value={tp}>{tp}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Classification</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none"
              >
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xxs font-semibold text-gray-500 uppercase tracking-wider">Properties</label>
              <button type="button" onClick={addRow} className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline">
                <Plus size={11} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={row.key}
                    onChange={(e) => updateRow(i, { key: e.target.value })}
                    placeholder="key"
                    className="w-1/3 px-2 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xxs text-gray-300 focus:outline-none"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => updateRow(i, { value: e.target.value })}
                    placeholder="value"
                    className="flex-1 px-2 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xxs text-gray-300 focus:outline-none"
                  />
                  <button type="button" onClick={() => removeRow(i)} className="p-1.5 text-gray-600 hover:text-red-400">
                    <X size={13} />
                  </button>
                </div>
              ))}
              {rows.length === 0 && <p className="text-xxs text-gray-600 font-mono">No properties.</p>}
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
              className="px-4 py-2 text-gray-500 hover:text-gray-300 rounded-xl text-xs font-semibold font-mono transition-all"
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
    <div className="bg-[#0c0e17]/50 border border-gray-800/60 rounded-2xl p-5">
      <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-300 flex items-center gap-2 mb-3">
        <Icon size={14} className="text-cyan-400" /> {title}
      </h2>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-gray-600 font-mono py-4 text-center">{text}</p>;
}

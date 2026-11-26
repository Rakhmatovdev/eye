'use client';
import { useQuery } from '@tanstack/react-query';
import { casesApi } from '../../lib/api';
import type { EvidenceClaim } from '../../lib/workspaceApi';
import { useAuthStore } from '../../store/authStore';
import { QueryState } from './Shared';
import { useDiagnosticCopy } from './DiagnosticCopy';

export default function EvidenceClaims({ caseId, claims, onChange }: { caseId: string; claims: EvidenceClaim[]; onChange: (claims: EvidenceClaim[]) => void }) {
  const copy = useDiagnosticCopy(); const user = useAuthStore(s => s.user);
  const query = useQuery({ queryKey: ['case-claim-entities', caseId, user?.id], queryFn: () => casesApi.entities(caseId) });
  const update = (index: number, key: keyof EvidenceClaim, value: string | undefined) => onChange(claims.map((claim, n) => n === index ? { ...claim, [key]: value } : claim));
  return <fieldset className="wb-form"><legend>{copy.claims}</legend><p className="wb-muted">{copy.claimNote}</p><QueryState query={query}/>{claims.map((claim, i) => <div className="wb-evidence-card wb-form" key={i}><label>{copy.entity}<select required value={claim.entity_id} onChange={e => update(i, 'entity_id', e.target.value)}><option value="">—</option>{query.data?.map(entity => <option key={entity.id} value={entity.id}>{entity.name || entity.id}</option>)}</select></label><label>{copy.field}<input required maxLength={64} pattern="[a-z][a-z0-9_]{0,63}" value={claim.field} onChange={e => update(i, 'field', e.target.value)}/></label><label>{copy.value}<textarea required maxLength={2000} rows={2} value={claim.value} onChange={e => update(i, 'value', e.target.value)}/></label><div className="wb-form-grid"><label>{copy.from}<input type="date" value={claim.valid_from?.slice(0, 10) ?? ''} max={claim.valid_to?.slice(0, 10)} onChange={e => update(i, 'valid_from', e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined)}/></label><label>{copy.to}<input type="date" value={claim.valid_to?.slice(0, 10) ?? ''} min={claim.valid_from?.slice(0, 10)} onChange={e => update(i, 'valid_to', e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined)}/></label></div><button type="button" className="dashboard-secondary-button" onClick={() => onChange(claims.filter((_, n) => n !== i))}>{copy.remove}</button></div>)}<button type="button" className="dashboard-secondary-button" disabled={claims.length >= 20 || !query.data?.length || query.isError} onClick={() => onChange([...claims, { entity_id: '', field: '', value: '' }])}>{copy.add} ({claims.length}/20)</button></fieldset>;
}

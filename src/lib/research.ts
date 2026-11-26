import client, { unwrap, type Envelope } from './apiClient';
import type { WorkItem } from './api';
import type { Entity } from '../data/mockEntities';

export interface BoardCard { id: string; kind: 'note'|'entity'|'evidence'; ref_id: string; note: string; x: number; y: number }
export interface BoardLink { from: string; to: string; label: string }
export interface Hypothesis { id: string; title: string; status: 'open'|'supported'|'rejected'|'inconclusive'; notes: string; supporting: string[]; opposing: string[]; questions?: {id:string;title:string;done:boolean}[] }
export interface Research { case_id: string; version: number; classification: string; cards: BoardCard[]; links: BoardLink[]; hypotheses: Hypothesis[]; checklist: {id:string;title:string;done:boolean}[]; report_outline: string; updated_at: string; updated_by: string }
export interface CaseTemplate { id: string; title: string; tasks: string[]; checklist: string[]; outline: string }
export interface EntitySnapshot { id:string; type:string; classification:string; source_id:string; properties:Record<string,unknown>; updated_at:string }
export interface EntityWatch { id:string; baseline:EntitySnapshot; current:EntitySnapshot; captured_at:string; history?:{snapshot:EntitySnapshot;at:string}[] }
const path = (id:string) => `/cases/${encodeURIComponent(id)}`;
export const researchApi = {
  async get(id:string) { return unwrap((await client.get<Envelope<Research>>(`${path(id)}/research`)).data); },
  async save(id:string, body:Research) { return unwrap((await client.put<Envelope<Research>>(`${path(id)}/research`,body)).data); },
  async templates() { return unwrap((await client.get<Envelope<CaseTemplate[]>>('/workspace/case-templates')).data); },
  async apply(id:string, template_id:string, assignee_id:string) { return unwrap((await client.post<Envelope<Research>>(`${path(id)}/apply-template`,{template_id,assignee_id})).data); },
  async watches(id:string) { return unwrap((await client.get<Envelope<EntityWatch[]>>(`${path(id)}/entity-watches`)).data); },
  async capture(id:string, entityId:string) { await client.put(`${path(id)}/entity-watches/${encodeURIComponent(entityId)}`); },
  async unwatch(id:string, entityId:string) { await client.delete(`${path(id)}/entity-watches/${encodeURIComponent(entityId)}`); },
};

// Object key order is immaterial; array order and null/missing distinctions are not.
export function stableValue(value:unknown):string {
  if (value === undefined) return '—';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableValue((value as Record<string,unknown>)[k])}`).join(',')}}`;
}
export function compareFields(a:Record<string,unknown>,b:Record<string,unknown>) {
  return Array.from(new Set([...Object.keys(a),...Object.keys(b)])).sort().map(field=>({field,before:stableValue(a[field]),after:stableValue(b[field]),changed:stableValue(a[field])!==stableValue(b[field])}));
}
export function entityFields(e:Entity):Record<string,unknown> { return {name:e.name,type:e.type,classification:e.classification,source:e.source,...Object.fromEntries(Object.entries(e.properties).map(([k,v])=>[`properties.${k}`,v]))}; }
export function snapshotFields(e:EntitySnapshot):Record<string,unknown> { return {type:e.type,classification:e.classification,source:e.source_id,...Object.fromEntries(Object.entries(e.properties??{}).map(([k,v])=>[`properties.${k}`,v]))}; }
export function workload(tasks:WorkItem[],now=Date.now()) {
  const groups:Record<string,{active:number;review:number;completed:number;overdue:number;soon:number}>={};
  for(const task of tasks) {
    const row=groups[task.assignee_id]??={active:0,review:0,completed:0,overdue:0,soon:0};
    if(task.status==='completed'){row.completed++;continue;}
    row.active++;if(task.status==='in_review')row.review++;
    const due=Date.parse(task.due_at??'');if(due<now)row.overdue++;else if(due<=now+7*86400000)row.soon++;
  }
  return groups;
}

import client, {unwrap, type Envelope} from './apiClient';

export const briefMetricKeys=['entities_total','people_total','organizations_total','relationships_total','evidence_total','evidence_assessed_pct','tasks_completed_pct','tasks_overdue','events_24h','external'] as const;
export type BriefMetric=typeof briefMetricKeys[number] | '';
export interface BriefRequirement {id:string;text:string;line:number;metric:BriefMetric;target?:number;operator:'gte'|'lte';source_id?:string}
export interface AnalyticsBrief {id:string;case_id:string;title:string;classification:string;attachment_id:string;filename:string;file_sha256:string;text_sha256:string;requirements:BriefRequirement[];omitted:number;engine:string;published:boolean;revision:number;created_by:string;updated_by:string;created_at:string;updated_at:string}
export interface BriefKPI extends BriefRequirement {value:number|null;unit:string;status:'no_data'|'tracking'|'met'|'gap';reason?:string;observed_at?:string}
export interface BriefBucket {label:string;count:number}
export interface BriefLive {plan_id:string;revision:number;at:string;refresh_seconds:number;kpis:BriefKPI[];entity_types:BriefBucket[];task_statuses:BriefBucket[];event_hours:BriefBucket[];partial:boolean;scope:string;source_available:boolean}
export interface BriefPoint {at:string;values:Record<string,number>}
const base=(id:string)=>`/cases/${encodeURIComponent(id)}/brief-analytics`;
export const briefApi={
 list:async(id:string)=>unwrap((await client.get<Envelope<AnalyticsBrief[]>>(base(id))).data),
 create:async(id:string,attachmentId:string,title:string)=>unwrap((await client.post<Envelope<AnalyticsBrief>>(base(id),{attachment_id:attachmentId,title},{timeout:100000})).data),
 update:async(id:string,plan:AnalyticsBrief,published:boolean,rows:BriefRequirement[])=>unwrap((await client.patch<Envelope<AnalyticsBrief>>(`${base(id)}/${encodeURIComponent(plan.id)}`,{revision:plan.revision,published,mappings:rows.map(({id,metric,target,operator,source_id})=>({id,metric,target:target??null,operator,source_id:source_id??''}))})).data),
 live:async(id:string,planId:string,signal?:AbortSignal)=>unwrap((await client.get<Envelope<BriefLive>>(`${base(id)}/${encodeURIComponent(planId)}/live`,{signal,timeout:12000})).data),
};
export function addBriefPoint(points:BriefPoint[],snapshot:BriefLive):BriefPoint[] {
 if(points.some(p=>p.at===snapshot.at))return points;
 const values:Record<string,number>={};snapshot.kpis.forEach(k=>{if(k.metric && k.value!==null && Number.isFinite(k.value))values[k.id]=k.value;});
 return [...points,{at:snapshot.at,values}].slice(-20);
}
export function briefSparkline(points:BriefPoint[],id:string):string {
 const values=points.map((p,index)=>({index,value:p.values[id]})).filter(p=>Number.isFinite(p.value));
 if(values.length<2)return '';
 const low=Math.min(...values.map(p=>p.value)),high=Math.max(...values.map(p=>p.value));
 return values.map(p=>`${8+p.index*184/Math.max(1,points.length-1)},${high===low?30:52-(p.value-low)*44/(high-low)}`).join(' ');
}

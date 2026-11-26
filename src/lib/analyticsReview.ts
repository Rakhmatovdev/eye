import client,{unwrap,type Envelope} from './apiClient';
import type {AnalyticsBrief,BriefRequirement} from './briefAnalytics';
export interface BriefVersion{key:string;plan_id:string;plan:AnalyticsBrief}
export interface BriefDiff{before:BriefVersion;after:BriefVersion;changes:{kind:string;before:BriefRequirement|null;after:BriefRequirement|null;match:string}[];unchanged:number;algorithm:string}
export interface QualityDecision{version:number;fingerprint:string;status:string;assignee_id:string;notes:string;updated_by:string;updated_at:string}
export interface QualityMonitor{enabled:boolean;interval_minutes:number;last_at?:string;last_changed_at?:string;error?:string}
export interface QualityIssue{key?:string;fingerprint?:string;target?:string;kind:string;id:string;title:string;count:number;ids?:string[];decision?:QualityDecision}
export interface DataQuality{at:string;entities_scanned:number;evidence_scanned:number;sources_scanned:number;missing_labels:number;duplicate_groups:number;unassessed_evidence:number;stale_sources:number;missing_sources:number;unresolved_conflicts:number;issues:QualityIssue[];limited:boolean;can_write?:boolean;participants?:{id:string;name:string}[];monitor?:QualityMonitor}
const base=(id:string)=>`/cases/${encodeURIComponent(id)}`;
export const reviewApi={
 saveDecision:async(id:string,key:string,body:{version:number;fingerprint:string;status:string;assignee_id:string;notes:string})=>unwrap((await client.put<Envelope<QualityDecision>>(`${base(id)}/data-quality/issues/${encodeURIComponent(key)}`,body)).data),
 saveQualityMonitor:async(id:string,enabled:boolean,interval_minutes:number)=>unwrap((await client.put<Envelope<QualityMonitor>>(`${base(id)}/data-quality/monitoring`,{enabled,interval_minutes})).data),
 versions:async(id:string)=>unwrap((await client.get<Envelope<{versions:BriefVersion[];limited:boolean}>>(`${base(id)}/brief-versions`)).data),
 diff:async(id:string,b:BriefVersion,a:BriefVersion)=>unwrap((await client.post<Envelope<BriefDiff>>(`${base(id)}/brief-versions/compare`,{before_plan:b.plan_id,before_revision:b.plan.revision,after_plan:a.plan_id,after_revision:a.plan.revision})).data),
 quality:async(id:string)=>unwrap((await client.get<Envelope<DataQuality>>(`${base(id)}/data-quality`)).data),
 exportQualityCsv:async(id:string)=>(await client.get<Blob>(`${base(id)}/data-quality/export.csv`,{responseType:'blob'})).data,
};

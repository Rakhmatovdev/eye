import client,{unwrap,type Envelope} from './apiClient';
import type {AnalyticsBrief,BriefRequirement} from './briefAnalytics';
import type {Participant} from './workspaceApi';
export interface MatrixReference{id:string;title:string;status?:string}
export interface AcceptanceCriterion{id:string;text:string;passed:boolean;basis:string;reviewed_by?:string;reviewed_at?:string}
export interface MatrixRecord{depends_on?:string[];criteria?:AcceptanceCriterion[];plan_revision:number;requirement_id:string;version:number;status:string;assignee_id:string;due_at?:string;notes:string;evidence_ids:string[];task_ids:string[];updated_by:string;updated_at:string;reviewed_by?:string;reviewed_at?:string}
export interface MatrixEntry{blocked_by?:string[];requirement:BriefRequirement;record:MatrixRecord|null;restricted:boolean;evidence:MatrixReference[];tasks:MatrixReference[];missing_references:number;verification_valid:boolean;overdue:boolean}
export interface BriefMatrix{revision:number;entries:MatrixEntry[];participants:Participant[];evidence_options:MatrixReference[];task_options:MatrixReference[];options_limited:boolean;can_write:boolean;can_review:boolean}
export interface MatrixInput{depends_on?:string[];criteria:AcceptanceCriterion[];plan_revision:number;version:number;status:string;assignee_id:string;due_at:string|null;notes:string;evidence_ids:string[];task_ids:string[]}
export interface ComparisonPeriod{start:string;end:string;samples:number;sample_id?:string;sample_at?:string}
export interface KPIComparison{requirement_id:string;text:string;metric:string;unit:string;before:number|null;after:number|null;delta:number|null;relative_percent:number|null;delta_unit:string;state:string;before_status:string;after_status:string}
export interface BriefComparison{revision:number;days:number;at:string;before:ComparisonPeriod;after:ComparisonPeriod;rows:KPIComparison[]}
export interface BriefExplanation{comparison:KPIComparison;before_at:string;after_at:string;mechanism:string;factors:{key:string;before:number;after:number;delta:number}[];records:{id:string;kind:string;title:string;action:string;at:string;value?:number;observed_at?:string}[];limited:boolean;causality_confirmed:boolean;legacy_factors:boolean}
const base=(id:string,pid:string)=>`/cases/${encodeURIComponent(id)}/brief-analytics/${encodeURIComponent(pid)}`;
export const decisionsApi={
 history:async(id:string,pid:string,req:string,before=0)=>unwrap((await client.get<Envelope<{rows:{record:MatrixRecord}[];next:number}>>(`${base(id,pid)}/matrix/${encodeURIComponent(req)}/history`,{params:{before}})).data),
 matrix:async(id:string,pid:string)=>unwrap((await client.get<Envelope<BriefMatrix>>(`${base(id,pid)}/matrix`)).data),
 exportCsv:async(id:string,pid:string)=>(await client.get<Blob>(`${base(id,pid)}/matrix/export.csv`,{responseType:'blob'})).data,
 save:async(id:string,plan:AnalyticsBrief,reqId:string,body:MatrixInput)=>unwrap((await client.put<Envelope<MatrixRecord>>(`${base(id,plan.id)}/matrix/${encodeURIComponent(reqId)}`,body)).data),
 compare:async(id:string,pid:string,days:number)=>unwrap((await client.get<Envelope<BriefComparison>>(`${base(id,pid)}/comparison`,{params:{days}})).data),
 explain:async(id:string,pid:string,reqId:string,before:string,after:string)=>unwrap((await client.get<Envelope<BriefExplanation>>(`${base(id,pid)}/explanation/${encodeURIComponent(reqId)}`,{params:{before_id:before,after_id:after}})).data),
};




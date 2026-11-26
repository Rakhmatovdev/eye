import client,{unwrap,type Envelope} from './apiClient';
import type {BriefKPI} from './briefAnalytics';
export interface AnalyticsSource {id:string;name:string;kind:'import'|'http';unit:'count'|'percent'|'number';url?:string;value_path?:string;time_path?:string;freshness_minutes:number;poll_minutes:number;value:number|null;observed_at?:string;last_success?:string;last_error?:string}
export interface SourceInput {name:string;kind:'import'|'http';unit:AnalyticsSource['unit'];url:string;value_path:string;time_path:string;freshness_minutes:number;poll_minutes:number}
export interface AnalyticsMonitor {enabled:boolean;alerts:boolean;interval_minutes:number;next_at:string;last_at?:string;error?:string}
export interface HistoryPoint {at:string;revision:number;kpis:BriefKPI[]}
export interface AnalyticsHistory {points:HistoryPoint[];days:number;bucket:string;retention_days:number}
const sources=(id:string)=>`/cases/${encodeURIComponent(id)}/analytics-sources`;
const plan=(id:string,pid:string)=>`/cases/${encodeURIComponent(id)}/brief-analytics/${encodeURIComponent(pid)}`;
export const growthApi={
 sources:async(id:string)=>unwrap((await client.get<Envelope<AnalyticsSource[]>>(sources(id))).data),
 createSource:async(id:string,body:SourceInput)=>unwrap((await client.post<Envelope<AnalyticsSource>>(sources(id),body)).data),
 deleteSource:async(id:string,sid:string)=>{await client.delete(`${sources(id)}/${encodeURIComponent(sid)}`);},
 refresh:async(id:string,sid:string)=>unwrap((await client.post<Envelope<AnalyticsSource>>(`${sources(id)}/${encodeURIComponent(sid)}/refresh`,{})).data),
 observe:async(id:string,sid:string,value:number,at:string)=>unwrap((await client.post<Envelope<{accepted:number}>>(`${sources(id)}/${encodeURIComponent(sid)}/observations`,{value,observed_at:at})).data),
 import:async(id:string,sid:string,file:File,valueColumn:string,timeColumn:string,sheet:string)=>{const body=new FormData();body.append('file',file);body.append('value_column',valueColumn);body.append('time_column',timeColumn);body.append('sheet',sheet);return unwrap((await client.post<Envelope<{accepted:number}>>(`${sources(id)}/${encodeURIComponent(sid)}/import`,body,{headers:{'Content-Type':undefined}})).data);},
 monitor:async(id:string,pid:string)=>unwrap((await client.get<Envelope<AnalyticsMonitor>>(`${plan(id,pid)}/monitoring`)).data),
 saveMonitor:async(id:string,pid:string,body:Pick<AnalyticsMonitor,'enabled'|'alerts'|'interval_minutes'>)=>unwrap((await client.put<Envelope<AnalyticsMonitor>>(`${plan(id,pid)}/monitoring`,body)).data),
 capture:async(id:string,pid:string)=>unwrap((await client.post<Envelope<HistoryPoint>>(`${plan(id,pid)}/capture`,{})).data),
 history:async(id:string,pid:string,days:number)=>unwrap((await client.get<Envelope<AnalyticsHistory>>(`${plan(id,pid)}/history`,{params:{days}})).data),
};

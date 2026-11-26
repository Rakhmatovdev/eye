import type {Entity} from '../../data/mockEntities';
import type {Relationship} from '../../data/mockRelationships';
export interface GraphData {nodes:Entity[];edges:Relationship[];total_nodes?:number;truncated?:boolean}
export type GraphLayout='cose'|'concentric'|'breadthfirst'|'circle'|'grid';
export interface GraphSettings {layout:GraphLayout;labels:boolean;edgeLabels:boolean;animations:boolean;minConfidence:number;includeUnrated:boolean;focus:boolean;focusNode?:string;pinned:string[];hidden:string[];asOf?:string;includeUndated?:boolean}
export const defaultGraphSettings:GraphSettings={layout:'cose',labels:true,edgeLabels:false,animations:true,minConfidence:0,includeUnrated:true,focus:false,pinned:[],hidden:[]};
export interface GraphCanvasFilters {entityTypes?:string[];validFrom?:string;validTo?:string;asOf?:string;includeUndated?:boolean}
export const graphColors:Record<string,string>={person:'#8b5cf6',organization:'#3b82f6',location:'#10b981',phone:'#f59e0b',account:'#06b6d4',vehicle:'#ec4899',document:'#64748b',transaction:'#f97316'};
export function visibleGraph(graph:GraphData,settings:GraphSettings,filters:GraphCanvasFilters,selected:string):GraphData {
 const hidden=new Set(settings.hidden),types=filters.entityTypes?.length?new Set(filters.entityTypes):null;
 let nodes=graph.nodes.filter(n=>!hidden.has(n.id)&&(!types||types.has(n.type))&&(!filters.asOf||!n.created_at||n.created_at.slice(0,10)<=filters.asOf));
 let ids=new Set(nodes.map(n=>n.id));
 let edges=graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)&&(typeof e.confidence==='number'?e.confidence>=settings.minConfidence:settings.includeUnrated)&&(!filters.validFrom||!e.valid_to||e.valid_to>=filters.validFrom)&&(!filters.validTo||!e.valid_from||e.valid_from<=filters.validTo+'T23:59:59.999Z')&&(!filters.asOf||((filters.includeUndated!==false||!!e.valid_from||!!e.valid_to)&&(!e.valid_from||e.valid_from.slice(0,10)<=filters.asOf)&&(!e.valid_to||e.valid_to.slice(0,10)>filters.asOf))));
 if(settings.focus&&selected&&ids.has(selected)){ids=new Set([selected]);edges.forEach(e=>{if(e.source===selected||e.target===selected){ids.add(e.source);ids.add(e.target);}});nodes=nodes.filter(n=>ids.has(n.id));edges=edges.filter(e=>ids.has(e.source)&&ids.has(e.target));}
 return {nodes,edges};
}
export interface GraphPath {nodes:string[];edges:string[]}
export function graphDates(graph:GraphData):string[] {return Array.from(new Set([...graph.nodes.map(n=>n.created_at),...graph.edges.flatMap(e=>[e.valid_from,e.valid_to])].filter((s):s is string=>!!s&&!s.startsWith('0001-')&&Number.isFinite(Date.parse(s))).map(s=>s.slice(0,10)))).sort();}
export function commonNeighbors(graph:GraphData,from:string,to:string,directed=false):string[]{const ids=new Set(graph.nodes.map(n=>n.id));if(!ids.has(from)||!ids.has(to))return [];const neighbors=(id:string)=>new Set(graph.edges.flatMap(e=>e.source===id&&ids.has(e.target)?[e.target]:!directed&&e.target===id&&ids.has(e.source)?[e.source]:[]));const a=neighbors(from),b=neighbors(to);return Array.from(a).filter(id=>id!==from&&id!==to&&b.has(id)).sort();}
export function shortestPath(graph:GraphData,from:string,to:string,directed=false):GraphPath|null {
 const ids=new Set(graph.nodes.map(n=>n.id));if(!ids.has(from)||!ids.has(to))return null;
 const adjacency=new Map<string,{id:string;edge:string}[]>();ids.forEach(id=>adjacency.set(id,[]));
 graph.edges.forEach(e=>{if(!ids.has(e.source)||!ids.has(e.target))return;adjacency.get(e.source)!.push({id:e.target,edge:e.id});if(!directed)adjacency.get(e.target)!.push({id:e.source,edge:e.id});});
 adjacency.forEach(items=>items.sort((a,b)=>a.id.localeCompare(b.id)||a.edge.localeCompare(b.edge)));
 const queue=[from],previous=new Map<string,{id:string;edge:string}>(),visited=new Set([from]);
 for(let i=0;i<queue.length;i++){const id=queue[i];if(id===to){const nodes=[to],edges:string[]=[];let current=to;while(current!==from){const p=previous.get(current)!;nodes.push(p.id);edges.push(p.edge);current=p.id;}nodes.reverse();edges.reverse();return {nodes,edges};}for(const next of adjacency.get(id)!){if(!visited.has(next.id)){visited.add(next.id);previous.set(next.id,{id,edge:next.edge});queue.push(next.id);}}}return null;
}
export function graphMetrics(graph:GraphData){const degree:Record<string,number>={};const neighbors=new Map<string,string[]>();graph.nodes.forEach(n=>{degree[n.id]=0;neighbors.set(n.id,[]);});graph.edges.forEach(e=>{if(!neighbors.has(e.source)||!neighbors.has(e.target))return;degree[e.source]++;degree[e.target]++;neighbors.get(e.source)!.push(e.target);neighbors.get(e.target)!.push(e.source);});let components=0;const seen=new Set<string>();for(const n of graph.nodes){if(seen.has(n.id))continue;components++;const queue=[n.id];seen.add(n.id);for(let i=0;i<queue.length;i++)for(const next of neighbors.get(queue[i])!){if(!seen.has(next)){seen.add(next);queue.push(next);}}}return {degree,components,isolated:Object.values(degree).filter(n=>!n).length};}

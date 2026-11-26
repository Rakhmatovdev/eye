import {defaultGraphSettings,visibleGraph,shortestPath,commonNeighbors,graphMetrics,type GraphData} from './graphModel';
import {mockEntities} from '../../data/mockEntities';
const graph:GraphData={nodes:['a','b','c','d','isolated'].map((id,i)=>({...mockEntities[0],id,name:id,type:i===3?'organization':'person'})),edges:[{id:'ab',source:'a',target:'b',type:'link',label:'AB',confidence:.9,valid_from:'2026-03-01T12:00:00Z'},{id:'bc',source:'b',target:'c',type:'link',label:'BC',confidence:.2},{id:'ca',source:'c',target:'a',type:'link',label:'CA'},{id:'cd',source:'c',target:'d',type:'link',label:'CD',valid_to:'2026-02-28T12:00:00Z'}]};
test('shortest path respects directed arrows, hidden endpoints, cycles and same-node paths',()=>{expect(shortestPath(graph,'b','a')?.edges).toEqual(['ab']);expect(shortestPath(graph,'b','a',true)?.edges).toEqual(['bc','ca']);expect(shortestPath(graph,'isolated','a')).toBeNull();expect(shortestPath(graph,'a','a')).toEqual({nodes:['a'],edges:[]});expect(shortestPath({...graph,nodes:graph.nodes.filter(n=>n.id!=='a')},'b','a')).toBeNull();});
test('confidence, type and inclusive date filters cannot leave dangling relationships',()=>{const result=visibleGraph(graph,{...defaultGraphSettings,minConfidence:.5,includeUnrated:false},{entityTypes:['person'],validFrom:'2026-03-01',validTo:'2026-03-01'},'');expect(result.nodes.map(n=>n.id)).toEqual(['a','b','c','isolated']);expect(result.edges.map(e=>e.id)).toEqual(['ab']);});
test('focus includes one-hop neighbors only and hiding removes all incident edges',()=>{const result=visibleGraph(graph,{...defaultGraphSettings,focus:true,hidden:['b']},{},'a');expect(result.nodes.map(n=>n.id)).toEqual(['a','c']);expect(result.edges.map(e=>e.id)).toEqual(['ca']);});
test('metrics count isolated nodes as independent components',()=>{expect(graphMetrics(graph)).toEqual({degree:{a:2,b:2,c:3,d:1,isolated:0},components:2,isolated:1});});
test('common neighbors use only loaded endpoints and respect direction',()=>{expect(commonNeighbors(graph,'a','c')).toEqual(['b']);expect(commonNeighbors(graph,'a','c',true)).toEqual([]);expect(commonNeighbors(graph,'missing','c')).toEqual([]);});
test('time snapshot filters future nodes, expired links and optional undated links',()=>{
 const dated={...graph,nodes:graph.nodes.map(n=>n.id==='d'?{...n,created_at:'2026-04-01T00:00:00Z'}:n)};
 const view=visibleGraph(dated,defaultGraphSettings,{asOf:'2026-03-01',includeUndated:false},'');
 expect(view.nodes.map(n=>n.id)).not.toContain('d');expect(view.edges.map(e=>e.id)).toEqual(['ab']);
 expect(visibleGraph(dated,defaultGraphSettings,{asOf:'2026-02-01',includeUndated:true},'').edges.map(e=>e.id)).toEqual(['bc','ca']);
});
test('large hidden sets preserve input data and remove all incident edges',()=>{
 const settings={...defaultGraphSettings,hidden:['a','a','b','missing']};const result=visibleGraph(graph,settings,{},'');
 expect(result.nodes.map(n=>n.id)).toEqual(['c','d','isolated']);expect(result.edges.map(e=>e.id)).toEqual(['cd']);expect(settings.hidden).toEqual(['a','a','b','missing']);expect(graph.nodes).toHaveLength(5);
});
test('long paths are reconstructed in source-to-target order',()=>{
 const size=1500,nodes=Array.from({length:size},(_,i)=>({...mockEntities[0],id:String(i)})),edges=Array.from({length:size-1},(_,i)=>({id:`e${i}`,source:String(i),target:String(i+1),type:'link',label:''}));
 const path=shortestPath({nodes,edges},'0',String(size-1),true)!;
 expect(path.nodes).toHaveLength(size);expect(path.nodes.slice(0,3)).toEqual(['0','1','2']);expect(path.nodes.at(-1)).toBe('1499');expect(path.edges[0]).toBe('e0');expect(path.edges.at(-1)).toBe('e1498');
});

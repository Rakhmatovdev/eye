const fs=require('fs'),ts=require('typescript'),vm=require('vm'),{performance}=require('perf_hooks');
const source=fs.readFileSync(require('path').join(__dirname,'../src/components/graph/graphModel.ts'),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const graphModule={};vm.runInNewContext(js,{exports:graphModule,Set,Map,Array,Date,Number,JSON,Math});
const graph={nodes:Array.from({length:500},(_,i)=>({id:'node-'+i,type:'person',created_at:'2026-01-01',name:'Node '+i})),edges:Array.from({length:3000},(_,i)=>({id:'edge-'+i,source:'node-'+(i%500),target:'node-'+((i*7+1)%500),type:'link'}))};
const settings={...graphModule.defaultGraphSettings,hidden:graph.nodes.slice(0,250).map(n=>n.id)};
for(let i=0;i<1000;i++)graphModule.visibleGraph(graph,settings,{},'');
const samples=[];for(let sample=0;sample<5;sample++){const start=performance.now();for(let i=0;i<3000;i++)graphModule.visibleGraph(graph,settings,{},'');samples.push((performance.now()-start)/3000);}
samples.sort((a,b)=>a-b);const result=JSON.stringify({nodes:500,edges:3000,hidden:250,iterations_per_sample:3000,median_ms:samples[2],samples_ms:samples});console.log(result);if(process.argv[2])fs.writeFileSync(process.argv[2],result);

import {addBriefPoint,briefSparkline,type BriefLive} from '../briefAnalytics';
const snapshot=(at:string,value:number|null):BriefLive=>({plan_id:'p',revision:2,at,refresh_seconds:5,kpis:[{id:'r',text:'People',line:1,metric:'people_total',operator:'gte',value,unit:'count',status:value===null?'no_data':'tracking'}],entity_types:[],task_statuses:[],event_hours:[],partial:false,scope:'visible_case_records',source_available:true});
test('session trend retains measured values only and bounds history',()=>{
 let points=addBriefPoint([],snapshot('0',null));expect(points[0].values).toEqual({});
 points=addBriefPoint(points,snapshot('1',3));points=addBriefPoint(points,snapshot('1',8));expect(points).toHaveLength(2);expect(points[1].values.r).toBe(3);
 for(let i=2;i<30;i++)points=addBriefPoint(points,snapshot(String(i),i));expect(points).toHaveLength(20);expect(points[0].at).toBe('10');
 expect(briefSparkline(points,'r')).not.toContain('NaN');expect(briefSparkline(points,'unknown')).toBe('');
});

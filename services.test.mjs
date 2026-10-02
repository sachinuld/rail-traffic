import test from 'node:test';
import assert from 'node:assert/strict';
import {boardRow,locationOf} from './services/normalize.mjs';
import {demoRequest} from './ui/demo.js';
test('unknown halting status is not silently classified as non-stop',()=>{
 const row=boardRow({train:{number:'12345'},stop:{arrival:null},live:{type:'upcoming',actualArrivalTime:'2026-10-02T12:00:00+05:30'}},'CNB');
 assert.equal(row.isHalt,null);assert.equal(row.actualArrival,null);
});
test('actual arrivals require an observed arrival/departure state',()=>{
 const r=boardRow({train:{number:'12345'},live:{type:'at-station',actualArrivalTime:'2026-10-02T12:00:00+05:30',actualDepartureTime:'2026-10-02T12:10:00+05:30'}},'CNB',true);
 assert.ok(r.actualArrival);assert.equal(r.actualDeparture,null);
});
test('departed station is not promoted to exact current train coordinates',()=>{
 const l=locationOf({currentLocation:{stationCode:'A',status:'departed'},route:[{stationCode:'A',lat:26,lng:79},{stationCode:'B',lat:27,lng:80}]});
 assert.equal(l.position,null);assert.deepEqual(l.lastReportedPoint,{lat:26,lng:79});assert.equal(l.next.code,'B');
});
test('demo responses always declare demo and do not mix live metadata',async()=>{
 for(const path of ['/api/status','/api/station','/api/coaches','/api/nearby','/api/location','/api/between']){
 const r=await demoRequest(path,{train:'12420',station:'PHD',from:'ETW',to:'CNB'});
 assert.equal(r.mode,'demo');assert.equal(r.source,'Illustrative fixtures');
 }
});
test('new API endpoints normalize schedule/search and verify non-stop against route',async()=>{
 process.env.NODE_ENV='test';process.env.RAILRADAR_API_KEY='fixture-key';
 const real=globalThis.fetch;
 globalThis.fetch=async url=>{
 const u=new URL(url);let data;
 if(u.pathname.endsWith('/search/stations'))data=[{code:'CNB',name:'Kanpur Central',city:'Kanpur'}];
 else if(u.pathname.endsWith('/search/trains'))data=[{number:'12345',name:'Test',source:'A',destination:'B'}];
 else if(u.pathname.endsWith('/stations/CNB/live'))data={station:{code:'CNB',name:'Kanpur'},trains:[{train:{number:'12345',name:'Test'},stop:{arrival:null},live:{type:'upcoming'}}]};
 else if(u.pathname.endsWith('/trains/12345'))data={train:{number:'12345',name:'Test',runDays:['mon']},route:[{station:{code:'CNB',name:'Kanpur'},isHalt:false}]};
 else throw Error('Unexpected endpoint '+u.pathname);
 return new Response(JSON.stringify({success:true,data}));
 };
 const {server}=await import('./server.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
 let r=await real(base+'/api/stations?q=Kan');let d=await r.json();assert.equal(d.data[0].city,'Kanpur');assert.equal(d.mode,'schedule');
 r=await real(base+'/api/trains?q=Test');d=await r.json();assert.deepEqual(d.data[0].runDays,['mon']);
 r=await real(base+'/api/station?station=CNB');d=await r.json();assert.equal(d.data.rows[0].isHalt,false);assert.equal(d.data.rows[0].stationCode,'CNB');
 r=await real(base+'/api/map?train=12345&date=2026-10-02');assert.equal(r.status,503);
 r=await real(base+'/api/config');d=await r.json();assert.ok(!JSON.stringify(d).includes('fixture-key'));
 r=await real(base+'/provider.mjs');assert.equal(r.status,404);
 r=await real(base+'/api/stations?q=a');assert.equal(r.status,400);
 }finally{globalThis.fetch=real;server.closeAllConnections();await new Promise(r=>server.close(r));}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {compare,candidates,discover} from './nearby.mjs';
const now=Date.now();
const run=(number,index,status='departed')=>({trainNumber:number,trainName:number,startDate:'2026-10-01',lastUpdatedAt:new Date(now).toISOString(),isLive:true,status:'running',currentLocation:{stationCode:'S'+index,status},route:Array.from({length:12},(_,i)=>({stationCode:'S'+i,stationName:'Station '+i,distance:i*10}))});
test('ahead and behind use disjoint segment intervals, not foreign origin distances',()=>{
 const base=run('10000',5),ahead=run('10001',8),behind=run('10002',2);ahead.route.forEach(s=>s.distance+=800);
 assert.equal(compare(base,ahead,now).relation,'ahead');assert.equal(compare(base,ahead,now).distanceMinKm,20);assert.equal(compare(base,ahead,now).distanceMaxKm,40);
 assert.equal(compare(base,behind,now).relation,'behind');
});
test('same/adjacent overlapping segments never assert train order',()=>{
 assert.equal(compare(run('10000',5),run('10001',5),now).relation,'uncertain');
 assert.equal(compare(run('10000',5),run('10001',6),now).relation,'uncertain');
});
test('reject stale, future and temporally mismatched snapshots',()=>{
 for(const shift of [-360000,120000,-180000]){const b=run('10001',8);b.lastUpdatedAt=new Date(now+shift).toISOString();assert.equal(compare(run('10000',5),b,now),null);}
});
test('opposite direction and diverging route rejected',()=>{
 const base=run('10000',5),opposite=run('10001',8);opposite.route.reverse().forEach((s,i)=>s.distance=i*10);assert.equal(compare(base,opposite,now),null);
 const branch=run('10002',8);branch.route[7].stationCode='BRANCH';assert.equal(compare(base,branch,now),null);
});
test('ambiguous loops, diversion, predicted location and completed runs rejected',()=>{
 for(const mutate of [d=>d.route[1].stationCode='S0',d=>d.currentLocation.isDiverted=true,d=>d.currentLocation.isActualPosition=false,d=>d.status='completed']){const b=run('10001',8);mutate(b);assert.equal(compare(run('10000',5),b,now),null);}
});
test('candidate discovery deduplicates, excludes self and reverse, bounds radius and count',()=>{
 const rows=Array.from({length:11},(_,i)=>({train_number:String(10001+i),current_station:'S'+i,next_station:'S'+(i+1)}));rows.push(rows[0],{train_number:'10000',current_station:'S5',next_station:'S6'},{train_number:'99999',current_station:'S8',next_station:'S7'});
 const result=candidates(run('10000',5),rows,6,now);assert.equal(result.length,6);assert.equal(new Set(result).size,6);assert(!result.includes('10000'));assert(!result.includes('99999'));
});
test('different journey dates allowed only when snapshots are fresh',()=>{const other=run('10001',8);other.startDate='2026-09-30';assert.equal(compare(run('10000',5),other,now).journeyDate,'2026-09-30');});
test('map alone never becomes a live neighbour; failures remain partial',async()=>{
 const base=run('10000',5);const requests=[];
 const result=await discover(base,async path=>{requests.push(path);if(path.includes('live-map'))return {success:true,data:[{train_number:'10001',current_station:'S8',next_station:'S9'},{train_number:'10002',current_station:'S2',next_station:'S3'}]};if(path.includes('10002'))throw Error('quota');return {success:true,data:run('10001',8)};},now);
 assert.equal(requests.length,3);assert.equal(result.items.length,1);assert.equal(result.failed,1);assert.equal(result.state,'partial');
});
test('stale base prevents further provider requests',async()=>{const d=run('10000',5);d.lastUpdatedAt=new Date(now-600000).toISOString();const r=await discover(d,()=>{throw Error('should not request');},now);assert.equal(r.state,'unavailable');});
test('HTTP endpoints keep normal status working and protect cross-origin access',async()=>{
 process.env.NODE_ENV='test';process.env.RAILRADAR_API_KEY='test-key-not-real';
 const nativeFetch=globalThis.fetch;let upstream=0;
 globalThis.fetch=async(url,options)=>{upstream++;assert.equal(options.headers.Authorization,'Bearer test-key-not-real');const path=new URL(url).pathname;
 if(path.endsWith('/live-map'))return new Response(JSON.stringify({success:true,data:[{train_number:'10001',current_station:'S8',next_station:'S9'}]}));
 const d=path.includes('10001')?run('10001',8):run('10000',5);return new Response(JSON.stringify({success:true,data:d}));};
 const {server}=await import('./server.mjs');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
 let r=await nativeFetch(base+'/api/status?train=10000&date=2026-10-01');assert.equal(r.status,200);assert.equal((await r.json()).train.number,'10000');
 r=await nativeFetch(base+'/api/nearby?train=10000&date=2026-10-01');assert.equal(r.status,200);assert.equal((await r.json()).items[0].relation,'ahead');assert.equal(upstream,3);
 r=await nativeFetch(base+'/api/nearby?train=10000&date=2026-10-01');assert.equal(r.status,200);assert.equal(upstream,3);
 r=await nativeFetch(base+'/api/status?train=10000&date=2026-10-01',{headers:{Origin:'https://other.example'}});assert.equal(r.status,403);
 r=await nativeFetch(base+'/api/status?train=10000&date=2026-02-30');assert.equal(r.status,400);
 delete process.env.RAILRADAR_API_KEY;r=await nativeFetch(base+'/api/status?train=10000&date=2026-10-01');assert.equal(r.status,503);
 }finally{globalThis.fetch=nativeFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

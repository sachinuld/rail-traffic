import {stationVisit} from './station-window.mjs';
import {nearStation,locationFacts,radiusKm,normalizeBlueprint} from './accuracy.mjs';
import {request} from './provider.mjs';
import {railkitData} from './railkit-data.mjs';
import {normalize,normalizeCoaches} from './railradar.mjs';
import {discover} from './nearby.mjs';
import {train,station,envelope,boardRow,locationOf,num} from './normalize.mjs';
const behindPending=new Map(),behindCache=new Map(),stationCache=new Map(),stationPending=new Map();
const fail=message=>{const e=Error(message);e.status=502;throw e;};
const useRailKit=()=>!!process.env.RAILKIT_API_KEY;
export const railData={
 async stationSearch(q){if(useRailKit()) return railkitData.stationSearch(q); const p=await request('/lookup/search/stations?q='+encodeURIComponent(q)+'&limit=10');if(!Array.isArray(p.data))fail('Station search response unavailable');return envelope(p,p.data.map(station),'schedule');},
 async trainSearch(q){const p=await request('/lookup/search/trains?q='+encodeURIComponent(q)+'&limit=5');if(!Array.isArray(p.data))fail('Train search response unavailable');const rows=p.data.slice(0,5).map(train);for(const row of rows){if(!row.runDays.length&&/^\d{5}$/.test(row.number)){try{const full=(await this.schedule(row.number)).data.train;row.runDays=full.runDays;row.from=full.from||row.from;row.to=full.to||row.to;}catch{}}}return envelope(p,rows,'schedule');},
 async between(from,to,date){const p=await request('/trains/between/'+from+'/'+to+'?date='+date+'&live=true');if(!Array.isArray(p.data?.trains))fail('Route search response unavailable');return envelope(p,p.data.trains.map(r=>({...train(r.train),from:p.data.from?.name||from,to:p.data.to?.name||to,runDays:r.train?.runDays||[],journeyDate:r.live?.startDate||null,boardingDay:r.from?.day||null,departure:r.from?.departure||null,arrival:r.to?.arrival||null})),'schedule');},
 async schedule(number){const p=await request('/trains/'+number+'?haltsOnly=false');if(String(p.data?.train?.number)!==number||!Array.isArray(p.data.route))fail('Schedule response unavailable');return envelope(p,{train:train(p.data.train),route:p.data.route.map(s=>({...station(s.station),isHalt:typeof s.isHalt==='boolean'?s.isHalt:null,arrival:s.arrival||null,departure:s.departure||null,arrivalDay:s.arrivalDay||null,departureDay:s.departureDay||null,platform:s.platform??null,distance:num(s.distance)}))},'schedule');},
 async live(number,date){if(useRailKit()) return railkitData.live(number,date); const p=await request('/trains/'+number+'/live?date='+date+'&haltsOnly=false&includeCoordinates=true');const n=normalize(p,number,date);n.location={...locationOf(p.data),...locationFacts(p.data)};n.journeyDate=p.data.startDate;n.train.status=p.data.status||null;n.train.runDays=p.data.train?.runDays||[];n.stations=n.stations.map((s,i)=>({...s,distance:num(p.data.route[i]?.distance),delayArrival:num(p.data.route[i]?.delayArrival),delayDeparture:num(p.data.route[i]?.delayDeparture),isCurrent:s.code===(n.location.near?.stationCode||p.data.currentLocation?.stationCode),rawStatus:p.data.route[i]?.status,currentStatus:s.code===p.data.currentLocation?.stationCode?p.data.currentLocation?.status:null}));return envelope(p,n);},
 async coaches(number,stationCode){const p=await request('/trains/'+number+'/coaches/'+stationCode);const n=normalizeCoaches(p,number,stationCode),details=p.data.rake||p.data.coaches||[];let blueprints=p.data.blueprints;
 if(!blueprints){try{blueprints=(await request('/trains/'+number+'/coaches')).data?.blueprints;}catch{}}
 n.coaches=n.coaches.map(c=>{const detail=details.find(r=>r.position===c.position&&r.code===c.code)||{};return {...c,classType:detail.classType||null,blueprint:normalizeBlueprint(blueprints?.[detail.classType]),hasSeats:detail.hasSeats??null};});return envelope(p,n,'schedule');},
 async behind(number,date,offset=0,radius=100){const p=await request('/trains/'+number+'/live?date='+date+'&haltsOnly=false&includeCoordinates=true');normalize(p,number,date);const id=number+date+p.data.lastUpdatedAt+':'+offset+':'+radius;const cached=behindCache.get(id);if(cached&&Date.now()-cached.time<60000)return cached.data;if(behindPending.has(id))return behindPending.get(id);const job=discover(p.data,request,Date.now(),offset,radius).then(result=>{const data=envelope(p,result);if(behindCache.size>80)behindCache.clear();if(!data.data.failed)behindCache.set(id,{time:Date.now(),data});return data;}).finally(()=>behindPending.delete(id));behindPending.set(id,job);return job;},
 async stationLive(code,offset=0){
  if(useRailKit()) return railkitData.stationPage(code);
  const key=code+':'+offset,c=stationCache.get(key);if(c&&Date.now()-c.time<45000)return c.data;
  if(stationPending.has(key))return stationPending.get(key);
  const job=this.stationPage(code,offset).then(data=>{if(!data.data.failed){if(stationCache.size>80)stationCache.clear();stationCache.set(key,{time:Date.now(),data});}return data;}).finally(()=>stationPending.delete(key));stationPending.set(key,job);return job;
 },
 async stationPage(code,offset=0){
  const p=await request('/stations/'+code+'/live?hours=4&includeIntermediate=true');
  if(p.data?.station?.code!==code||!Array.isArray(p.data.trains))fail('Live station response unavailable');
  const seen=new Set(),all=p.data.trains.filter(r=>{const n=String(r.train?.number||'');if(!/^\d{5}$/.test(n)||seen.has(n))return false;seen.add(n);return true;});
  const selected=all.slice(offset,offset+8),rows=[];let failed=0,checked=0,rateLimited=false,retryAfterSeconds=null;
  for(const row of selected){checked++;try{
   const number=String(row.train.number),date=row.live?.startDate;
   const live=await request('/trains/'+number+'/live?haltsOnly=false&includeCoordinates=true'+(/^\d{4}-\d{2}-\d{2}$/.test(date||'')?'&date='+date:''));
   const d=live.data;if(d?.trainNumber!==number)continue;
   const stop=d.route?.find(s=>s.stationCode===code);if(typeof stop?.isHalt!=='boolean')continue;
   const detail=normalize(live,number,d.startDate).stations.find(s=>s.code===code);
   const visit=stationVisit(d,code,detail);if(!visit)continue;
   rows.push({...boardRow(row,code,stop.isHalt),...locationFacts(d),...visit,journeyDate:d.startDate,currentLocation:locationFacts(d).lastReportedStation,status:visit.proximity||'upcoming',
    scheduledArrival:detail.arrival.scheduled,scheduledDeparture:detail.departure.scheduled,actualArrival:detail.arrival.actual,actualDeparture:detail.departure.actual,
    expectedArrival:detail.arrival.expected,expectedDeparture:detail.departure.expected,platform:detail.platform});
  }catch(e){failed++;if(e.status===429){rateLimited=true;retryAfterSeconds=e.retryAfterSeconds||120;break;}}}
  return envelope(p,{station:station(p.data.station),rows:rows.sort((a,b)=>(a.visitKind==='near'?0:Date.parse(a.visitTime))-(b.visitKind==='near'?0:Date.parse(b.visitTime))),radiusKm,rateLimited,retryAfterSeconds,windowHours:4,windowEnd:new Date(Date.now()+14400000).toISOString(),failed,partial:failed>0,totalCandidates:all.length,checked,nextOffset:rateLimited?offset+checked-1:offset+checked<all.length?offset+checked:null});
 },
 async location(number,date){const live=await this.live(number,date);return {...live,data:live.data.location};},
 async geometry(number){const p=await request('/trains/'+number+'/route?format=geojson&stops=true');if(String(p.data?.trainNumber)!==number)fail('Route geometry unavailable');const g=p.data.geojson?.geometry;return envelope(p,{coordinates:g?.type==='LineString'&&Array.isArray(g.coordinates)?g.coordinates.filter(c=>Array.isArray(c)&&c.length>=2&&Number.isFinite(c[0])&&Number.isFinite(c[1])&&Math.abs(c[0])<=180&&Math.abs(c[1])<=90):[],stations:(p.data.stops||[]).map(station)},'schedule');}
};

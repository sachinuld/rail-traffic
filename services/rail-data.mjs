import {request} from '../provider.mjs';
import {normalize,normalizeCoaches} from '../railradar.mjs';
import {discover} from '../nearby.mjs';
import {train,station,envelope,boardRow,locationOf,num} from './normalize.mjs';
const behindCache=new Map();
const fail=message=>{const e=Error(message);e.status=502;throw e;};
export const railData={
 async stationSearch(q){const p=await request('/lookup/search/stations?q='+encodeURIComponent(q)+'&limit=10');if(!Array.isArray(p.data))fail('Station search response unavailable');return envelope(p,p.data.map(station),'schedule');},
 async trainSearch(q){const p=await request('/lookup/search/trains?q='+encodeURIComponent(q)+'&limit=5');if(!Array.isArray(p.data))fail('Train search response unavailable');const rows=p.data.slice(0,5).map(train);for(const row of rows){if(!row.runDays.length&&/^\d{5}$/.test(row.number)){try{const full=(await this.schedule(row.number)).data.train;row.runDays=full.runDays;row.from=full.from||row.from;row.to=full.to||row.to;}catch{}}}return envelope(p,rows,'schedule');},
 async between(from,to,date){const p=await request('/trains/between/'+from+'/'+to+'?date='+date+'&live=true');if(!Array.isArray(p.data?.trains))fail('Route search response unavailable');return envelope(p,p.data.trains.map(r=>({...train(r.train),from:p.data.from?.name||from,to:p.data.to?.name||to,runDays:r.train?.runDays||[],journeyDate:r.live?.startDate||null,boardingDay:r.from?.day||null,departure:r.from?.departure||null,arrival:r.to?.arrival||null})),'schedule');},
 async schedule(number){const p=await request('/trains/'+number+'?haltsOnly=false');if(String(p.data?.train?.number)!==number||!Array.isArray(p.data.route))fail('Schedule response unavailable');return envelope(p,{train:train(p.data.train),route:p.data.route.map(s=>({...station(s.station),isHalt:typeof s.isHalt==='boolean'?s.isHalt:null,arrival:s.arrival||null,departure:s.departure||null,arrivalDay:s.arrivalDay||null,departureDay:s.departureDay||null,platform:s.platform??null,distance:num(s.distance)}))},'schedule');},
 async live(number,date){const p=await request('/trains/'+number+'/live?date='+date+'&haltsOnly=false');const n=normalize(p,number,date);n.location=locationOf(p.data);n.train.status=p.data.status||null;n.train.runDays=p.data.train?.runDays||[];n.stations=n.stations.map((s,i)=>({...s,distance:num(p.data.route[i]?.distance),delayArrival:num(p.data.route[i]?.delayArrival),delayDeparture:num(p.data.route[i]?.delayDeparture),isCurrent:s.code===p.data.currentLocation?.stationCode,currentStatus:s.code===p.data.currentLocation?.stationCode?p.data.currentLocation?.status:null}));return envelope(p,n);},
 async coaches(number,stationCode){const p=await request('/trains/'+number+'/coaches/'+stationCode);const n=normalizeCoaches(p,number,stationCode),details=p.data.rake||p.data.coaches||[];n.coaches=n.coaches.map(c=>({...c,classType:details.find(r=>r.position===c.position&&r.code===c.code)?.classType||null}));return envelope(p,n,'schedule');},
 async behind(number,date){const p=await request('/trains/'+number+'/live?date='+date+'&haltsOnly=false');normalize(p,number,date);const id=number+date+p.data.lastUpdatedAt;const cached=behindCache.get(id);if(cached&&Date.now()-cached.time<60000)return cached.data;const data=envelope(p,await discover(p.data,request));if(behindCache.size>80)behindCache.clear();behindCache.set(id,{time:Date.now(),data});return data;},
 async stationLive(code){
  const p=await request('/stations/'+code+'/live?hours=4&includeIntermediate=true');
  if(p.data?.station?.code!==code||!Array.isArray(p.data.trains))fail('Live station response unavailable');
  let checked=0;
  const rows=[];
  for(const row of p.data.trains){
   let halt=typeof row.stop?.isHalt==='boolean'?row.stop.isHalt:typeof row.isHalt==='boolean'?row.isHalt:null;
   // Never infer NON-STOP just because an arrival time is absent.
   if(halt===null&&checked<6&&/^\d{5}$/.test(String(row.train?.number||''))){
    checked++;
    try{const schedule=await this.schedule(String(row.train.number));const s=schedule.data.route.find(s=>s.code===code);if(s)halt=s.isHalt;}catch{}
   }
   rows.push(boardRow(row,code,halt));
  }
  return envelope(p,{station:station(p.data.station),rows,window:p.data.window||null,partial:rows.some(r=>r.isHalt===null),message:'−4 घंटे से अगले 4 घंटे की सेवा-आधारित सूची। यह सभी ट्रेनों की गारंटी नहीं है।'});
 },
 async location(number,date){const live=await this.live(number,date);return {...live,data:live.data.location};},
 async geometry(number){const p=await request('/trains/'+number+'/route?format=geojson&stops=true');if(String(p.data?.trainNumber)!==number)fail('Route geometry unavailable');const g=p.data.geojson?.geometry;return envelope(p,{coordinates:g?.type==='LineString'&&Array.isArray(g.coordinates)?g.coordinates.filter(c=>Array.isArray(c)&&c.length>=2&&Number.isFinite(c[0])&&Number.isFinite(c[1])&&Math.abs(c[0])<=180&&Math.abs(c[1])<=90):[],stations:(p.data.stops||[]).map(station)},'schedule');}
};

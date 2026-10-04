import {railkit} from './railkit.mjs';
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const parseDelay=v=>{if(typeof v==='number'&&Number.isFinite(v))return v;const m=String(v??'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null;};
const normalizeJourneyDate=v=>{if(!v)return null;const s=String(v);let m=s.match(/^(\d{2})-(\d{2})-(\d{4})$/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);if(m){const mo={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'}[m[2]];return mo?`${m[3]}-${mo}-${m[1].padStart(2,'0')}`:null;}return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;};
const isoFromTime=(value,journeyDate)=>{if(!value||value==='--'||value==='SRC'||value==='DSTN')return null;const s=String(value).trim();if(/T/.test(s)&&Number.isFinite(Date.parse(s)))return new Date(s).toISOString();const m=s.match(/^(\d{1,2}):(\d{2})(?:\s+(\d{1,2})-(\d{1,2})-(\d{4}))?/);if(!m)return null;const [_,hh,mm,dd,mo,yy]=m;const d=dd?`${yy}-${mo.padStart(2,'0')}-${dd.padStart(2,'0')}`:normalizeJourneyDate(journeyDate);const dt=new Date(`${d}T${hh.padStart(2,'0')}:${mm}:00+05:30`);return Number.isFinite(dt.getTime())?dt.toISOString():null;};
const trainInfo=d=>({number:String(d?.trainNo||d?.trainInfo?.train_no||''),name:d?.trainName||d?.trainInfo?.train_name||'',from:d?.sourceStationName||d?.trainInfo?.from_stn_name||null,to:d?.destinationStationName||d?.trainInfo?.to_stn_name||null,runDays:typeof d?.trainInfo?.running_days==='string'?d.trainInfo.running_days.split('').map((x,i)=>x==='1'?['sun','mon','tue','wed','thu','fri','sat'][i]:null).filter(Boolean):[]});
const station=s=>({code:s?.stationCode||s?.stnCode||'',name:s?.stationName||s?.stnName||s?.code||'',lat:num(s?.lat??s?.coordinates?.latitude),lng:num(s?.lon??s?.coordinates?.longitude)});
const envelope=(data,payload,source='RailKit NTES')=>({mode:'live',source,updatedAt:new Date().toISOString(),receivedAt:new Date().toISOString(),data});
function buildLive(number,date,ntes,wimt=null,info=null){
 const d=ntes.data||{},ti=d.trainInfo||{};
 const timeline=Array.isArray(d.timeline)?d.timeline:[];
 const wd=wimt?.data||{};
 const currentCode=wd.currentLocation?.stnCode||d.currentStationCode||timeline.find(x=>x.status==='current')?.stationCode||null;
 const idx=timeline.findIndex(x=>x.stationCode===currentCode);
 const cur=idx>=0?timeline[idx]:null,next=idx>=0?timeline[idx+1]:null,prev=idx>0?timeline[idx-1]:null;
 const infoRoute=info?.data?.route||[];
 const coordFor=code=>{const x=infoRoute.find(s=>s.stnCode===code)?.coordinates;return x&&Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude))?{lat:Number(x.latitude),lng:Number(x.longitude)}:null;};
 const route=timeline.map(s=>({stationCode:s.stationCode,stationName:s.stationName,isHalt:s.type==='stoppage',status:s.status,platform:s.platform??null,distance:s.distanceKm??null,arrival:s.arrival||{},departure:s.departure||{},...coordFor(s.stationCode)}));
 const here=route.find(s=>s.stationCode===currentCode)||null;
 const loc={near:here?{...here,stationCode:here.stationCode,stationName:here.stationName}:null,lastReportedStation:wd.currentLocation?.stnName||cur?.stationName||currentCode,position:here?.lat!=null?{lat:here.lat,lng:here.lng}:null,positionKind:here?.lat!=null?'reported-at-station':'unavailable',previous:prev?{code:prev.stationCode,name:prev.stationName}:null,next:next?{code:next.stationCode,name:next.stationName}:null,speedKmh:num(wd.speedKmh??wd.currentLocation?.speedKmh),bearingDegrees:null,updatedAt:d.lastUpdate||wd.lastUpdatedAt||null,status:wd.status||d.status||'running'};
 const stations=route.map(s=>({code:s.stationCode,name:s.stationName,platform:s.platform,arrival:{scheduled:s.arrival?.scheduled||null,actual:s.arrival?.actual||null,expected:null},departure:{scheduled:s.departure?.scheduled||null,actual:s.departure?.actual||null,expected:null},isHalt:s.isHalt,rawStatus:s.status}));
 return {train:{number:String(d.trainNo||wd.trainInfo?.[0]?.number||number),name:d.trainName||wd.trainInfo?.[0]?.name||ti.train_name||'',routeName:[d.sourceStationName||ti.from_stn_name||wd.trainInfo?.[0]?.source?.name,d.destinationStationName||ti.to_stn_name||wd.trainInfo?.[0]?.destination?.name].filter(Boolean).join(' → '),delayMinutes:parseDelay(wd.delayMinutes??d.delayMinutes??cur?.arrival?.delay??cur?.departure?.delay),status:wd.status||d.status||null},location:loc,stations,journeyDate:normalizeJourneyDate(d.date||wd.startDate)||date};
}
export const railkitData={
 async stationSearch(q){const p=await railkit.stationSearch(q);const rows=(p.data?.stations||[]).map(s=>({code:s.code,name:s.name,city:null,lat:s.lat,lon:s.lon}));return envelope(rows,p,'RailKit');},
 async live(number,date){const [p, w, info]=await Promise.all([railkit.ntes(number,date),railkit.wimt(number,date).catch(()=>null),railkit.trainInfo(number).catch(()=>null)]);return envelope(buildLive(number,date,p,w,info),p,'RailKit NTES + WIMT');},
 async stationPage(code){
  const p=await railkit.stationLive(code,4);
  const stationData=await railkit.stationInfo(code).catch(()=>null);
  const rows=[];
  for(const r of (p.data?.trains||[])){
   const number=String(r.trainNo||''); if(!/^\d{5}$/.test(number)) continue;
   const journeyDate=normalizeJourneyDate(r.runDate)||new Date().toISOString().slice(0,10);
   let ntes=null,wimt=null,info=null;
   try{ [ntes,info]=await Promise.all([railkit.ntes(number,journeyDate),railkit.trainInfo(number)]); try{wimt=await railkit.wimt(number,journeyDate);}catch{} }catch{continue;}
   const ld=ntes.data||{}, wd=wimt?.data||{}, timeline=Array.isArray(ld.timeline)?ld.timeline:[];
   const stop=timeline.find(s=>s.stationCode===code); if(!stop) continue;
   const scheduled=(info.data?.route||[]).find(s=>s.stnCode===code);
   const isHalt=stop.type==='stoppage'||Number(scheduled?.haltMinutes||0)>0;
   const current=(wd.currentLocation?.stnCode||ld.currentStationCode)===code;
   const coord=(info.data?.route||[]).find(s=>s.stnCode===code)?.coordinates;
   const position=coord&&Number.isFinite(Number(coord.latitude))&&Number.isFinite(Number(coord.longitude))?{lat:Number(coord.latitude),lng:Number(coord.longitude)}:null;
   const delay=parseDelay(r.arrival?.delay||r.departure?.delay||stop.arrival?.delay||stop.departure?.delay||wd.delayMinutes);
   rows.push({number,name:r.trainName||ld.trainName||wd.trainInfo?.[0]?.name||'',from:r.sourceName||r.source||info.data?.trainInfo?.from_stn_name||'',to:r.destinationName||r.destination||info.data?.trainInfo?.to_stn_name||'',stationCode:code,isHalt,journeyDate,status:current?'passing':'upcoming',visitKind:!isHalt&&current?'near':'upcoming',visitTime:isoFromTime(r.arrival?.actual||r.arrival?.scheduled||r.departure?.actual||r.departure?.scheduled,journeyDate),scheduledArrival:isoFromTime(r.arrival?.scheduled||scheduled?.arrival,journeyDate),scheduledDeparture:isoFromTime(r.departure?.scheduled||scheduled?.departure,journeyDate),actualArrival:isoFromTime(r.arrival?.actual,journeyDate),actualDeparture:isoFromTime(r.departure?.actual,journeyDate),expectedArrival:null,expectedDeparture:null,expectedPassingTime:!isHalt?isoFromTime(r.arrival?.actual||r.arrival?.scheduled||r.departure?.actual||r.departure?.scheduled,journeyDate):null,platform:r.platform??scheduled?.platform??null,delayMinutes:delay,currentLocation:wd.currentLocation?.stnName||ld.currentStationCode===code?(stop.stationName||code):null,lastReportedLocation:wd.currentLocation?.stnName||stop.stationName||code,updatedAt:wd.lastUpdatedAt||null,speedKmh:num(wd.speedKmh),distanceKm:!isHalt&&current?0:null,position});
  }
  return envelope({station:stationData?.data||{code,name:code},rows:rows.sort((a,b)=>a.visitKind==='near'?-1:b.visitKind==='near'?1:Date.parse(a.visitTime||'')-Date.parse(b.visitTime||'')),windowHours:4,windowEnd:new Date(Date.now()+14400000).toISOString(),rateLimited:false,failed:0,partial:false,totalCandidates:p.data?.totalTrains||rows.length,checked:rows.length,nextOffset:null},p,'RailKit NTES + WIMT');
 }
};
function dateFromLive(d){const m=String(d.lastUpdate||'').match(/(\d{2})-(\d{2})-(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:null;}

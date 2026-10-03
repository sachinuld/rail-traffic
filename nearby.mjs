import {locationFacts} from './accuracy.mjs';
// Feed rows discover candidates only. Ordering always uses separately checked live runs.
export const BEHIND_RADIUS_KM=100;
export const FRESH_MS=5*60*1000;
export function fresh(d,now=Date.now()){
 const t=Date.parse(d?.lastUpdatedAt);
 return d?.isLive===true && d.status==='running' && Number.isFinite(t) && now-t<=FRESH_MS && t-now<=60000;
}
function routeOf(d){
 const r=d?.route;
 if(!Array.isArray(r)||r.length<3)return null;
 const codes=r.map(s=>s.stationCode);
 if(codes.some(c=>typeof c!=='string'||!c)||new Set(codes).size!==codes.length)return null;
 if(r.some((s,i)=>!Number.isFinite(s.distance)||(i>0&&s.distance<=r[i-1].distance)))return null;
 return r;
}
function segment(d,r){
 const loc=d.currentLocation;
 if(!loc||loc.isDiverted||loc.isActualPosition===false||loc.provenance==='predicted'||(d.exceptions||[]).length)return null;
 const i=r.findIndex(s=>s.stationCode===loc.stationCode);
 if(i<0||i>=r.length-1||!['arrived','departed'].includes(loc.status))return null;
 // Do not turn scheduled/predicted times or segmentProgress into exact GPS positions.
 return {i,end:loc.status==='arrived'?i:i+1};
}
export function context(d,now=Date.now()){
 if(!fresh(d,now))return null;
 const route=routeOf(d);if(!route)return null;
 const pos=segment(d,route);return pos?{route,pos}:null;
}
export function candidates(base,feed,limit=Infinity,now=Date.now(),radius=BEHIND_RADIUS_KM){
 const c=context(base,now);if(!c)return [];
 const indices=new Map(c.route.map((s,i)=>[s.stationCode,i]));
 const home=c.route[c.pos.i].distance,seen=new Set(),rows=[];
 for(const row of feed){
 const number=String(row.train_number||'');if(!/^\d{5}$/.test(number)||number===base.trainNumber||seen.has(number))continue;
 const i=indices.get(row.current_station),j=indices.get(row.next_station);
 if(i===undefined||j===undefined||j<=i)continue;
 const gap=c.route[i].distance-home;if(gap>=0||home-c.route[j].distance>radius)continue;
 seen.add(number);rows.push({number,gap:Math.abs(gap)});
 }
 rows.sort((a,b)=>a.gap-b.gap);
 return rows.slice(0,limit).map(r=>r.number);
}
export function compare(base,other,now=Date.now()){
 if(other?.trainNumber===base?.trainNumber)return null;
 const a=context(base,now),b=context(other,now);if(!a||!b)return null;
 if(Math.abs(Date.parse(base.lastUpdatedAt)-Date.parse(other.lastUpdatedAt))>120000)return null;
 const mapped=a.route.findIndex(s=>s.stationCode===b.route[b.pos.i].stationCode);if(mapped<0)return null;
 // Require a contiguous, equally ordered shared route across BOTH positions,
 // plus at least three stations. This rejects branches, reverse travel and loops.
 let left=Math.min(a.pos.i,mapped),right=Math.max(a.pos.i+1,mapped+1);
 if(right-left<2){if(left>0)left--;else right++;}
 if(right>=a.route.length)return null;
 const offset=b.pos.i-mapped;
 for(let i=left;i<=right;i++)if(b.route[i+offset]?.stationCode!==a.route[i].stationCode)return null;
 const alo=a.route[a.pos.i].distance,ahi=a.route[a.pos.end].distance;
 const blo=a.route[mapped].distance,bhi=a.route[mapped+(b.pos.end-b.pos.i)].distance;
 let relation='uncertain',min=0,max=0;
 if(blo>ahi){relation='ahead';min=blo-ahi;max=bhi-alo;}
 else if(bhi<alo){relation='behind';min=alo-bhi;max=ahi-blo;}
 else {max=Math.max(Math.abs(bhi-alo),Math.abs(ahi-blo));}

 return {number:other.trainNumber,name:other.trainName||other.trainNumber,journeyDate:other.startDate,relation,
 distanceMinKm:Math.floor(min),distanceMaxKm:Math.ceil(max),station:b.route[b.pos.i].stationName||b.route[b.pos.i].stationCode,
 nextStation:b.route[b.pos.i+1].stationName||b.route[b.pos.i+1].stationCode,
 ...locationFacts(other,now),direction:'same',nextHalt:nextHaltTimes(other),locationStatus:other.currentLocation.status,updatedAt:other.lastUpdatedAt,distanceKind:'reported-route-range'};
}
export async function discover(base,request,now=Date.now(),offset=0,radius=BEHIND_RADIUS_KM){
 if(![50,100].includes(radius))throw Object.assign(Error("Radius must be 50 or 100 KM"),{status:400});
 if(!context(base,now))return {items:[],checked:0,failed:0,totalCandidates:0,nextOffset:null,state:'unavailable',message:'आपकी ट्रेन का ताज़ा, तुलनीय रूट डेटा नहीं मिला। पहले लाइव स्थिति फिर देखें।'};
 const map=await request('/legacy/trains/live-map');
 if(map?.success!==true||!Array.isArray(map.data))throw Error('Invalid map response');
 const all=candidates(base,map.data,Infinity,now,radius),selected=all.slice(offset,offset+8),items=[];let failed=0,rejected=0,rateLimited=false,boundaryUncertain=0,retryAfterSeconds=null,checked=0;
 // Bounded parallelism; provider quota and shared caching are enforced by request().
 for(let i=0;i<selected.length;i+=3){
 const results=await Promise.allSettled(selected.slice(i,i+3).map(async n=>{
 const p=await request('/trains/'+n+'/live?haltsOnly=false&includeCoordinates=true');
 const d=p?.data;
 if(p?.success!==true||d?.trainNumber!==n||!/^\d{4}-\d{2}-\d{2}$/.test(d?.startDate||''))throw Error('Wrong run');
 return compare(base,d,Date.now());
 }));
 checked+=results.length;for(const result of results){if(result.status==='rejected'){failed++;if(result.reason?.status===429){rateLimited=true;retryAfterSeconds=Math.max(retryAfterSeconds||0,result.reason.retryAfterSeconds||120);}}else if(result.value?.relation==='behind'&&result.value.distanceMaxKm<=radius)items.push(result.value);else{if(result.value?.relation==='behind'&&result.value.distanceMinKm<=radius)boundaryUncertain++;rejected++;}}
 if(rateLimited)break;
 }
 for(const item of items)if(!item.trainType)item.trainType=map.data.find(r=>String(r.train_number)===item.number)?.type||null;
 items.sort((a,b)=>a.distanceMinKm-b.distanceMinKm);
 return {items:items.slice(0,10),radiusKm:radius,boundaryUncertain,rateLimited,retryAfterSeconds,retryOffset:failed?offset:null,state:failed?'partial':'checked',checked,failed,rejected,totalCandidates:all.length,nextOffset:offset+selected.length<all.length?offset+selected.length:null,baseUpdatedAt:base.lastUpdatedAt,
 message:'Authorized feed candidates, verified in pages. Coverage depends on provider; empty results do not mean a clear track.'};
}

// Future "actual" fields from the provider are estimates, never observed arrivals.
export function nextHaltTimes(d){
 const route=d.route||[],i=route.findIndex(s=>s.stationCode===d.currentLocation?.stationCode);
 if(i<0)return null;
 const stop=route.slice(i+1).find(s=>s.isHalt===true && !['departed','skipped','cancelled'].includes(s.status));
 if(!stop)return null;
 const valid=v=>typeof v==='string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v))?v:null;
 const expected=(event)=>{
 const schedule=valid(stop['scheduled'+event]);if(!schedule)return null;
 const supplied=valid(stop['actual'+event]);
 if(supplied)return supplied;
 const delay=stop['delay'+event];
 return Number.isFinite(delay)?new Date(Date.parse(schedule)+delay*60000).toISOString():null;
 };
 return {code:stop.stationCode,name:stop.stationName||stop.stationCode,
 scheduledArrival:valid(stop.scheduledArrival),scheduledDeparture:valid(stop.scheduledDeparture),
 expectedArrival:expected('Arrival'),expectedDeparture:expected('Departure')};
}

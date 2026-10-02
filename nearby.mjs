// Feed rows discover candidates only. Ordering always uses separately checked live runs.
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
export function candidates(base,feed,limit=6,now=Date.now()){
 const c=context(base,now);if(!c)return [];
 const indices=new Map(c.route.map((s,i)=>[s.stationCode,i]));
 const home=c.route[c.pos.i].distance,seen=new Set(),groups=[[],[],[]];
 for(const row of feed){
 const number=String(row.train_number||'');if(!/^\d{5}$/.test(number)||number===base.trainNumber||seen.has(number))continue;
 const i=indices.get(row.current_station),j=indices.get(row.next_station);
 if(i===undefined||j===undefined||j<=i)continue;
 const gap=c.route[i].distance-home;if(Math.abs(gap)>100)continue;
 seen.add(number);groups[gap>0?0:gap<0?1:2].push({number,gap:Math.abs(gap)});
 }
 groups.forEach(g=>g.sort((a,b)=>a.gap-b.gap));
 const result=[];for(let n=0;result.length<limit&&groups.some(g=>g.length>n);n++)for(const g of groups)if(g[n]&&result.length<limit)result.push(g[n].number);
 return result;
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
 if(min>100)return null;
 return {number:other.trainNumber,name:other.trainName||other.trainNumber,journeyDate:other.startDate,relation,
 distanceMinKm:Math.floor(min),distanceMaxKm:Math.ceil(max),station:b.route[b.pos.i].stationName||b.route[b.pos.i].stationCode,
 nextStation:b.route[b.pos.i+1].stationName||b.route[b.pos.i+1].stationCode,
 locationStatus:other.currentLocation.status,updatedAt:other.lastUpdatedAt,estimated:true};
}
export async function discover(base,request,now=Date.now()){
 if(!context(base,now))return {items:[],state:'unavailable',message:'आपकी ट्रेन का ताज़ा, तुलनीय रूट डेटा नहीं मिला। पहले लाइव स्थिति फिर देखें।'};
 const map=await request('/legacy/trains/live-map');
 if(map?.success!==true||!Array.isArray(map.data))throw Error('Invalid map response');
 const selected=candidates(base,map.data,6,now),items=[];let failed=0,rejected=0;
 // Bounded parallelism; provider quota and shared caching are enforced by request().
 for(let i=0;i<selected.length;i+=3){
 const results=await Promise.allSettled(selected.slice(i,i+3).map(async n=>{
 const p=await request('/trains/'+n+'/live?haltsOnly=false');
 const d=p?.data;
 if(p?.success!==true||d?.trainNumber!==n||!/^\d{4}-\d{2}-\d{2}$/.test(d?.startDate||''))throw Error('Wrong run');
 return compare(base,d,Date.now());
 }));
 for(const result of results)if(result.status==='rejected')failed++;else if(result.value)items.push(result.value);else rejected++;
 }
 items.sort((a,b)=>a.distanceMinKm-b.distanceMinKm);
 return {items,state:failed?'partial':'checked',checked:selected.length,failed,rejected,baseUpdatedAt:base.lastUpdatedAt,
 message:'लगभग 100 किमी के दायरे में अधिकतम 6 संभावित ट्रेनों की जाँच। यह सभी ट्रेनों की पूरी सूची नहीं है; खाली परिणाम का अर्थ रास्ता खाली होना नहीं है।'};
}

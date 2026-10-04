import {point,num,iso} from './normalize.mjs';
export const MAX_AGE=300000;
export const radiusKm=Math.max(0.5,Math.min(20,Number(process.env.STATION_RADIUS_KM)||5));
export function isFresh(stamp,now=Date.now()){const t=Date.parse(stamp);return Number.isFinite(t)&&now-t<=MAX_AGE&&t-now<=60000;}
export function km(a,b){if(!a||!b)return null;const rad=x=>x*Math.PI/180,dlat=rad(b.lat-a.lat),dlon=rad(b.lng-a.lng);return 6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2)));}
export function reportedPoint(d){
 const l=d?.currentLocation;if(!l||l.isActualPosition===false||l.provenance==='predicted'||l.isDiverted||(d.exceptions||[]).length)return null;
 const exact=point(l);if(exact)return exact;
 const route=Array.isArray(d.route)?d.route:[],i=route.findIndex(s=>s.stationCode===l.stationCode),here=route[i],next=route[i+1];
 if(l.status==='arrived')return point(here);
 const progress=Number(l.segmentProgress);
 const a=point(here),b=point(next);
 if(a&&b&&Number.isFinite(progress)&&progress>=0&&progress<=1){
  const lat=a.lat+(b.lat-a.lat)*progress;
  const lng=a.lng+(b.lng-a.lng)*progress;
  if(Number.isFinite(lat)&&Number.isFinite(lng))return {lat,lng};
 }
 return null;
}
export function nearStation(d,code,radius=radiusKm,now=Date.now()){
 if(d?.isLive!==true||d.status!=='running'||!isFresh(d.lastUpdatedAt,now))return null;
 const route=d.route||[],stop=route.find(s=>s.stationCode===code),loc=d.currentLocation;
 if(!stop||!loc||loc.isActualPosition===false||loc.provenance==='predicted'||loc.isDiverted||(d.exceptions||[]).length)return null;
 if(loc.stationCode===code&&loc.status==='arrived')return {stationCode:code,stationName:stop.stationName||code,distanceKm:0,proximity:stop.isHalt===false?'passing':'at'};
 const distance=km(reportedPoint(d),point(stop));if(distance===null||distance>radius)return null;
 return {stationCode:code,stationName:stop.stationName||code,distanceKm:Math.round(distance*100)/100,proximity:distance<=0.2&&stop.isHalt===false?'passing':'near'};
}
export function locationFacts(d,now=Date.now()){
 const route=d.route||[],i=route.findIndex(s=>s.stationCode===d.currentLocation?.stationCode);
 const near=route.map(s=>nearStation(d,s.stationCode,radiusKm,now)).filter(Boolean).sort((a,b)=>a.distanceKm-b.distanceKm)[0]||null;
 return {near,position:isFresh(d.lastUpdatedAt,now)&&d.status==='running'?reportedPoint(d):null,updatedAt:iso(d.lastUpdatedAt),
 currentStation:near?.stationName||null,lastReportedStation:route[i]?.stationName||d.currentLocation?.stationCode||null,
 previous:route[i-1]?.stationName||null,next:route[i+1]?.stationName||null,
 speedKmh:num(d.currentLocation?.speedKmh),bearingDegrees:num(d.currentLocation?.bearingDegrees),
 trainType:d.train?.type||d.trainType||null,delayMinutes:num(d.delayMinutes)};
}
export function normalizeBlueprint(raw){
 if(!raw||!Array.isArray(raw.cabins))return null;
 const seats=a=>Array.isArray(a)?a.filter(s=>Number.isInteger(s.number)&&s.number>0&&typeof s.type==='string').map(s=>({number:s.number,type:s.type})):[];
 const cabins=raw.cabins.map(c=>({number:c.cabinNumber,main:seats(c.main),side:seats(c.side)})).filter(c=>c.main.length||c.side.length);
 const all=cabins.flatMap(c=>[...c.main,...c.side]).map(s=>s.number);
 if(!all.length||new Set(all).size!==all.length)return null;
 return {classCode:raw.classCode||null,totalBerths:num(raw.totalBerths),cabins,complete:Number.isInteger(raw.totalBerths)&&all.length===raw.totalBerths};
}

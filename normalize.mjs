// Provider-independent contracts. Unknown facts stay null.
export const num=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
export const iso=v=>typeof v==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v))?v:null;
export const point=s=>num(s?.lat)!==null&&num(s?.lng)!==null&&Math.abs(s.lat)<=90&&Math.abs(s.lng)<=180?{lat:s.lat,lng:s.lng}:null;
export const station=s=>({code:s?.code||s?.stationCode||'',name:s?.name||s?.stationName||s?.code||'',city:s?.city||null,...point(s)});
export const train=t=>({number:String(t?.number||t?.trainNumber||''),name:t?.name||t?.trainName||'',from:typeof t?.source==='object'?t.source.name||t.source.code:t?.source||null,to:typeof t?.destination==='object'?t.destination.name||t.destination.code:t?.destination||null,runDays:Array.isArray(t?.runDays)?t.runDays:[]});
export function envelope(payload,data,kind='live'){
 return {mode:kind,source:'RailRadar',updatedAt:iso(payload?.data?.lastUpdatedAt)||null,receivedAt:new Date().toISOString(),data};
}
export function boardRow(row,code,isHalt=null){
 const l=row.live||{},s=row.stop||{};
 const at=['at-station','departed'].includes(l.type),departed=l.type==='departed';
 return {...train(row.train),stationCode:code,isHalt,
  journeyDate:l.startDate||null,status:l.type||'scheduled',platform:l.platform??s.platform??null,delayMinutes:num(l.delayMinutes),
  scheduledArrival:s.arrival||null,scheduledDeparture:s.departure||null,
  expectedArrival:iso(l.expectedArrivalTime),expectedDeparture:iso(l.expectedDepartureTime),
  actualArrival:at?iso(l.actualArrivalTime):null,actualDeparture:departed?iso(l.actualDepartureTime):null,
  expectedPassingTime:iso(l.expectedPassingTime),currentLocation:l.currentLocation?.stationName||l.currentLocation?.stationCode||null,
  speedKmh:num(l.currentLocation?.speedKmh),lastReportedLocation:l.lastReportedLocation||null,updatedAt:iso(l.lastUpdatedAt)};
}
export function locationOf(d){
 const r=Array.isArray(d.route)?d.route:[],loc=d.currentLocation||{},i=r.findIndex(s=>s.stationCode===loc.stationCode),here=r[i];
 const exact=point(loc);
 const position=exact||(loc.status==='arrived'?point(here):null);
 return {position,positionKind:exact?(loc.isActualPosition===false||loc.provenance==='predicted'?'provider-estimate':'reported-coordinate'):position?'reported-at-station':'unavailable',
 lastReportedStation:here?.stationName||loc.stationCode||null,lastReportedPoint:point(here),
 previous:r[i-1]?station(r[i-1]):null,next:r[i+1]?station(r[i+1]):null,
 speedKmh:num(loc.speedKmh),bearingDegrees:num(loc.bearingDegrees),
 updatedAt:iso(d.lastUpdatedAt),status:d.status||null,
 nearbyStations:r.slice(Math.max(0,i-2),Math.max(0,i)+4).map(station)};
}

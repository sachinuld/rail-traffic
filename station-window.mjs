import {isFresh,nearStation} from './accuracy.mjs';
// A future visit is not a claim that the train is physically near the station.
export function stationVisit(d,code,detail,now=Date.now()){
 if(d?.isLive!==true||!isFresh(d.lastUpdatedAt,now)||d.status!=='running')return null;
 if(d.currentLocation?.isDiverted||(d.exceptions||[]).length)return null;
 const stop=d.route?.find(s=>s.stationCode===code);if(typeof stop?.isHalt!=='boolean')return null;
 const near=nearStation(d,code,undefined,now);
 if(near)return {...near,visitKind:'near',visitTime:null,timeBasis:null};
 if(['departed','skipped','cancelled','arrived'].includes(stop.status))return null;
 const route=d.route||[],current=route.findIndex(s=>s.stationCode===d.currentLocation?.stationCode),target=route.indexOf(stop);
 if(current<0||target<=current)return null;
 const expected=detail?.arrival?.expected||(!stop.isHalt?detail?.departure?.expected:null);
 const scheduled=detail?.arrival?.scheduled||(!stop.isHalt?detail?.departure?.scheduled:null);
 const visitTime=expected||scheduled,when=Date.parse(visitTime);
 if(!Number.isFinite(when)||when<now||when>now+4*60*60*1000)return null;
 return {stationCode:code,stationName:stop.stationName||code,distanceKm:null,proximity:null,visitKind:'upcoming',visitTime,timeBasis:expected?'expected':'scheduled'};
}

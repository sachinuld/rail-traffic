import test from 'node:test';
import assert from 'node:assert/strict';
import {nearStation,reportedPoint,normalizeBlueprint} from './accuracy.mjs';
import {candidates,discover} from './nearby.mjs';
const now=Date.now();
const run=(number='10000',index=16)=>({trainNumber:number,trainName:number,startDate:'2026-10-03',isLive:true,status:'running',lastUpdatedAt:new Date(now).toISOString(),currentLocation:{stationCode:'S'+index,status:'arrived'},route:Array.from({length:20},(_,i)=>({stationCode:'S'+i,stationName:'Station '+i,distance:i*20,lat:26,lng:79+i*.2,isHalt:i%2===0}))});
test('station requires fresh actual proximity, not board membership or same route',()=>{
 const d=run();assert.equal(nearStation(d,'S16',5,now).proximity,'at');assert.equal(nearStation(d,'S1',5,now),null);
 d.currentLocation.status='departed';assert.equal(nearStation(d,'S16',5,now),null);assert.equal(reportedPoint(d),null);
 Object.assign(d.currentLocation,{lat:26,lng:82.21});assert.equal(nearStation(d,'S16',5,now).proximity,'near');
 d.currentLocation.isActualPosition=false;assert.equal(nearStation(d,'S16',5,now),null);
 delete d.currentLocation.isActualPosition;d.lastUpdatedAt=new Date(now-300001).toISOString();assert.equal(nearStation(d,'S16',5,now),null);
 d.lastUpdatedAt=new Date(now+120000).toISOString();assert.equal(nearStation(d,'S16',5,now),null);
});
test('nonstop requires explicit route pass-through and proximity',()=>{
 const d=run('10000',15);assert.equal(nearStation(d,'S15',5,now).proximity,'passing');assert.equal(nearStation(d,'OTHER',5,now),null);
 d.currentLocation.isDiverted=true;assert.equal(nearStation(d,'S15',5,now),null);
});
test('all behind candidates remain accessible beyond six and 100km via pages',async()=>{
 const base=run(),feed=Array.from({length:15},(_,i)=>({train_number:String(11000+i),current_station:'S'+i,next_station:'S'+(i+1)}));
 assert.equal(candidates(base,feed,undefined,now).length,15);
 const request=async path=>path.includes('live-map')?{success:true,data:feed}:{success:true,data:run(path.match(/trains\/(\d+)/)[1],Number(path.match(/trains\/(\d+)/)[1])-11000)};
 const first=await discover(base,request,now,0),second=await discover(base,request,now,first.nextOffset);
 assert.equal(first.items.length,8);assert.equal(second.items.length,7);assert.equal(second.nextOffset,null);assert.ok(second.items.some(i=>i.distanceMinKm>100));
 assert.equal(new Set([...first.items,...second.items].map(i=>i.number)).size,15);
});
test('blueprints use only supplied seats, flag incomplete data, reject duplicates',()=>{
 const raw={classCode:'3A',totalBerths:72,cabins:[{cabinNumber:1,main:[{number:21,type:'LB'},{number:22,type:'MB'}],side:[{number:27,type:'SL'}]}]};
 assert.equal(normalizeBlueprint(raw).complete,false);assert.equal(normalizeBlueprint(raw).cabins[0].side[0].number,27);
 raw.cabins[0].main.push({number:21,type:'LB'});assert.equal(normalizeBlueprint(raw),null);
 assert.equal(normalizeBlueprint({classCode:'GEN'}),null);
});

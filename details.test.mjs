import test from 'node:test';
import assert from 'node:assert/strict';
import {stationDetails,normalizeCoaches} from './railradar.mjs';
test('future actual fields are estimates; station delays are used without inventing times',()=>{
 const s=stationDetails({status:'upcoming',scheduledArrival:'2026-10-02T23:55:00+05:30',delayArrival:10,actualDeparture:'2026-10-03T00:10:00+05:30'});
 assert.equal(s.arrival.actual,null);assert.equal(s.arrival.expected,'2026-10-02T18:35:00.000Z');
 assert.equal(s.departure.actual,null);assert.equal(s.departure.expected,'2026-10-03T00:10:00+05:30');assert.equal(s.platform,null);
});
test('arrived status does not mark departure as observed',()=>{
 const s=stationDetails({status:'arrived',actualArrival:'2026-10-02T12:00:00+05:30',actualDeparture:'2026-10-02T12:05:00+05:30',platform:'2'});
 assert.ok(s.arrival.actual);assert.equal(s.departure.actual,null);assert.ok(s.departure.expected);assert.equal(s.platform,'2');
});
test('missing and skipped times have no predictions',()=>{
 assert.equal(stationDetails({}).arrival.expected,null);
 assert.equal(stationDetails({status:'skipped',scheduledArrival:'2026-10-02T12:00:00+05:30',delayArrival:5}).arrival.expected,null);
});
test('complete formation preserves coaches omitted from detailed sample list',()=>{
 const d=normalizeCoaches({success:true,data:{trainNumber:'12952',stationCode:'BRC',formation:'ENG-EOG-H1-A1',coaches:[{position:1,code:'ENG'},{position:3,code:'H1'}]}},'12952','BRC');
 assert.deepEqual(d.coaches.map(c=>c.code),['ENG','EOG','H1','A1']);
 assert.throws(()=>normalizeCoaches({success:true,data:{trainNumber:'12952',stationCode:'BRC'}},'12952','CNB'));
});

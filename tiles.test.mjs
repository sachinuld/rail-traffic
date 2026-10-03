import test from 'node:test';
import assert from 'node:assert/strict';
import {satelliteTile,imageryConfig} from './tiles.mjs';
test('satellite source is optional, validates indices, and keeps credentials server-side',async()=>{
 delete process.env.SATELLITE_TILE_URL;assert.equal(imageryConfig().available,false);await assert.rejects(satelliteTile(0,0,0),e=>e.status===503);await assert.rejects(satelliteTile(2,4,0),e=>e.status===400);
 const native=globalThis.fetch;let count=0;
 process.env.SATELLITE_TILE_URL='https://tiles.example/{z}/{x}/{y}?token=private-test-token';process.env.SATELLITE_ATTRIBUTION='Licensed provider';
 try{assert.ok(!JSON.stringify(imageryConfig()).includes('private-test-token'));globalThis.fetch=async url=>{count++;assert.equal(String(url),'https://tiles.example/2/1/3?token=private-test-token');return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}});};const [a,b]=await Promise.all([satelliteTile(2,1,3),satelliteTile(2,1,3)]);assert.equal(count,1);assert.equal(a.type,'image/png');assert.deepEqual(a.bytes,b.bytes);}finally{globalThis.fetch=native;delete process.env.SATELLITE_TILE_URL;delete process.env.SATELLITE_ATTRIBUTION;}
});

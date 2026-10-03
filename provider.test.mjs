import test from 'node:test';import assert from 'node:assert/strict';
import {request} from './provider.mjs';
test('cache coalesces equivalent queries and upstream 429 blocks retries but permits cached data',async()=>{
 const original=global.fetch;process.env.RAILRADAR_API_KEY='test-only';let calls=0;
 global.fetch=async url=>{calls++;return String(url).includes('/blocked')?new Response('{}',{status:429,headers:{'Retry-After':'7'}}):new Response(JSON.stringify({success:true,data:{value:1}}));};
 try{await Promise.all([request('/test?a=1&b=2'),request('/test?b=2&a=1')]);assert.equal(calls,1);await assert.rejects(request('/blocked'),e=>e.status===429&&e.retryAfterSeconds===7);await assert.rejects(request('/other'),e=>e.status===429&&e.retryAfterSeconds<=7);assert.equal(calls,2);assert.equal((await request('/test?b=2&a=1')).data.value,1);assert.equal(calls,2);}finally{global.fetch=original;delete process.env.RAILRADAR_API_KEY;}
});

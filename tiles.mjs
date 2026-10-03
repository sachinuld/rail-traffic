// Optional authorized imagery. Credentials stay on the server; callers select only tile indices.
const pending=new Map();let calls=[];
export function imageryConfig(){return {available:!!process.env.SATELLITE_TILE_URL,attribution:process.env.SATELLITE_ATTRIBUTION||'Satellite imagery provider'};}
export async function satelliteTile(z,x,y){
 if(!Number.isInteger(z)||z<0||z>19||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=2**z||y>=2**z){const e=Error('Invalid tile');e.status=400;throw e;}
 const template=process.env.SATELLITE_TILE_URL;if(!template){const e=Error('Satellite imagery connection required');e.status=503;throw e;}
 const id=`${z}/${x}/${y}`;if(pending.has(id))return pending.get(id);
 calls=calls.filter(t=>Date.now()-t<60000);if(calls.length>=120){const e=Error('Tile rate limit');e.status=429;throw e;}calls.push(Date.now());
 const work=(async()=>{const u=new URL(template.replaceAll('{z}',z).replaceAll('{x}',x).replaceAll('{y}',y));if(u.protocol!=='https:')throw Error('HTTPS tile source required');const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok||!/^image\/(png|jpeg|webp)/.test(r.headers.get('content-type')||'')){const e=Error('Satellite imagery unavailable');e.status=503;throw e;}const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>2000000)throw Error('Tile too large');return {bytes,type:r.headers.get('content-type')};})();pending.set(id,work);try{return await work;}finally{pending.delete(id);}
}

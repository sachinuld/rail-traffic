// Google Maps Static API proxy: the server key never leaves this process.
import {createHmac} from 'node:crypto';
import {railData} from './rail-data.mjs';
let requests=[];const cache=new Map();
export async function googleMap(number,date,zoom){
 if(!process.env.GOOGLE_MAPS_API_KEY){const e=Error('Google Maps API connection required');e.status=503;throw e;}
 const id=number+date+zoom,c=cache.get(id);if(c&&Date.now()-c.time<60000)return c.bytes;
 requests=requests.filter(t=>Date.now()-t<60000);if(requests.length>=10){const e=Error('Map rate limit. Retry after one minute.');e.status=429;throw e;}requests.push(Date.now());
 const l=(await railData.location(number,date)).data;
 const pos=l.position;
 if(!pos){const e=Error('Train coordinates unavailable');e.status=404;throw e;}
 const u=new URL('https://maps.googleapis.com/maps/api/staticmap');
 u.searchParams.set('size','640x400');u.searchParams.set('scale','2');
 u.searchParams.set('center',pos.lat+','+pos.lng);u.searchParams.set('zoom',String(zoom));
 u.searchParams.set('markers','color:blue|label:T|'+pos.lat+','+pos.lng);
 for(const s of l.nearbyStations||[])if(Number.isFinite(s.lat)&&Number.isFinite(s.lng))u.searchParams.append('markers','color:gray|size:tiny|'+s.lat+','+s.lng);
 try{
 const route=(await railData.geometry(number)).data.coordinates;
 // Map displays an explicitly simplified route; bounded URL length.
 if(route.length){const stride=Math.max(1,Math.ceil(route.length/70));const pts=route.filter((_,i)=>i%stride===0||i===route.length-1);u.searchParams.set('path','color:0x1675ccee|weight:3|'+pts.map(c=>c[1]+','+c[0]).join('|'));}
 }catch{}
 u.searchParams.set('key',process.env.GOOGLE_MAPS_API_KEY);
 if(process.env.GOOGLE_MAPS_SIGNING_SECRET){const secret=Buffer.from(process.env.GOOGLE_MAPS_SIGNING_SECRET.replace(/-/g,'+').replace(/_/g,'/'),'base64');const signature=createHmac('sha1',secret).update(u.pathname+u.search).digest('base64').replace(/\+/g,'-').replace(/\//g,'_');u.searchParams.set('signature',signature);}
 const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!r.ok||!r.headers.get('content-type')?.startsWith('image/')){const e=Error('Google Maps unavailable. Check server API configuration.');e.status=503;throw e;}
 const bytes=Buffer.from(await r.arrayBuffer());if(cache.size>30)cache.clear();cache.set(id,{time:Date.now(),bytes});return bytes;
}

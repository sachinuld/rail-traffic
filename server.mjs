import http from 'node:http';
import {railData} from './services/rail-data.mjs';
import {googleMap} from './services/maps.mjs';
import {readFile} from 'node:fs/promises';
const origin=process.env.ALLOWED_ORIGIN||'https://sachinuld.github.io';
const staticFiles=new Map(['index.html','style.css','app.js','manifest.json','sw.js','icon-192.png','icon-512.png','ui/api.js','ui/demo.js','ui/map.js','ui/view.js','fonts/hindi-regular.woff2','fonts/hindi-bold.woff2'].map(f=>['/'+f,f]));
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
const bad=message=>{const e=Error(message);e.status=400;throw e;};
export const server=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json; charset=utf-8');
 const send=(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));};
 if(req.headers.origin&&req.headers.origin!==origin&&req.headers.origin!=='http://'+req.headers.host&&req.headers.origin!=='https://'+req.headers.host)return send(403,{error:'Origin not allowed'});
 if(req.method==='OPTIONS')return send(204,{});
 const u=new URL(req.url,'http://localhost'),path=u.pathname,q=u.searchParams;
 if(req.method!=='GET')return send(405,{error:'Method not allowed'});
 if(path==='/health')return send(200,{ok:true,version:'rail-live-6'});
 if(path==='/api/config')return send(200,{liveConnected:!!process.env.RAILRADAR_API_KEY,mapConnected:!!process.env.GOOGLE_MAPS_API_KEY,refreshSeconds:60,version:6});
 try{
  if(path==='/'||staticFiles.has(path)){const file=staticFiles.get(path)||'index.html';const bytes=await readFile(new URL('./'+file,import.meta.url));res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.woff2')?'font/woff2':file.endsWith('.png')?'image/png':'application/json');res.end(bytes);return;}
  const code=name=>{const v=q.get(name)||'';if(!/^[A-Z0-9]{1,10}$/.test(v))bad('सही स्टेशन चुनें।');return v;};
  const number=()=>{const n=q.get('train')||'';if(!/^\d{5}$/.test(n))bad('सही 5 अंकों का ट्रेन नंबर भरें।');return n;};
  const date=()=>{const d=q.get('date')||'';if(!validDate(d))bad('सही यात्रा शुरू होने की तारीख चुनें।');return d;};
  let data;
  if(path==='/api/stations'||path==='/api/trains'){const text=(q.get('q')||'').trim();if(text.length<2||text.length>80)bad('कम से कम 2 अक्षर भरें।');data=await railData[path==='/api/stations'?'stationSearch':'trainSearch'](text);}
  else if(path==='/api/between')data=await railData.between(code('from'),code('to'),date());
  else if(path==='/api/station')data=await railData.stationLive(code('station'));
  else if(path==='/api/schedule')data=await railData.schedule(number());
  else if(path==='/api/status')data=await railData.live(number(),date());
  else if(path==='/api/coaches')data=await railData.coaches(number(),code('station'));
  else if(path==='/api/nearby')data=await railData.behind(number(),date());
  else if(path==='/api/location')data=await railData.location(number(),date());
  else if(path==='/api/geometry')data=await railData.geometry(number());
  else if(path==='/api/map'){const zoom=Number(q.get('zoom')||10);if(!Number.isInteger(zoom)||zoom<5||zoom>16)bad('Invalid map zoom');const bytes=await googleMap(number(),date(),zoom);res.setHeader('Content-Type','image/png');res.end(bytes);return;}
  else return send(404,{error:'Not found'});
  send(200,data);
 }catch(e){send(e.status||502,{error:e.status?e.message:'Live data temporarily unavailable — सेवा का जवाब नहीं मिला।',code:e.status===429?'RATE_LIMIT':'DATA_UNAVAILABLE',retryAfterSeconds:e.status===429?120:60});}
});
if(process.env.NODE_ENV!=='test')server.listen(Number(process.env.PORT)||8080);

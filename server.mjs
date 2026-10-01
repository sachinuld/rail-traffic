import http from 'node:http';
import {getStatus} from './railradar.mjs';
const cache=new Map(),active=new Map();let calls=[];
const origin=process.env.ALLOWED_ORIGIN||'https://sachinuld.github.io';
export const server=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 const send=(s,d)=>{res.writeHead(s);res.end(JSON.stringify(d))};
 if(req.headers.origin&&req.headers.origin!==origin)return send(403,{error:'Origin not allowed'});
 if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
 const u=new URL(req.url,'http://localhost');
 if(req.method!=='GET'||u.pathname!=='/api/status')return send(404,{error:'Not found'});
 const train=u.searchParams.get('train')||'',date=u.searchParams.get('date')||'';
 if(!/^\d{5}$/.test(train)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return send(400,{error:'सही पाँच अंकों का ट्रेन नंबर और तारीख दें।'});
 const key=process.env.RAILRADAR_API_KEY;if(!key)return send(503,{error:'सर्वर में RailRadar API key अभी सेट नहीं है।'});
 const id=train+date,now=Date.now(),c=cache.get(id);if(c&&now-c.time<60000)return send(200,c.data);
 calls=calls.filter(t=>now-t<60000);if(calls.length>=10)return send(429,{error:'कृपया एक मिनट बाद प्रयास करें।'});
 try{if(!active.has(id)){calls.push(now);active.set(id,getStatus(train,date,key).finally(()=>active.delete(id)))}const data=await active.get(id);if(cache.size>=200)cache.delete(cache.keys().next().value);cache.set(id,{time:Date.now(),data});send(200,data)}catch(e){send(e.status||502,{error:e.status?e.message:'डेटा सेवा से सही जानकारी नहीं मिली।'})}
});
if(process.env.NODE_ENV!=='test')server.listen(Number(process.env.PORT)||8080);

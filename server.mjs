import http from 'node:http';
import {normalize} from './railradar.mjs';
import {request} from './provider.mjs';
import {discover} from './nearby.mjs';
const origin=process.env.ALLOWED_ORIGIN||'https://sachinuld.github.io';
const cache=new Map(),active=new Map();
export const server=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 const send=(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));};
 if(req.headers.origin&&req.headers.origin!==origin)return send(403,{error:'Origin not allowed'});
 if(req.method==='OPTIONS')return send(204,{});
 const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/health')return send(200,{ok:true,version:'behind-3'});
 if(req.method!=='GET'||!['/api/status','/api/nearby'].includes(u.pathname))return send(404,{error:'Not found'});
 const train=u.searchParams.get('train')||'',date=u.searchParams.get('date')||'';
 if(!/^\d{5}$/.test(train)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return send(400,{error:'सही पाँच अंकों का ट्रेन नंबर और यात्रा शुरू होने की तारीख दें।'});
 try{
 const p=await request('/trains/'+train+'/live?date='+date+'&haltsOnly=false');
 const normal=normalize(p,train,date);
 if(u.pathname==='/api/status')return send(200,normal);
 const id=train+':'+date+':'+p.data.lastUpdatedAt,c=cache.get(id);
 if(c&&Date.now()-c.time<60000)return send(200,c.data);
 if(!active.has(id))active.set(id,discover(p.data,request).finally(()=>active.delete(id)));
 const data=await active.get(id);
 if(cache.size>=100)cache.delete(cache.keys().next().value);
 cache.set(id,{data,time:Date.now()});return send(200,data);
 }catch(e){send(e.status||502,{error:e.status?e.message:'डेटा सेवा से तुलनीय जानकारी नहीं मिली। कुछ देर बाद फिर देखें।'});}
});
if(process.env.NODE_ENV!=='test')server.listen(Number(process.env.PORT)||8080);

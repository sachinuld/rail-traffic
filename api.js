export const storage={
 get(key,fallback){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}},
 set(key,value){try{localStorage.setItem(key,value);}catch{}}
};
export class TrainDataService{
 constructor(){this.base=storage.get('rail-server',location.hostname==='localhost'||location.hostname==='127.0.0.1'?location.origin:'https://rail-traffic.onrender.com');this.cooldown=0;}
 configure(base){const u=new URL(base);if((u.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(u.hostname))||u.username||u.password)throw Error('सही HTTPS सर्वर पता भरें। API key यहाँ न डालें।');this.base=u.origin;this.compatible=undefined;storage.set('rail-server',this.base);}
 async config(){if(this.configPending)return this.configPending;this.configPending=this.fetch('/api/config',{}).then(c=>{const v=String(c.version||'0').split('.').map(x=>parseInt(x,10)||0);this.compatible=(v[0]>9)||(v[0]===9&&v[1]>=2);return c;}).finally(()=>{this.configPending=null;});return this.configPending;}
 async fetch(path,params={},signal){
  if(Date.now()<this.cooldown&&path!=='/api/config'){const e=Error('अनुरोध सीमा: थोड़ी देर बाद Retry करें।');e.status=429;e.retryAfterSeconds=Math.ceil((this.cooldown-Date.now())/1000);throw e;}
  const u=new URL(path,this.base);for(const [k,v]of Object.entries(params))if(v!==null&&v!==undefined)u.searchParams.set(k,String(v));
  const r=await fetch(u,{signal:signal||AbortSignal.timeout(90000)});let data;try{data=await r.json();}catch{throw Error('सर्वर का संस्करण या पता जाँचें। सही API जवाब नहीं मिला।');}
  if(!r.ok){const e=Error(data.error||'Live data temporarily unavailable');e.status=r.status;if(r.status===429){e.retryAfterSeconds=data.retryAfterSeconds||120;this.cooldown=Date.now()+e.retryAfterSeconds*1000;}throw e;}return data;
 }
 async get(path,params={},signal){if(this.compatible===undefined)await this.config();if(!this.compatible)throw Object.assign(Error('Backend upgrade required'),{code:'UPGRADE_REQUIRED'});const r=await this.fetch(path,params,signal);if(!['live','schedule'].includes(r.mode)||!('data'in r))throw Error('नया server.mjs और services फ़ोल्डर deploy करें।');return r;}
 stationSearch(q,signal){return this.get('/api/stations',{q},signal);}
 trainSearch(q){return this.get('/api/trains',{q});}
 liveTrain(train,date){return this.get('/api/status',{train,date});}
 liveStation(station,offset=0){return this.get('/api/station',{station,offset});}
 schedule(train){return this.get('/api/schedule',{train});}
 coachPosition(train,station){return this.get('/api/coaches',{train,station});}
 trainLocation(train,date){return this.get('/api/location',{train,date});}
}
export const service=new TrainDataService();

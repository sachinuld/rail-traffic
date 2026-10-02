const $=id=>document.getElementById(id);
const time=value=>{const n=Date.parse(value);return Number.isFinite(n)?new Date(n).toLocaleString('hi-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}):'उपलब्ध नहीं';};
$('date').value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
try{$('endpoint').value=localStorage.getItem('rail-server')||'https://rail-traffic.onrender.com';}catch{$('endpoint').value='https://rail-traffic.onrender.com';}
let generation=0,current=null,coachGeneration=0;
function text(tag,value,cls){const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;}
function endpoint(){const u=new URL($('endpoint').value.trim());if(u.protocol!=='https:'||u.username||u.password)throw Error('सही HTTPS सर्वर पता भरें।');return u.origin;}
async function call(base,path,q){const url=new URL(path,base);url.searchParams.set('train',q.train);url.searchParams.set('date',q.date);if(q.station)url.searchParams.set('station',q.station);const r=await fetch(url,{signal:AbortSignal.timeout(90000)});let data;try{data=await r.json();}catch{throw Error('सर्वर से सही जवाब नहीं मिला। फिर प्रयास करें।');}if(!r.ok)throw Error(data.error||'सेवा अभी उपलब्ध नहीं है।');return data;}
function clearNearby(){ $('nearby').replaceChildren();$('nearby-message').textContent='बटन दबाने पर पीछे की संभावित ट्रेनों का लाइव स्टेटस अलग से जाँचा जाएगा।';$('nearby-search').disabled=false;}
function render(data){
 const t=data.train;if(data.demo||!t?.number)throw Error('सर्वर से सही लाइव जानकारी नहीं मिली।');
 $('notice').textContent='RailRadar से प्राप्त जानकारी — हर ट्रेन के अपडेट का समय देखें।';
 $('name').textContent=t.number+' • '+t.name;$('route').textContent=t.routeName||'';
 $('stats').replaceChildren();for(const [label,value] of [['आखिरी दर्ज स्टेशन',t.currentStation||'उपलब्ध नहीं'],['अगला ठहराव',t.nextStation||'उपलब्ध नहीं'],['देरी',Number.isFinite(t.delayMinutes)?t.delayMinutes+' मिनट':'उपलब्ध नहीं']]){const e=text('div',label,'stat');e.append(text('b',value));$('stats').append(e);}
 $('updated').textContent='डेटा का समय: '+time(data.updatedAt)+(Date.now()-Date.parse(data.updatedAt)>300000?' • पुराना अपडेट':'');

 $('stations').replaceChildren();$('coach-station').replaceChildren();resetCoaches();
 for(const s of data.stations||[]){
  const card=text('article','','station'+(s.isHalt===true?' station-halt':''));

  const center=text('div','','station-center');
  center.append(text('h3',s.name),text('small',s.code||'','station-code'));
  const info=text('div','','station-info');
  info.append(text('span','PF '+(s.platform??'—')+(s.platformChanged?' • बदला है':''),'platform'));
  if(s.isHalt===true)info.append(text('span','ठहराव','halt-badge'));
  center.append(info,text('p',s.status,'muted'));
  function eventCell(event,label){
   const cell=text('div','','event-time');cell.setAttribute('aria-label',label);
   cell.append(text('span',time(event?.scheduled),'scheduled'));
   cell.append(text('small',(event?.actual?'दर्ज: ':'संभावित: ')+time(event?.actual||event?.expected),'live-time'));
   return cell;
  }
  card.append(eventCell(s.arrival,'आगमन'),center,eventCell(s.departure,'प्रस्थान'));
  $('stations').append(card);
  if(s.isHalt&&s.code){const opt=text('option',s.name+' ('+s.code+')');opt.value=s.code;$('coach-station').append(opt);}
 }
 $('coach-search').disabled=!$('coach-station').options.length;

 clearNearby();$('result').hidden=false;
}
async function search(){
 const mine=++generation;current=null;$('result').hidden=true;$('message').textContent='स्थिति आ रही है… सर्वर बंद पड़ा हो तो जागने में लगभग एक मिनट लग सकता है।';
 try{const q={train:$('query').value.trim(),date:$('date').value,base:endpoint()};const data=await call(q.base,'/api/status',q);if(mine!==generation)return;render(data);current=q;$('message').textContent='';}
 catch(e){if(mine===generation)$('message').replaceChildren(text('div',e.name==='TimeoutError'?'सर्वर जवाब देने में समय ले रहा है। फिर कोशिश करें।':e.message,'error'));}
}
async function nearby(){
 if(!current)return;const mine=generation,q={...current};$('nearby-search').disabled=true;$('nearby').replaceChildren();$('nearby-message').textContent='रूट, दिशा और अपडेट का समय मिलाया जा रहा है…';
 try{const data=await call(q.base,'/api/nearby',q);if(mine!==generation)return;
 if(!Array.isArray(data.items))throw Error('सर्वर का नया संस्करण अभी चालू नहीं हुआ है।');
 $('nearby-message').textContent=(data.state==='unavailable'?(data.message||'तुलनीय जानकारी उपलब्ध नहीं है।'):'')+(Number.isFinite(data.checked)?'जाँची गई: '+data.checked+' ट्रेनें।':'')+(data.failed?' '+data.failed+' ट्रेनों की जाँच पूरी नहीं हुई।':'')+(data.baseUpdatedAt?' आपकी ट्रेन का तुलना-समय: '+time(data.baseUpdatedAt):'');
 for(const [rel,title] of [['behind','आपके पीछे']]){
 const section=text('section','','nearby-grid');const rows=data.items.filter(n=>n.relation===rel).slice(0,6);
 for(const n of rows){const card=text('article','','train');card.append(text('h3',n.number+' • '+n.name));
 card.append(text('p',n.locationStatus==='arrived'?n.station+' पर दर्ज':n.station+' → '+n.nextStation+' के बीच रिपोर्ट की गई स्थिति'));
 if(rel!=='uncertain')card.append(text('p','स्टेशन-खंडों से दूरी की सीमा: लगभग '+n.distanceMinKm+'–'+n.distanceMaxKm+' किमी'));
 const halt=n.nextHalt;
 if(halt){
 card.append(text('h4','अगला ठहराव: '+halt.name));

 const times=text('div','','times');
 for(const [label,schedule,expected] of [['आगमन',halt.scheduledArrival,halt.expectedArrival],['प्रस्थान',halt.scheduledDeparture,halt.expectedDeparture]]){
 const cell=text('div','','time-cell');cell.append(text('b',label),text('p','निर्धारित: '+time(schedule)),text('p','संभावित: '+time(expected)));times.append(cell);
 }
 card.append(times);

 }else card.append(text('p','अगले ठहराव का समय: जानकारी उपलब्ध नहीं','muted'));
 card.append(text('p','अपडेट: '+time(n.updatedAt)+' • यात्रा शुरू: '+n.journeyDate,'muted'));section.append(card);}
 if(!rows.length)section.append(text('p','इस जाँच में तुलनीय ट्रेन नहीं मिली।','muted'));$('nearby').append(section);
 }
 }catch(e){if(mine===generation)$('nearby-message').textContent='पीछे की ट्रेनों की खोज पूरी नहीं हुई: '+(e.name==='TimeoutError'?'सर्वर ने समय पर जवाब नहीं दिया। फिर प्रयास करें।':e.message);}
 finally{if(mine===generation)$('nearby-search').disabled=false;}
}
$('search').onsubmit=e=>{e.preventDefault();search();};$('refresh').onclick=search;$('nearby-search').onclick=nearby;
for(const id of ['query','date','endpoint'])$(id).addEventListener('input',()=>{generation++;current=null;$('result').hidden=true;$('message').textContent='';});
$('endpoint').addEventListener('change',()=>{try{localStorage.setItem('rail-server',$('endpoint').value.trim());}catch{}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

function resetCoaches(){coachGeneration++;$('coaches').replaceChildren();$('coach-message').textContent='';$('coach-search').disabled=false;}
async function coaches(){
 if(!current)return;
 const mine=generation,requestId=++coachGeneration,q={...current,station:$('coach-station').value};
 $('coach-search').disabled=true;$('coaches').replaceChildren();$('coach-message').textContent='कोच का क्रम आ रहा है…';
 try{
  const data=await call(q.base,'/api/coaches',q);if(mine!==generation||requestId!==coachGeneration)return;
  if(!Array.isArray(data.coaches))throw Error('कोच डेटा उपलब्ध नहीं है। सर्वर का नया संस्करण लगाएँ।');
  $('coach-message').textContent=data.coaches.length?data.station+' • प्लेटफॉर्म '+(data.platform??'उपलब्ध नहीं')+' • सेवा से प्राप्त क्रम':'इस स्टेशन के लिए कोच क्रम उपलब्ध नहीं है।';
  for(const c of data.coaches){const el=text('li','','coach');el.append(text('small','स्थान '+c.position),text('strong',c.code));$('coaches').append(el);}
 }catch(e){if(mine===generation&&requestId===coachGeneration)$('coach-message').textContent='कोच क्रम नहीं मिला: '+(e.name==='TimeoutError'?'फिर प्रयास करें।':e.message);}
 finally{if(mine===generation&&requestId===coachGeneration)$('coach-search').disabled=false;}
}
$('coach-form').onsubmit=e=>{e.preventDefault();coaches();};
$('coach-station').onchange=resetCoaches;

for(const button of document.querySelectorAll('[data-view]')){
 button.addEventListener('click',()=>{
  for(const panel of document.querySelectorAll('.view-panel'))panel.hidden=panel.id!==button.dataset.view;
  for(const tab of document.querySelectorAll('[data-view]'))tab.setAttribute('aria-pressed',String(tab===button));
 });
}

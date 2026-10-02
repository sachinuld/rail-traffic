import {service,storage} from './ui/api.js';
import {$,el,today,time,fullTime,status,badge,empty,meta,errorBox,field,events} from './ui/view.js';
import {schematic,mapFacts} from './ui/map.js';
const state={page:'home',train:null,date:today(),live:null,station:null,board:null,boardType:'halt',epoch:0,trainSeq:0,stationSeq:0,searchSeq:0,routeSeq:0,coachSeq:0,behindSeq:0,mapSeq:0,zoom:10,mapConnected:false,busyTrain:false,busyStation:false};
const picks=new Map();
$('boarding-date').value=today();$('journey-date').value=today();$('endpoint').value=service.base;
function theme(dark){document.documentElement.dataset.theme=dark?'dark':'light';$('dark-switch').checked=dark;storage.set('rail-theme',dark?'dark':'light');}
theme(storage.get('rail-theme','light')==='dark');
$('theme-toggle').onclick=()=>theme(document.documentElement.dataset.theme!=='dark');$('dark-switch').onchange=e=>theme(e.target.checked);
function connection(message){$('connection').classList.toggle('demo',service.demo);$('connection').textContent=service.demo?'DEMO DATA / Live API Not Connected — सभी ट्रेन स्थिति केवल उदाहरण हैं':message||'RailRadar API • लाइव जानकारी के अपडेट का समय देखें';$('demo-switch').checked=service.demo;}
function mode(demo){
 state.epoch++;state.trainSeq++;state.stationSeq++;state.searchSeq++;state.routeSeq++;state.coachSeq++;state.behindSeq++;state.mapSeq++;
 $('behind-load').disabled=false;$('coach-load').disabled=false;$('train-refresh').disabled=false;$('station-refresh').disabled=false;service.demo=demo;state.live=null;state.board=null;state.busyTrain=false;state.busyStation=false;
 state.train=null;state.station=null;picks.clear();
 for(const id of ['from','to','home-station','station-query']){$(id).value='';$(id+'-options').replaceChildren();}
 for(const id of ['route-results','train-results','station-results','station-unknown','coach-results','behind-results','timeline','train-error','map-canvas'])$(id).replaceChildren();
 $('train-content').hidden=true;$('train-empty').hidden=false;$('station-title').textContent='स्टेशन चुनें';$('station-notice').replaceChildren();
 connection();if(demo){setPick('from',{code:'ETW',name:'Etawah Junction',city:'Etawah'});setPick('to',{code:'CNB',name:'Kanpur Central',city:'Kanpur'});}
}
$('demo-home').onclick=()=>{mode(true);location.hash='home';};
$('demo-switch').onchange=e=>{mode(e.target.checked);if(!e.target.checked)connect();};
async function connect(){const epoch=state.epoch;try{const c=await service.config();if(epoch!==state.epoch)return;state.mapConnected=c.mapConnected===true;if(!c.liveConnected){mode(true);connection();$('settings-message').textContent='Live data unavailable – API connection required';}else connection();}catch(e){if(epoch!==state.epoch)return;connection('Live data unavailable – API connection required • More से connection जाँचें या Demo देखें');$('settings-message').textContent=e.message;}}
$('settings-form').onsubmit=async e=>{e.preventDefault();try{service.configure($('endpoint').value.trim());mode(false);await connect();$('settings-message').textContent=service.demo?'API key उपलब्ध नहीं। Demo चालू है।':'कनेक्शन जाँच पूरी हुई।';}catch(e){$('settings-message').textContent=e.message;}};
function navigate(){const page=location.hash.slice(1)||'home';state.page=['home','search','station','live','more'].includes(page)?page:'home';for(const n of document.querySelectorAll('[data-page]'))n.hidden=n.dataset.page!==state.page;for(const n of document.querySelectorAll('[data-nav]')){if(n.dataset.nav===state.page)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');}window.scrollTo(0,0);}
addEventListener('hashchange',navigate);navigate();
function setPick(id,s){picks.set(id,s);$(id).value=s.name+' ('+s.code+')';$(id+'-options').replaceChildren();$(id).setAttribute('aria-expanded','false');}
function requirePick(id){const selected=picks.get(id);if(selected)return selected;const value=$(id).value.trim().toUpperCase();if(/^[A-Z0-9]{1,10}$/.test(value))return {code:value,name:value};throw Error('सूची से स्टेशन चुनें या स्टेशन का कोड लिखें।');}
function setupPicker(id){
 let timer,seq=0,controller;
 const input=$(id),list=$(id+'-options');
 input.addEventListener('input',()=>{
  picks.delete(id);clearTimeout(timer);controller?.abort();const mine=++seq,epoch=state.epoch;list.replaceChildren();input.setAttribute('aria-expanded','false');
  const q=input.value.trim();if(q.length<2)return;
  timer=setTimeout(async()=>{
   controller=new AbortController();list.append(el('p','खोज रहे हैं…','option-message'));input.setAttribute('aria-expanded','true');
   try{const result=await service.stationSearch(q,controller.signal);if(mine!==seq||epoch!==state.epoch)return;list.replaceChildren();for(const s of result.data){const b=el('button',s.name+' • '+s.code,'option');b.type='button';b.setAttribute('role','option');b.append(el('small',s.city||'शहर की जानकारी उपलब्ध नहीं'));b.onclick=()=>{++seq;setPick(id,s);input.focus();};list.append(b);}if(!result.data.length)list.append(el('p','कोई स्टेशन नहीं मिला।','option-message'));}
   catch(e){if(mine===seq&&epoch===state.epoch&&e.name!=='AbortError')list.replaceChildren(el('p',e.message,'option-message'));}
  },450);
 });
 input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();list.querySelector('button')?.focus();}if(e.key==='Escape'){++seq;list.replaceChildren();input.setAttribute('aria-expanded','false');}});
 list.addEventListener('keydown',e=>{const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus();}if(e.key==='Escape'){list.replaceChildren();input.setAttribute('aria-expanded','false');input.focus();}});
 document.addEventListener('click',e=>{if(!input.parentElement.contains(e.target)){list.replaceChildren();input.setAttribute('aria-expanded','false');}});
}
['from','to','home-station','station-query'].forEach(setupPicker);
$('swap').onclick=()=>{const a=$('from').value,b=$('to').value,pa=picks.get('from'),pb=picks.get('to');$('from').value=b;$('to').value=a;picks.delete('from');picks.delete('to');if(pb)picks.set('from',pb);if(pa)picks.set('to',pa);};
function resultList(target,w,boardingDate){
 target.replaceChildren(el('p',meta(w),'micro'));
 if(!w.data.length){target.append(el('div','इस खोज में ट्रेन नहीं मिली।','empty'));return;}
 for(const t of w.data){const button=el('button','','search-result'),head=el('div','','result-head');head.append(el('h3',t.number+' • '+t.name),el('span','→'));button.append(head,el('small',(t.from||'From उपलब्ध नहीं')+' → '+(t.to||'To उपलब्ध नहीं')),el('small','Running days: '+(t.runDays?.length?t.runDays.join(' · '):'उपलब्ध नहीं — ट्रेन खोलकर समय-सारणी देखें')));
 if(t.departure||t.arrival)button.append(el('small','प्रस्थान '+time(t.departure)+' • आगमन '+time(t.arrival)));
 button.onclick=()=>{let date=t.journeyDate||today();if(!t.journeyDate&&boardingDate&&Number.isInteger(t.boardingDay)&&t.boardingDay>=1){const d=new Date(boardingDate+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(t.boardingDay-1));date=d.toISOString().slice(0,10);}openTrain(t.number,date);};target.append(button);}
}
async function searchTrains(q){const mine=++state.searchSeq,epoch=state.epoch;location.hash='search';$('train-query').value=q;empty($('train-results'),'ट्रेन खोज रहे हैं…');try{const w=await service.trainSearch(q);if(mine!==state.searchSeq||epoch!==state.epoch)return;resultList($('train-results'),w);}catch(e){if(mine===state.searchSeq&&epoch===state.epoch)errorBox($('train-results'),e,()=>searchTrains(q));}}
$('home-train-form').onsubmit=e=>{e.preventDefault();searchTrains($('home-train').value.trim());};
$('train-search-form').onsubmit=e=>{e.preventDefault();searchTrains($('train-query').value.trim());};
async function between(){const mine=++state.routeSeq,epoch=state.epoch;try{const from=requirePick('from'),to=requirePick('to'),date=$('boarding-date').value;if(from.code===to.code)throw Error('From और To अलग स्टेशन चुनें।');empty($('route-results'),'इस रूट की ट्रेनें खोज रहे हैं…');const w=await service.get('/api/between',{from:from.code,to:to.code,date});if(mine!==state.routeSeq||epoch!==state.epoch)return;resultList($('route-results'),w,date);$('route-results').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){if(mine===state.routeSeq&&epoch===state.epoch)errorBox($('route-results'),e,between);}}
$('between-form').onsubmit=e=>{e.preventDefault();between();};
function boardCard(r){
 const card=el('article','','board-card'),head=el('div','','result-head'),name=el('button',r.number+' • '+r.name);name.onclick=()=>openTrain(r.number,r.journeyDate||today());head.append(name,badge(r.delayMinutes));card.append(head);
 if(r.isHalt===false)card.append(el('span','NON-STOP','pill nonstop'));
 const facts=el('div','','board-times');
 for(const [label,value] of [['Expected Arrival',fullTime(r.expectedArrival)],['Actual Arrival',fullTime(r.actualArrival)],['Expected Departure',fullTime(r.expectedDeparture)],['Actual Departure',fullTime(r.actualDeparture)],['Scheduled Arrival',time(r.scheduledArrival)],['Scheduled Departure',time(r.scheduledDeparture)],['Platform',r.platform??'—'],['Train Status',r.status||'—']])facts.append(field(label,value,label.startsWith('Actual')||label.startsWith('Scheduled')?'normal-time':label.startsWith('Expected')?status(r.delayMinutes).cls:''));
 if(r.isHalt===false)for(const [label,value]of [['Current location',r.currentLocation],['Speed',Number.isFinite(r.speedKmh)?r.speedKmh+' km/h':null],['Last reported location',r.lastReportedLocation],['Expected passing',fullTime(r.expectedPassingTime)]])facts.append(field(label,value));
 card.append(facts,el('p','Last updated: '+fullTime(r.updatedAt),'micro'));return card;
}
function renderBoard(){
 if(!state.board)return;const w=state.board,d=w.data;$('station-title').textContent=d.station.name+' • '+d.station.code;
 $('station-notice').replaceChildren(el('p',meta(w),'micro'),el('p',d.message,'micro'));
 $('station-results').replaceChildren();const rows=d.rows.filter(r=>r.isHalt===(state.boardType==='halt'));for(const r of rows)$('station-results').append(boardCard(r));if(!rows.length)empty($('station-results'),'इस समय इस श्रेणी में पुष्टि की गई ट्रेन नहीं मिली।');
 $('station-unknown').replaceChildren();const unknown=d.rows.filter(r=>r.isHalt===null);
 if(unknown.length){const box=el('details','','card');box.append(el('summary',unknown.length+' ट्रेनें: ठहराव की पुष्टि उपलब्ध नहीं'));for(const r of unknown)box.append(boardCard(r));$('station-unknown').append(box);}
}
async function loadStation(background=false){
 if(!state.station)return;if(state.busyStation&&background)return;
 const mine=++state.stationSeq,epoch=state.epoch;state.busyStation=true;$('station-refresh').disabled=true;
 if(!background){$('station-notice').replaceChildren();empty($('station-results'),'स्टेशन की स्थिति आ रही है…');}
 try{const w=await service.liveStation(state.station.code);if(mine!==state.stationSeq||epoch!==state.epoch)return;state.board=w;renderBoard();}
 catch(e){if(mine===state.stationSeq&&epoch===state.epoch){errorBox($('station-notice'),e,()=>loadStation());if(!state.board)empty($('station-results'),'लाइव सूची उपलब्ध नहीं है। More से Demo Data आज़मा सकते हैं।');else $('station-notice').append(el('p','पुरानी सूची • '+meta(state.board),'micro'));}}
 finally{if(mine===state.stationSeq){state.busyStation=false;$('station-refresh').disabled=false;}}
}
function openStation(id){try{state.station=requirePick(id);state.board=null;$('station-unknown').replaceChildren();setPick('station-query',state.station);location.hash='station';loadStation();}catch(e){errorBox($('station-notice'),e,()=>openStation(id));location.hash='station';}}
$('home-station-form').onsubmit=e=>{e.preventDefault();openStation('home-station');};$('station-form').onsubmit=e=>{e.preventDefault();openStation('station-query');};$('station-refresh').onclick=()=>loadStation();
for(const b of document.querySelectorAll('[data-board]'))b.onclick=()=>{state.boardType=b.dataset.board;for(const x of document.querySelectorAll('[data-board]'))x.setAttribute('aria-pressed',String(x===b));renderBoard();};
function showTrainTab(name){for(const p of document.querySelectorAll('[data-train-panel]'))p.hidden=p.dataset.trainPanel!==name;for(const b of document.querySelectorAll('[data-train-tab]'))b.setAttribute('aria-pressed',String(b.dataset.trainTab===name));}
for(const b of document.querySelectorAll('[data-train-tab]'))b.onclick=()=>showTrainTab(b.dataset.trainTab);
function openTrain(number,date=today()){
 $('behind-load').disabled=false;$('coach-load').disabled=false;state.train=number;state.date=date;state.live=null;state.coachSeq++;state.behindSeq++;state.mapSeq++;
 $('journey-date').value=date;$('train-content').hidden=false;$('train-empty').hidden=true;$('train-title').textContent=number;
 for(const id of ['train-route','train-stats','timeline','coach-results','behind-results','train-meta','map-canvas'])$(id).replaceChildren();
 $('map-panel').hidden=true;$('radar-panel').hidden=true;$('coach-station').replaceChildren();showTrainTab('timeline');location.hash='live';loadTrain();
}
function timelineEvent(ev,delay){
 const cell=el('div','','time-cell');cell.append(el('span',time(ev?.scheduled),'normal-time'));
 cell.append(el('small',ev?.actual?'दर्ज '+time(ev.actual):'संभावित '+time(ev?.expected),ev?.actual?'normal-time':Number.isFinite(delay)?status(delay).cls:'muted'));
 if(Number.isFinite(delay))cell.append(el('small',status(delay).label,status(delay).cls));return cell;
}
function renderTrain(w){
 const d=w.data;state.live=w;$('train-title').textContent=d.train.number+' • '+d.train.name;$('train-route').textContent=d.train.routeName||'';
 $('train-meta').textContent=meta(w)+(w.updatedAt&&Date.now()-Date.parse(w.updatedAt)>300000?' • पुराना अपडेट':'');
 const stats=$('train-stats');stats.replaceChildren(field('आखिरी दर्ज स्टेशन',d.train.currentStation),field('अगला ठहराव',d.train.nextStation),field('Delay',status(d.train.delayMinutes).label,status(d.train.delayMinutes).cls),field('पिछला स्टेशन',d.location?.previous?.name),field('Running status',d.train.status),field('Speed',Number.isFinite(d.location?.speedKmh)?d.location.speedKmh+' km/h':null));
 const selected=$('coach-station').value;$('coach-station').replaceChildren();$('timeline').replaceChildren();let previousDate='';
 for(const s of d.stations||[]){
 const stamp=s.arrival?.scheduled||s.departure?.scheduled;const date=stamp?fullTime(stamp).split(',')[0]:'';if(date&&date!==previousDate){$('timeline').append(el('div',date+' • भारतीय समय','date-separator'));previousDate=date;}
 const row=el('article','','timeline-row'+(s.isHalt?' halt':'')+(s.isCurrent?' current':'')),center=el('div','','timeline-center');
 center.append(el('h3',s.name),el('p',s.code+(Number.isFinite(s.distance)?' • '+s.distance+' km':'')));
 const info=el('p','PF '+(s.platform??'—')+(s.platformChanged?' • बदला है':''));if(s.isHalt)info.append(el('span','● ठहराव','stop-badge'));center.append(info);
 if(s.isCurrent){const label=s.currentStatus==='arrived'?'● आखिरी रिपोर्ट: इस स्टेशन पर':'● आखिरी रिपोर्ट: यहाँ से प्रस्थान';center.append(el('div',label,'current-label'));}else center.append(el('p',s.status));
 row.append(timelineEvent(s.arrival,s.delayArrival),center,timelineEvent(s.departure,s.delayDeparture));$('timeline').append(row);
 if(s.isHalt){const opt=el('option',s.name+' ('+s.code+')');opt.value=s.code;$('coach-station').append(opt);}
 }
 if([...$('coach-station').options].some(o=>o.value===selected))$('coach-station').value=selected;
 $('coach-load').disabled=!$('coach-station').options.length;
 if(!$('radar-panel').hidden)renderRadar();
}
async function loadTrain(background=false){
 if(!state.train)return;if(state.busyTrain&&background)return;const mine=++state.trainSeq,epoch=state.epoch,number=state.train,date=state.date;
 state.busyTrain=true;$('train-refresh').disabled=true;$('train-error').replaceChildren();if(!state.live)empty($('timeline'),'ट्रेन का लाइव डेटा आ रहा है…');
 try{const w=await service.liveTrain(number,date);if(mine!==state.trainSeq||epoch!==state.epoch)return;renderTrain(w);}
 catch(e){
 if(mine!==state.trainSeq||epoch!==state.epoch)return;errorBox($('train-error'),e,()=>loadTrain());
 if(state.live)$('train-error').append(el('p','पुराना डेटा दिख रहा है • '+meta(state.live),'micro'));
 else{empty($('timeline'),'Live data unavailable – API connection required या इस यात्रा का डेटा उपलब्ध नहीं है।');
 const scheduleButton=el('button','समय-सारणी देखें','secondary');scheduleButton.onclick=()=>loadSchedule(number,epoch);$('train-error').append(scheduleButton);}
 }finally{if(mine===state.trainSeq){state.busyTrain=false;$('train-refresh').disabled=false;}}
}
async function loadSchedule(number,epoch){try{const w=await service.schedule(number);if(epoch!==state.epoch||number!==state.train)return;$('train-title').textContent=number+' • '+w.data.train.name;$('train-route').textContent=(w.data.train.from||'')+' → '+(w.data.train.to||'')+' • Running days: '+(w.data.train.runDays.join(' · ')||'उपलब्ध नहीं');$('train-meta').textContent=meta(w);$('timeline').replaceChildren(el('p','केवल समय-सारणी — लाइव स्थिति नहीं','connection'));$('coach-station').replaceChildren();for(const s of w.data.route){if(s.isHalt){const o=el('option',s.name+' ('+s.code+')');o.value=s.code;$('coach-station').append(o);}const row=el('article','','timeline-row'+(s.isHalt?' halt':''));const middle=el('div','','timeline-center');middle.append(el('h3',s.name),el('p',s.code+' • PF '+(s.platform??'—')+(s.isHalt?' • ठहराव':'')));row.append(el('div',time(s.arrival),'time-cell'),middle,el('div',time(s.departure),'time-cell'));$('timeline').append(row);}$('coach-load').disabled=!$('coach-station').options.length;}catch(e){errorBox($('train-error'),e,()=>loadSchedule(number,epoch));}}
$('train-refresh').onclick=()=>loadTrain();
function changeDate(date){if(state.train)openTrain(state.train,date);}
$('journey-date').onchange=e=>changeDate(e.target.value);$('today').onclick=()=>changeDate(today());
async function behind(){
 if(!state.train)return;const mine=++state.behindSeq,epoch=state.epoch;const number=state.train,date=state.date;$('behind-load').disabled=true;empty($('behind-results'),'पीछे की ट्रेनों के रूट और समय की तुलना हो रही है…');
 try{const w=await service.get('/api/nearby',{train:number,date});if(epoch!==state.epoch||mine!==state.behindSeq)return;const target=$('behind-results');target.replaceChildren(el('p',meta(w),'micro'),el('p',w.data.message,'micro'));const rows=w.data.items?.filter(t=>t.relation==='behind').slice(0,6)||[];
 for(const t of rows){const c=el('article','','card');c.append(el('h3',t.number+' • '+t.name),el('p',t.station+' → '+t.nextStation),el('p','लगभग '+t.distanceMinKm+'–'+t.distanceMaxKm+' km','muted'));if(t.nextHalt){c.append(el('p','अगला ठहराव: '+t.nextHalt.name),events({scheduled:t.nextHalt.scheduledArrival,expected:t.nextHalt.expectedArrival},{scheduled:t.nextHalt.scheduledDeparture,expected:t.nextHalt.expectedDeparture}));}c.append(el('p','अपडेट: '+fullTime(t.updatedAt)+' • यात्रा शुरू: '+t.journeyDate,'micro'));target.append(c);}
 if(!rows.length)target.append(el('div','इस जाँच में पीछे की तुलनीय ट्रेन नहीं मिली। इसका अर्थ रास्ता खाली होना नहीं है।','empty'));
 }catch(e){if(epoch===state.epoch&&mine===state.behindSeq)errorBox($('behind-results'),e,behind);}finally{if(mine===state.behindSeq)$('behind-load').disabled=false;}
}
$('behind-load').onclick=behind;
async function coaches(){
 const mine=++state.coachSeq,epoch=state.epoch,station=$('coach-station').value;if(!state.train||!station)return;$('coach-load').disabled=true;empty($('coach-results'),'कोच क्रम आ रहा है…');
 try{const w=await service.coachPosition(state.train,station);if(mine!==state.coachSeq||epoch!==state.epoch)return;const target=$('coach-results');target.replaceChildren(el('p',meta(w),'micro'),el('p',w.data.station+' • Platform '+(w.data.platform??'—')));
 const list=el('ol','','coach-list');for(const c of w.data.coaches){const type=c.classType||'',item=el('li','','coach'+(type==='LOCO'||c.code==='ENG'?' engine':['1A','2A','3A','CC','EC'].includes(type)?' ac':type==='GEN'?' general':''));item.append(el('small','स्थान '+c.position),el('strong',c.code),el('small',type||'—'));list.append(item);}target.append(list);if(!w.data.coaches.length)target.append(el('p','कोच जानकारी उपलब्ध नहीं है।','empty'));
 }catch(e){if(mine===state.coachSeq&&epoch===state.epoch)errorBox($('coach-results'),e,coaches);}finally{if(mine===state.coachSeq)$('coach-load').disabled=false;}
}
$('coach-form').onsubmit=e=>{e.preventDefault();coaches();};$('coach-station').onchange=()=>{state.coachSeq++;$('coach-results').replaceChildren();$('coach-load').disabled=false;};
function renderRadar(){const d=state.live?.data;if(!d)return;const l=d.location||{};$('radar-facts').replaceChildren(field('Location',l.lastReportedStation),field('Movement',l.positionKind),field('Delay',status(d.train.delayMinutes).label,status(d.train.delayMinutes).cls),field('Speed',Number.isFinite(l.speedKmh)?l.speedKmh+' km/h':null),field('Last update',fullTime(l.updatedAt)),field('Next station',l.next?.name));}
$('radar-open').onclick=()=>{$('radar-panel').hidden=!$('radar-panel').hidden;renderRadar();if(!$('radar-panel').hidden)$('radar-panel').scrollIntoView({behavior:'smooth'});};
async function map(){
 if(!state.train)return;const mine=++state.mapSeq,epoch=state.epoch;const number=state.train,date=state.date;$('map-panel').hidden=false;empty($('map-canvas'),'लोकेशन लोड हो रही है…');
 try{const w=await service.trainLocation(number,date);if(mine!==state.mapSeq||epoch!==state.epoch)return;const l=w.data;mapFacts($('map-facts'),l);const at=l.position;const point=at||l.lastReportedPoint;
 $('map-note').textContent=meta(w)+' • '+(l.positionKind==='provider-estimate'?'सेवा का अनुमानित स्थान':at?'सेवा से प्राप्त स्थान':'केवल आखिरी दर्ज स्टेशन; वर्तमान सटीक स्थान उपलब्ध नहीं')+' • रूट रेखा सरल की गई है।';
 if(service.demo||!state.mapConnected){schematic($('map-canvas'),l,l.nearbyStations||[],service.demo,state.zoom);$('map-note').append(document.createTextNode(service.demo?' • Google Maps demo fallback':' • Google Maps API Not Connected — सांकेतिक रूट।'));return;}
 if(!point){empty($('map-canvas'),'Live geographical coordinates unavailable');return;}
 const url=new URL('/api/map',service.base);url.search=new URLSearchParams({train:number,date,zoom:String(state.zoom)});
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Google Maps temporarily unavailable. Retry करें।');const blob=await response.blob();if(mine!==state.mapSeq||epoch!==state.epoch)return;
 const img=el('img');const src=URL.createObjectURL(blob);img.src=src;img.alt='Google Maps: ट्रेन का रिपोर्ट किया गया स्थान और सरल रूट';img.onload=()=>URL.revokeObjectURL(src);img.onerror=()=>URL.revokeObjectURL(src);$('map-canvas').replaceChildren(img);
 }catch(e){if(mine===state.mapSeq&&epoch===state.epoch)errorBox($('map-canvas'),e,map);}
}
$('inside').onclick=()=>{map();$('map-panel').scrollIntoView({behavior:'smooth'});};$('map-refresh').onclick=map;$('map-close').onclick=()=>{state.mapSeq++;$('map-panel').hidden=true;};
$('map-in').onclick=()=>{state.zoom=Math.min(16,state.zoom+1);map();};$('map-out').onclick=()=>{state.zoom=Math.max(5,state.zoom-1);map();};
setInterval(()=>{if(document.hidden||!$('auto-switch').checked||service.demo||Date.now()<service.cooldown)return;if(state.page==='live'){loadTrain(true);if(!$('map-panel').hidden)map();}if(state.page==='station')loadStation(true);},60000);
connect();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

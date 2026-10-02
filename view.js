export const $=id=>document.getElementById(id);
export function el(tag,txt='',cls=''){const n=document.createElement(tag);n.textContent=txt;if(cls)n.className=cls;return n;}
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function time(v){if(!v)return '—';if(/^\d{2}:\d{2}$/.test(v))return v;const d=new Date(v);return Number.isFinite(+d)?new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false}).format(d):'—';}
export function fullTime(v){if(!v)return 'उपलब्ध नहीं';const d=new Date(v);return Number.isFinite(+d)?new Intl.DateTimeFormat('hi-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(d):String(v);}
export function status(delay){return Number.isFinite(delay)?{label:delay>0?'+'+delay+' min Delay':delay<0?Math.abs(delay)+' min Early':'On Time',cls:delay>0?'late':'ontime'}:{label:'Delay उपलब्ध नहीं',cls:'muted'};}
export function badge(delay){const s=status(delay);return el('span',s.label,'pill '+s.cls);}
export function empty(target,message){target.replaceChildren(el('div',message,'empty'));}
export function meta(w){return w.mode==='demo'?'DEMO DATA • Live API Not Connected':w.mode==='schedule'?'समय-सारणी / सेवा से प्राप्त जानकारी':'RailRadar • Last updated: '+fullTime(w.updatedAt)+' • प्राप्त: '+fullTime(w.receivedAt);}
export function errorBox(target,error,retry){const box=el('div','','error');box.setAttribute('role','alert');box.append(el('strong','Live data temporarily unavailable'),el('p',error.message));const b=el('button','↻ Retry','secondary');b.onclick=retry;box.append(b);target.replaceChildren(box);}
export function field(label,value,cls=''){const n=el('div','','fact');n.append(el('small',label),el('strong',value??'उपलब्ध नहीं',cls));return n;}
export function events(arrival,departure,delay){
 const grid=el('div','','event-grid');
 for(const [label,event]of [['आगमन',arrival],['प्रस्थान',departure]]){
 const box=el('div');box.append(el('small',label),el('div',time(event?.scheduled),'normal-time'),el('small',event?.actual?'दर्ज '+time(event.actual):'संभावित '+time(event?.expected),event?.actual?'normal-time':Number.isFinite(delay)?status(delay).cls:'muted'));grid.append(box);
 }return grid;
}

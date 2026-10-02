import {el,empty,field,fullTime} from './view.js';
export function schematic(target,location,stations,demo,zoom=10){
 target.replaceChildren();
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 const scale=Math.pow(1.22,zoom-10),width=640/scale,height=330/scale;svg.setAttribute('viewBox',[(640-width)/2,(330-height)/2,width,height].join(' '));svg.setAttribute('role','img');svg.setAttribute('aria-label',demo?'Demo geographic station diagram':'रूट के स्टेशन का सांकेतिक चित्र, वास्तविक track map नहीं');
 const points=stations.filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lng));
 if(!points.length){empty(target,'स्थान के coordinates उपलब्ध नहीं हैं।');return;}
 const xs=points.map(p=>p.lng),ys=points.map(p=>p.lat),loX=Math.min(...xs),loY=Math.min(...ys),dx=Math.max(.01,Math.max(...xs)-loX),dy=Math.max(.01,Math.max(...ys)-loY);
 const xy=p=>[50+(p.lng-loX)/dx*530,275-(p.lat-loY)/dy*215];
 const line=document.createElementNS(ns,'polyline');line.setAttribute('points',points.map(p=>xy(p).join(',')).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#70b3d6');line.setAttribute('stroke-width','5');svg.append(line);
 for(const p of points){const [x,y]=xy(p);const c=document.createElementNS(ns,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r','6');c.setAttribute('fill','#16669b');svg.append(c);const label=document.createElementNS(ns,'text');label.setAttribute('x',x);label.setAttribute('y',y-13);label.setAttribute('text-anchor','middle');label.setAttribute('font-size','12');label.setAttribute('fill','#49667e');label.textContent=p.code;svg.append(label);}
 const pos=location.position||location.lastReportedPoint;
 if(pos){const [x,y]=xy(pos),c=document.createElementNS(ns,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r','10');c.setAttribute('fill','#ed8b32');c.setAttribute('stroke','white');c.setAttribute('stroke-width','3');svg.append(c);}
 target.append(svg,el('p',demo?'DEMO • उदाहरण स्थान, लाइव नहीं':'सांकेतिक स्टेशन-लाइन • वास्तविक track geometry नहीं','map-caption'));
}
export function mapFacts(target,l){target.replaceChildren(field('पिछला स्टेशन',l.previous?.name),field('अगला स्टेशन',l.next?.name),field('आखिरी रिपोर्ट',l.lastReportedStation),field('Speed',Number.isFinite(l.speedKmh)?l.speedKmh+' km/h':null),field('दिशा / bearing',Number.isFinite(l.bearingDegrees)?l.bearingDegrees+'°':null),field('Last updated',fullTime(l.updatedAt)));}

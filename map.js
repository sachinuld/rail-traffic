import {el,field,time,status,meta,fresh} from './view.js';
import {t,proximity,liveUnavailable} from './i18n.js';
let map,layer,routeLayer,fitted=false;
export function clearMap(){map?.remove();map=null;layer=null;routeLayer=null;fitted=false;}
export function drawMap(target,rows,geometry,openTrain,note){
 const valid=rows.filter(r=>fresh(r.updatedAt)&&r.position&&Number.isFinite(r.position.lat)&&Number.isFinite(r.position.lng));
 if(!valid.length){clearMap();target.replaceChildren(el('div',liveUnavailable()+' '+t('ताज़ा रिपोर्ट किए गए निर्देशांक नहीं मिले।','No fresh reported coordinates available.'),'empty'));note.textContent=t('अनुमानित या पुराने स्थान मैप पर नहीं दिखाए जाते।','Predicted or stale locations are not plotted.');return;}
 if(!window.L){note.textContent=t('मैप लोड नहीं हुआ। पेज फिर खोलें।','Map failed to load. Reload the page.');return;}
 note.textContent=valid.length+t(' ट्रेनों के रिपोर्ट किए गए स्थान • दिशा का तीर केवल उपलब्ध होने पर।',' reported train positions • direction arrow only when supplied.');
 if(!map){target.replaceChildren();map=L.map(target,{scrollWheelZoom:false,zoomControl:false});L.control.zoom({zoomInTitle:t('ज़ूम बढ़ाएँ','Zoom in'),zoomOutTitle:t('ज़ूम घटाएँ','Zoom out')}).addTo(map);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).on('tileerror',()=>{note.textContent=t('पृष्ठभूमि मैप उपलब्ध नहीं है। फिर कोशिश करें।','Background map unavailable. Please retry.');}).addTo(map);layer=L.layerGroup().addTo(map);}
 layer.clearLayers();routeLayer?.remove();routeLayer=null;
 if(geometry?.length)routeLayer=L.polyline(geometry.map(c=>[c[1],c[0]]),{color:'#246ea8',weight:3,opacity:.6,interactive:false}).addTo(map);
 for(const r of valid){const icon=el('div','','train-symbol');icon.append(el('span','🚆'),el('b',r.number));if(Number.isFinite(r.bearingDegrees)){const arrow=el('span','↑','direction-arrow');arrow.style.transform='rotate('+r.bearingDegrees+'deg)';icon.append(arrow);}
 const popup=el('div','','train-popup');popup.append(el('h3',r.number+' • '+r.name),field(t('वर्तमान / नज़दीकी स्टेशन','Current / nearest station'),r.near?.stationName||null,r.near?'near-station':''),field(t('आखिरी दर्ज स्टेशन','Last reported station'),r.lastReportedStation||r.station),field(t('स्थिति','Status'),r.near?proximity(r.near.proximity):t('रिपोर्ट किया गया स्थान','Reported location')),field(t('गति','Speed'),Number.isFinite(r.speedKmh)?r.speedKmh+' km/h':null),field(t('देरी','Delay'),status(r.delayMinutes).label,status(r.delayMinutes).cls),field(t('अगला स्टेशन','Next station'),r.nextStation||r.next),field(t('संभावित आगमन','ETA'),time(r.nextHalt?.expectedArrival)),el('p',meta({updatedAt:r.updatedAt}),'micro'));
 const button=el('button',t('पूरा लाइव स्टेटस देखें','View Full Train Status'),'primary');button.onclick=()=>openTrain(r.number,r.journeyDate);popup.append(button);
 L.marker([r.position.lat,r.position.lng],{icon:L.divIcon({html:icon,className:'train-marker',iconSize:[84,48],iconAnchor:[42,24]}),title:r.number+' '+r.name,alt:r.number+' '+r.name,keyboard:true}).bindPopup(popup,{minWidth:220,maxWidth:280,maxHeight:240,autoPanPaddingTopLeft:[10,25],autoPanPaddingBottomRight:[10,45]}).addTo(layer);
 }
 map.invalidateSize();if(!fitted){map.fitBounds(valid.map(r=>[r.position.lat,r.position.lng]),{padding:[50,50],maxZoom:13});fitted=true;}
}

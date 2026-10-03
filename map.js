import {el,field,time,status,meta,fresh} from './view.js';
import {t,proximity} from './i18n.js';
let streetLayer,satelliteLayer,imagery={},apiBase,latestRows=[],map,routeLayer,lastGeometry,points=[],fitted=false,tileFailed=false;
const markers=new Map();
export function configureImagery(config,base){imagery=config||{};apiBase=base;}
export function changeLayer(kind,note){if(!map)return;if(kind==='satellite'){if(!imagery.available){note.textContent=t('सैटेलाइट कनेक्शन उपलब्ध नहीं है। मूल RailRadar मैप नीचे दिए लिंक से खोलें।','Satellite connection unavailable. Open the original RailRadar map using the link below.');document.getElementById('map-layer').value='street';return;}
 if(!satelliteLayer){const safe=document.createElement('span');safe.textContent=imagery.attribution;satelliteLayer=L.tileLayer(apiBase+'/api/satellite-tile?z={z}&x={x}&y={y}',{maxZoom:19,attribution:safe.innerHTML}).on('tileerror',()=>{note.textContent=t('सैटेलाइट डेटा उपलब्ध नहीं है। सड़क मैप चुना जा सकता है।','Satellite data unavailable. Select the street map.');});}streetLayer.remove();satelliteLayer.addTo(map);
 }else{satelliteLayer?.remove();streetLayer.addTo(map);}}
export function searchMap(query,target){target.replaceChildren();if(!query.trim())return;const q=query.trim().toLocaleLowerCase();const rows=latestRows.filter(r=>[r.number,r.name,r.near?.stationName,r.lastReportedStation,r.station,r.nextStation,r.next].filter(Boolean).some(v=>String(v).toLocaleLowerCase().includes(q)));for(const r of rows.slice(0,10)){const b=el('button',r.number+' • '+r.name);b.onclick=()=>{const marker=markers.get(r.number+':'+r.journeyDate);if(marker){map.setView(marker.getLatLng(),13);marker.openPopup();}target.replaceChildren();};target.append(b);}if(!rows.length)target.append(el('p',t('लोड हुई ट्रेनों में नहीं मिला।','No match among loaded trains.')));}

export function clearMap(){map?.remove();map=null;routeLayer=null;lastGeometry=null;fitted=false;tileFailed=false;markers.clear();points=[];streetLayer=null;satelliteLayer=null;latestRows=[];}
export function resizeMap(){requestAnimationFrame(()=>map?.invalidateSize());}
export function fitMap(){if(map&&points.length)map.fitBounds(points,{padding:[45,45],maxZoom:13});}
export function drawMap(target,rows,geometry,openTrain,note){
 if(!window.L){note.textContent=t('मैप लोड नहीं हुआ। पेज फिर खोलें।','Map failed to load. Reload the page.');return;}
 const valid=rows.filter(r=>fresh(r.updatedAt)&&r.position&&Number.isFinite(r.position.lat)&&Number.isFinite(r.position.lng));
 if(!map){target.replaceChildren();map=L.map(target,{scrollWheelZoom:true,zoomControl:false}).setView([23.6,80],5);L.control.zoom({position:'bottomright',zoomInTitle:t('ज़ूम बढ़ाएँ','Zoom in'),zoomOutTitle:t('ज़ूम घटाएँ','Zoom out')}).addTo(map);streetLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).on('tileerror',()=>{tileFailed=true;note.textContent=t('पृष्ठभूमि मैप लोड नहीं हुआ। फिर कोशिश करें।','Background map could not load. Retry.');}).addTo(map);}
 note.textContent=(valid.length?valid.length+t(' रिपोर्ट किए गए स्थान • ट्रेन पर टैप करें',' reported positions • Tap a train'):t('लाइव निर्देशांक उपलब्ध नहीं हैं। केवल भौगोलिक मैप दिख रहा है।','Live coordinates unavailable. Showing the geographical map only.'))+(tileFailed?t(' • मैप टाइल लोड नहीं हुई',' • Map tiles unavailable'):'');
 latestRows=valid;
 const keys=new Set(valid.map(r=>r.number+':'+r.journeyDate));for(const [key,marker]of markers)if(!keys.has(key)){marker.remove();markers.delete(key);}
 if(lastGeometry!==geometry){routeLayer?.remove();routeLayer=null;lastGeometry=geometry;if(geometry?.length)routeLayer=L.polyline(geometry.map(c=>[c[1],c[0]]),{color:'#2779bb',weight:4,opacity:.8,interactive:false}).addTo(map);}
 for(const [index,r] of valid.entries()){
  const key=r.number+':'+r.journeyDate,icon=el('div','','radar-train');const shape=el('span','','radar-shape');const palette=['#24c7b7','#65aaff','#ffce38','#fa75b5','#50d47b'];shape.style.background=palette[Number(r.number)%palette.length];if(Number.isFinite(r.bearingDegrees)){shape.classList.add('has-heading');shape.style.transform='rotate('+r.bearingDegrees+'deg)';}icon.append(shape,el('b',r.number));
  const popup=el('div','','train-popup');popup.append(el('h3',r.number+' • '+r.name),field(t('वर्तमान / नज़दीकी स्टेशन','Current / nearest station'),r.near?.stationName||null,r.near?'near-station':''),field(t('आखिरी दर्ज स्टेशन','Last reported station'),r.lastReportedStation||r.station),field(t('स्थिति','Status'),r.near?proximity(r.near.proximity):t('रिपोर्ट किया गया स्थान','Reported location')),field(t('गति','Speed'),Number.isFinite(r.speedKmh)?r.speedKmh+' km/h':null),field(t('देरी','Delay'),status(r.delayMinutes).label,status(r.delayMinutes).cls),field(t('अगला स्टेशन','Next station'),r.nextStation||r.next),field(t('संभावित आगमन','ETA'),time(r.nextHalt?.expectedArrival)),el('p',meta({updatedAt:r.updatedAt}),'micro'));
  const button=el('button',t('पूरा लाइव स्टेटस देखें','View Full Train Status'),'primary');button.onclick=()=>openTrain(r.number,r.journeyDate);popup.append(button);
  let marker=markers.get(key);const markerIcon=L.divIcon({html:icon,className:'train-marker',iconSize:[44,44],iconAnchor:[22,22]});
  if(marker){marker.setLatLng([r.position.lat,r.position.lng]);marker.setIcon(markerIcon);marker.setPopupContent(popup);}else{marker=L.marker([r.position.lat,r.position.lng],{icon:markerIcon,title:r.number+' '+r.name,alt:r.number+' '+r.name,keyboard:true}).bindPopup(popup,{minWidth:220,maxWidth:280,maxHeight:230,autoPanPaddingBottomRight:[10,45]}).addTo(map);markers.set(key,marker);}
 }
 points=valid.map(r=>[r.position.lat,r.position.lng]);map.invalidateSize();if(!fitted&&points.length){fitMap();fitted=true;}
 target.querySelector('.leaflet-control-zoom-in')?.setAttribute('title',t('ज़ूम बढ़ाएँ','Zoom in'));target.querySelector('.leaflet-control-zoom-out')?.setAttribute('title',t('ज़ूम घटाएँ','Zoom out'));
}

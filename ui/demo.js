// Entirely illustrative fixtures. Never merged into a live response.
export const demoStations=[
 {code:'NDLS',name:'New Delhi',city:'Delhi',lat:28.642,lng:77.219},
 {code:'ETW',name:'Etawah Junction',city:'Etawah',lat:26.785,lng:79.022},
 {code:'ULD',name:'Achalda',city:'Auraiya',lat:26.71,lng:79.415},
 {code:'PHD',name:'Phaphund',city:'Auraiya',lat:26.635,lng:79.547},
 {code:'JJK',name:'Jhinjhak',city:'Kanpur Dehat',lat:26.559,lng:79.736},
 {code:'CNB',name:'Kanpur Central',city:'Kanpur',lat:26.454,lng:80.35},
 {code:'LKO',name:'Lucknow',city:'Lucknow',lat:26.832,lng:80.922}
];
const demoTrains=[
 {number:'12420',name:'Gomti Express',from:'New Delhi',to:'Lucknow',runDays:['mon','tue','wed','thu','fri','sat','sun']},
 {number:'12034',name:'Kanpur Shatabdi',from:'New Delhi',to:'Kanpur Central',runDays:['mon','tue','wed','thu','fri','sat']}
];
const stamp='2026-10-02T12:30:00+05:30';
const t=(h,m)=>'2026-10-02T'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00+05:30';
const wrap=data=>({mode:'demo',source:'Illustrative fixtures',updatedAt:stamp,receivedAt:stamp,data});
const delay=(h,m,n)=>new Date(Date.parse(t(h,m))+n*60000).toISOString();
export function demoLive(number='12420'){
 const train=demoTrains.find(t=>t.number===number)||demoTrains[0];
 const stations=demoStations.map((s,i)=>({...s,isHalt:i!==2,platform:String(i%3+1),isCurrent:i===3,currentStatus:i===3?'arrived':null,status:i<3?'प्रस्थान कर चुकी':i===3?'पहुँच चुकी':'आने वाला स्टेशन',distance:i*45,delayArrival:15,delayDeparture:15,
 arrival:{scheduled:i?t(10+i,10):null,actual:i&&i<=3?delay(10+i,10,15):null,expected:i>3?delay(10+i,10,15):null},
 departure:{scheduled:i<6?t(10+i,15):null,actual:i<3?delay(10+i,15,15):null,expected:i>=3&&i<6?delay(10+i,15,15):null}}));
 return wrap({demo:true,updatedAt:stamp,train:{...train,routeName:train.from+' → '+train.to,currentStation:'Phaphund',nextStation:'Jhinjhak',delayMinutes:15,status:'running'},stations,
 location:{position:{lat:26.635,lng:79.547},positionKind:'demo',lastReportedPoint:{lat:26.635,lng:79.547},lastReportedStation:'Phaphund',speedKmh:0,bearingDegrees:105,previous:demoStations[2],next:demoStations[4],nearbyStations:demoStations.slice(2,6),updatedAt:stamp,status:'running'}});
}
export async function demoRequest(path,q={}){
 if(path==='/api/stations'){const v=(q.q||'').toLowerCase();return wrap(demoStations.filter(s=>(s.name+s.code+s.city).toLowerCase().includes(v)));}
 if(path==='/api/trains'){const v=(q.q||'').toLowerCase();return wrap(demoTrains.filter(t=>(t.name+t.number).toLowerCase().includes(v)));}
 if(path==='/api/between'){
 const from=demoStations.findIndex(s=>s.code===q.from),to=demoStations.findIndex(s=>s.code===q.to);
 return wrap(from>=0&&to>from?demoTrains.filter(t=>t.number==='12420'||to<=5).map(t=>({...t,from:demoStations[from].name,to:demoStations[to].name,journeyDate:q.date,departure:'12:10',arrival:'14:30'})):[]);
 }
 if(path==='/api/status')return demoLive(q.train);
 if(path==='/api/schedule'){const l=demoLive(q.train).data;return wrap({train:l.train,route:l.stations.map(s=>({...s,arrival:s.arrival.scheduled,departure:s.departure.scheduled}))});}
 if(path==='/api/location')return wrap(demoLive(q.train).data.location);
 if(path==='/api/geometry')return wrap({coordinates:demoStations.map(s=>[s.lng,s.lat]),stations:demoStations});
 if(path==='/api/coaches')return wrap({station:demoStations.find(s=>s.code===q.station)?.name||q.station,platform:'2',coaches:['ENG','SLR','GEN','HA1','A1','B1','S1','C1','E1','D1','GEN'].map((code,i)=>({code,position:i+1,classType:['LOCO','SLR','GEN','1A','2A','3A','SL','CC','EC','2S','GEN'][i]}))});
 if(path==='/api/nearby')return wrap({checked:2,failed:0,message:'केवल उदाहरण। वास्तविक ट्रेन स्थिति नहीं।',items:[{number:'12034',name:'Kanpur Shatabdi',relation:'behind',station:'Etawah',nextStation:'Achalda',distanceMinKm:22,distanceMaxKm:39,updatedAt:stamp,journeyDate:'2026-10-02',nextHalt:{name:'Kanpur Central',scheduledArrival:t(16,30),expectedArrival:t(16,40),scheduledDeparture:null,expectedDeparture:null}}]});
 if(path==='/api/station')return wrap({station:demoStations.find(s=>s.code===q.station)||demoStations[3],partial:false,message:'Demo station board — यात्रा के लिए उपयोग न करें।',rows:demoTrains.map((tr,i)=>({...tr,stationCode:q.station,isHalt:i===0,journeyDate:'2026-10-02',status:i?'upcoming':'at-station',platform:i?null:'2',delayMinutes:i?0:15,scheduledArrival:t(13,10),scheduledDeparture:t(13,15),actualArrival:i?null:t(13,25),actualDeparture:null,expectedArrival:i?t(13,10):null,expectedDeparture:t(13,30),expectedPassingTime:i?t(13,10):null,currentLocation:i?'Etawah → Achalda':'Phaphund',lastReportedLocation:'Etawah',speedKmh:i?65:0,updatedAt:stamp}))});
 throw Error('Demo view unavailable');
}

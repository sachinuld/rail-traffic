const validTime=v=>typeof v==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v))?v:null;
export function stationDetails(s){
 const event=kind=>{
  const scheduled=validTime(s['scheduled'+kind]), supplied=validTime(s['actual'+kind]);
  const observed=kind==='Arrival'?['arrived','departed'].includes(s.status):s.status==='departed';
  const delay=s['delay'+kind];
  const estimate=scheduled&&Number.isFinite(delay)?new Date(Date.parse(scheduled)+delay*60000).toISOString():null;
  return {scheduled,actual:observed?supplied:null,expected:['skipped','cancelled'].includes(s.status)?null:observed?null:supplied||estimate};
 };
 return {code:s.stationCode,name:s.stationName||s.stationCode,isHalt:s.isHalt===true,platform:s.platform??null,platformChanged:s.platformChanged===true,
 status:({departed:'प्रस्थान कर चुकी',arrived:'पहुँच चुकी',upcoming:'आने वाला स्टेशन',skipped:'स्टेशन छोड़ा गया',cancelled:'रद्द'})[s.status]||s.status||'उपलब्ध नहीं',arrival:event('Arrival'),departure:event('Departure')};
}
export function normalizeCoaches(payload,number,station){
 const d=payload?.data;
 if(payload?.success!==true||d?.trainNumber!==number||(d?.station?.code??d?.stationCode)!==station)throw Error('Invalid coach response');
 const formation=typeof d.formation==='string'?d.formation.split('-').filter(Boolean):[];
 const coaches=formation.length?formation.map((code,i)=>({position:i+1,code})):
 (Array.isArray(d.rake)?d.rake:Array.isArray(d.coaches)?d.coaches:[]).filter(c=>typeof c.code==='string'&&Number.isInteger(c.position)&&c.position>0).map(c=>({position:c.position,code:c.code})).sort((a,b)=>a.position-b.position);
 return {station:d.station?.name||d.stationName||station,platform:d.station?.platform??d.platform??null,coaches};
}
export function normalize(payload,number,date){
 const d=payload?.data;
 if(payload?.success!==true||!d||d.isLive!==true||d.trainNumber!==number||d.startDate!==date||!Number.isFinite(Date.parse(d.lastUpdatedAt)))throw Error('Invalid provider response');
 const route=Array.isArray(d.route)?d.route:[];
 const current=route.find(s=>s.stationCode===d.currentLocation?.stationCode);
 return {demo:false,updatedAt:d.lastUpdatedAt,source:'RailRadar',train:{number:d.trainNumber,name:d.trainName||d.train?.name||number,routeName:[d.train?.source?.name,d.train?.destination?.name].filter(Boolean).join(' → '),currentStation:current?.stationName||d.currentLocation?.stationCode||'उपलब्ध नहीं',nextStation:d.nextHalt?.stationName||d.nextHalt?.stationCode||'उपलब्ध नहीं',delayMinutes:Number.isFinite(d.delayMinutes)?d.delayMinutes:null},nearby:[],stations:route.map(stationDetails)};
}
export async function getStatus(number,date,key,fetcher=fetch){
 const url=new URL('https://api.railradar.in/v1/trains/'+number+'/live');url.searchParams.set('date',date);
 const r=await fetcher(url,{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!r.ok){const e=new Error(({401:'डेटा सेवा की API key मान्य नहीं है।',403:'इस खाते को लाइव डेटा की अनुमति नहीं है।',404:'इस ट्रेन और तारीख का डेटा नहीं मिला।',429:'डेटा सेवा की सीमा पूरी हो गई है।'})[r.status]||'लाइव डेटा सेवा अभी उपलब्ध नहीं है।');e.status=[401,403].includes(r.status)?503:r.status===404?404:r.status===429?429:502;throw e;}
 return normalize(await r.json(),number,date);
}

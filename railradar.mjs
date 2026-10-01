export function normalize(payload,number,date){
 const d=payload?.data;
 if(payload?.success!==true||!d||d.isLive!==true||d.trainNumber!==number||d.startDate!==date||!Number.isFinite(Date.parse(d.lastUpdatedAt)))throw Error('Invalid provider response');
 const route=Array.isArray(d.route)?d.route:[];
 const current=route.find(s=>s.stationCode===d.currentLocation?.stationCode);
 return {demo:false,updatedAt:d.lastUpdatedAt,source:'RailRadar',train:{number:d.trainNumber,name:d.trainName||d.train?.name||number,routeName:[d.train?.source?.name,d.train?.destination?.name].filter(Boolean).join(' → '),currentStation:current?.stationName||d.currentLocation?.stationCode||'उपलब्ध नहीं',nextStation:d.nextHalt?.stationName||d.nextHalt?.stationCode||'उपलब्ध नहीं',delayMinutes:Number.isFinite(d.delayMinutes)?d.delayMinutes:null},nearby:[],stations:route.map(s=>({name:s.stationName||s.stationCode,status:({departed:'प्रस्थान कर चुकी',arrived:'पहुँच चुकी',upcoming:'आने वाला स्टेशन',skipped:'स्टेशन छोड़ा गया'})[s.status]||s.status||'उपलब्ध नहीं'}))};
}
export async function getStatus(number,date,key,fetcher=fetch){
 const url=new URL('https://api.railradar.in/v1/trains/'+number+'/live');url.searchParams.set('date',date);
 const r=await fetcher(url,{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!r.ok){const e=new Error(({401:'डेटा सेवा की API key मान्य नहीं है।',403:'इस खाते को लाइव डेटा की अनुमति नहीं है।',404:'इस ट्रेन और तारीख का डेटा नहीं मिला।',429:'डेटा सेवा की सीमा पूरी हो गई है।'})[r.status]||'लाइव डेटा सेवा अभी उपलब्ध नहीं है।');e.status=[401,403].includes(r.status)?503:r.status===404?404:r.status===429?429:502;throw e;}
 return normalize(await r.json(),number,date);
}

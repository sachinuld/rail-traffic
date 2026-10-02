const cache=new Map(),pending=new Map();let calls=[];
export async function request(path){
 const key=process.env.RAILRADAR_API_KEY;
 if(!key){const e=Error('सर्वर में RailRadar API key सेट नहीं है।');e.status=503;throw e;}
 const now=Date.now(),c=cache.get(path);if(c&&c.until>now)return c.data;
 if(pending.has(path))return pending.get(path);
 calls=calls.filter(t=>now-t<60000);
 if(calls.length>=20){const e=Error('अभी अनुरोध सीमा पूरी है। एक मिनट बाद फिर देखें।');e.status=429;throw e;}
 calls.push(now);
 const work=(async()=>{
 const r=await fetch('https://api.railradar.in/v1'+path,{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!r.ok){const e=Error(({401:'RailRadar API key मान्य नहीं है।',403:'RailRadar खाते में इस डेटा की अनुमति नहीं है।',404:'इस ट्रेन/यात्रा का डेटा नहीं मिला।',429:'RailRadar की अनुरोध सीमा पूरी हो गई है।'})[r.status]||'RailRadar सेवा अभी उपलब्ध नहीं है।');e.status=r.status===404?404:r.status===429?429:503;throw e;}
 const data=await r.json();if(data.success!==true)throw Error('Invalid provider response');
 if(cache.size>=250)cache.delete(cache.keys().next().value);
 cache.set(path,{data,until:Date.now()+(path.includes('live-map')?120000:60000)});return data;
 })();pending.set(path,work);
 try{return await work;}finally{pending.delete(path);}
}

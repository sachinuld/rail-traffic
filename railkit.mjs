let sdkPromise;
async function sdk(){
 if(!process.env.RAILKIT_API_KEY){const e=Error('सर्वर में RailKit API key सेट नहीं है।');e.status=503;throw e;}
 sdkPromise ||= import('railkit').then(m=>{m.configure(process.env.RAILKIT_API_KEY);return m;});
 return sdkPromise;
}
export const railkit={
 stationSearch:async q=>(await sdk()).stationsByName(q),
 stationInfo:async code=>(await sdk()).stationByCode(code),
 stationLive:async (code,hours=4)=>(await sdk()).liveAtStation(code,hours),
 ntes:async (number,date)=>(await sdk()).trackTrain(number,date),
 wimt:async (number,date)=>(await sdk()).trackTrainV2(number,date),
 trainInfo:async number=>(await sdk()).getTrainInfo(number)
};

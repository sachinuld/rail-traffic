import {storage} from './api.js';
export let language=storage.get('rail-language','hi');
export const t=(hi,en)=>language==='hi'?hi:en;
export function setLanguage(value){language=value==='en'?'en':'hi';storage.set('rail-language',language);document.documentElement.lang=language;translate();}
export function translate(){for(const n of document.querySelectorAll('[data-hi]')){const text=language==='hi'?n.dataset.hi:n.dataset.en;if(n.matches('input'))n.placeholder=text;else n.textContent=text;}}
export const unavailable=()=>t('उपलब्ध नहीं','Unavailable');
export const liveUnavailable=()=>t('लाइव ट्रेन डेटा अभी उपलब्ध नहीं है।','Live train data is currently unavailable.');
export function proximity(v){return ({at:t('स्टेशन पर','At Station'),passing:t('स्टेशन से गुजर रही है','Passing Station'),near:t('स्टेशन के पास','Near Station'),arrived:t('पहुँच चुकी','Arrived'),departed:t('प्रस्थान कर चुकी','Departed'),running:t('चल रही है','Running'),completed:t('यात्रा पूरी','Completed'),upcoming:t('आने वाला स्टेशन','Upcoming'),skipped:t('स्टेशन छोड़ा गया','Skipped'),cancelled:t('रद्द','Cancelled')})[v]||unavailable();}

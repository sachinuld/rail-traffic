# Rail Traffic Live — RailRadar integration
यह संस्करण वास्तविक RailRadar API के दस्तावेज़ के अनुसार बना है। डेमो खोज हटा दी गई है। API key और HTTPS server deployment के बिना लाइव डेटा नहीं आएगा। अभी authenticated live request का परीक्षण नहीं हुआ; tests नकली responses से protocol और errors जाँचते हैं। सभी भारतीय ट्रेनों की उपलब्धता provider की coverage पर निर्भर है। नाम से खोज अभी नहीं; पाँच अंकों का ट्रेन नंबर दें।

## चालू करने के कदम
1. https://railradar.in/developers पर खाता/API access लें। अपने plan में live data, उपयोग अनुमति और quota की पुष्टि करें। key चैट या GitHub में न डालें।
2. Node 22+ HTTPS hosting पर इस package को deploy करें। start command: npm start
3. hosting के secret/environment settings में RAILRADAR_API_KEY जोड़ें। ALLOWED_ORIGIN=https://sachinuld.github.io रखें। PORT hosting दे सकती है (default 8080)।
4. web/ के अंदर की 7 files GitHub Pages repository root में upload करें।
5. ऐप में 'डेटा मोड और लाइव सेवा' खोलें और अपने HTTPS server का base URL डालें। ट्रेन नंबर और origin journey date भरें।

## सीमाएँ
आगे–पीछे की सुविधा अभी उपलब्ध नहीं। Provider live-map example में प्रत्येक position का freshness timestamp और विश्वसनीय साझा track ordering नहीं है; इसलिए अनुमानित पड़ोसी ट्रेनें नहीं भरी गई हैं। Provider access मिलने पर timestamped samples से route matching implement और verify करना बाकी है। इस package को पूरी तरह कार्यरत live app कहकर प्रस्तुत न करें।

## सुरक्षा व कार्यप्रणाली
Key केवल server environment में है। upstream fixed https://api.railradar.in/v1/trains/{number}/live है; arbitrary URL proxy नहीं। 60-second cache और 10 upstream calls/minute per process; ये monthly plan cap का विकल्प नहीं हैं। Response में source timestamp रहता है। source data पाँच मिनट से पुराना हो तो UI पुराना अपडेट दिखाता है। API response errors पर demo fallback नहीं। Public launch से पहले provider quota और hosting access policy सेट करें।

## जाँच
npm test
Docs: https://railradar.in/docs/live-train-status

# Rail Traffic — आगे–पीछे की ट्रेनें (संस्करण 2)

यह नया संस्करण मौजूद GitHub Pages + Render ऐप के लिए है। इसे अपलोड किए बिना वेबसाइट नहीं बदलेगी। API key ZIP या GitHub में नहीं है।

## सचिन के ऐप में अपडेट
1. ZIP डाउनलोड करके Extract All करें।
2. निकले हुए फ़ोल्डर के अंदर की सभी फ़ाइलें GitHub sachinuld/rail-traffic के मुख्य पेज पर Add file → Upload files से डालें। सभी फ़ाइलें सीधे मुख्य फ़ोल्डर में रहें; बाहरी फ़ोल्डर या ZIP अपलोड न करें। पुराने समान नाम वाली फ़ाइलें बदलेंगी। Commit changes दबाएँ।
3. Render में rail-traffic सेवा देखें। नया commit अपने आप deploy नहीं हो तो Manual Deploy → Deploy latest commit करें। Start Command: node server.mjs; Build Command: npm install; Root Directory खाली। Free वाला मौजूदा प्लान रहने दें।
4. मौजूदा RAILRADAR_API_KEY और ALLOWED_ORIGIN=https://sachinuld.github.io रहने दें। कोई नई key जरूरी नहीं।
5. Render deployment पूरा होने और GitHub Pages अपडेट होने के बाद ऐप खोलें; जरूरत हो तो Ctrl+Shift+R और एक बार पेज दोबारा खोलें। Footer में संस्करण 2 दिखेगा।
6. अपनी ट्रेन खोजें। फिर 'आगे–पीछे की ट्रेनें खोजें' दबाएँ। परिणाम या त्रुटि की स्क्रीन भेजें; API key नहीं।

## क्या होता है
- सामान्य लाइव स्टेटस अपने अलग अनुरोध से चलता है। आसपास की खोज में समस्या होने पर सामान्य स्टेटस बना रहता है।
- RailRadar /v1/legacy/trains/live-map केवल संभावित ट्रेन नंबर चुनने के लिए है। इसका timestamp किसी ट्रेन के ताज़ा होने का प्रमाण नहीं माना जाता।
- अपनी ट्रेन के रूट पर लगभग 100 किमी में अधिकतम 6 संभावित ट्रेनें चुनी जाती हैं। उनके /v1/trains/{number}/live?haltsOnly=false जवाब अलग जाँचे जाते हैं। दूसरे रन की तारीख provider से आती है; docs में auto-detect और today-default दोनों लिखे हैं, इसलिए सभी पुराने origin-date वाले रन मिलने की गारंटी नहीं है।
- दोनों ट्रेनों का lastUpdatedAt अधिकतम 5 मिनट पुराना और आपस में 2 मिनट के भीतर होना चाहिए। भविष्य में 1 मिनट से अधिक timestamp, non-running, स्पष्ट predicted position, diversion/exception या repeated station codes होने पर तुलना नहीं होती। isActualPosition अनुपस्थित होने पर स्थान को provider-reported station segment माना जाता है, GPS सत्यापन नहीं।
- दोनों स्थानों के बीच लगातार समान स्टेशन-क्रम और दिशा, कम-से-कम 3 स्टेशन, मिलना आवश्यक है। विपरीत दिशा और अलग शाखाएँ हटती हैं। निर्धारित समय से ट्रेन को आगे नहीं बढ़ाया जाता।
- ट्रेन कहाँ है इसे आखिरी स्टेशन/अगले स्टेशन के बीच सीमा माना जाता है। सीमाएँ अलग हों तभी आगे/पीछे कहा जाता है। एक ही/छूते हुए खंड में क्रम स्पष्ट नहीं लिखा जाता। दूरी एक सीमा है, सटीक GPS दूरी नहीं।
- यह पूरी सूची नहीं है, उसी भौतिक पटरी की पहचान या सिग्नल/सुरक्षा जानकारी नहीं। खाली सूची का अर्थ आसपास कोई ट्रेन न होना नहीं है। राष्ट्रीय उपयोग provider coverage पर निर्भर है; कोई शहर hard-code नहीं।

## अनुरोध और खर्च
स्टेटस 60 सेकंड, map 120 सेकंड और आसपास परिणाम 60 सेकंड cache होते हैं। समान pending अनुरोध एक साथ मिलते हैं। एक process में सभी provider calls मिलाकर अधिकतम 20/minute हैं; यह monthly quota cap नहीं है। पहली पूरी खोज में अधिकतम 8 calls (अपनी ट्रेन + map + 6 candidates) हो सकती हैं। कोई background polling नहीं। Render का मौजूदा free plan स्वतः नहीं बदलेगा। Provider का plan/quota उसकी अपनी सीमा है।

## जाँच और सीमा
npm test: दिशा, अलग शाखा, duplicate station, stale/future timestamps, overlapping segments, अलग journey dates, partial API failure, HTTP endpoints और cache के synthetic tests। पहले प्राप्त वास्तविक single-train response का parser पहले सत्यापित है। इस नए map endpoint की authenticated वास्तविक response और live multi-train परिणाम इस वातावरण में जाँचे नहीं जा सके; key Render में है। तैनाती के बाद वास्तविक परिणाम से पुष्टि आवश्यक है।

Health check: /health → version nearby-1 (इससे provider access प्रमाणित नहीं होता)।
Docs: https://railradar.in/docs/legacy-live-map और https://railradar.in/docs/live-train-status

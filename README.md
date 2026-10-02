Rail Traffic — संस्करण 4.2

नई सुविधाएँ
- हर स्टेशन का निर्धारित आगमन–प्रस्थान, उपलब्ध दर्ज/संभावित समय और प्लेटफॉर्म नंबर।
- ठहराव वाला स्टेशन चुनकर कोच क्रम। डेटा न मिले तो स्पष्ट संदेश।
- आधिकारिक Indian Railways PNR पेज खोलने वाला बटन; PNR वहीं भरें।
- मोबाइल पर साफ कार्ड, पढ़ने योग्य इनपुट और क्षैतिज कोच सूची।
- पहले की तरह लगभग 100 किमी में पीछे की अधिकतम 6 संभावित ट्रेनों की जाँच।

समय और डेटा
सभी समय भारतीय समय में हैं। आने वाले स्टेशन के actual नाम वाले provider fields को संभावित समय ही माना जाता है। स्टेशन-विशिष्ट delay मिलने पर ही अनुमान निकाला जाता है। अज्ञात समय/प्लेटफॉर्म नहीं गढ़े जाते।
कोच API स्टेशन-विशिष्ट क्रम देती है, यात्रा की तारीख नहीं लेती। इसलिए चयनित तारीख की वास्तविक रेक की पुष्टि नहीं है। प्लेटफॉर्म और कोच क्रम स्टेशन के डिस्प्ले से पुष्टि करें।
डेटा और API अनुमति RailRadar पर निर्भर हैं। लाइव API key के साथ सत्यापन अभी बाकी है।

अपलोड और चालू करना
1. ZIP को Extract All करें।
2. निकली सभी फाइलें GitHub sachinuld/rail-traffic की मुख्य जगह Add file > Upload files से अपलोड करें। फोल्डर के अंदर फोल्डर न बनाएँ।
3. Commit changes करें। GitHub Pages और Render, दोनों का deployment पूरा होने दें।
4. जरूरत पर Render > Manual Deploy > Deploy latest commit चुनें।
5. Render start command: node server.mjs; Health Check Path: /health
6. RAILRADAR_API_KEY केवल Render environment में रखें। ALLOWED_ORIGIN अपने frontend का origin रखें (default https://sachinuld.github.io)।
7. ऐप refresh करें। नीचे संस्करण 4.2 तथा /health पर behind-4.2 दिखना चाहिए। पुराने कैश पर Ctrl+Shift+R करें।
8. ट्रेन खोजें; स्टेशनवार समय देखें; स्टेशन चुनकर कोच देखें; PNR बटन से आधिकारिक वेबसाइट खोलें।

जाँच
npm test — 17 परीक्षण; स्टेशन के समय, कोच डेटा, पीछे की 6 ट्रेनों की सीमा और HTTP व्यवहार।
वास्तविक लाइव डेटा की जाँच deployment और आपकी API key के साथ करें।

तकनीकी स्रोत
https://railradar.in/docs/live-train-status
https://railradar.in/docs/station-coach-position
https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en

संस्करण 4.2: केवल isHalt=true वाले स्टेशनों को हरे कार्ड और ठहराव बैज से हाईलाइट किया गया है। कोच जवाब में station.code/name/platform और rake वाले वास्तविक प्रारूप को समर्थन दिया गया है।

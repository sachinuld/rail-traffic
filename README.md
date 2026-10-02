Rail Traffic — संस्करण 3

बदलाव:
- साझा रूट और दिशा में केवल पीछे की ट्रेनें।
- 100 किमी में पीछे की अधिकतम 6 संभावित ट्रेनों की जाँच; पूरी सूची की गारंटी नहीं।
- हर परिणाम में अगले ठहराव का नाम, निर्धारित आगमन/प्रस्थान और उपलब्ध संभावित समय।
- भारतीय समय के साथ तारीख भी दिखाई जाती है। अगले ठहराव के actual नाम वाले provider fields भी संभावित समय के रूप में दिखते हैं।
- स्टेशन की अलग delayArrival/delayDeparture जानकारी मिलने पर ही उससे संभावित समय निकालते हैं। अनुपलब्ध समय का अनुमान नहीं गढ़ते।
- ओवरटेक की भविष्यवाणी नहीं।

अपलोड:
1. ZIP को Extract All करें।
2. निकली सभी 14 फाइलों को GitHub sachinuld/rail-traffic की मुख्य जगह पर Add file > Upload files से अपलोड करें। फोल्डर अपलोड न करें।
3. Commit changes करें। Render deploy पूरा होने दें। जरूरत हो तो Manual Deploy > Deploy latest commit करें।
4. Render में Health Check Path /health, start command node server.mjs रखें। API key केवल Render environment में रखें।
5. ऐप खोलकर Ctrl+Shift+R दबाएँ; नीचे संस्करण 3 देखें। ट्रेन खोजकर पीछे की ट्रेनें खोजें दबाएँ।

स्थानीय जाँच: node --test nearby.test.mjs — 12 परीक्षण। वास्तविक लाइव नए परिणाम deployment के बाद जाँचना है।

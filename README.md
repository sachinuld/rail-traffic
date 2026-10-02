INDIAN RAIL LIVE — संस्करण 6

यह संस्करण नया Home, route search, नाम/नंबर से ट्रेन खोज, Live Station,
Non-Stop सूची, timetable timeline, coaches, Behind Trains, map, Dark Mode और
bottom navigation जोड़ता है। पिछली coach parsing fix शामिल है।

पहले कैसे लगाएँ
1. इस ZIP को नए फ़ोल्डर में Extract All करें।
2. GitHub rail-traffic repository की मुख्य जगह पर सभी फाइलें और ui, services,
   fonts फ़ोल्डर उनके अंदर की फाइलों सहित अपलोड करें। इन फ़ोल्डरों को flatten न करें।
   ZIP फ़ाइल अपलोड न करें। (यह नया modular संस्करण है; अब सिर्फ 15 files नहीं हैं।)
3. Commit changes. GitHub Pages और Render deploy पूरा होने दें।
4. Render: Start command node server.mjs, Health Check /health.
5. Health response rail-live-6 होना चाहिए।
6. ऐप refresh (Ctrl+Shift+R), zoom Ctrl+0. More में संस्करण 6 देखें।
7. नया frontend पुराने backend के साथ काम नहीं करेगा; दोनों अपडेट करें।

Environment variables (Render)
RAILRADAR_API_KEY=अपनी authorized RailRadar key
ALLOWED_ORIGIN=https://sachinuld.github.io
RAILRADAR_RPM=20
PORT=8080  (Render इसे स्वयं दे सकता है)
GOOGLE_MAPS_API_KEY=वैकल्पिक server-side Maps Static API key
GOOGLE_MAPS_SIGNING_SECRET=वैकल्पिक URL signing secret

इनका कोई वास्तविक मूल्य GitHub, frontend या ZIP में न रखें।
Google key पर Maps Static API और उचित server/IP/quota restrictions लगाएँ।
कोई secret /api/config से नहीं लौटता। Google image server proxy से मिलती है;
frontend में Google key भेजी नहीं जाती। External Maps billing/API setup आवश्यक है।
Maps JavaScript browser key वाला तरीका इस संस्करण में उपयोग नहीं किया गया।

Demo / Live
- Key न होने पर /api/config की पुष्टि के बाद पूरे ऐप में स्पष्ट Demo mode खुलता है।
- नेटवर्क error पर लाइव failure message/Retry रहता है; fake live substitution नहीं।
- Demo Home button या More > Demo Data से सभी flows बिना key चल सकते हैं।
- Demo तारीख/स्थान/कोच केवल fixture हैं; वास्तविक यात्रा की जानकारी नहीं।
- Mode बदलते ही पुराने परिणाम साफ होते हैं, late responses ignore होते हैं।
- Demo से निकलने के लिए More > Demo Data बंद करें और live service connect करें।

डेटा की सीमाएँ
- Live search/results अधिकार, coverage, तारीख और RailRadar quota पर निर्भर हैं।
- ट्रेन autocomplete के अधिकतम 5 matches के running days schedule से मिलाए जाते हैं।
- Board −4 घंटे से अगले 4 घंटे का है; exhaustive train inventory नहीं है।
- NON-STOP केवल स्पष्ट isHalt=false या route schedule की पुष्टि पर दिखता है।
  प्रति board request अधिकतम 6 ambiguous entries की schedule जाँच; बाकी unknown
  अलग expandable section में रहती हैं। आगमन समय null होना NON-STOP का प्रमाण नहीं।
- Board का actual time तभी माना जाता है जब status arrival/departure की पुष्टि करे।
- अनुपलब्ध fields को unavailable/— दिखाते हैं, scheduled time से speed नहीं बनाते।
- Dates साथ रहती हैं; train start date और boarding date अलग हैं। Route search में
  उपलब्ध journeyDate/boardingDay से date निर्धारित होती है। ट्रेन पेज पर इसे जाँचें।
- Behind: shared route/direction, fresh reports, maximum 6 candidates, ~100 km.
  कोई overtaking/clear-track claim नहीं। यह जाँच manual है।
- Coaches station-specific composition है, date-specific actual rake confirmation नहीं।
- Train location: provider coordinates मिलने पर marker; अन्यथा केवल last reported
  station marker. Between-station interpolation से fake GPS point नहीं बनाते।
- Google map route एक simplified geographical line है; nearby route stations दिखते हैं।
  Google key न होने पर geographic schematic दिखता है, Google/live map नहीं।
- Current timeline dot pulse केवल report marker है, actual train movement animation नहीं।
- On Time green, Delayed red, scheduled/actual neutral black (dark mode light text)।

Refresh and quotas
केवल visible Live Train / Live Station screen 60 seconds में refresh होती है।
Background tab/hidden screen और Demo में polling बंद। More से auto refresh बंद करें।
429 पर 120-second cooldown. Server dedup/cache: live 60 sec, lookup/schedule
15 min, candidate map 120 sec; global configurable RPM cap (default 20).
Map images on-demand / visible map 60 sec; server map budget 10/min.
Automatic refresh छोटे/free monthly quota को जल्दी खर्च कर सकता है।

Architecture
app.js                 UI state/navigation/orchestration
ui/api.js              Browser TrainDataService, rate-limit cooldown
ui/demo.js             Explicit isolated demo adapter
ui/view.js             Safe text-based rendering and status/time helpers
ui/map.js              Labelled schematic fallback
services/rail-data.mjs Authorized provider adapter and service methods
services/normalize.mjs Consistent search/board/location contracts
services/maps.mjs      Secret-free client Google static-map proxy
services/extensions.mjs Future authenticated feature module registry
provider.mjs           Authorized requests, request coalescing/cache/rate limit
railradar.mjs          Live/coach normalization
nearby.mjs             Behind-train comparison (retained)
server.mjs             API routes + allowlisted static files (no secret file serving)
fonts/                 Local Noto Sans Devanagari; license included

API JSON envelope: {mode:live|schedule|demo,source,updatedAt,receivedAt,data}
updatedAt is null when no observation timestamp is provided; receivedAt is only retrieval time.
Endpoints: /api/config, /api/stations?q, /api/trains?q,
/api/between?from&to&date, /api/station?station,
/api/status?train&date, /api/schedule?train,
/api/coaches?train&station, /api/nearby?train&date,
/api/location?train&date, /api/geometry?train, /api/map?train&date&zoom.
The map endpoint returns image/png, not an envelope.

Validation
npm test — normalization, safety of unknown/non-stop classification,
demo separation, coordinates, API endpoints, input checks, credential non-disclosure,
and existing behind logic.
Browser smoke: search, swap, timeline, coach, behind, demo map zoom,
station/non-stop, dark mode, five-nav, responsive 320/390/768/1366px.
Real credential-backed provider integration and paid Google map require deployment
and your account configuration. No external service keys were used in local tests.

Official provider documentation used
https://railradar.in/docs/search-stations
https://railradar.in/docs/search-trains
https://railradar.in/docs/trains-between-stations
https://railradar.in/docs/station-live-board
https://railradar.in/docs/get-train-details
https://railradar.in/docs/live-train-status
https://railradar.in/docs/station-coach-position
https://railradar.in/docs/train-route-geometry
https://developers.google.com/maps/api-security-best-practices

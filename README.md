# Indian Rail Live — Version 8

हिंदी / English, mobile-first railway status app. No built-in example trains, fallback positions, or demonstration mode.

## Install / GitHub upload

The distributed ZIP is intentionally FLAT: all application modules and assets are in the same directory. This preserves modular source files while making GitHub browser uploads simple.

1. ZIP पर right-click → Extract All.
2. Extract हुए folder को खोलकर उसकी सभी files चुनें (ZIP या पूरा outer folder नहीं).
3. GitHub repository → Add file → Upload files → choose your files → सभी files → Commit changes.
4. Render → Manual Deploy → Deploy latest commit.
5. `/health` must show `rail-live-8`. GitHub Pages deployment must finish too.
6. Open the app and press Ctrl+Shift+R. Settings must show Version 8.
7. Old `demo.js` / `ui/demo.js` can be deleted from GitHub. Version 8 never imports or serves them. Old subdirectories are unused by the flat package.

Local: Node 22+; `npm start`. No npm install/build is required. Tests: `npm test`.
Render: build command `npm install` (or leave empty if supported), start command `npm start`.

## Server environment

- RAILRADAR_API_KEY: authorized provider key, required for railway data.
- ALLOWED_ORIGIN: https://sachinuld.github.io (origin only).
- RAILRADAR_RPM: request budget, default 20 per minute, range 1–120; set no higher than your plan.
- STATION_RADIUS_KM: default 5; configurable 0.5–20 km.
- PORT: assigned by Render, default 8080 locally.
- GOOGLE_MAPS_API_KEY and GOOGLE_MAPS_SIGNING_SECRET: optional, for the retained server-only static map endpoint. Neither is needed for the interactive Leaflet map.

Never upload actual keys to GitHub or enter them in frontend settings.

## Accuracy and limits

Live Station / Non-Stop: provider station-board candidates are checked against individual live runs. A train must have an update no older than 5 minutes, a running state, an explicit route through the selected station, a confirmed stop/non-stop flag, and either a reported arrival there or verified coordinates within the radius. Predicted/diverted/unknown positions are excluded. Geographic distances are straight-line distances, not rail-track distances. A departure from a nearby station alone does not prove current proximity. The board provider's +/-4-hour candidate window may not cover all trains.

Behind Train: fixed 50-km route-distance radius. No total six-train limit. All candidates supplied by the authorized API that could be inside the radius are automatically checked in eight-candidate batches. The frontend follows every page automatically; no repeated More button is needed. Failed pages retain a resume cursor; rate limits pause checks and the next permitted refresh resumes them. Same-direction contiguous shared corridor, fresh comparable timestamps, and non-overlapping route intervals are required. Only a verified distance range entirely within 50 km is included. Ranges crossing the boundary are explicitly counted as uncertain, not silently claimed to be within 50 km. Provider omissions and ambiguous ordering mean no guarantee of every physical train.

Map: screenshot-inspired compact search, coloured heading symbols, right-hand controls, Street/Satellite selector, fit-trains control and expanded view. A 60-second active-refresh switch is enabled by default. The geographical map remains visible even when train coordinates are unavailable; no train positions are invented. Only the selected train and verified behind trains are plotted, not the entire unverified national legacy feed. Marker identity and pan/zoom are preserved on refresh. The original RailRadar website map is linked separately; this is not an embedded copy of its proprietary site. Heading is drawn only when supplied; colours identify trains, not classes or delay. Map search covers loaded trains and their reported station names.

Street basemap: OpenStreetMap with attribution and vendored Leaflet. Satellite is optional: set SATELLITE_TILE_URL to an authorized HTTPS raster tile template containing {z}, {x}, {y}, plus SATELLITE_ATTRIBUTION to the required provider attribution. Any access token stays in the server environment and is never returned in /api/config. The /api/satellite-tile proxy validates tile indices and enforces a 120/minute request ceiling. It does not scrape or copy RailRadar map tiles. Example for a properly licensed ArcGIS account: https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=YOUR_AUTHORIZED_TOKEN . Check your provider's license, token permissions and attribution requirements before configuring. Without a configured source, satellite selection explicitly reports unavailable and retains the street map. Production satellite credentials and external tiles have not been verified in this environment.

Coach layout: provider `blueprints[classType]` cabin/main/side seats only. No generated numbering for 1A/2A/3A/SL/CC/EC/GEN. Missing layouts show unavailable; partial layouts are explicitly marked; duplicate seat IDs are rejected. General coaches may have no reserved-seat blueprint. Composition is provider schedule data, not a guarantee about today's physical rake or seat availability.

Route: starts at the current/near or last reported station by default; Show Full Route restores passed stations. Without a confirmed current index, only not-yet-passed entries are displayed and uncertainty is labelled. A green current/near highlight requires a fresh confirmed proximity. Scheduled halt markers remain distinct from current location.

Language: all application labels, statuses, map details, errors and seat labels switch Hindi/English. Train and station proper names remain as supplied by the provider. No notifications feature is currently active. Theme and language persist locally.

Unknown timestamps are not replaced with retrieval time. Last Updated ages are shown; stale status gets Data may be delayed. Station rows and map markers expire after five minutes. Live calls refresh about 60 seconds only on visible pages, with request coalescing/cache and a 429 cooldown. Request quota exhaustion produces partial or unavailable results, not invented data.

## Modules / API

Frontend: app.js, api.js, view.js, i18n.js, map.js, style.css, index.html.
Backend: server.mjs, provider.mjs, railradar.mjs, nearby.mjs, accuracy.mjs, normalize.mjs, rail-data.mjs, maps.mjs, extensions.mjs.

API envelopes: `{mode: 'live'|'schedule', source, updatedAt, receivedAt, data}`.
Endpoints: /api/config, /api/stations, /api/trains, /api/between, /api/status, /api/schedule, /api/station, /api/nearby, /api/coaches, /api/location, /api/geometry, /api/map.
Station and nearby endpoints accept nonnegative `offset`; responses have `nextOffset` or null. Page counters report candidates checked, not trains asserted to be nearby.
Backend enforces a static file allowlist; source, environment and API keys are not served. GitHub Pages only hosts public source/assets, never private credentials. Future auth/favourites/alerts use the existing extensions module.

## UI refinements

Compact side-by-side From/To search, consistent Noto Sans Devanagari/system typography, four equal parallel tabs at mobile widths, compact 12px seat numbers and 8px type codes. Sleeping bays place the supplied main-berth groups opposite side berths with an aisle; chair-car groups preserve the supplied arrangement. This is a labelled schematic based on provider blueprints, not a certified engineering drawing.

## Validation

Automated tests cover proximity exclusion, stale/future/predicted positions, same-direction corridor ordering, pagination past six, the 50-km boundary and quota-resume cursors, provider blueprint integrity, HTTP normalization, CORS, and private-file access. Browser checks use isolated test fixtures, not shipped application fallback data. Authenticated production RailRadar data and optional paid Google Maps require your configured account and remain deployment-dependent.

## Primary references

https://railradar.in/docs/live-train-status
https://railradar.in/docs/legacy-live-map
https://railradar.in/docs/train-coaches
https://railradar.in/docs/station-coach-position
https://leafletjs.com/reference.html
https://operations.osmfoundation.org/policies/tiles/

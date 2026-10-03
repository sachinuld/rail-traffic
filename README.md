# Indian Rail Live — Version 9.1

हिंदी / English, mobile-first railway status app. No built-in example trains, fallback positions, or demonstration mode.

## Install / GitHub upload

The distributed ZIP is intentionally FLAT: all application modules and assets are in the same directory. This preserves modular source files while making GitHub browser uploads simple.

1. ZIP पर right-click → Extract All.
2. Extract हुए folder को खोलकर उसकी सभी files चुनें (ZIP या पूरा outer folder नहीं).
3. GitHub repository → Add file → Upload files → choose your files → सभी files → Commit changes.
4. Render → Manual Deploy → Deploy latest commit.
5. `/health` must show `rail-live-9`. GitHub Pages deployment must finish too.
6. Open the app and press Ctrl+Shift+R. Settings must show Version 9.1.
7. Old `demo.js` / `ui/demo.js` can be deleted from GitHub. Version 9.1 never imports or serves them. Old subdirectories are unused by the flat package.

Local: Node 22+; `npm start`. No npm install/build is required. Tests: `npm test`.
Render: build command `npm install` (or leave empty if supported), start command `npm start`.

## Server environment

- RAILRADAR_API_KEY: authorized provider key, required for railway data.
- ALLOWED_ORIGIN: https://sachinuld.github.io (origin only).
- RAILRADAR_RPM: request budget, default 20 per minute, range 1–120; set no higher than your plan.
- STATION_RADIUS_KM: default 5; configurable 0.5–20 km.
- PORT: assigned by Render, default 8080 locally.
- GOOGLE_MAPS_API_KEY and GOOGLE_MAPS_SIGNING_SECRET: optional, for the retained server-only static map endpoint. Neither is needed for the external RailRadar link.

Never upload actual keys to GitHub or enter them in frontend settings.

## Accuracy and limits

Live Station / Non-Stop: provider station-board candidates are checked against individual live runs. A train must have an update no older than 5 minutes, a running state, an explicit route through the selected station, a confirmed stop/non-stop flag, and either a reported arrival there or verified coordinates within the radius. Predicted/diverted/unknown positions are excluded. Geographic distances are straight-line distances, not rail-track distances. A departure from a nearby station alone does not prove current proximity. The board provider's +/-4-hour candidate window may not cover all trains.

Behind Train: selectable 50 / 100 KM route-distance radius, default 100. The screen displays at most 10 unique verified trains; it stops fetching more pages once ten are collected. Candidates are verified in bounded pages of eight. Cards are collapsed initially; tap the prominent train number to reveal available live details. Failed pages keep a retry cursor. A missing/stale base report is an unavailable state, not an empty successful search. Partial failures and quota cooldowns remain visible.

Ordering requires the same contiguous corridor, same direction, fresh comparable timestamps and disjoint route segments. The entire reported route-distance range must fit inside the chosen radius. This is a distance range from reported stations, not an interpolated GPS position. Provider omissions and uncertain ordering limit coverage. No data is fabricated to fill ten slots.

Map: one Live Train Map tab contains one prominent external RailRadar button to https://railradar.in/railradar. No embedded map, map library, tiles, marker simulation or map-triggered API calls. The optional backend Google Maps/satellite endpoints remain for compatibility, but this UI does not use them. No map key is needed to open the external site.

Coach layout: provider `blueprints[classType]` cabin/main/side seats only. No generated numbering for 1A/2A/3A/SL/CC/EC/GEN. Missing layouts show unavailable; partial layouts are explicitly marked; duplicate seat IDs are rejected. General coaches may have no reserved-seat blueprint. Composition is provider schedule data, not a guarantee about today's physical rake or seat availability.

Route: starts at the current/near or last reported station by default; Show Full Route restores passed stations. Without a confirmed current index, only not-yet-passed entries are displayed and uncertainty is labelled. A green current/near highlight requires a fresh confirmed proximity. Scheduled halt markers remain distinct from current location.

Language: all application labels, statuses, map details, errors and seat labels switch Hindi/English. Train and station proper names remain as supplied by the provider. No notifications feature is currently active. Theme and language persist locally.

Unknown timestamps are not replaced with retrieval time. Last Updated ages are shown; stale status gets Data may be delayed. Station and behind-train rows expire after five minutes. Live calls refresh about 60 seconds only on visible pages, with request coalescing/cache and a 429 cooldown. Request quota exhaustion produces partial or unavailable results, not invented data.

## Modules / API

Frontend: app.js, api.js, view.js, i18n.js, style.css, index.html.
Backend: server.mjs, provider.mjs, railradar.mjs, nearby.mjs, accuracy.mjs, normalize.mjs, rail-data.mjs, maps.mjs, extensions.mjs.

API envelopes: `{mode: 'live'|'schedule', source, updatedAt, receivedAt, data}`.
Endpoints: /api/config, /api/stations, /api/trains, /api/between, /api/status, /api/schedule, /api/station, /api/nearby, /api/coaches, /api/location, /api/geometry, /api/map.
The nearby endpoint also accepts `radius=50|100` (default 100); invalid radii return 400 before provider calls. Station and nearby endpoints accept nonnegative `offset`; responses have `nextOffset` or null. Page counters report candidates checked, not trains asserted to be nearby.
Backend enforces a static file allowlist; source, environment and API keys are not served. GitHub Pages only hosts public source/assets, never private credentials. Future auth/favourites/alerts use the existing extensions module.

## UI refinements

Home contains From/To, Train No/Name and Live Station search forms, plus PNR. Interior result screens do not repeat the search forms. Bottom navigation shortcuts focus the matching Home form. A single contextual Search a train first link appears only before selecting a train.


Compact side-by-side From/To search, consistent Noto Sans Devanagari/system typography, four equal parallel tabs at mobile widths, compact 13px seat numbers and 10px type codes. Sleeping bays place the supplied main-berth groups opposite side berths with an aisle; chair-car groups preserve the supplied arrangement. This is a labelled schematic based on provider blueprints, not a certified engineering drawing.

## Validation

Automated tests cover proximity exclusion, stale/future/predicted positions, same-direction corridor ordering, bounded pagination, the 50/100-km boundaries and quota-resume cursors, provider blueprint integrity, HTTP normalization, CORS, and private-file access. Browser checks use isolated test fixtures, not shipped application fallback data. Authenticated production RailRadar data and optional paid Google Maps require your configured account and remain deployment-dependent.

## Primary references

https://railradar.in/docs/live-train-status
https://railradar.in/docs/legacy-live-map
https://railradar.in/docs/train-coaches
https://railradar.in/docs/station-coach-position


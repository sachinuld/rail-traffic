# Indian Rail Live v9.6.0

Live Station and Live Train data now support **RailKit**, using its documented NTES-backed live endpoints and WIMT-backed V2 tracking where available. The API key remains server-side in Render.

## Render environment
- `RAILKIT_API_KEY` — required for the new live data path.
- `RAILRADAR_API_KEY` — optional fallback for older/non-live features.
- `GOOGLE_MAPS_API_KEY` — optional for existing map features.

## Features
- Live Station: next 4 hours
- Train click from station board → live train view
- NTES-backed station/live timeline
- WIMT-backed live location enrichment when available
- Non-stop: only currently reported passing trains are promoted to the live non-stop tab
- 34 existing automated tests pass

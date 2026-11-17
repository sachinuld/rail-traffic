# Rail Traffic v11 home redesign — changelog (UI only)
New files: home-redesign.css (all styling), brand-logo.png (your logo photo).
index.html: added stylesheet/font links; theme-color; logo + wordmark in header; "Trains Between Stations" label (hi: स्टेशनों के बीच ट्रेनें); decorative SVG above Live Train Map link and under route fields. No id/class/href/handler removed.
sw.js: cache v21 -> v22; brand-logo.png + home-redesign.css added to FILES.
server.mjs: same two files added to the static allowlist.
NOT touched: app.js, api.js, view.js, i18n.js, provider/rail-data, all API routes, storage keys.
Known pre-existing bug (not fixed): app.js lines 92-93, see OPTIONAL patch.

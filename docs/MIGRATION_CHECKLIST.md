# Migration checklist

Baseline branch: `migration/preact-preserve-ui`. Original working tree snapshot, including uncommitted settings/tools/server changes: `/tmp/streamhub-original/source.tar`, with `uncommitted.patch` and SHA-256 manifest. No original user changes were discarded.

## Audit complete

Read all 18,535 lines of application JS, HTML/EJS and CSS, including script.js, utils.js, listeners.js, history.js, explore.js, watch.js, search.js, library.js, sports/app.js, tools/script.js and settings.js. Inspected package/lock metadata, Express route order, Vercel configuration, editor settings, and inventoried the static assets.

Baseline has no build or test scripts. `node server.js` cannot bind in this environment (EPERM); npm registry lookup fails (getaddrinfo EBUSY). The restored package still includes unused Svelte dependencies from the previous attempt.

## Route and behavior contract

Source replacements for every item below are implemented under src/. Boxes deliberately remain unchecked until browser parity is verified; they do not indicate absent source implementation.

- [ ] `/`, `/index.html`: hourly seeded hero, logos, genres, 10s timer, dots, arrows, details/watch/bookmark; trending movie/TV rows; streaming tabs and movie/TV switch; expanding rows, pagination, wheel scrolling, edge masks; Continue Watching.
- [ ] `/movie?id=`, `/tv?id=`, `/person?id=`: home behind details; movie runtime/certification/release state/resume, TV season/episode selection, person cast/department credits, internal modal back/forward, trailers/fullscreen, sharing/clipboard, external links, Escape/outside dismissal and focus trap.
- [ ] `/explore`, slash and index aliases: all 12 image tiles, movie/TV/anime/top-rated/Indian/studio presets; genre inclusion/exclusion, genre ordering, year, sort direction, rating/vote sliders, cast/company autocomplete and chips, country/language keyboard menus, reset/apply, floating controls, infinite paging, query compatibility.
- [ ] `/search?q=`: debounced parallel movie/TV/person results, counts/time, expandable and collapsible sections, people cards, independent incremental paging, encoded terms and history.
- [ ] `/library`: watching/history/bookmarks; lazy metadata, progress, actions, watch/unwatch/next episode, long-press edit, selection/select-all/Delete, confirmation, backup export/import merge or replace, explicit clear.
- [ ] `/settings`: group menu/search, profile/avatar, theme/autoplay/default source preferences, reset defaults, backup management. Baseline settings script URL is broken and mergeByKey is missing in that page; correct during migration. Theme/autoplay preferences were stored but not applied by the old app.
- [ ] `/watch/movie/:id`, `/watch/tv/:id/:season/:episode`: all original source IDs/URLs including hidden Whvx, anime conversion, sub/dub/version switches, source persistence, provider hover/pin/close, zoom/fullscreen, season/episode navigation, stable iframe, progress messages and delayed fallback logging.
- [ ] `/sports`: categories, debounced search, live threshold, popular ordering/date groups, collapsed states, cache TTL/stale fallback, 30s clock/5m refresh, lazy cards/images, source fallback, quality/language/viewers, reload/close/minimize/drag/resize, iframe permissions.
- [ ] `/tools`: extractor movie/TV fields and numeric controls, suggestions, validation, Alpha/Bravo, size limits, WebSocket client ID/status/retry, POST /fetch, streamed NDJSON raw/file/select/resolve records, cancel/reset, download/copy/external intents/drive/directory links.
- [ ] Unknown URLs: original 404 design with real HTTP 404. Missing assets and reserved API paths must not receive the app shell.
- [ ] Shared original desktop/mobile navigation, scroll detach/hide, CSS/typography/assets/media queries, notification and confirmation UI, keyboard behavior.
- [ ] Storage compatibility: history/watching/bookmarks records `{mediaType,id,index,progress,data:{sno,eno}}`; DEF_SRC `{id,value}[]`; app_settings object; sports sf_categories/sf_streams caches; retain all unknown keys. Safely read old numeric source keys without deleting them. No automatic clear/cleanup.

## Baseline defects to distinguish from regressions

Carousel dots reference out-of-scope showSlide; global variables are missing on some routes; fetchSearchResults double-encodes queries; search result aggregation mixes arrays and metadata; fixLog deletes unknown keys; removeLoggedValue retains the selected key instead of removing it; multiple observers/listeners lack cleanup; playback source selection and message handling can log incorrect sources; settings URL is wrong; tools stream parser drops the final non-newline record. Preserve intended behavior while fixing these defects.

## Verification and cleanup

- [x] Pure service tests (storage, providers, filters, streaming parser, routes, request caching).
- [x] Production bundling, split sizes, asset integrity; real output served in-process across 12 routes and 69 assets.
- [x] Express direct route/404 checks using in-process HTTP request/response streams. Real browser refresh remains pending.
- [ ] Browser desktop/mobile, interactions, storage persistence and listener cleanup.
- [ ] Actual external integrations separately checked or reported blocked.
- [ ] Remove obsolete frontend entries only after replacement checks.
- [x] Architecture, migration, test and run documentation.

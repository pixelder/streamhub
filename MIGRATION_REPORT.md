# Migration report

## Status and preservation

Source implementation covers all discovered frontend routes. The migration is **not release-ready or verified complete**: the production build and in-process artifact checks pass, but browser/live integration checks remain outstanding. A valid production bundle is present in ignored dist/.

Work is on migration/preact-preserve-ui. Original uncommitted changes were preserved in /tmp/streamhub-original/source.tar and uncommitted.patch before implementation. That temporary snapshot is local, not a durable repository backup. Original public scripts/templates remain available for parity review. They are not imported by the new app; the build excludes legacy scripts/HTML from production output. Deleting them is deferred until replacement verification succeeds.

## Implemented route coverage (browser parity pending)

| URLs | Source implementation |
| --- | --- |
| / and /index.html | Seeded hero, timer/dots/arrows, trending, provider discovery tabs, Continue Watching, expandable/paged rows |
| /movie?id=, /tv?id=, /person?id= | Details over home, metadata, trailers, credits, modal navigation, bookmarks, sharing, resume and episodes |
| /explore | Twelve tiles, presets, genres, sort/year/rating/votes, cast/company, country/language, filter reset/apply and infinite paging |
| /search?q= | Debounced movie/TV/person results, counts, expandable sections and independent paging |
| /library | Watching/history/bookmarks, progress, edit/select/delete, watch state, next episode, import/export/clear |
| /settings | Profile/avatar, preference groups/search, theme/autoplay/source persistence, reset and backup management |
| /watch/movie/:id | All 13 original provider IDs, source preferences, provider controls, fullscreen and progress/history |
| /watch/tv/:id/:season/:episode | Movie player behavior plus seasons, special season zero, episode navigation and anime numbering |
| /sports | Categories/search, live/date/popularity groups, caching/refresh, source selection/fallback, quality, mini-player/drag/resize |
| /tools | Suggestions, validation, server/size controls, WebSocket identity/status, streaming extraction, resolve/select/copy/download/cancel |
| Unknown documents | Original 404 design with HTTP 404 |

Section trailing-slash and index.html aliases are recognized. History remains part of Library, not a new /history route. Query strings and watch parameters remain compatible. Shared desktop/mobile navigation, cards, overlays, keyboard handling, responsive CSS and original Pixelstream branding are retained in the implementation.

## Data and backend compatibility

Existing localStorage keys/schemas are retained. Startup retains unknown keys and malformed source storage instead of deleting them. Import supports core application keys and numeric legacy source preferences, validates before writing and rolls back failed writes. Unrelated keys in current storage are retained; arbitrary unrelated keys from a backup are not imported. No cookies or IndexedDB migration was required by the original app.

Express serves documents/assets and now provides `GET /api/tmdb/*`, a constrained same-origin proxy using server-only `TMDB_READ_ACCESS_TOKEN`. TMDB catalog calls no longer include a credential in browser URLs. Embedded providers, sports feeds and the separate extractor remain external integrations. Reserved server paths are excluded from SPA fallback. Direct document responses were checked with an actual Express app and synthetic request/response streams; deployment and listening sockets were not verified.

## Dependencies

Declared runtime additions: preact ^10.29.8 and preact-iso ^2.12.2. Express retained. Vite ^8.3.4 is the development bundler. No additional rendering-test dependency is required by the current tests.

Old Svelte tooling, ejs, nodemon, serve, TypeScript and type-only packages were removed from package.json declarations. An initial install attempt failed at registry DNS lookup. Dependencies subsequently appeared in the workspace, and npm install --package-lock-only --offline --ignore-scripts --no-audit --no-fund succeeded. The lockfile now matches the dependency declarations. A fresh npm ci in a clean environment has not been tested. The original user-modified lockfile remains in the baseline snapshot.

## Intentional fixes and baseline limitations

The new implementation addresses search encoding, trailing NDJSON records, destructive unknown-key cleanup, backup validation/rollback, source logging, settings routing, timer/listener cleanup and request deduplication. Pure tests cover a subset; see TEST_REPORT.md for exact evidence.

Original theme/autoplay settings only stored preferences. Following the subsequent settings-page request, theme selection now applies across the site and autoplay enables next-episode navigation at reported completion; embedded playback still depends on the provider. The original hidden Watch download control had no implementation and remains hidden. External service availability is not guaranteed by passing URL-generation tests.

## Remaining completion gates

1. Validate a clean npm ci install in the deployment environment.
2. Launch both development and production servers in an environment permitted to bind ports. Production build and bundle measurements are already complete.
3. Compare every route and overlay against the original at desktop/mobile sizes, including animations and body scroll restoration.
4. Exercise live playback/progress/resume, sports sources, extraction/WebSocket behavior and navigation cleanup.
5. Verify deployment, then remove obsolete public scripts/templates and unused dependencies after parity checks pass.

No original feature was intentionally removed to obtain a passing check. Source coverage and unchanged CSS are not substitutes for these completion gates.

## Production measurements

Vite transformed 70 modules successfully. The entry chunk is 39.60 KiB raw / 14.40 KiB gzip. All lazy JavaScript chunks total 130.60 KiB / 50.72 KiB gzip; the largest feature chunks are Explore (15.57 KiB raw), Sports (12.83 KiB), and Tools (11.67 KiB). Shared chunks and original CSS/assets are additional to an individual route chunk. These measurements exclude remote fonts/icons/images and playback embeds. Route splitting delays feature code until navigation; retaining native CSS avoids redesign but does not minimize the original stylesheet payload.

The production artifact check served 12 document routes and 69 generated/copied assets through Express in process, confirmed reserved/missing-path exclusions, and found no legacy scripts or HTML in dist. This does not execute the client in a browser.

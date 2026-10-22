# Test report

## Separate original and Preact servers

`server.js` now serves the original public/EJS routes, and `server-preact.js`
serves the migration. Both use the extracted shared API proxy. Restored the
original EJS dependency from the local npm cache. All 64 tests pass, including
three added checks for original public documents, EJS search/watch/404 rendering
and proxy mounting. The original `/search` directory redirect is retained.
The production artifact check passes for 12 Preact routes and 75 assets.
These are in-process HTTP checks; browser rendering and live TMDB availability
were not reverified for this separation.

Results recorded during the migration continuation on 2026-10-20 (Asia/Kolkata). Runtime: Node v26.10.0, npm 12.2.0.

## Executed checks

| Check | Result | Scope |
| --- | --- | --- |
| npm run check | PASS | 56 source modules: syntax transformation and relative import paths; not runtime rendering/type checking |
| Original CSS/assets SHA-256 comparison | PASS | 50/50 match docs/UI_BASELINE.json byte for byte; not screenshot comparison |
| npm test | PASS | 35 tests, zero failures/skips; details below |
| git diff --check | PASS | Tracked diff whitespace check |
| npm install --fetch-retries=0 --fetch-timeout=10000 --no-audit --no-fund | BLOCKED | getaddrinfo EBUSY registry.npmjs.org while fetching preact |
| npm run build | PASS | 70 modules transformed; production output published after dependencies became available |
| Offline lockfile reconciliation | PASS | npm install --package-lock-only --offline --ignore-scripts --no-audit --no-fund; root dependency declarations match |
| node scripts/verify-production.mjs | PASS | Real generated shell across 12 routes, 69 generated/copied assets, reserved/missing-path exclusions and no legacy JS/HTML |
| npm start | BLOCKED | listen EPERM on 0.0.0.0:8443, also present in baseline |
| Puppeteer/Chrome launch attempt | BLOCKED | Protocol error (Target.setDiscoverTargets): Target closed; no browser scenarios executed |
| npm run bundle:report | PASS | Entry: 39.60 KiB raw / 14.40 KiB gzip; all lazy chunks: 130.60 KiB / 50.72 KiB gzip; native CSS/assets additional |
| Vercel deployment | NOT RUN | Configuration only; no deployment requested or performed |

The original baseline had no build/test scripts. Registry and listening failures were present before frontend changes. Dependencies subsequently appeared in the workspace. Offline lockfile reconciliation succeeded and the production build passed. The original user-modified lockfile remains in the snapshot. A fresh npm ci is still unverified.

## Automated coverage

- **13 storage tests:** original records/preferences and unrelated keys; migration idempotence/source precedence; session history; episode advancement; special season zero/null values; completed movies; merge/replace; invalid imports; rollback after quota failure; explicit clear; malformed source storage; old numeric source-key backups.
- **13 feature-service tests:** all 13 provider URL IDs; anime episode mapping; progress protocol validation; filters/genre inclusion; extractor payload; NDJSON arbitrary byte boundaries, Unicode, final record, invalid JSON and cancellation; resolved row replacement; sports cutoff/search/order/posters/date grouping; route aliases/reserved paths.
- **6 Express tests:** direct known routes and aliases; unknown document 404; reserved API/WebSocket and missing assets; asset MIME; POST/JSON exclusions; missing-build 503.
- **3 API tests:** search encoding/cache; concurrent request deduplication with a separate cancellable request; HTTP failures/recovery without caching errors.

Service tests use controlled inputs and mocked fetch responses. Express tests use the real Express application with temporary fixture HTML/assets and Node HTTP request/response streams over an in-memory transport. The separate production artifact check additionally validates serving actual Vite output and copied assets. Neither check validates a listening server, browser execution/routing, external services or deployment. Browser-specific fullscreen and sports resize fixes were source-checked but not exercised in a browser.

## Required browser and integration acceptance

Run the original snapshot and migration in a permitted environment using separate copies/profiles. Preserve or export real user data before manual import/clear tests. Use representative fixture storage for destructive interaction checks.

1. **Desktop/mobile layout:** compare home, every feature page, details/person dialogs, expanded grids, navigation and 404 at desktop, tablet and narrow phone widths. Compare spacing, fonts/icons, CSS order, overflow, animations, scrolling and focus.
2. **Routing:** open/refresh every documented URL and slash/index alias; test query terms containing Unicode, ampersands and spaces; navigate back/forward with saved scroll and open dialogs; confirm unknown documents remain 404 and assets/API paths do not return HTML.
3. **Discovery/search:** operate hero arrows/dots/timer, provider/type tabs, expand/collapse, wheel scrolling, all explore presets/filters and search suggestions; test slow/failed/empty responses and multi-page loading.
4. **Library/storage:** load a copy of original bookmarks/history/preferences, edit/select/delete, mark watched/unwatched, advance episodes, export and merge/replace imports, reload and navigate between pages; confirm unrelated keys survive.
5. **Player:** exercise all available providers with movie/TV/anime and special seasons, source persistence, pinned provider menu, fullscreen including Safari, progress/resume and completion/next episode. Verify iframe stability during unrelated state changes and ignore messages from unrelated frames.
6. **Sports:** verify categories/search/date groups, cache expiry/stale fallback, refresh, source failures, stream selection, mini mode, drag, resize/restore, reload and close across desktop/mobile.
7. **Tools:** use a real extractor for WebSocket identity/status/reconnect, Alpha/Bravo, validation, streamed results, resolve/select/download/copy/external links, cancellation and page exit during an active request.
8. **Settings/accessibility:** validate profile/avatar/default source, preference persistence, backup/reset confirmations, keyboard menus, Escape/Tab focus traps and focus restoration. Theme/autoplay had storage-only behavior in the original.
9. **Lifecycle/performance:** navigate repeatedly while loading and playing; inspect console/network, detached listeners/observers/timers, request cancellation and unnecessary iframe reloads. Build and record raw/gzip chunks with npm run bundle:report.
10. **Deployment:** start production with real dist, verify MIME/caching/deep links and refreshes, then verify Vercel separately if used.

These are pending checks, not reported successes. Do not remove legacy comparison sources or declare feature/visual parity until the relevant checks pass.

## Development dependency-scan fix

Configured optimizeDeps.rolldownOptions.transform.jsx to use Preact, matching the main Oxc transform. Vite 8's scanner does not inherit that main transform setting. Restricted scan entries to the migrated root index.html so retained legacy pages are not scanned. A forced development dependency scan completed successfully and resolved preact, preact/hooks, preact-iso and preact/jsx-dev-runtime, with no React runtime dependency. This verifies dependency discovery/prebundling, not browser rendering.

## Settings customization follow-up

Implemented a functional /settings page with global appearance preferences, home controls, source selection, completion-based next-episode navigation, validated profile uploads, all-category search and confirmed defaults reset. Added desktop/mobile navigation access. Original baseline CSS/assets remain unchanged; customization overrides are in src/styles/customization.css.

Checks: 40 tests pass, including five new tests for preference validation, persistence/data preservation, default restoration, system appearance/motion application and storage failures. Source check passes for 58 modules; all 50 baseline assets match. Production build passes (73 modules); the artifact check passes for 12 routes and 71 assets. Browser layout, avatar file selection and live provider completion/navigation remain unverified in this environment. Earlier bundle metrics describe the migration baseline before these settings additions.

## Settings studio redesign and expanded integrations

The page now has eight categories, 27 persisted preferences and six data actions, with scoped desktop/mobile CSS, theme previews, accent swatches, touch controls, profile/storage overview and search. Six added integration tests bring the suite to **46 passing tests**. They cover request language/artwork, cache bypass, source memory, anime audio, targeted data actions and diagnostics using mocked HTTP responses. The default Settings view also passed an actual Preact server-render smoke check (4,833 HTML characters) using the locally available renderer; no new dependency was added for that one-off check. This confirms rendering, not browser layout or interactions.

Live connection checks, embedded playback behavior, avatar upload and desktop/mobile appearance remain unverified. The integration map and scope are in docs/SETTINGS.md. Earlier counts and bundle sizes in this report describe their respective earlier revisions.

## Image configuration and catalog customization follow-up

Added ten tests for: default vote floors and explicit language exceptions; language/country removal and genre precedence; adult flags versus certifications/unrated results; certification/country lookup ordering and concurrency; blacklist route rejection before fetch; custom source URL validation/substitution; separate supported image sizes; TMDB configuration requests; custom section/provider persistence; and discovery provider/vote parameters. The suite now contains 56 passing tests. Earlier zero-vote preset assertions were updated to reflect the requested global 200-vote default. Appearance assertions now include navigation-label state.

Source and production checks are rerun after this change. Live previews, remote font loading, actual provider availability, arbitrary custom embeds, mobile touch interactions and browser layouts are not claimed verified. See docs/SETTINGS.md for filter scope, certification metadata limitations and pagination behavior.

Final checks for this follow-up: 63 source modules pass syntax/import checks; all 50 baseline CSS/assets remain unchanged. The 56-test suite passes, and the ten catalog-preference tests were rerun after the final language-threshold adjustment. Production build passes with 79 transformed modules. Express artifact checks pass for 12 routes and 75 assets. Whitespace checks pass. Browser/live-service verification remains pending.

## Settings content and navigation polish

Added concise, practical introductions to all ten settings categories and a short page-level description. Desktop navigation is text-first by default with an opt-in icon setting; the mobile label setting now affects only the mobile bar. Artwork previews use poster, landscape, square and logo aspect ratios rather than a single fixed box. Checks: all 56 tests pass, production build succeeds (79 modules), 63 source modules pass syntax/import checks, all 50 baseline styles/assets match, and the Settings server-render smoke check passes (3,642 rendered characters). Real browser layout remains unverified in this environment.

## Complete Settings layout replacement

Replaced the Settings stylesheet and page shell with scoped typography/layout, a desktop sidebar, mobile category select, and related-control panels. Fixed the catalog's global `section` flex layout and `section h2` decorative-font rules leaking into Settings. All 54 controls are represented exactly once across ten categories. The 56-test suite, source checks (63 modules), original asset checks (50 matches), production build and default Settings SSR check pass. Browser launch was attempted using installed headless Chrome, which exited with a sandbox `setsockopt: Operation not permitted` error; desktop/mobile visual validation is still pending. No dependencies were added.

## Light theme contrast follow-up

Updated shared light palette contrast, top and bottom navigation surfaces, select menus, catalog card shadows and Continue Watching text contrast. The Home hero retains its dark image scrim for readable white copy while the catalog surface remains light. Production build, all 56 tests, source checks and baseline asset checks pass. Browser screenshots remain unavailable because headless Chrome is denied socket permissions by this environment.

## Light theme screenshot fixes

Follow-up screenshots showed remaining dark-only treatments in the home hero, title details modal and Sports page. The hero scrim now switches to a light gradient with dark readable copy and controls; the details modal uses a light glass surface with unshadowed readable text; Sports surface, cards, controls and accent colors use light-theme tokens while the video player remains dark for the stream. Build, source/import check and baseline asset verification pass. Browser visual verification remains blocked by Chrome's sandbox socket restriction.

## TMDB credential security follow-up

Moved active catalog requests to the same-origin `/api/tmdb/*` Express proxy. The proxy requires server-only `TMDB_READ_ACCESS_TOKEN`, restricts paths, rejects client `api_key` parameters, caps query count/value size, applies an in-memory per-IP request limit, a 10-second timeout, redirect rejection and a 5 MiB streamed response cap. The previously embedded credential was removed from current source files and the obsolete `VITE_TMDB_API_KEY` configuration was removed. Added tests for missing configuration, path/method/query rejection and bearer-token forwarding. Live TMDB behavior is not verified without a newly issued token; revoke the exposed credential in the TMDB dashboard and set the replacement in local `.env` or deployment secrets.

## Softer light palette

Replaced pure white surfaces with muted lavender slate tones across the site, including Settings panels, navigation, modal, hero mask and Sports cards. Production build passes; whitespace check passes.
## Readability refactor — October 21, 2026

Expanded formatting across the new frontend, backend helpers, build scripts and
tests. Added intent comments for request sharing, stale pagination responses,
playback history and storage compatibility. No dependencies were added.

Validation against the source snapshot taken before this pass:

- Compared 88 files using compiled JavaScript/JSX syntax trees, CSS structure,
  JSON data or exact text. The separate removal of `still` from `imageKinds` in
  `src/features/settings/catalogOptions.js` was preserved and accounted for in
  the comparison; the remaining code matches.
- `npm test`: 64 passing, zero failures.
- `npm run check`: 63 source modules pass; 50/50 original styles/assets match.
- `npm run build`: succeeds, 79 modules transformed.
- `node scripts/verify-production.mjs`: passes for 12 document routes and 75 assets.
- `git diff --check`: passes.

No fresh browser or live streaming/API verification was performed for this pass.
The original `server.js`, public assets and environment credentials were not edited
by this refactor. Existing unrelated working-tree changes were retained.


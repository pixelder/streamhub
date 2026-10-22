# STREAMHUB frontend architecture

## Status

The frontend source has been reimplemented in Preact. Production bundling and in-process production asset checks pass; browser parity validation remains blocked by this execution environment; see TEST_REPORT.md. The original frontend remains in public/ and views/ as a comparison reference until those checks succeed.

## Runtime and ownership

The original public/EJS server is now isolated in `server.js`, with its original
routes and a small API integration block. The Preact runtime described below lives
in `server-preact.js`, which exports `createApp` and is used by `api/index.js`.
Both servers mount `backend/tmdb-proxy.cjs` and use `backend/tmdb.cjs` for
credentials and upstream request construction. `npm start` runs the original site;
`npm run dev` and `npm run start:preact` run Preact development and production.
See `docs/LEGACY_API_STAGING.md` for staging the original-site change independently.

Express remains the Node backend. Running either server directly starts its HTTP listener (PORT defaults to 8443). Preact development mounts Vite middleware inside Express; Preact production serves dist. `GET /api/tmdb/*` is a same-origin TMDB proxy: it accepts only the catalog routes used by the app, adds the server-only credential, limits query shape, request rate, timeout and response size, and returns controlled errors. Add the credential to local `.env` or deployment secrets; never use a `VITE_` variable. Other integrations keep their existing remote services.

`src/app/routes.js` defines URL matching shared by Express and Preact. Known documents receive the shell with HTTP 200; unknown documents receive it with HTTP 404. Reserved API/WebSocket paths, missing assets, non-document requests and unsupported methods do not receive the shell. Future backend endpoints belong before the document handler.

`src/main.jsx` performs compatible storage initialization and mounts `App`. Preact-iso owns navigation and lazy route loading. `App` owns navigation, overlays and page layout. Page components live under `src/features/`; media cards, sections, episode lists, dialogs and navigation live under `src/components/`. Route keys preserve the Watch instance during episode changes; the player iframe is keyed by its actual source URL.

## State and integrations

- Component hooks own filters, paging, dialogs' local controls and loading state.
- `stores/storage.js` owns persistent records, source preferences, subscriptions, backup validation and transactional import. Selective subscriptions avoid unrelated card updates.
- `stores/ui.js` owns transient details navigation, confirmations and notifications.
- `services/api.js` owns TMDB requests, short-lived caching and pending-request sharing. Abortable requests remain independent. API calls are separated from rendering.
- Feature services own discovery presets, provider URL generation, sports caching and extractor protocols.
- Hooks clean up request controllers, observers, timers and listeners. Playback logging checks iframe identity and origin before processing progress. Actual provider interoperability still needs live checks.

Existing keys and record shapes are retained: history, watching, bookmarks, DEF_SRC, app_settings, sports caches and current-media-title. Numeric legacy source keys remain readable and are retained. Initialization does not delete unknown keys. Watching is copied from history only when absent. Explicit backup replacement or clearing requires the corresponding user action; import rollback protects against partial writes.

## Styling and rendering

Native CSS and original assets are retained. `docs/UI_BASELINE.json` records hashes for 50 original stylesheets/assets; `npm run check` verifies them. Original settings/404 inline styles were extracted to stylesheets. Page-specific CSS is attached and removed by `usePage`; sports styles retain their position before global styles. Existing class names, layout wrappers and body scrolling are preserved. `#app` uses display:contents to avoid adding a layout box.

Unchanged CSS does not prove visual parity: DOM differences, loading order and runtime state require desktop/mobile browser comparison. No visual parity claim is made yet.

## Build and deployment

Vite uses automatic Preact JSX transformation and lazy route chunks. No styling framework or additional state-management package is introduced. `scripts/build.mjs` checks runtime dependencies, builds in .build-tmp, removes copied legacy script/HTML entries and publishes dist only after success. A failed build leaves the previous dist intact. Production contains the new shell, bundled modules, CSS and assets.

Dependencies became available during the continuation. The lockfile was reconciled offline and its root dependency declarations match package.json. Use npm ci in CI. Vercel configuration delegates requests to the Express handler and includes dist; deployment is not verified. The entry JavaScript is 39.60 KiB raw / 14.40 KiB gzip; all lazy chunks total 130.60 KiB / 50.72 KiB gzip. Native CSS and assets are additional requests. Run npm run bundle:report after subsequent builds.

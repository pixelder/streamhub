# STREAMHUB

The two frontends now have separate servers: `server.js` runs the original
`public/` and EJS site; `server-preact.js` runs the Preact/Vite app. Both use
the shared TMDB proxy in `backend/`.

| Command | Runs |
| --- | --- |
| `npm start` / `npm run dev:public` | Original public/EJS site |
| `npm run dev` | Preact development |
| `npm run build && npm run start:preact` | Preact production |
| `npm run preview` | Preact production |

For side-by-side use, start the original site on port 8443 and run
`PORT=8444 npm run dev` in a second terminal.
See [the legacy API staging guide](docs/LEGACY_API_STAGING.md) for committing
only the original site's API integration.

A Preact frontend with native CSS, Vite bundling and the existing Express server. The interface retains the project's Pixelstream branding.

**Migration status:** frontend source implementation is in place, but production build and in-process artifact checks pass; visual/live integration validation remains blocked in the migration environment. Read [MIGRATION_REPORT.md](MIGRATION_REPORT.md) and [TEST_REPORT.md](TEST_REPORT.md) before deployment.

## Install and develop

Use Node.js 22.12 or newer and npm. Tests were executed with Node 26.10.0.

```sh
cd /home/rishi/Desktop/Projects/streamhub
npm install
[ -f .env ] || cp .env.example .env
npm run dev
```

The application defaults to http://localhost:8443. `PORT` controls the Express port. Set `TMDB_READ_ACCESS_TOKEN` in the server environment (local `.env` for development, deployment secrets for production) to enable catalog requests. The server accepts a TMDB Read Access Token or a 32-character v3 API key in this variable; both remain server-only and must never use a `VITE_` prefix. `VITE_EXTRACTOR_URL` defaults to `http://localhost:3000` and must point to the separate extractor service. All `VITE_` values are public and are substituted into browser assets during build.

TMDB requests from the browser go through `/api/tmdb/*`; Express adds the bearer token and limits the allowed endpoints, request rate, timeout, and response size. A TMDB token that was previously embedded in frontend source should be revoked and replaced in the TMDB dashboard. Never commit `.env` or deployment secrets.

The lockfile matches the new dependency declarations. Use npm ci for a clean install in CI; a clean network installation has not been verified in the migration environment.

## Check, build and run

```sh
npm run check
npm test
npm run build
npm run bundle:report
node scripts/verify-production.mjs
npm run start:preact
```

`check` checks source syntax/local import paths and original asset hashes. Tests cover service/storage contracts and Express document behavior without opening a listening socket. These are not browser tests.

`build` publishes dist only after successful bundling and removes legacy scripts/HTML from the output. `start:preact` and `preview` serve that production build. `start` serves the original public/EJS site. Build again after changing frontend source or VITE_ environment values. A missing Preact build receives HTTP 503 with instructions.

For Preact Node deployment, install dependencies, build, and run `npm run start:preact` with the desired PORT. Vercel configuration uses api/index.js and bundles dist with the Preact handler, but this configuration still requires a real deployment check. The original site runs with `npm start` and needs no frontend build.

## Troubleshooting

For TMDB failures, run `npm run diagnose:tmdb` from the project directory. It loads `.env`, shows which variable the server selects, and checks each configured credential without printing secrets. HTTP 200 confirms acceptance; 401/403 reports authentication/access rejection. A timeout or DNS/connection error means no HTTP response was received and cannot establish credential validity. The server prefers `TMDB_READ_ACCESS_TOKEN` when nonempty, then `TMDB_API_KEY`; a 32-character hexadecimal value uses v3 query authentication on the server. Restart `npm run dev` or `npm start` after changing `.env` or backend code.

If both credentials time out, run `npm run diagnose:tmdb -- --network`. This makes unauthenticated HTTPS requests to both TMDB hostnames using IPv4 and IPv6, plus an IPv4 request to example.com as a connectivity comparison. It reports whether failure occurred during DNS lookup, TCP connection, TLS handshake or waiting for HTTP. HTTP 401 from TMDB is expected for these credential-free probes. Proxy variable names are reported without their values; browser VPN/proxy/DNS settings may differ from the Node server.

- Missing preact or npm EBUSY/getaddrinfo: restore registry/DNS access, run npm install, then build. No production runtime substitute is included.
- EPERM on listen: run in an environment permitted to bind a local port; PORT can select an available permitted port.
- Blank media or failed feeds: inspect browser requests to TMDB/provider/sports/extractor services. Local route tests cannot verify those services.
- Extractor unavailable: start the separate service and check VITE_EXTRACTOR_URL, its WebSocket endpoint and CORS permissions. An HTTPS frontend needs a compatible HTTPS/WSS endpoint.
- Visual differences: compare against retained public/ and views/ sources before changing CSS. npm run check confirms original asset bytes, not rendered appearance.

Architecture, compatibility details and remaining verification work are documented in [ARCHITECTURE.md](ARCHITECTURE.md), [MIGRATION_REPORT.md](MIGRATION_REPORT.md), [TEST_REPORT.md](TEST_REPORT.md) and [the checklist](docs/MIGRATION_CHECKLIST.md).

## Customize the site

Open /settings using the desktop or mobile Settings navigation link. Preferences save automatically in app_settings on this browser/device and are included in backups.

- Appearance: dark/light/system theme, accent color, text size and reduced motion. Embedded providers control their own appearance.
- Home: automatic featured-title rotation, slide duration and Continue Watching visibility.
- Playback: default provider for titles without a saved source, and next-episode navigation when a provider reports completion (99.5% progress or above). Providers that do not send progress cannot trigger this navigation.
- Profile: name and a local avatar image (PNG/JPEG/WebP/GIF, up to 512 KB).
- Data: export, merge/replace imports, confirmed clearing and confirmed preference reset. Restoring default preferences keeps library/history records.

Device reduced-motion preferences also pause carousel rotation. Settings search covers all categories. Preferences do not sync to an account or other devices.

The redesigned Settings studio includes eight sections and 33 controls/actions. Additional integrations cover localized catalog metadata, streaming region, artwork data saver, episode spoilers, ratings, home collections, source memory, anime audio, activity recording, cache policy, sports polling and extraction defaults. See [Settings integration map](docs/SETTINGS.md) for exact behavior and provider limitations.

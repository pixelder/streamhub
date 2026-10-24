# STREAMHUB product review and tracking upgrade

## Assessment

**6.5/10 against the intended watch, track, and share experience, before this upgrade.**
This is a qualitative source-based assessment, not a production reliability score or a live playback certification.

| Area | Assessment |
| --- | --- |
| Watching and discovery | The strongest part: browsing, search, filters, title details, episode selection, source selection, progress and Continue Watching are implemented. Third-party player availability still determines whether playback works. |
| Tracking | Existing bookmarks, playback history and backups provide a useful foundation. They did not provide a complete personal rating, viewing-status and note workflow. |
| Sharing | Individual title sharing exists. Named collections, portable collection sharing, profiles and social activity were the larger product gaps. |
| Architecture | Preact, route splitting, separate services and a server-side TMDB proxy are sound foundations. Global browser persistence and external playback integrations still constrain portability and reliability. |
| Confidence | Automated tests cover meaningful logic and routes. End-to-end browser coverage, real-device checks and production telemetry remain necessary. |

For comparison, [Letterboxd](https://letterboxd.com/welcome/) combines ratings, reviews, watchlists, lists and social discovery. [Trakt's watchlist documentation](https://forums.trakt.tv/t/what-is-the-watchlist-what-kind-of-items-should-i-add-to-it/104850) connects planned viewing to upcoming releases. These are useful reference workflows for STREAMHUB's stated purpose.

## Implemented in this development branch

- Movie and TV tracking: Want to watch, Watching, Watched, On hold and Stopped watching.
- Personal ratings in half-point steps, from 0.5 to 10; zero means unrated.
- Optional watched date and private note, edited from title details or Library.
- Library summary, title search, status filtering, and sorting by update date, rating or title.
- Named collections with movie/TV membership, duplicate prevention, renaming, reordering and deletion.
- Collection links with an explicit preview and Save a copy action for recipients.
- Native sharing when available, clipboard fallback, and a selectable URL if neither succeeds.
- Existing backup export, restore, merge, storage usage and full erase controls include the new records.

Open any movie or TV show's details and expand **Your tracking**. Create collections under **Library → Collections**, then add titles from their details.

The existing history, watchlist, Continue Watching, APIs, routes and playback logic are retained. Manual tracking is separate from playback history: marking a show watched does not manufacture episode progress. Each title has one current tracking record; this is not a multi-entry rewatch diary.

## Files and design

`features/personal/model.js` contains validation, stable movie/TV identity, backup merging and share encoding. `store.js` owns browser persistence. `TitleJournal.jsx` supplies the reusable editor; `PersonalLibrary.jsx` supplies the overview and collection management. `personal.css` scopes the new responsive UI to existing theme tokens.

Integration points are `components/media/DetailsModal.jsx`, `features/library/Library.jsx`, `stores/storage.js`, and `features/settings/actions.js`. No dependencies were added.

### Data and sharing boundaries

- New keys: `title_journal` and `custom_lists`. Existing keys and schemas are preserved.
- Data stays in this browser origin. There is no account, cloud sync or shared database.
- Limits: 5,000 tracking records, 100 collections, 200 titles per stored collection; sharing supports up to 40 titles and a 12,000-character encoded payload.
- Links contain the collection name and title identities, names and poster paths. They exclude private notes, ratings, status and watched dates. Anyone with a link can read its collection contents; encoding is not encryption.
- Links use a URL fragment. They are snapshots, not live collaborative lists, and recipients must open them on a deployment containing this feature. Some messaging apps may truncate long links; there is no URL-shortening service.
- Opening a shared link does not save or overwrite data. Saving creates a new collection.
- Backup merge retains the newer tracking record and combines matching collection members. Explicit replace mode retains its existing replace semantics.
- Invalid stored personal data is reported, not silently reset. Storage write failures are surfaced.

## Validation

- `npm test`: **75 passed, 0 failed**, including 11 new tests for tracking, collection operations, safe sharing, validation, backup compatibility, merge conflicts, erasure and storage failure.
- `node scripts/check-source.mjs`: **67 modules checked, 0 failures**.
- Vite build: **passed**, 84 modules transformed. Output was redirected to `/tmp/streamhub-product-build`; no production output was overwritten.
- Build sizes: entry JS 38.41 kB / 14.01 kB gzip; Library chunk 9.68 kB / 3.44 kB gzip; shared CSS 93.88 kB / 17.93 kB gzip. These are final artifact sizes, not measured before/after deltas or the total page transfer size.
- In-memory Express smoke checks: `/library`, `/library?view=collections`, `/movie?id=42`, `/watch/movie/42`, and `/settings` served the built shell. Six entry/preload/style assets returned 200. An unknown API path returned 404 rather than SPA HTML. The `view` query is accepted but does not select a Library tab.
- An initial smoke probe incorrectly used `/movie/42`; the app correctly returned 404. The existing title URL is `/movie?id=42`; no route change was needed.
- `git diff --check`: passed.
- Browser verification **blocked**: installed Chrome exits with `setsockopt: Operation not permitted`. Responsive styling is implemented, but visual equivalence, keyboard interaction, native sharing and click-through flows have not been browser-verified here.
- Live TMDB availability, embedded playback, and sports streams were not verified by this task.

## Remaining upgrades, in priority order

1. **Accounts and cross-device persistence:** authenticated users, a database, ownership checks, local-data import, conflict handling, account export and deletion. This is the largest step toward a dependable personal service.
2. **Episode-level tracking and release calendar:** explicit watched episodes, next unwatched episode, returning-show schedule and optional notifications. Keep manual tracking independent of unreliable third-party player events.
3. **Social sharing:** stable public/private list URLs, profiles, follows, reviews and activity feeds. Public user content also needs reporting and moderation controls.
4. **Personal discovery:** recommendations informed by personal ratings and history, with reasons and controls for excluded genres/titles.
5. **Reliability:** browser regression tests, mobile and keyboard checks, API/provider health monitoring and observable playback failures.

The new features close useful local tracking and sharing gaps. They do not by themselves make this an 8/10 multi-user service; cloud identity, durable sync and demonstrated browser/playback reliability remain material requirements.

## Running this checkout

Changes are isolated on `feature/tracking-sharing`, based on the existing `mig` branch, at `/home/rishi/Desktop/Projects/streamhub-dev`. The original `streamhub` checkout remains on production `Main` and was not modified. Nothing was staged, committed, pushed or deployed.

```sh
cd /home/rishi/Desktop/Projects/streamhub-dev
PORT=8444 npm run dev
```

Open `http://localhost:8444/library`. Port 8444 allows the production/local site on 8443 to continue running. Browser storage is origin-specific: use the existing backup export/import flow to copy wanted data between ports. Use merge when keeping existing development records.

This local worktree reuses installed dependencies and server credentials through ignored `node_modules` and `.env` symlinks to the original checkout. No credential contents were changed or added to Git. A fresh checkout needs `npm install` and its own server environment configuration.

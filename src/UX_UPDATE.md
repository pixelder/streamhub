# Development UX update

## Changes

### Trending rows

TMDB returns up to 20 titles per page, but STREAMHUB's catalog preferences then filter them. In particular, the default minimum of 200 votes removes some new or less widely rated titles. The previous implementation displayed only what survived that first page.

Trending Movies and Trending Series now fetch subsequent pages until at least 20 eligible, distinct titles are available, the catalog ends, or five pages have been checked. The row displays the first 20; expanding it retains the remaining fetched results. The upstream page cursor prevents skipping or repeating pages during further loading. Existing maturity, rating, language, genre and blacklist preferences remain effective.

Restrictive filters can still produce fewer than 20 titles. In that case, the row explains why, links to Content filters, and offers another batch where available. A later request failure preserves completed pages and provides a retry starting at the failed page.

### Title details

The tracking editor no longer appears among the synopsis and playback actions. Open **Title options (⋮) → Rate & track** to show a dedicated editing view inside the details modal. **Title details** or Escape returns to the original view. Library retains its inline editors.

Share, copy and external-link menu rows now have consistent sizing, padding, icons, typography, hover and focus states. The menu closes on outside pointer input and Escape. A cancelled native share does not unexpectedly copy the link, and Parental Guide is shown only when an IMDb ID exists.

### Stylesheet loading

`app/RouteStyles.jsx` gates rendering for routes that use legacy page stylesheets. `app/pageStyles.js` owns their load/error handling and cleanup. Sports retains its required ordering before the global stylesheet. Failed loads show a retry action; navigation removes old route styles. `usePage` now only sets the document title.

Settings and Watch use bundled feature CSS. Watch's former global iframe/player selectors are scoped to `.watch-page`, because a mini-player can coexist with any route. Optional remote fonts retain fallbacks; this change does not block the entire app on font services.

### Mobile Settings

The category select has been replaced with grouped rows containing an icon, category name, short description and navigation arrow. Selecting a category opens its controls; **All settings** returns to the list. Category selection uses `/settings?category=appearance` (and the other existing category keys), so direct links and browser history work.

Desktop keeps its sidebar. Spacing is tighter, repeated profile labels have been removed, and search still searches every category. Existing preferences, storage schemas and integrations are retained.

### Persistent mini-player

`features/watch/WatchHost.jsx` lives outside the replaceable route subtree. Navigating away from Watch or pressing **Minimize player and browse** retains the same Watch component and iframe, displaying a floating player. Expand returns to its watch URL; close removes the session and iframe. Reload and next-episode controls are also available.

TV autoplay advances inside the minimized session without forcing the current browsing page back to Watch. Pending manual next-episode lookups are ignored after closing or changing episodes. Provider controls have larger touch targets, keyboard activation, Escape handling and hidden-panel focus protection. The normal iframe no longer receives the old combined mobile zoom and transform.

This is an in-page mini-player, not operating-system picture-in-picture. Embedded providers own their transport controls; no unsupported external pause/seek API is assumed. The session is not retained across a full browser refresh.

## Validation

- `npm test`: **85 passed, 0 failed**. Ten new regression cases cover batch pagination, duplicate identities, request bounds, cancellation, partial failures, stylesheet readiness, ordering, failure/retry and cleanup.
- `node scripts/check-source.mjs`: **71 modules, 0 failures**.
- Vite build: **passed**, 89 modules transformed. Output was written to `/tmp/streamhub-ux-build`, leaving existing production output untouched.
- Final entry JS: **42.03 kB / 15.22 kB gzip**. Watch remains a separate chunk: **10.93 kB JS / 4.24 kB gzip**, plus **13.39 kB CSS / 2.93 kB gzip**.
- Server-rendered markup checks passed for mobile category navigation, nested settings, desktop filters, withholding route content before CSS is ready, the standalone tracking editor, and mini-player controls. These are render checks, not browser interaction tests.
- `git diff --check`: passed.
- Chrome could not start: this environment rejects its socket operations with `EPERM`. Screenshots, real browser back/forward interaction, focus behavior and iframe continuity during actual playback remain unverified here. Live TMDB and third-party streams were not certified by these tests.

## Browser checks still needed

1. Open Home with default filters, expand Trending Movies, and check that loading resumes after the last fetched API page. Repeat with restrictive filters and a failed request.
2. At mobile width, open Settings → Appearance, change a preference, then use All settings and browser Back. Check search and direct category links.
3. Open a movie and a TV show's details. Use Rate & track, save a rating, return to details, and check copy/share and keyboard focus.
4. Start a supported player, minimize it, visit Home/Library/Settings, and expand it. Check in the browser's Network panel that minimizing/restoring does not request a fresh iframe document. Change providers, play the next episode, and close the player.
5. Repeat layouts in light and dark themes and with a slow connection; verify the route waiting state appears before page-specific content.

All implementation changes are in `/home/rishi/Desktop/Projects/streamhub-dev` on `feature/tracking-sharing`. No dependencies were added, and no files in the production checkout or legacy `public` frontend were edited. Both checkouts had pre-existing `package-lock.json` changes; those were preserved. No commits, pushes or deployments were performed.

```sh
cd /home/rishi/Desktop/Projects/streamhub-dev
PORT=8444 npm run dev
```

## Watch follow-up: resizing and playback tools

- Restored the original toolbar button heights/margins and provider row sizes, including their existing mobile rules, by removing the later enlarged-control overrides.
- Mini-player video stays at 16:9. Its top-left handle resizes with mouse, pen or touch, constrained to viewport width/height. Arrow keys adjust size, Home/End choose limits, and Enter or double-click resets it. Width is remembered for the browser session; unavailable storage does not prevent resizing.
- Resizing and theater mode change layout without replacing the iframe. Page bottom clearance follows the mini-player height. Pointer capture is released on completion/cancellation and window resize listeners are cleaned up.
- Added desktop theater mode and a copy-watch-link control that preserves the current season and episode. Mobile keeps its full-width player layout and hides the redundant theater control.
- Validation: 91 automated tests pass, including resize direction and viewport bounds. Source/import checker passes for 78 modules. Vite build passes into `/tmp/streamhub-watch-build`.
- Browser drag/keyboard interaction, screenshot comparisons and external playback remain unverified in this environment. No production or public files were edited for this follow-up; existing user changes there are preserved.

## Mini-player dragging and compact dock

- Drag the floating player's title with a mouse, touch or pen; position is clamped to the viewport and mobile navigation area. Dropping near the bottom after a downward drag docks it.
- The dock uses a compact artwork/title row above mobile navigation (centered bottom bar on desktop). Drag upward or choose Show floating video to return to the resizable video window. Expand, next episode and close remain available; no unsupported provider play/pause command is simulated.
- Keyboard: arrow keys move the focused title; Enter/Space toggles docking. Resize controls remain separate. Pointer cancellation does not dock; captured pointers and resize listeners are cleaned up.
- The iframe is not replaced when docking. Its clipped container is inert and hidden from assistive technology while docked. Third-party providers may independently restrict background playback.
- Validation: 93 automated tests passed, source/import checks passed for 80 modules, production build passed to `/tmp/streamhub-dock-build`. Dragging/docking interaction and provider playback require a browser check; no visual verification is claimed.

## Dock transitions

Floating-to-docked transitions now animate measured position and size over 280ms, with coordinated artwork and video fades. The iframe remains mounted. New gestures cancel an in-progress animation so pointer movement remains direct; window resizing, unmounting and reduced-motion preference changes also cancel animations. Both the OS and application reduced-motion settings are respected. Source checks and Vite build pass; 93 automated tests pass. Browser animation smoothness remains unverified in this environment.

Live docking now runs during pointer movement rather than on release. The same captured gesture can dock at the bottom and pull upward to undock. A 36px upward threshold prevents boundary flicker; further movement interrupts the undock animation to keep dragging responsive. Pointer release/cancellation only ends the gesture. Source check, 93 tests and temporary-output build pass; browser gesture verification remains pending.

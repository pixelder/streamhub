# Profile page

Development checkout only. No public assets, production checkout, dependencies or server code changed.

## Experience

- `/profile` combines editable name/photo, activity counts and Library, Tracking and Collections tabs.
- Library retains Continue Watching, bookmarks (labelled Watchlist), History and existing title actions.
- Existing ratings, notes, collection management/sharing and backup controls remain available.
- Mobile navigation has Home, Explore, Sports, Tools and Profile. Settings is accessible from the top-right Profile button; desktop also retains its Settings link.
- Profile uses theme variables, responsive spacing and compact typography below 400px. The photo editor supports keyboard focus trapping, Escape, draft cancellation and validated photo uploads.
- Mobile Settings search stretches across its container. General/profile controls moved out of Settings.

## Compatibility

- `/library` and its aliases redirect to Profile with query parameters, section anchors and shared collection snapshots retained.
- `/settings?category=general` redirects to Profile.
- Shared collection links now use `/profile?view=collections#collection=...`.
- Existing `app_settings.profile`, bookmarks, watching, history, journal and collection schemas remain unchanged. The profile schema remains in preferences for data compatibility.
- Resetting preferences preserves the profile. Explicit erase-data behavior is unchanged.

## Validation

- 88 automated tests passed, including Profile/Library URLs, Express direct routes and profile preservation on preference reset.
- Source checker: 76 modules, no syntax/import-path failures.
- Vite production build passed with output directed to `/tmp/streamhub-profile-build`, leaving deployment artifacts untouched.
- Server-rendered component smoke checks passed for all three Profile views, mobile navigation, Settings and the profile editor. These check generated markup, not browser interactions.
- `npm run check` asset guard reports three existing archived-baseline differences: `public/css/media.css`, `public/css/styles.css`, `public/css/base.css` (47/50 matches). These files were not modified by this work.
- Browser screenshot comparison and interactive upload/navigation checks remain unverified: the browser could not launch under this environment's socket restrictions. Check desktop and mobile layouts in `npm run dev`, then visit `/profile` and `/settings`.
- Production checkout retains only its pre-existing package-lock.json change. Development public files have no Git diff.

## Multiple local profiles

- The Profile page now supports adding a name/photo profile, switching profiles, and confirmed deletion. At least one profile must remain. New profiles start with empty libraries and default preferences.
- Existing data is the `default` profile and stays under its original keys. `streamhub_profiles_v1` stores IDs and the selected ID; additional profiles use `streamhub_profile:<id>:<key>` for their app settings, bookmarks, viewing history, continue watching, sources, journal and collections. No original data is copied or cleared on first use.
- Backups export/import the selected profile only. Switch to each profile to back it up. Older backups can be imported into any selected profile. Profile registry and other profiles are excluded from exports. Preference resets keep identity; the explicit erase-data action clears only the selected profile's application data.
- Creation rolls back the new settings record if saving the registry fails. Deletion keeps other profiles and unrelated browser storage intact. Original numeric provider keys are retained until the original profile is explicitly deleted.
- Switching refreshes route state, closes dialogs and stops the player. Playback/history and backup operations reject stale updates after a profile change. The selected profile is shared across tabs on the same origin; storage events refresh other tabs.
- These are local browser profiles, not authenticated accounts or privacy barriers. There is no cloud sync or password protection.
- Validation: 98 tests pass, including original data retention, separate journal/bookmarks/preferences/sources, current-profile backup/import/erase, deletion and last-profile protection, failed creation rollback and isolated cleanup. Source/import check and Vite production build passed (`/tmp/streamhub-multi-profile-build`). Browser interaction and visual verification remain pending. Production/public files were not modified in this change.

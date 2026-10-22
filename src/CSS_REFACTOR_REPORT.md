# STREAMHUB CSS architecture refactor

## Scope and directory boundary

The repository contains two applications in one project root. `package.json`
starts the Preact development application through `server-preact.js --dev`.
That server reads the root `index.html`, which loads `src/main.jsx`. These are
the development frontend's entry and source directory.

The original application runs through `server.js`, which serves `public/` and
renders templates from `views/`. `server-preact.js` serves `dist/` when running
the built application, and `vercel.json` also identifies `dist/` as its output.

This task changed only `src/**` and the Preact root `index.html`. `public/`,
`views/`, `dist/`, both servers, deployment configuration, dependencies and
lockfiles were treated as read-only. The report lives in `src/` for that reason.
No normal build, deployment or synchronization command was run.

Before editing, file hashes, Git status, unstaged diff and staged diff were
recorded under `/tmp/streamhub-css-architecture-6liehl10`. Existing changes to
production files were already present; they are not part of this refactor.

## Previous architecture

Preact loaded five shared stylesheets from `public/css/`: `base.css`, `utils.css`,
`components.css`, `styles.css` and the mobile `media.css`. The main stylesheet
contained 3,525 lines, 503 rules and 1,945 declarations. Theme and preference
overrides were imported separately from `src/main.jsx`.

The route hook adds page styles after the global styles. Sports deliberately
inserts its stylesheet before the base styles. Settings has its own scoped,
lazy-loaded stylesheet. These ordering relationships are significant.

The audit covered the global styles, responsive and route overrides, JSX class
attributes, inline styles, conditional classes, CSS variables, animations and
DOM selector/state operations in the development source. Generated credit
classes, provider state, expanded sections, keyboard state, history editing,
modal behavior and route-specific rules were retained.

## New architecture

`src/styles/index.css` is the single global stylesheet entry. Its imports are
ordered to reproduce the previous cascade. The original global styles have
development-owned copies, so future Preact changes can be made without editing
the original site's stylesheets.

New files, all under `src/styles/`:

```text
index.css
foundation/
  base.css                 Reset, existing variables and document defaults
  document.css             Page scrolling and heading rules
  tokens.css               Catalog alert color tokens
layout/
  existing-utilities.css   Existing layout utility vocabulary
  patterns.css             Shared control and spinner patterns
components/
  primitives.css           Inputs, selects, buttons and confirmation dialogs
  navigation.css           Top navigation and navigation search
  catalog.css              Sections, expansion, cards and selection
  search-controls.css      Search pickers, dropdowns and their animations
  details.css              Details modal, trailers, actions and metadata
  episodes.css             Seasons and episode cards
  people.css               Synopsis, biographies and person credits
  feedback.css             Notifications and progress indicators
features/
  home.css                 Main layout and hero carousel
  streaming.css            Service tabs and movie/TV switch
  discovery.css            Browse results and filter dialog
  history.css              Continue Watching and history cards
responsive.css             Existing mobile overrides in their original order
```

The existing `customization.css` is imported last without changing its contents.
Settings' stylesheet and all eight page styles loaded by `usePage` are unchanged.
Those page styles remain read-only references to public assets. No source files
were removed. The main stylesheet was divided into 12 modules; the largest is
650 lines.

### Cascade and asset handling

The root HTML now links to the development CSS entry. Vite combines its imports
for the temporary build. Loading the complete global sequence through one entry
prevents a bundled desktop sheet from being emitted after a separate mobile
stylesheet and overriding it.

The HTML retains a stable `[data-base-style]` marker as a meta element, before
the global stylesheet. `usePage` still finds that marker and inserts Sports
styles before it. Other page styles continue to append after the globals.
The hook itself was not modified.

`responsive.css` retains both its internal media queries and the former link's
`(max-width: 767px)` condition. The conditional Funnel Display font import also
retains that condition in the emitted CSS. Other responsive values and media
queries were not changed.

Asset URLs formerly relative to `/css/` now use `/assets/` paths, which resolve
to the same files after moving the CSS source. No assets were copied into or
modified in production directories.

## Reuse and markup changes

Two reusable classes were added:

- `.centered-control`: `display: flex`, `align-items: center` and
  `justify-content: center`. It replaces three repeated declaration blocks for
  filter buttons, close buttons, and Watch/Trailer buttons. Five JSX sites use it.
  Their semantic classes remain present. The utility has the same single-class
  specificity as the extracted selectors. Component and responsive overrides
  remain later in the cascade; size, spacing and appearance stay in those rules.
- `.loading-spinner`: the existing 30px height, square aspect ratio and spinner
  mask, shared by catalog loading and the Watch player. Each instance retains
  its original inline background color. Neither markup structure nor loading
  logic changed.

Two exact color tokens replace eight literal uses:

| Token | Value | Uses |
| --- | --- | --- |
| `--catalog-alert-text` | `#ff5855` | Catalog alert/destructive text |
| `--catalog-alert-surface` | `#2f111a` | Catalog alert/destructive surfaces |

The existing `--warn` color and theme values are independent and unchanged.
Navigation's red hover color was left independent of these catalog tokens.

Markup files modified:

- Root `index.html`: global CSS entry and Sports insertion marker.
- `src/components/common/Loading.jsx`: spinner class.
- `src/components/media/DetailsModal.jsx`: centered Watch/Trailer controls.
- `src/features/explore/Explore.jsx`: centered filter and close controls.
- `src/features/watch/ProviderMenu.jsx`: centered close control.
- `src/features/watch/Watch.jsx`: spinner class.

`src/main.jsx` no longer imports `customization.css` separately because the CSS
entry includes it last. No other application logic was modified.

No original selectors, animation definitions or state classes were removed.
The refactor preserves `querySelector`, `querySelectorAll`, `closest`, `matches`
and `classList` operations, including `.hidden`, `.detach`, `.expanded`,
`.episode.current`, `.list-item`, `.grid-actions` and `.player-active`.

## Validation

| Check | Result |
| --- | --- |
| Modular CSS comparison | Passed: all 503 original rules retain their selectors, nesting and order; the 1,945 declarations match after expanding the recorded utility/token extractions |
| Shared CSS copies | Passed: parsed base, utilities, primitives and responsive styles match their original sources after URL resolution |
| Theme and Settings CSS | Byte-for-byte unchanged |
| CSS parsing | All 21 CSS files under `src/` parse |
| Class coverage | All five affected controls and both spinners updated; existing DOM hook expressions unchanged |
| Development build | Passed with 79 modules; output only in `/tmp/streamhub-css-architecture-6liehl10/build` |
| Existing tests | `npm test`: 64 passed, zero failed |
| Source checks | `node scripts/check-source.mjs`: 63 modules, zero syntax/import errors |
| Original asset baseline | 47/50 match; the three mismatches are the pre-existing edits to public base, main and mobile CSS |
| Route smoke checks | 12 document routes, global stylesheet, 11 emitted asset references and eight page styles served successfully through in-memory Express requests against the temporary build |
| Error routing | Unknown document/asset requests return 404; unsupported TMDB endpoint returns API 400, not an app document |
| Vite development transforms | Development HTML and CSS import transformation passed |
| Whitespace | `git diff --check` passed |

No lint script is configured. The temporary build used Vite's build API with
`configFile: false`, the existing imported Vite configuration, a cache directory
under `/tmp`, and an explicit temporary `outDir`. It did not run
`scripts/build.mjs`, whose publishing step replaces `dist/`.

The Vite development transform reported an environment denial when its
WebSocket listener attempted to open port 24678. HTML and stylesheet transforms
completed, but live HMR was not verified. In-memory route checks do not establish
browser navigation or live streaming behavior.

Headless Chrome was attempted and exited with `setsockopt: Operation not
permitted`. Before/after screenshots, desktop/mobile rendering, browser console
checks and interactive hover/focus/playback behavior could not be automatically
verified. The structural comparisons support preservation of the CSS; they do
not substitute for a browser visual comparison.

## Metrics

Counts cover CSS consumed by the Preact application, including its unchanged
read-only page styles. Production source copies are not counted twice.

| Metric | Before | After |
| --- | ---: | ---: |
| Main stylesheet lines | 3,525 | 3,504 across 12 modules |
| Total application CSS lines | 10,033 | 10,055 |
| Application CSS files | 15 | 29 |
| Development-owned CSS files | 2 | 21 |
| New reusable classes | — | 2 |
| Repeated declaration patterns consolidated | — | 2 |
| New exact color tokens | — | 2 |

Nine declarations were replaced by the three-declaration centered-control
pattern. Two three-declaration inline spinner patterns now share one rule.
The temporary optimized global CSS is approximately 89.49 kB, or 17.06 kB gzip;
this includes the previously separate base, component and mobile sheets.

## Deliberately preserved

The responsive sheet remains one ordered override file. Overlapping selectors,
nested rules, `!important`, broad classes such as `.loading`, and apparently
unused rules were retained where deleting or regrouping them could affect
dynamic markup, source order or responsive behavior. Unrelated repeat patterns
in Sports, Tools, Settings and page-specific production styles were not edited.

For maintenance, follow the order in `styles/index.css`. Add component rules
to the corresponding module, shared patterns only when their cascade can be
verified, and mobile refinements to the existing responsive override sequence.
Preact's global styles are now independent copies; edits to the original public
global styles no longer automatically change the development app.

## Production protection

The final review compares every repository file with the starting snapshot,
including untracked and ignored build files, rather than relying only on Git's
tracked-file diff. All 187 files outside `src/**` and the Preact HTML entry
remain byte-for-byte unchanged. This includes `public/`, `views/`, `dist/`,
server code, deployment configuration and existing environment files. The
staged diff and pre-existing tracked diff are unchanged. No files were staged
or committed by this task.

# Stage the API integration for the original site

`server.js` serves the original `public/` HTML/JavaScript and `views/` EJS pages.
`server-preact.js` runs the Preact/Vite application. Both mount the same proxy.
The original server never imports `src/`, Vite, or Preact and does not need `dist/`.

For the original site commit, include:

- `server.js` in full: original routes, `.env` loading, shared proxy mounting, and an export for route tests.
- `backend/tmdb.cjs` and `backend/tmdb-proxy.cjs` in full.
- The API URL/key-removal changes in `public/script.js`, `public/utils.js`,
  `public/explore/explore.js`, `public/search/search.js`, `public/watch/watch.js`,
  `public/library/library.js`, and `public/tools/script.js`. Review individual hunks
  because a file can also contain earlier unrelated edits.
- `.gitignore` rules that exclude `.env` and other local secret files.

The original package already declared Express and EJS. Keep those dependencies
and the original lockfile when committing only the legacy change; do not stage
the entire migration's package diff. Use Node 22.12 or newer.
`node server.js` loads `.env` itself, so the original `nodemon server.js` start
command also works if nodemon is installed.

Optional: include `scripts/diagnose-tmdb.cjs` and the `diagnose:tmdb` package script.
You can also run the diagnostic directly:

```sh
node --env-file-if-exists=.env scripts/diagnose-tmdb.cjs
```

Keep `server-preact.js`, `src/`, Vite setup, migration package changes, and the
Preact Vercel entry/configuration for the migration commit. Never stage `.env`.

## Commands in the combined working tree

| Command | Application |
| --- | --- |
| `npm start` or `npm run dev:public` | Original public/EJS site |
| `npm run dev` | Preact development with Vite |
| `npm run build && npm run start:preact` | Preact production |
| `npm run preview` | Preact production |

Both default to port 8443. To compare them simultaneously:

```sh
npm run dev:public
# In another terminal:
PORT=8444 npm run dev
```

The current `api/index.js` and `vercel.json` remain the Preact deployment setup.
Exclude them from the original-site API commit to preserve the original hosting setup.

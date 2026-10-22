// Preact/Vite server. The original public/EJS site runs through server.js.
const express = require('express');
const path = require('node:path');
const fs = require('node:fs/promises');
const { credentialFor } = require('./backend/tmdb.cjs');
const mountTmdbProxy = require('./backend/tmdb-proxy.cjs');

async function createApp({ development = false, root = __dirname } = {}) {
  const app = express();
  const { matchRoute, isServerPath } = await import('./src/app/routes.js');
  const dist = path.join(root, 'dist');
  let vite;
  mountTmdbProxy(app);
  if (development) {
    const { createServer } = await import('vite');
    vite = await createServer({
      root,
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.locals.close = () => vite.close();
  }
  const staticFiles = express.static(development ? path.join(root, 'public') : dist, { index: false, redirect: false });
  app.use(
    (req, res, next) => {
      if (matchRoute(req.path).name !== 'not-found' || /\.html$/i.test(req.path)) return next();
      staticFiles(req, res, next);
    }
  );
  // Vite must also skip the retained legacy HTML entries.
  if (vite) app.use(
    (req, res, next) => {
      if (matchRoute(req.path).name !== 'not-found' || /\.html$/i.test(req.path)) return next();
      vite.middlewares(req, res, next);
    }
  );
  app.use(
    async (req, res, next) => {
      if (!['GET', 'HEAD'].includes(req.method) || isServerPath(req.path) || !req.accepts('html')) {
        return res.status(404).type('text/plain').send('Not found');
      }
      try {
        let html = await fs.readFile(path.join(development ? root : dist, 'index.html'), 'utf8');
        if (vite) html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(matchRoute(req.path).name === 'not-found' ? 404 : 200).type('html').send(html);
      } catch (error) {
        if (error.code === 'ENOENT') return res.status(503).type('text/plain').send(
          'Frontend build is missing. Run npm install and npm run build before npm run start:preact.'
        );
        vite?.ssrFixStacktrace(error);
        next(error);
      }
    }
  );
  return app;
}

let productionApp;
module.exports = async (req, res, next) => {
  try {
    productionApp ||= createApp();
    (await productionApp)(req, res, next);
  }
  catch (error) {
    if (next) next(error); else {
      console.error(error);
      res.statusCode = 500;
      res.end('Unable to start the application.');
    }
  }
};
module.exports.createApp = createApp;

if (require.main === module) {
  const credential = credentialFor();
  console.log(
    credential
      ? `TMDB: ${credential.variable} selected (${credential.mode}); credential value hidden.`
      : 'TMDB: no server credential configured.'
  );
  createApp({ development: process.argv.includes('--dev') }).then(
    app => {
      const port = process.env.PORT || 8443;
      const server = app.listen(port, () => console.log(`STREAMHUB running at http://localhost:${port}`));
      server.on('error', error => {
        console.error(error);
        process.exitCode = 1;
        app.locals.close?.();
      });
      const shutdown = () => server.close(async () => {
        await app.locals.close?.();
        process.exit(0);
      });
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    }
  ).catch(
    error => {
      console.error(error);
      process.exitCode = 1;
    }
  );
}

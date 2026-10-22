const { credentialFor, upstreamRequest, failureCode } = require('./tmdb.cjs');

const TMDB_PATH = /^(?:configuration(?:\/(?:languages|countries))?|genre\/(?:movie|tv)\/list|watch\/providers\/(?:movie|tv)|discover\/(?:movie|tv)|trending\/(?:all|movie|tv)\/week|search\/(?:movie|tv|person|multi)|(?:movie|tv|person)\/\d+(?:\/images|\/season\/\d+)?)$/;
const rateBuckets = new Map();
const TMDB_LIMIT = 60;
const TMDB_WINDOW = 60_000;
const TMDB_MAX_RESPONSE = 5 * 1024 * 1024;

function allowTmdbRequest(ip, now = Date.now()) {
  let bucket = rateBuckets.get(ip);
  if (!bucket || bucket.until <= now) bucket = { count: 0, until: now + TMDB_WINDOW };
  bucket.count++;
  rateBuckets.set(ip, bucket);
  if (rateBuckets.size > 10_000) {
    for (const [key, value] of rateBuckets) if (value.until <= now) rateBuckets.delete(key);
  }
  return bucket.count <= TMDB_LIMIT;
}

async function tmdbProxy(req, res) {
  let upstreamPath;
  try {
    upstreamPath = decodeURIComponent(req.path.slice('/api/tmdb/'.length));
  }
  catch {
    return res.status(400).json({ error: 'Invalid TMDB path.' });
  }
  if (!TMDB_PATH.test(upstreamPath)) return res.status(400).json({ error: 'Unsupported TMDB endpoint.' });

  const query = new URLSearchParams();
  const entries = Object.entries(req.query);
  if (entries.length > 40) return res.status(400).json({ error: 'Too many query parameters.' });
  for (const [key, raw] of entries) {
    if (key === 'api_key' || !/^[a-z][a-z0-9_.]{0,63}$/i.test(key) || Array.isArray(raw) || typeof raw !== 'string' || raw.length > 500) {
      return res.status(400).json({ error: 'Invalid TMDB query parameter.' });
    }
    query.set(key, raw);
  }

  const credential = credentialFor();
  if (!credential) return res.status(503).json({ error: 'TMDB is not configured on this server.' });
  if (!allowTmdbRequest(req.ip)) return res.status(429).json({ error: 'Too many catalog requests. Try again shortly.' });

  const upstreamConfig = upstreamRequest(upstreamPath, query, credential);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  req.once('aborted', () => controller.abort());
  try {
    const upstream = await fetch(
      upstreamConfig.url,
      {
        headers: upstreamConfig.headers,
        signal: controller.signal,
        redirect: 'error'
      }
    );
    const length = Number(upstream.headers.get('content-length') || 0);
    if (length > TMDB_MAX_RESPONSE) return res.status(502).json({ error: 'TMDB response was too large.' });
    const reader = upstream.body?.getReader();
    const chunks = [];
    let total = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > TMDB_MAX_RESPONSE) {
          await reader.cancel();
          return res.status(502).json({ error: 'TMDB response was too large.' });
        }
        chunks.push(Buffer.from(value));
      }
    }
    res.status(upstream.status).type('application/json').send(Buffer.concat(chunks, total));
  } catch (error) {
    const code = failureCode(error);
    console.warn(`[TMDB] ${upstreamPath}: ${code}; authentication=${credential.mode}`);
    if (!res.headersSent) res.status(code === 'TIMEOUT' ? 504 : 502).json(
      {
        error: code === 'TIMEOUT'
          ? 'The server timed out connecting to TMDB. Run npm run diagnose:tmdb on the server.'
          : 'The server could not reach TMDB. Run npm run diagnose:tmdb on the server.',
        code
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

module.exports = function mountTmdbProxy(app) {
  app.get(['/api/tmdb', '/api/tmdb/*'], tmdbProxy);
  app.all(
    ['/api/tmdb', '/api/tmdb/*'],
    (req, res) => res.status(405).set('Allow', 'GET').json({ error: 'Method not allowed.' })
  );
};

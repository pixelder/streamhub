// This TMDB hostname is reachable on the deployment network; the longer alias
// times out during TCP connection there. Keep the upstream fixed.
const HOST = 'https://api.tmdb.org/3';

function credentialFor(env = process.env) {
  const token = env.TMDB_READ_ACCESS_TOKEN?.trim();
  const key = env.TMDB_API_KEY?.trim();
  const value = token || key;
  if (!value) return null;
  return {
    value,
    variable: token ? 'TMDB_READ_ACCESS_TOKEN' : 'TMDB_API_KEY',
    mode: /^[a-f\d]{32}$/i.test(value) ? 'v3 API key' : 'bearer token'
  };
}

function upstreamRequest(path, params, credential) {
  const query = new URLSearchParams(params);
  query.delete('api_key');
  const headers = { accept: 'application/json' };
  if (credential.mode === 'v3 API key') query.set('api_key', credential.value);
  else headers.authorization = `Bearer ${credential.value}`;
  return { url: `${HOST}/${path}?${query}`, headers };
}

// Error messages and URLs can contain credentials. Report only known codes.
function failureCode(error) {
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return 'TIMEOUT';
  const allowed = new Set([
    'EBUSY',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ENETUNREACH',
    'EHOSTUNREACH',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'CERT_HAS_EXPIRED',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
  ]);
  const codes = [error?.code, error?.cause?.code,
  ...(error?.cause?.errors || []).map(cause => cause.code)];
  return codes.find(code => allowed.has(code)) || 'CONNECTION_FAILED';
}

module.exports = {
  credentialFor,
  upstreamRequest,
  failureCode
};

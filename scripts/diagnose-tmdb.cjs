const { credentialFor, upstreamRequest, failureCode } = require('../backend/tmdb.cjs');
const https = require('node:https');

function probeNetwork(hostname, family, path = '/3/configuration') {
  return new Promise(resolve => {
    const started = Date.now();
    let stage = 'DNS';
    let settled = false;
    const finish = message => {
      if (settled) return;
      settled = true;
      resolve(`${hostname} IPv${family}: ${message} (${Date.now() - started}ms)`);
    };
    // No credentials: an HTTP 401 here is expected and proves connectivity.
    const req = https.get(
      {
        hostname,
        path,
        family,
        agent: false,
        signal: AbortSignal.timeout(6000)
      },
      response => {
        finish(`HTTP ${response.statusCode}; HTTPS connection succeeded`);
        response.destroy();
      }
    );
    req.on(
      'socket',
      socket => {
        socket.on('lookup', error => {
          if (!error) stage = 'TCP connection';
        });
        socket.on('connect', () => {
          stage = 'TLS handshake';
        });
        socket.on('secureConnect', () => {
          stage = 'HTTP response';
        });
      }
    );
    req.on('error', error => finish(`${failureCode(error)} during ${stage}`));
  });
}

async function diagnoseNetwork() {
  console.log('Network checks send no credentials. HTTP 401 from TMDB is expected.');
  const proxies = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']
    .filter(
      name => process.env[name]
    );
  console.log(`Proxy environment variables present: ${proxies.join(', ') || 'none'} (values hidden).`);
  const results = await Promise.all(
    [
      ...['api.themoviedb.org', 'api.tmdb.org'].flatMap(
        host =>
          [4, 6].map(family => probeNetwork(host, family))
      ),
      probeNetwork('example.com', 4, '/')
    ]
  );
  results.forEach(result => console.log(result));
  console.log(
    'These probes connect directly. A browser VPN, browser DNS, or browser proxy may use a different network route.'
  );
}

async function main() {
  if (process.argv.includes('--network')) {
    await diagnoseNetwork();
    return;
  }
  const selected = credentialFor();
  console.log(
    selected
      ? `Server selects ${selected.variable} (${selected.mode}).`
      : 'No TMDB credential configured in the server environment.'
  );
  if (!selected) {
    process.exitCode = 1;
    return;
  }
  console.log('Upstream host: api.tmdb.org (same host as the Express proxy).');

  let selectedWorks = false;
  for (const variable of ['TMDB_READ_ACCESS_TOKEN', 'TMDB_API_KEY']) {
    const credential = credentialFor({ [variable]: process.env[variable] });
    if (!credential) continue;
    const request = upstreamRequest('configuration', {}, credential);
    const start = Date.now();
    try {
      const response = await fetch(
        request.url,
        {
          headers: request.headers,
          redirect: 'error',
          signal: AbortSignal.timeout(10_000)
        }
      );
      await response.body?.cancel();
      const explanation = response.status === 200
        ? 'credential accepted'
        : [401, 403].includes(response.status)
          ? 'authentication/access rejected by TMDB'
          : 'TMDB responded; inspect service status or rate limits';
      console.log(`${variable}: HTTP ${response.status}, ${explanation} (${Date.now() - start}ms).`);
      if (variable === selected.variable) selectedWorks = response.status === 200;
    } catch (error) {
      console.log(
        `${variable}: ${failureCode(error)} (${Date.now() - start}ms). No HTTP response; credential acceptance is unknown.`
      );
    }
  }
  if (!selectedWorks) process.exitCode = 1;
}

main().catch(
  () => {
    console.error('Diagnostic failed; credential values withheld.');
    process.exitCode = 1;
  }
);

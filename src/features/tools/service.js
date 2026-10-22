export const EXTRACTOR_URL = (import.meta.env?.VITE_EXTRACTOR_URL || 'http://localhost:3000').replace(/\/$/, '');

export function buildPayload(form) {
  const { mediaType, name, year, season, episode, server, maxsize } = form;
  if (!name.trim() || !(mediaType === 'movie' ? year : season)) {
    throw new Error(mediaType === 'movie'
      ? 'Movie requires both Name and Year.'
      : 'TV Show requires both Name and Season.');
  }
  const limit = parseFloat(maxsize) * 1024 ** 3;
  return {
    mediaType,
    name: name.trim(),
    server: server || 'alpha',
    ...(mediaType === 'movie'
      ? { year: String(year) }
      : { season: String(season), episode: String(episode) === '0' ? '' : String(episode || '') }),
    ...(limit > 0 ? { limit } : {})
  };
}
// NDJSON can split at any byte, including inside a multibyte character. Flush
// both the decoder and the final record when the server closes the stream.
export async function readRecords(body, onRecord, signal) {
  if (!body)
    throw new Error('The extractor returned an empty response body.');
  const reader = body.getReader(),
    decoder = new TextDecoder();
  let buffer = '';
  const abort = () => {
    reader.cancel(signal.reason).catch(() => {
    });
  };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines)
        if (line.trim())
          await onRecord(JSON.parse(line));
      if (done)
        break;
    }
    signal?.throwIfAborted();
    if (buffer.trim())
      await onRecord(JSON.parse(buffer));
  }
  finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}

export function createExtractor(onStatus, { server = EXTRACTOR_URL, Socket = globalThis.WebSocket } = {}) {
  let socket,
    stopped = false,
    clientId = null,
    retryTimer,
    connectTimer,
    attempt = 0;
  const pending = new Set();
  const settle = (error, id) => {
    for (const waiter of pending)
      waiter(error, id);
    pending.clear();
  };
  const connect = () => {
    if (stopped || socket?.readyState === 0 || socket?.readyState === 1)
      return;
    clearTimeout(retryTimer);
    onStatus(
      {
        type: 'log',
        icon: attempt ? 'retry' : '🔌',
        string: attempt ? `Retrying... [${attempt}/5]` : 'Establishing connection to server...'
      }
    );
    const url = new URL(server);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const current = socket = new Socket(url.href);
    connectTimer = setTimeout(() => {
      if (current.readyState !== 1)
        current.close();
    }, 3000);
    current.onopen = () => {
      clearTimeout(connectTimer);
      attempt = 0;
      onStatus({
        type: 'log',
        icon: 'connected',
        string: 'Connected to server.'
      });
    };
    current.onmessage = ({ data }) => {
      try {
        const message = JSON.parse(data);
        if (message.clientId) {
          clientId = message.clientId;
          settle(null, clientId);
        }
        else if (message.status)
          onStatus(
            {
              type: 'log',
              icon: message.status === 'queue' ? '📌' : message.status === 'running' ? 'spinner' : '',
              string: message.message
            }
          );
      }
      catch (error) {
        onStatus({ type: 'error', string: `Invalid extractor message: ${error.message}` });
      }
    };
    current.onerror = () => onStatus({ type: 'warn', string: 'Unable to connect to the extractor.' });
    current.onclose = () => {
      clearTimeout(connectTimer);
      clientId = null;
      if (stopped)
        return;
      if (++attempt <= 5) {
        onStatus({ type: 'warn', string: 'Server connection lost. Reconnecting...' });
        retryTimer = setTimeout(connect, 10000);
      }
      else {
        const error = new Error('Server failed to connect.');
        onStatus({ type: 'error', string: error.message });
        settle(error);
      }
    };
  };
  const ready = signal => new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    if (clientId && socket?.readyState === 1) {
      resolve(clientId);
      return;
    }
    let timer;
    const complete = (error, id) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      pending.delete(complete);
      error ? reject(error) : resolve(id);
    };
    const abort = () => complete(signal.reason || new DOMException('Aborted', 'AbortError'));
    pending.add(complete);
    timer = setTimeout(() => complete(new Error('Timeout waiting for clientId')), 50000);
    signal?.addEventListener('abort', abort, { once: true });
    connect();
  });
  return {
    connect,
    async fetch(payload, onRecord, signal) {
      const id = await ready(signal);
      const response = await fetch(
        `${server}/fetch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-client-id': id },
          body: JSON.stringify(payload),
          signal
        }
      );
      if (!response.ok) {
        const text = await response.text();
        let message = text;
        try {
          message = JSON.parse(text).message || text;
        }
        catch {
          /* Plain-text HTTP errors are also valid. */
        }
        throw new Error(message || `Extractor request failed (${response.status})`);
      }
      await readRecords(response.body, onRecord, signal);
    },
    dispose() {
      stopped = true;
      clearTimeout(retryTimer);
      clearTimeout(connectTimer);
      settle(new DOMException('Aborted', 'AbortError'));
      if (socket) {
        socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
        socket.close();
      }
    }
  };
}

export function upsertFile(rows, file, option = null) {
  if (!file || typeof file !== 'object')
    return rows;
  const index = file.id ? rows.findIndex(row => row.id === file.id) : -1;
  const entry = {
    ...(index >= 0 ? rows[index] : {}),
    ...file,
    option,
    id: index >= 0 ? rows[index].id : file.id || `file-${globalThis.crypto.randomUUID()}`
  };
  return index >= 0 ? rows.map((row, i) => i === index ? entry : row) : [...rows, entry];
}

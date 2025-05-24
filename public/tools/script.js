// utils

function changeValue(id, delta) {
  const input = document.getElementById(id);
  let value = parseFloat(input.value) || 0;
  value = Math.max(0, value + delta);
  input.value = parseFloat(value.toFixed(2)).toString();
}

let statusTimeout
// function updateStatus({ type='log', string, expire=false, time=5000, remove=false }) {
//   const container = document.getElementById('status-info');
//   container.innerHTML = ''; 
//   if (remove) return;
//   const msg = document.createElement('div');
//   msg.className = `message ${type}`;
//   msg.textContent = string;   // use textContent
//   container.appendChild(msg);
//   if (expire) setTimeout(() => container.textContent='', time);
// }

function updateStatus({ type = 'log', icon = null, string, time = 5000, expire = false, remove = false }) {
  if (!type) return;
  const container = document.getElementById('status-info')
  container.innerHTML = ''
  if (remove) return
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  let iconDiv = null
  if (icon) {
    iconDiv = document.createElement("div");
    iconDiv.style = "display: grid; place-content: center; height: 100%; width: auto;" ;
    iconDiv.innerHTML = icon;
  }
  
  if (type === 'error') {
    iconDiv = document.createElement("div")
    iconDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>'
  }
  if (type === 'warn') {
    iconDiv = document.createElement("div")
    iconDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation btn"></i>'
  } 
  // if (type === 'success') {
    // }
    
  if (iconDiv) {
    iconDiv.className = 'icon';
    msg.appendChild(iconDiv)
  }
  const span = document.createElement('span')
  span.textContent = `${string}`
  msg.appendChild(span)

  clearTimeout(statusTimeout)
  container.appendChild(msg);
  if (expire) {
    statusTimeout = setTimeout(() => { container.textContent = '' }, time)
  }
}

//////

function toggleFields() {
  const mediaType = document.getElementById("mediaType").value;
  const tvinfo = document.getElementById("tv-input");
  const yearinfo = document.getElementById("year-input");
  const limit = document.getElementById("maxsize")
  const isMovie = mediaType === "movie";

  tvinfo.style.display = isMovie ? "none" : "flex";
  yearinfo.style.display = isMovie ? "flex" : "none";
  limit.value = isMovie ? 12 : 4;
}

function initiateForm() {
  // document.getElementById('mediaType').value = 'movie';
  toggleFields();

  const form = document.getElementById("form");
  form.addEventListener('submit', e => {
    e.preventDefault();
    const submit = e.submitter.id === 'scrape'
    const reset = e.submitter.id === 'reset'
    if (submit) scrape();
    if (reset) resetFormFields(e.submitter)
  })
}

function resetUI() {
  parsedCount = 0;
  parsable = 0;
  const btn = document.getElementById("scrape");
  const cancel_btn = document.getElementById("reset")
  btn.disabled = false;
  btn.classList.remove('loading')
  btn.textContent = "Generate";
  cancel_btn.classList.remove('cancel')
  cancel_btn.innerText = 'Reset';
}

function resetFormFields(btn) {
  if (btn.classList.contains('cancel')) return;
  ["name", "season", "episode", "year"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const isMovie = document.getElementById("mediaType").value === "movie"
  document.getElementById("maxsize").value = isMovie ? 8 : 4;

  ["output", "status-info", "results"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
  toggleFields();
  resetUI();
  initWebSocket()
}

const SERVER = 'https://alpha-scraper.onrender.com'
// const SERVER = "http://192.168.29.122:3000";

let controller;
let parsedCount = 0;
let parsable = 0;
let error = false;
let clientId = null;
let ws;
let retry = false;
let opened = false;
let aborted = false
let initTimeout

async function initWebSocket({ retries = 5, attempt = 0, timeoutMs = 15000 } = {}) {
  console.log('initializing websocket connection', attempt)
  if (aborted) {
    updateStatus({ remove: true })
    return
  }
  if (opened) {
    const icon = `<div class="blink-container">
                    <div class="blink-dot"></div>
                    <div class="blink-dot blink"></div>
                  </div>`
    updateStatus({type: 'log', icon,  string: 'Connected to server.' });
    return
  }
  let RETRIES = retries;
  let ATTEMPTS = attempt

  if (attempt === 0) {
    updateStatus({ type: 'log', string: '🔌 Establishing connection to server...' });
  }

  const wsUrl = new URL(SERVER);
  wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(wsUrl.href);
  let timedOut = false;

  // Connection timeout fallback
  const timeout = setTimeout(() => {
    timedOut = true;
    if (!opened) {
      socket.close(); // triggers onclose
    }
  }, timeoutMs);

  socket.onopen = () => {
    if (timedOut) return;
    aborted = false;
    opened = true;
    retry = false;
    ATTEMPTS = 0;
    clearTimeout(timeout);

    ws = socket; // promote to global only after success
    const icon = `<div class="blink-container">
                    <div class="blink-dot"></div>
                    <div class="blink-dot blink"></div>
                  </div>`
    updateStatus({type: 'log', icon,  string: 'Connected to server.' });
    console.log('WebSocket connected');
  };

  socket.onmessage = ({ data }) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.clientId) {
        clientId = parsed.clientId;
        console.log("Received client ID:", clientId);
      } else if (parsed.status) {
        const icon = `${parsed.status === 'queue' ? '📌'
          : parsed.status === 'running'
            ? '<i class="fa fa-spinner fa-spin"></i>' : ''}`
        updateStatus({ type: 'log', icon,  string: parsed.message });
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  };

  socket.onerror = (err) => {
    opened = false
    console.error("WebSocket error:", err);
  };

  socket.onclose = () => {
    aborted = false;
    clearTimeout(timeout);
    clientId = null;
    if (opened && !retry) updateStatus({ type: 'warn', string: 'Server connection lost.', expire: true });
    if (!opened && !retry) updateStatus({ type: 'warn', string: 'Unable to connect.', expire: true });

    opened = false

    const nextAttempt = ATTEMPTS + 1;
    if (nextAttempt <= RETRIES) {
      console.warn(`Retrying WebSocket (${nextAttempt}/${RETRIES})...`);
      const icon = '<i class="fa-solid fa-sync fa-spin"></i> '
      const retryText = `Retrying... [${nextAttempt}/${RETRIES}]`;
      if (!retry) setTimeout(() => { updateStatus({ type: 'log', icon, string: retryText }) }, 2000)
      if (retry) updateStatus({ type: 'log',icon,  string: retryText })
      retry = true
      initTimeout = setTimeout(() => {
        initWebSocket({ retries: RETRIES, attempt: nextAttempt, timeoutMs })
      }, 5000);
    } else {
      updateStatus({ type: 'error', string: 'Server failed to connect.', expire: true });
    }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  bottomNavBar();
  setUpScrollEvents()
  initiateForm();
});
initWebSocket(); // Establish WebSocket connection once at page load

async function scrape() {
  aborted = false
  controller = new AbortController();
  const signal = controller.signal;

  const btn = document.getElementById("scrape");
  const cancel_btn = document.getElementById("reset");
  cancel_btn.classList.add('cancel');

  const output = document.getElementById("output");
  const resultsDiv = document.getElementById("results");
  const status = document.getElementById("status-info");

  status.innerHTML = "";
  resultsDiv.innerHTML = "";
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Loading...';
  btn.classList.add('loading');
  cancel_btn.innerText = 'Cancel';

  cancel_btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!e.target.matches(".cancel")) return;
    if (controller) controller.abort();
    updateStatus({ type: "error", string: "The operataion was aborted", expire: true })
    resetUI();
    aborted = true;
    clearTimeout(initTimeout)
  }, { once: true });


  updateStatus({ type: 'log', icon: '<i class="fa fa-spinner fa-spin"></i>', string: 'Fetching data...' });
  output.textContent = "";

  const mediaType = document.getElementById("mediaType").value;
  const name = document.getElementById("name").value.trim();
  const year = document.getElementById("year").value;
  const season = document.getElementById("season").value;
  const episode = document.getElementById("episode").value;
  const maxsize = parseFloat(document.getElementById("maxsize").value) * 1024 ** 3 || undefined;
  const server_key = document.getElementById("server-key").value || "alpha";

  if ((mediaType === "movie" && (!name || !year)) || (mediaType === "tv" && (!name || !season))) {
    const string = `${mediaType === "movie"
        ? 'Movie requires both Name and Year.'
        : 'TV Show requires both Name and Season.'
      }`;
    updateStatus({ type: 'warn', string, expire: true });
    resetUI();
    return;
  }

  const payload = {
    mediaType,
    name,
    server: server_key,
    ...(mediaType === "movie" ? { year } : { season, episode: episode === '0' ? '' : episode }),
    ...(maxsize ? { limit: maxsize } : {})
  };

  // Ensure WebSocket is connected
  if (!opened || !ws || ws.readyState !== WebSocket.OPEN) {
    updateStatus({ type: 'warn', string: 'Reconnecting to server...' });
    if (aborted) return
    initTimeout = setTimeout(async () => {
      await initWebSocket();
    }, 2000)
  }

  // Wait for clientId with timeout fallback
  if (!clientId && !aborted) {
    updateStatus({ type: 'warn', string: 'Waiting for server connection...' });

    const waitForClientId = new Promise((resolve) => {
      const interval = setInterval(() => {
        if (clientId) {
          clearInterval(interval);
          resolve(true);
        }
      }, 2000);
    });

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for clientId")), 10000));

    try {
      await Promise.race([
        waitForClientId,
        timeout,
        new Promise((_, reject) => signal.addEventListener("abort", () => {
          const error = new Error()
          error.name = 'AbortError'
          reject(error)
        }
        ))
      ]);

    } catch (err) {
      console.log(err)
      if (err.name === 'AbortError') {
        const string = 'The operation was aborted!';
        updateStatus({ type: 'error', string, expire: true });
      }
      resetUI();
      return;
    }
  }
  await fetchAndRender({ payload, output, signal, resultsDiv });
}

async function fetchAndRender({ payload, output, signal, resultsDiv }) {

  try {
    const res = await fetch(`${SERVER}/fetch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId || ''
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!res.ok) {
      const error = new Error();
      error.name = res.statusText;
      error.status = res.status;
      error.message = JSON.parse(await res.text()).message;
      throw error;
    }

    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buffer = '';
    let raw = { raw: [], file: [] };
    parsedCount = 0;
    parsable = 0;

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    resultsDiv.appendChild(table);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const response = JSON.parse(line);

          if (response.status === 'file') {
            parsedCount++;
            raw.file.push(response);
            output.textContent = JSON.stringify(raw, null, 2);
            const string = `📦 Processing ${parsable - parsedCount} of ${pluralResolver(parsable, 'file', 's')}...`;
            updateStatus({ type: 'log', string });
            buildFileEntry(response.result);
          }

          if (response.status === 'raw') {
            raw.raw.push(response);
            output.textContent = JSON.stringify(raw, null, 2);
            parsable = response.results.length;
            const string = `📦 Processing ${pluralResolver(parsable, 'file', 's')}...`;
            updateStatus({ type: 'log', string });
            for (const file of response.results) {
              buildFileEntry(file);
            }
          }
        } catch (e) {
          console.error('Stream parse error:', e);
          output.textContent = `Stream parse error: ${e.message}`;
        }
      }
    }

  } catch (err) {
    error = true;
    console.log(err);
    const string = err.name === 'AbortError' ? `The operation was aborted!` : `${err.message}`;
    updateStatus({ type: 'error', string, expire: true });
    output.textContent = `${string}`;

  } finally {
    if (parsedCount) {
      const string = ` Received ${pluralResolver(parsedCount, 'file', 's')}.`;
      updateStatus({ type: 'success', icon: '🎉', string });
    }
    if (!parsedCount && !error) {
      const string = 'No valid results received.';
      updateStatus({ type: 'warn', string, expire: true });
    }

    document.querySelectorAll('.action-cell').forEach(item => {
      if (item.querySelector('.fa-spinner')) item.innerHTML = `<i class="fa-solid fa-triangle-exclamation btn"></i>`;
    });

    resetUI();
  }
}

async function buildFileEntry(file) {
  const tbody = document.querySelector('tbody');
  const { size, index, quality, file_name } = file;
  let tr = document.querySelector(`.result-row[data-index="${index}"]`);
  const actionHTML = await buildActionHTML(file)

  if (!tr) {
    tr = document.createElement('tr');
    tr.classList.add('result-row');
    tr.setAttribute('data-index', index);

    tr.innerHTML = `
      <td class="file-cell">
        <div class="file-name">${file_name}</div>
        <div class="file-flags">
          <p class="file-size">Size: ${size}</p>
          <div> • </div>
          <p>Quality: ${quality || "Unknown"}</p>
        </div>
      </td>
      <td class="action-cell">${actionHTML}</td>`;
    tbody.appendChild(tr);
  } else {
    if (file_name) {
      tr.querySelector('.file-name').innerText = file_name;
    }
    if (size) {
      tr.querySelector('.file-size').innerText = `Size: ${size}`;
    }
    tr.querySelector('.action-cell').innerHTML = actionHTML;
  }
}

async function buildActionHTML(file) {
  const { url, drive_link, file_name } = file;
  const intent = (link) => `intent://${link.replace('https://', '')}#Intent;scheme=https;type=video/*;end;`;

  if (!url && !drive_link) return `<i class="fa fa-spinner fa-spin btn">`
  return `
    ${url ? `
      <button title="Open in external player" onclick="openLinkExternal(this)" data-link="${intent(url)}">
        <i class="fa-solid fa-arrow-up-right-from-square"></i>
      </button>
      <button title="Copy link" class="copy" onclick="copyLink(this)" data-link="${url}">
        <i class="fa-solid fa-clone"></i>
      </button>
      <a href="${url}" download="${file_name}" target="_self">
        <button title="Download"><i class="fa-solid fa-download"></i></button>
      </a>` : ''}
    ${drive_link ? `
      <a href="${drive_link}" target="_blank">
        <button title="Open Drive Page"><i class="fa-solid fa-server"></i></button>
      </a>` : ''}`;
}

async function copyLink(btn) {
  try {
    toastMessage({ el: btn, string: 'Copied link to clipboard!', time: 3000 })
    await navigator.clipboard.writeText(btn.dataset.link);
  } catch (e) {
    console.error(e);
  }
}

async function openLinkExternal(btn) {
  window.open(btn.dataset.link, '_self');
}

function matchItem(ua, data) {
  for (const { name, value, version: versionLabel } of data) {
    if (!new RegExp(value, 'i').test(ua)) continue;

    const versionRegex = new RegExp(`${versionLabel}[- /:;]([\\d._]+)`, 'i');
    const matchResult = ua.match(versionRegex);
    const version = matchResult?.[1]?.split(/[._]+/).join('.') || '0';

    return { name, version: parseFloat(version) };
  }
  return { name: 'unknown', version: 0 };
}

function detectOS() {
  const os = [
    { name: 'Windows', value: 'Win', version: 'NT' },
    { name: 'Windows Phone', value: 'Windows Phone', version: 'OS' },
    { name: 'Linux', value: 'Linux', version: 'rv' },
    { name: 'Android', value: 'Android', version: 'Android' },
    { name: 'iPhone', value: 'iPhone', version: 'OS' },
    { name: 'iPad', value: 'iPad', version: 'OS' },
    { name: 'PlayBook', value: 'PlayBook', version: 'OS' },
    { name: 'Macintosh', value: 'Mac', version: 'OS X' },
    { name: 'Kindle', value: 'Silk', version: 'Silk' },
    { name: 'BlackBerry', value: 'BlackBerry', version: '/' }
  ];

  const browser = [
    { name: 'Chrome', value: 'Chrome', version: 'Chrome' },
    { name: 'Firefox', value: 'Firefox', version: 'Firefox' },
    { name: 'Safari', value: 'Safari', version: 'Version' },
    { name: 'Internet Explorer', value: 'MSIE', version: 'MSIE' },
    { name: 'Opera', value: 'Opera', version: 'Opera' },
    { name: 'BlackBerry', value: 'CLDC', version: 'CLDC' },
    { name: 'Mozilla', value: 'Mozilla', version: 'Mozilla' }
  ];

  const userAgent = navigator.userAgent;
  const OS = matchItem(userAgent, os);
  const BROWSER = matchItem(userAgent, browser);

  console.log({ OS: OS.name, Browser: BROWSER.name });
  return { OS: OS.name, Browser: BROWSER.name };
}

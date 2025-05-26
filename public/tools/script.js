const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_300 = 'https://image.tmdb.org/t/p/w300';

function changeValue(id, delta) {
  const input = document.getElementById(id);
  let value = parseFloat(input.value) || 0;
  value = Math.max(0, value + delta);
  input.value = parseFloat(value.toFixed(2)).toString();
}

let statusTimeout
function updateStatus({ type = 'log', icon = null, string, time = 5000, expire = false, remove = false }) {
  const container = document.getElementById('status-info')
  container.innerHTML = ''
  if (remove) return
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  let iconDiv = null
  if (icon) {
    iconDiv = document.createElement("div");
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
    statusTimeout = setTimeout(async () => { container.textContent = '' }, time)
  }
}

function toggleFields() {
  const mediaType = document.getElementById("mediaType").value;
  const tvinfo = document.querySelectorAll(".tv-input");
  const yearinfo = document.getElementById("year-input");
  const limit = document.getElementById("maxsize")
  const isMovie = mediaType === "movie";

  yearinfo.style.display = isMovie ? "flex" : "none";
  if (isMovie) {
    tvinfo.forEach(input => input.classList.add('hidden'));
    yearinfo.classList.remove('hidden')
  } else {
    tvinfo.forEach(input => input.classList.remove('hidden'));
    yearinfo.classList.add('hidden')
  }
  limit.value = isMovie ? 12 : 4;
  document.querySelector('.suggestion-container')?.remove()
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

  activeSearchResults(getActiveResults, { selector: '#name', minLength: 0, debounce: 1000})

}

async function getActiveResults(query) {
  if (query.length < 2) {
    document.querySelector('.suggestion-container')?.remove()
    return
  }
  const type = document.getElementById("mediaType").value
  fetchSearchResults(query, type, 1).then( async (data) => {
    if (!data.length) return
    sortByPopularity(data, type).then((data) => {
      buildSuggestedResult(data, type)
    })
  })
}

async function buildSuggestedResult(data, type) {
  const parent = document.getElementById('search-field')
  let container = document.querySelector('.suggestion-container')
  if (!container) {
    container = document.createElement('div');
    container.className = 'suggestion-container';
  }
  container.innerHTML = ''
  container.remove()
  data.map(item => {
    container.appendChild(buildResultHTML(item, type))
  })
  parent.appendChild(container)

  parent.addEventListener('click', (e) => {
    const result = e.target.closest('.result')
    const xicon = e.target.closest('.x-icon')
    if (!result && !xicon) return
    populateFields(result)
    container.remove()
  }, false )
}

function buildResultHTML(item, type) {
		const result = document.createElement("div")
		result.classList.add("result")
		result.setAttribute("data-id", item.id)
		result.setAttribute("data-name", item.name || item.title)
    result.setAttribute("data-media-type", type)
    result.setAttribute("data-year", extractYear(item.release_date) || '')
		let IMG = '/assets/images/no-image-transparent-dark.svg'
    if (item.poster_path) IMG = `${IMAGE_300 + item.poster_path}`
		result.innerHTML = `<div class="img-container"><img src='${IMG}' loading="lazy" alt=""></div><p>${item.name || item.title}</p>`
		return result
}

async function sortByPopularity(data, type) {
  data.sort((a, b) => popularity(b, type) - popularity(a, type))
  data.filter(item => popularity(item, type) > 0.01);
  return data
}

async function populateFields(item) {
  document.getElementById('name').value = item.dataset.name
  document.getElementById('year').value = item.dataset.year
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

const WS_CONNECT_TIMEOUT = 3_000;
const WS_RETRY_DELAY = 10_000;
const SCRAPE_RETRY_DELAY = 2_000;
const STATUS_CLEAR_DELAY = 5_000;
const CLIENTID_WAIT_DELAY = 2_000;
const CLIENTID_WAIT_MAX = 50_000;


async function initWebSocket({ retries = 5, attempt = 0 } = {}) {
  console.log('initializing websocket connection', attempt)
  if (aborted) {
    updateStatus({ remove: true })
    return
  }
  if (opened) {
    const icon = `<div class="pulse-container">
                    <div class="pulse-dot"></div>
                    <div class="pulse-dot pulse"></div>
                  </div>`
    updateStatus({ type: 'log', icon, string: 'Connected to server.' });
    return
  }
  let RETRIES = retries;
  let ATTEMPT = attempt

  if (attempt === 0) {
    updateStatus({ type: 'log', icon: '🔌', string: 'Establishing connection to server...' });
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
  }, WS_CONNECT_TIMEOUT);

  socket.onopen = () => {
    if (timedOut) return;
    aborted = false;
    opened = true;
    retry = false;
    ATTEMPT = 0;
    clearTimeout(timeout);

    ws = socket; // promote to global only after success
    const icon = `<div class="pulse-container">
                    <div class="pulse-dot"></div>
                    <div class="pulse-dot pulse"></div>
                  </div>`
    updateStatus({ type: 'log', icon, string: 'Connected to server.' });
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
        updateStatus({ type: 'log', icon, string: parsed.message });
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
    if (!opened && !retry) updateStatus({ type: 'warn', string: 'Unable to connect.', expire: true });
    if (opened && !retry) updateStatus({ type: 'warn', string: 'Server connection lost.', expire: true });

    opened = false

    const nextAttempt = ATTEMPT + 1;
    if (nextAttempt <= RETRIES) {
      console.warn(`Retrying WebSocket (${nextAttempt}/${RETRIES})...`);
      const icon = '<i class="fa-solid fa-sync fa-spin"></i> '
      const retryText = `Retrying... [${nextAttempt}/${RETRIES}]`;
      if (!retry) setTimeout(() => { updateStatus({ type: 'log', icon, string: retryText }) }, 2000)
      if (retry) updateStatus({ type: 'log', icon, string: retryText })
      retry = true
      initTimeout = setTimeout(() => {
        initWebSocket({ retries: RETRIES, attempt: nextAttempt })
      }, WS_RETRY_DELAY);
    } else {
      updateStatus({ type: 'error', string: 'Server failed to connect.', expire: true });
    }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  bottomNavBar();
  setActiveIcon('tools')
  setUpScrollEvents()
  initiateForm();
  initWebSocket(); // Establish WebSocket connection once at page load
});

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
    clearTimeout(initTimeout)
    initTimeout = setTimeout(async () => {
      await initWebSocket();
    }, SCRAPE_RETRY_DELAY)
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
      }, CLIENTID_WAIT_DELAY);
    });

    const timeout = new Promise((_, reject) => setTimeout(() => {
      reject(new Error("Timeout waiting for clientId"))
    }, CLIENTID_WAIT_MAX)
    );

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
    tr.setAttribute('data-size', size);
    tr.setAttribute('data-quality', quality);

    tr.innerHTML = `
      <td class="file-cell">
        <div class="file-name">${file_name}</div>
        <div class="file-flags">
          <p class="file-size">Size: ${size}</p>
          <div> | </div>
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

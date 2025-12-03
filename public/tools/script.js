const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_300 = 'https://image.tmdb.org/t/p/w300';

const output = document.getElementById("output");
const resultsDiv = document.getElementById("results");
const STATUS = document.getElementById("status-info");

function changeValue(id, delta) {
  const input = document.getElementById(id);
  let value = parseFloat(input.value) || 0;
  value = Math.max(0, value + delta);
  input.value = parseFloat(value.toFixed(2)).toString();
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
    if (!result) return
    populateFields(result)
    container.remove()
  }, false )
}

function buildResultHTML(item, type) {
		const result = document.createElement("button")
    Object.assign(result.dataset, {
      id: item.id, mediaType: type, name: item.name || item.title,
      year: extractYear(item.release_date) || ''
    })
		result.classList.add("result")
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

let statusTimeout
function updateStatus({ type = 'log', icon = null, string, time = 5000, expire = false, remove = false }) {
  const container = STATUS;
  container.innerHTML = '';
  if (remove) return;
  const msg = document.createElement("div");
  msg.className = `message ${type}`;

  const icons = {
    error: '<i class="fa-solid fa-circle-exclamation"></i>',
    warn: '<i class="fa-solid fa-triangle-exclamation btn"></i>'
  };

  if (icon || icons[type]) {
    const iconDiv = document.createElement("div");
    iconDiv.innerHTML = icon || icons[type];
    iconDiv.className = 'icon';
    msg.appendChild(iconDiv);
  }

  const span = document.createElement('span');
  span.textContent = string;
  msg.appendChild(span);
  clearTimeout(statusTimeout);
  container.appendChild(msg);

  if (expire) {
    statusTimeout = setTimeout(() => container.textContent = '', time);
  }
}

function toggleFields() {
  const type = document.getElementById("mediaType").value;
  const year = document.getElementById("year-input");
  const tvInputs = document.querySelectorAll(".tv-input");
  const isMovie = type === 'movie';

  year.style.display = isMovie ? "flex" : "none";
  tvInputs.forEach(el => el.classList.toggle('hidden', isMovie));
  year.classList.toggle('hidden', !isMovie);
  document.getElementById("maxsize").value = isMovie ? 12 : 4;
  document.querySelector('.suggestion-container')?.remove();
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
    if (reset) resetFormEntries(e.submitter)
  })

  activeSearchResults(getActiveResults, { selector: '#name', minLength: 0, debounce: 1000})

}
async function populateFields(item) {
  document.getElementById('name').value = item.dataset.name
  document.getElementById('year').value = item.dataset.year
}

function resetUI() {
  parsedCount = parsable = 0;
  const btn = document.getElementById("scrape");
  const cancel_btn = document.getElementById("reset")
  btn.disabled = false;
  btn.classList.remove('loading')
  btn.textContent = "Generate";
  cancel_btn.classList.remove('cancel')
  cancel_btn.innerText = 'Reset';
}

function resetNameEntry() {
  document.querySelector('#name').value = ''
  document.querySelector('.suggestion-container')?.remove()
}

function resetFormEntries(btn) {
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
// const SERVER = "http://localhost:3000";

let payload = {};
let raw = { raw: [], file: [] };
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

window.onload = () => {
  topNavBar();
  bottomNavBar();
  setActiveIcon('tools')
}

window.addEventListener('DOMContentLoaded', () => {
  setUpScrollEvents()
  initiateForm();
  initWebSocket(); // Establish WebSocket connection once at page load
});

async function checkForWebSocket({ signal } = {}) {
  if (!opened || !ws || ws.readyState !== WebSocket.OPEN) {
    updateStatus({ type: 'warn', string: 'Reconnecting to server...' });
    if (aborted) return false;
    clearTimeout(initTimeout);
    await new Promise(resolve => {
      initTimeout = setTimeout(async () => {
        await initWebSocket();
        resolve();
      }, SCRAPE_RETRY_DELAY);
    });
  }

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

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout waiting for clientId")), CLIENTID_WAIT_MAX)
    );

    const abortListener = new Promise((_, reject) =>
      signal?.addEventListener("abort", () => {
        const error = new Error("The operation was aborted!");
        error.name = 'AbortError';
        reject(error);
      })
    );

    try {
      await Promise.race([waitForClientId, timeout, abortListener]);
    } catch (err) {
      if (err.name === 'AbortError') {
        updateStatus({ type: 'error', string: err.message, expire: true });
      } else {
        updateStatus({ type: 'error', string: err.message, expire: true });
      }
      resetUI();
      return false;
    }
  }
  return true;
}

async function scrape() {
  aborted = false;
  payload = {};
  raw = { raw: [], file: [] };
  controller = new AbortController();
  const signal = controller.signal;

  const btn = document.getElementById("scrape");
  const cancel_btn = document.getElementById("reset");
  cancel_btn.classList.add('cancel');

  STATUS.innerHTML = "";
  resultsDiv.innerHTML = "";
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Loading...';
  btn.classList.add('loading');
  cancel_btn.innerText = 'Cancel';

  cancel_btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!e.target.matches(".cancel")) return;
    if (controller) controller.abort();
    updateStatus({ type: "error", string: "The operation was aborted!", expire: true })
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

  payload = {
    mediaType,
    name,
    server: server_key,
    ...(mediaType === "movie" ? { year } : { season, episode: episode === '0' ? '' : episode }),
    ...(maxsize ? { limit: maxsize } : {})
  };

  const ready = await checkForWebSocket({ signal });
  if (!ready) return;

  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  resultsDiv.appendChild(table);

  fetchAndRender({ payload, signal });
}

async function fetchAndRender({payload, signal }) {
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
      const text = await res.text();
      throw Object.assign(new Error(JSON.parse(text).message), {
        name: res.statusText,
        status: res.status
      });
    }

    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buffer = '';
    parsedCount = 0;
    parsable = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;

        let response;
        try {
          response = JSON.parse(line);
        } catch (e) {
          console.error('Stream parse error:', e);
          output.textContent = `Stream parse error: ${e.message}`;
          continue;
        }

        const { status, option = null, result, results } = response;

        if (status === 'file') {
          parsedCount++;
          if (option) parsable = result ? 1 : 0;
          raw.file.push(response);
          buildFileEntry(result);
        }
        if (status === 'raw') {
          raw.raw.push(response);
          if (option) parsedCount = results.length;
          for (const file of results) buildFileEntry(file, option);
        }

        output.textContent = JSON.stringify(raw, null, 2);
        const parsedString = pluralResolver(status === 'file' ? parsable - parsedCount : parsable, 'file', 's');
        updateStatus({ type: 'log', string: `📦 Processing ${parsedString}...` });
      }
    }

  } catch (err) {
    error = true;
    console.error(err);
    let string = err.message.includes('403') ? 'Error while fetching. Try Again!' : err.message;
    if (err.name === 'AbortError') string = 'The operation was aborted!';
    updateStatus({ type: 'error', string, expire: true });
    output.textContent = string;

  } finally {
    if (parsedCount) {
      updateStatus({ type: 'success', icon: '🎉', string: `Received ${pluralResolver(parsedCount, 'file', 's')}.` });
    } else if (!error) {
      updateStatus({ type: 'warn', string: 'No valid results received.', expire: true });
    }
    resetUI();
  }
}

async function buildFileEntry(file, option = null) {
  const tbody = document.querySelector('tbody');
  const { size, index, quality, file_name, id } = file;
  let tr = document.querySelector(`#${id}`);
  const actionHTML = await buildActionHTML(file, option)

  if (!tr) {
    tr = document.createElement('tr');
    tr.classList.add('result-row');
    tr.id = makeid(8);
    Object.assign(tr.dataset, {index, size, quality});

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
    if (file_name) tr.querySelector('.file-name').innerText = file_name;
    if (size) tr.querySelector('.file-size').innerText = `Size: ${size}`;
    tr.querySelector('.action-cell').innerHTML = actionHTML;
  }
}

async function buildActionHTML(file, option = null) {
  const { url, link, drive_link, file_name, page, directory } = file;
  const intent = (link) => `intent://${link.replace('https://', '')}#Intent;scheme=https;type=video/*;end;`;

  if (!url && !drive_link && option !== 'select') return `<i class="fa fa-spinner fa-spin btn">`
  if (option === 'select') {
    return ` 
      ${page ? `
        <a href="${page}" target="_blank">
          <button title="Open source website"><i class="fa-solid fa-globe"></i></button>
        </a>
      `: ''}
      ${link ? `
        <button onclick="fetchLink(this)" title="Fetch this link" data-link="${link}">
          <i class="fa-solid fa-screwdriver-wrench btn"></i>
        </button>
      ` : ''}
    `;
  }
  return `
    ${directory ? `
      <a href="${directory}" target="_blank">
        <button title="Open directory"><i class="fa-solid fa-globe"></i></button>
      </a>
    `: ''}
    ${url ? `
      <button title="Open in external player" onclick="openLinkExternal(this)" data-link="${intent(url)}">
        <i class="fa-solid fa-arrow-up-right-from-square"></i>
      </button>
      <button title="Copy link" class="copy" onclick="copyLink(this)" data-link="${url}">
        <i class="fa-solid fa-clone"></i>
      </button>
      <a href="${url}" download="${file_name}" target="_self">
        <button title="Download"><i class="fa-solid fa-download"></i></button>
      </a>
    ` : ''}
    ${drive_link ? `
      <a href="${drive_link}" target="_blank">
        <button title="Open Drive Page"><i class="fa-solid fa-server"></i></button>
      </a>
    ` : ''}
  `
}

async function fetchLink(btn) {
  btn.disabled = true;
  btn.title = 'Please wait...fetching link'
  btn.innerHTML = `<i class="fa fa-spinner fa-spin btn"></i>`

  controller = new AbortController();
  const signal = controller.signal;
  payload.resolve = {
    id: btn.closest('tr').id,
    link: btn.dataset.link
  }

  const ready = await checkForWebSocket({ signal });
  if (!ready) return;

  fetchAndRender({payload, signal}).then(() => {
    btn.disabled = false;
    btn.title = 'Fetch Link';
    btn.innerHTML = `<i class="fa-solid fa-screwdriver-wrench btn"></i>`
    // document.querySelectorAll('.action-cell').forEach(cell => {
    //   const spinner = cell.querySelector('.fa-spinner');
    //   if (spinner) cell.innerHTML = `<i class="fa-solid fa-triangle-exclamation btn"></i>`;
    // });
  })
}

function makeid(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
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

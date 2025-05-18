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

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mediaType').value = 'movie';
  toggleFields();
  bottomNavBar();
});

function resetUI() {
  const btn = document.getElementById("scrape");
  const cancel_btn = document.getElementById("reset")
  btn.disabled = false;
  btn.classList.remove('loading')
  btn.textContent = "Generate";
  cancel_btn.classList.remove('cancel')
  cancel_btn.innerText = 'Reset';
}

function changeValue(id, delta) {
  const input = document.getElementById(id);
  let value = parseFloat(input.value) || 0;
  value = Math.max(0, value + delta);
  input.value = parseFloat(value.toFixed(2)).toString();
}

function resetForm(btn) {
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
}

async function scrape() {
  const btn = document.getElementById("scrape");
  const cancel_btn = document.getElementById("reset")
  cancel_btn.classList.add('cancel')
  const output = document.getElementById("output");
  const resultsDiv = document.getElementById("results");
  const status = document.getElementById("status-info");

  cancel_btn.addEventListener('click', (e) => {
    if (!e.target.matches(".cancel")) return
    if (controller) controller.abort();
    document.querySelectorAll('.action-cell').forEach(item => {
      if (item.querySelector('.fa-spinner')) item.innerHTML = `<i class="fa-solid fa-triangle-exclamation btn"></i>`
    })
  }, {once : true})

  status.innerHTML = "";
  resultsDiv.innerHTML = "";
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Loading...';
  btn.classList.add('loading')
  cancel_btn.innerText = 'Cancel'
  status.innerText = "Fetching data...";
  output.textContent = "";

  const mediaType = document.getElementById("mediaType").value;
  const name = document.getElementById("name").value.trim();
  const year = document.getElementById("year").value;
  const season = document.getElementById("season").value;
  const episode = document.getElementById("episode").value;
  const maxsize = parseFloat(document.getElementById("maxsize").value) * 1024 ** 3 || undefined;
  const server_key = document.getElementById("server-key").value || "alpha";

  if ((mediaType === "movie" && (!name || !year)) || (mediaType === "tv" && (!name || !season))) {
    status.innerHTML = `
      <span style="color: orange; text-shadow: none;">⚠️ ${mediaType === "movie" 
        ? 'Movie requires both <b>Name</b> and <b>Year</b>.' 
        : 'TV Show requires both <b>Name</b> and <b>Season</b>.'}
      </span>`;
    resetUI();
    return;
  }

  const payload = {
    mediaType,
    name,
    server: server_key,
    ...(mediaType === "movie" ? { year } : { season, episode }),
    ...(maxsize ? { limit: maxsize } : {})
  };

  fetchAndRender({payload, status, output, resultsDiv})
}

let controller

async function  fetchAndRender({payload, status, output, resultsDiv}) {

  const server = "https://alpha-scraper.onrender.com";
  // const server = "http://192.168.29.122:3000"

  controller = new AbortController();
  const signal = controller.signal;

  try {
    const res = await fetch(`${server}/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal
    });

    if (!res.ok) {
      // Try to parse server-provided error message
      let errorText = await res.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.message || JSON.stringify(errorJson);
      } catch {
        // keep raw text if not JSON
      }

      throw new Error(`Server Error ${res.status}: ${errorText}`);
    }

    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buffer = '';
    let raw = { raw: [], file: [] };
    let parsedCount = 0;
    let parsable = 0;
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
            status.innerHTML = `<span>📦 Processing ${parsable - parsedCount} of ${parsable} files.</span>`;
            buildFileEntry(response.result);
          }

          if (response.status === 'raw') {
            raw.raw.push(response);
            output.textContent = JSON.stringify(raw, null, 2);
            parsable = response.results.length;
            status.innerHTML = `<span>📦 Processing ${parsable} files.</span>`;
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

    status.innerHTML = parsedCount
      ? `<span style="var(--success)"> 🎉 Received ${parsedCount} file${parsedCount !== 1 ? 's' : ''}.</span>`
      : `<span style="color: orange">⚠️ No valid results received.</span>`;

  } catch (err) {
    output.textContent = `Error: ${err.message}`;
    const msg = document.createElement("div");
    msg.style = "color: crimson; text-shadow: none;";
    msg.textContent = `⛔ ${err.message}`;
    status.innerHTML = '';
    status.appendChild(msg);
    setTimeout(() => {status.removeChild(msg)}, 5000)
  } finally {
    resetUI();
  }
}

function buildFileEntry(file) {
  const tbody = document.querySelector('tbody');
  const { size, index, quality, file_name } = file;
  let tr = document.querySelector(`.result-row[data-index="${index}"]`);

  if (!tr) {
    tr = document.createElement('tr');
    tr.classList.add('result-row');
    tr.setAttribute('data-index', index);

    tr.innerHTML = `
      <td class="file-cell">
        <div class="file-name">${file_name}</div>
        <div class="file-flags">
          <p class="file-size">Size: ${size}</p>
          <div> | </div>
          <p>Quality: ${quality || "Unknown"}</p>
        </div>
      </td>
      <td class="action-cell">${buildActionHTML(file)}</td>`;
    tbody.appendChild(tr);
  } else {
    if (file_name) {
      tr.querySelector('.file-name').innerText = file_name;
    }
    if (size) {
      tr.querySelector('.file-size').innerText = `Size: ${size}`; 
    }
    tr.querySelector('.action-cell').innerHTML = buildActionHTML(file);
  }
}

function buildActionHTML(file) {
  const { url, drive_link, file_name } = file;
  const intent = (link) => `intent://${link.replace('https://', '')}#Intent;scheme=https;type=video/*;end;`;
  
  if ( !url && !drive_link) return `<i class="fa fa-spinner fa-spin btn">`
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
    { name: 'Windows Phone', value: 'Windows Phone', version: 'OS' },
    { name: 'Windows', value: 'Win', version: 'NT' },
    { name: 'iPhone', value: 'iPhone', version: 'OS' },
    { name: 'iPad', value: 'iPad', version: 'OS' },
    { name: 'Kindle', value: 'Silk', version: 'Silk' },
    { name: 'Android', value: 'Android', version: 'Android' },
    { name: 'PlayBook', value: 'PlayBook', version: 'OS' },
    { name: 'BlackBerry', value: 'BlackBerry', version: '/' },
    { name: 'Macintosh', value: 'Mac', version: 'OS X' },
    { name: 'Linux', value: 'Linux', version: 'rv' },
    { name: 'Palm', value: 'Palm', version: 'PalmOS' }
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

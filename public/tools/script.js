function toggleFields() {
  const mediaType = document.getElementById("mediaType").value;
  const tvinfo = document.getElementById("tv-input");
  const yearinfo = document.getElementById("year-input");

  // Show and hide fields based on media type
  if (mediaType === "movie") {
    tvinfo.style.display = "none";
    yearinfo.style.display = "flex";
  } else {
    tvinfo.style.display = "flex";
    yearinfo.style.display = "none";
  }
}

// Initialize the fields on page load
window.onload = function () {
  document.getElementById('mediaType').value = 'movie';
  toggleFields(); // Ensure fields are correctly set on initial load
  bottomNavBar();
};

function resetUI() {
  const btn = document.getElementById("scrape");
  btn.disabled = false;
  btn.style.filter = 'unset'
  btn.textContent = "Generate";
}

function changeValue(id, delta) {
  const input = document.getElementById(id);
  let value = parseFloat(input.value) || 0;
  value = Math.max(0, value + delta); // Prevent negative numbers
  input.value = value.toFixed(2).replace(/\.?0+$/, ''); // Trim trailing zeros
}

function resetForm() {
  document.getElementById("name").value = "";
  document.getElementById("season").value = "";
  document.getElementById("episode").value = "";
  document.getElementById("year").value = "";
  document.getElementById("maxsize").value = "";
  document.getElementById("output").textContent = "";
  document.getElementById("status-info").innerHTML = "";
  document.getElementById("results").innerHTML = "";
  toggleFields();
  resetUI();
}


async function scrape() {
  const btn = document.getElementById("scrape");
  const output = document.getElementById("output");
  const resultsDiv = document.getElementById("results");
  const status = document.getElementById("status-info");

  // Reset the status info and results before starting the fetch process
  status.innerHTML = "";
  resultsDiv.innerHTML = "";

  // Disable UI elements during loading
  btn.disabled = true;
  btn.style.filter = 'saturate(0.2)';
  btn.textContent = "Loading...";
  status.innerText = "Fetching data..."
  output.textContent = "";

  const mediaType =  document.getElementById("mediaType").value;
  const name =  document.getElementById("name").value.trim();
  const year = document.getElementById("year").value;
  const season = document.getElementById("season").value;
  const episode = document.getElementById("episode").value;
  const maxsize = document.getElementById("maxsize").value * 1024 ** 3;
  const server_key = document.getElementById('server-key').value || 'alpha';

    // Input validation
  if (mediaType === "movie") {
    if (!name || !year) {
      status.innerHTML = `<span style="color: orange; text-shadow: none;">⚠️ Movie requires both <b>Name</b> and <b>Year</b>.</span>`;
      resetUI();
      return;
    }
  } else if (mediaType === "tv") {
    if (!name || !season) {
      status.innerHTML = `<span style="color: orange; text-shadow: none;">⚠️ TV Show requires both <b>Name</b> and <b>Season</b>.</span>`;
      resetUI();
      return;
    }
  }

  const payload = { mediaType, name, server: server_key , limit: maxsize};

  if (mediaType === "movie") {
    payload.year = year;
  } 
  if (mediaType === "tv") {
    payload.year = '';
    payload.season = season;
    payload.episode = episode || '';
  }
  // Remove any empty fields from the payload
  for (let key in payload) {
    if (payload[key] === "" || payload[key] === null) {
      delete payload[key];
    }
  }

  const server = "https://alpha-scraper.onrender.com";
  // const server = "http://192.168.29.122:3000";
  
  // try {
  //   const pingRes = await fetch(`${server}/ping`, { method: "HEAD" });
  //   if (!pingRes.ok) {
  //     throw new Error("Server not awake");
  //   }
  // } catch (err) {
  //   // Step 2: If server is not awake, wake it up
  //   console.log("Waking up the server...");
  //   status.innerHTML = `<span style="color: orange; text-shadow: none;">⏳ Server is waking up... please wait.</span>`;
  //   await fetch(`${server}/ping`, { method: "GET" }); // Trigger the wake-up
  // }
  
  try {
    const res = await fetch(`${server}/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buffer = '';
    let raw = { raw: [], file: [] }
    let parsedCount = 0;
    let parsable = 0;
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    resultsDiv.appendChild(table);
    
    // Stream handler
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
    
      buffer += decoder.decode(value, { stream: true });

      let lines = buffer.split('\n');
      buffer = lines.pop(); // Save incomplete line for next chunk
    
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const response = JSON.parse(line);
        console.log(response.status)

        
        if (response.status === 'file') {
          parsedCount++

          raw.file.push(response)
          output.textContent = JSON.stringify(raw, null, 2)
          status.innerHTML = `<span>📦 Processing data for ${parsable - parsedCount} out of ${pluralResolver(parsable, 'file', 's')}.</span>`

          const file = response.result
          try {

            buildFileEntry(file)
  
          } catch (e) {
            console.error('Stream parse error:', e);
            output.textContent = `Stream parse error: ${e.message}`
          }
        }
        
        if (response.status === 'raw') {
          raw.raw.push(response)
          output.textContent = JSON.stringify(raw, null, 2)
          parsable = response.results.length
          status.innerHTML = `<span>📦 Processing data for ${pluralResolver(parsable, 'file', 's')}.</span>`;

          for (file of response.results) {
            try {
              buildFileEntry(file)
    
            } catch (e) {
              console.error('Stream parse error:', e);
              output.textContent = `Stream parse error: ${e.message}`
            }
          }
        }
      }
    }
    
    status.innerHTML = parsedCount
    ? `<span style="var(--success)"> 🎉 Received ${pluralResolver(parsedCount, 'file', 's')}.</span>`
    : `<span style="color: orange">⚠️ No valid results received.</span>`;
    

  } catch (err) {
    output.textContent = `Error: ${err.message}`;
    const errorMessage = document.createElement("div");
    errorMessage.style = "color: crimson; text-shadow: none;";
    errorMessage.textContent = `❌ ${err.message}`;
    status.innerHTML = ''
    status.appendChild(errorMessage);
  } finally {
    resetUI()
  }
}

function buildFileEntry(file) {
  const tbody = document.querySelector('tbody')
  const { size, index, quality, file_name } = file
  let tr = document.querySelector(`.result-row[data-index="${index}"]`)
  if ( !tr ) {
    tr = document.createElement('tr');
    tr.classList.add('result-row')
    tr.setAttribute('data-index', index)
  
    tr.innerHTML = `
      <td class="file-cell">
        <div class="file-name">${file_name}</div>
        <div class="file-flags">Size: ${size} | Quality: ${quality || "Unknown"}</div>
      </td>
      <td class="action-cell">
        ${buildActionHTML(file)}
      </td>
    `;
    tbody.appendChild(tr);
  } 

  if ( tr ) {
    tr.querySelector('.action-cell').innerHTML = buildActionHTML(file);
  }

}


function buildActionHTML(file) {
  const { url, drive_link, file_name, index } = file
  if (!url && !drive_link) return ''
  const intent = (link) => { return `intent://${link.replace('https://', '')}#Intent;scheme=https;type=video/*;end;` }

  return `
    ${ url ? `
      <button onclick="openLinkExternal(this)" data-link="${intent(url)}">
        <i class="fa-solid fa-arrow-up-right-from-square"></i>
      </button>
      <button class="copy" onclick="copyLink(this)" data-link="${url}">
        <i class="fa-solid fa-clone"></i>
      </button>
      <a href="${url}" download="${file_name}" target="_self">
        <button><i class="fa-solid fa-download"></i></button>
      </a>
    ` : ''}
    ${ drive_link ? `
      <a href="${drive_link}" target="_blank">
        <button><i class="fa-solid fa-server"></i></button>
      </a>
    ` : '' }
  `
}

async function copyLink(btn) {
  const link = btn.dataset.link
  try {
    await navigator.clipboard.writeText(link);
  } catch (e) {
    console.error(e)
  }
}

async function openLinkExternal(btn) {
  const link = btn.dataset.link
  window.open(link, '_self')
}

function matchItem(ua, data) {
  for (let i = 0; i < data.length; i++) {
    const { name, value, version: versionLabel } = data[i];

    const match = new RegExp(value, 'i').test(ua);
    if (!match) continue;

    const versionRegex = new RegExp(`${versionLabel}[- /:;]([\\d._]+)`, 'i');
    const matchResult = ua.match(versionRegex);

    let version = '0';
    if (matchResult && matchResult[1]) {
      version = matchResult[1].split(/[._]+/).join('.');
    }
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

  console.log({ 'OS': OS.name, 'Browser': BROWSER.name })
  return { 'OS': OS.name, 'Browser': BROWSER.name }
}
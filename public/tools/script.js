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
  let value = parseInt(input.value) || 0;
  value = Math.max(0, value + delta); // Prevent negative numbers
  input.value = value;
}

function resetForm() {
  document.getElementById("name").value = "";
  document.getElementById("season").value = "";
  document.getElementById("episode").value = "";
  document.getElementById("year").value = "";
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

  const payload = { mediaType, name, server: server_key };

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

    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);

    // Reset status
    status.innerHTML = "";

    if (!res.ok || data.error) {
      const errorMessage = document.createElement("div");
      errorMessage.style = "color: crimson; text-shadow: none;";
      errorMessage.textContent = `❌ ${data.error || 'Something went wrong.'}`;
      status.innerHTML = ''
      status.appendChild(errorMessage);
      return
    }

    const files = Array.isArray(data.results)
      ? data.results
      : data.result?.available_files || [];

    if (files.length === 0) {
      status.innerHTML = "<p>No results found.</p>";
      return;
    }

    // Show info message
    const infoMessage = document.createElement("div");
    if ( !data.error ) {
      infoMessage.textContent = `Results for ${data.name} ${data.tvinfo ? `- ${data.tvinfo}` : ""}`;
      status.innerHTML = ''
      status.appendChild(infoMessage);
    } else {
      infoMessage.textContent = `${data.error} — showing available data instead for ${data.result.name}.`;
      status.innerHTML = ''
      status.appendChild(infoMessage);
    }

    // Render files
    let tableHTML = `<table><tbody>`;
    for (const file of files) {
      tableHTML += `
        <tr>
          <td class="file-cell">
            <div class="file-name">${file.file_name}</div>
            <div class="file-flags">Size: ${file.size} | Quality: ${file.quality || "Unknown"}</div>
          </td>
          <td class="action-cell">

            ${file.url ? `
              <a href="intent://${file.url.replace('https://', '')}#Intent;scheme=https;type=video/*;end;" target="_blank">
                <button>
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </button>
              </a>
              <button class="copy" onclick="copyLink(this)" data-link=${file.url}>
                <i class="fa-solid fa-clone"></i>
              </button>
            ` : ''}
            ${file.drive_link ? `
              <a href="${file.drive_link}" target="_blank">
                <button>
                  <i class="fa-solid fa-server"></i>
                </button>
              </a>
            `: ''}
            ${file.url ? `
              <a href="${file.url}" target="_blank">
                <button>
                  <i class="fa-solid fa-download"></i>
                  <!-- <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" 
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg> -->
                </button>
              </a>  
            `: ''}
          </td>
        </tr>`;
    }
    tableHTML += `</tbody></table>`;
    resultsDiv.innerHTML += tableHTML;

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

async function copyLink(btn) {
  const link = btn.dataset.link
  try {
    await navigator.clipboard.writeText(link);
  } catch (e) {
    console.error(e)
  }
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
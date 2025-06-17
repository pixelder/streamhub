function getLogData(logType) {
  const jsonData = localStorage.getItem(logType);
  return jsonData ? JSON.parse(jsonData) : [];
}


function fixLog() {

  ['history', 'watching', 'bookmarks'].forEach(logType => {
    const logData = getLogData(logType);
    const updatedLog = logData.map(item => {
      if (!item.hasOwnProperty('index')) {
        console.log('fixing log')
        item.index = Date.now() + Math.floor(Math.random() * 1000);
      }
      if (item.data.sno === 'NaN' || item.data.sno === 'null') item.data.sno = ''
      if (item.data.eno === 'NaN' || item.data.eno === 'null') item.data.eno = ''
      return item;
    });
    localStorage.setItem(logType, JSON.stringify(updatedLog));
  })

  if (localStorage.getItem('watching') !== null) return;

  const historyData = getLogData('history');
  localStorage.removeItem('history');
  localStorage.setItem('watching', JSON.stringify(historyData));
}

// Modified logToLocalStorage to assign a unique index to each log entry
async function logToLocalStorage(logType, id, mediaType, sno = null, eno = null, progress = null) {
  //console.log('logging', logType, id, mediaType, sno, eno, progress)
  const newLog = {
    mediaType, id: Number(id),
    index: Date.now(), progress: progress,
    data: { sno: sno ? String(sno) : null, eno: eno ? String(eno) : null }
  };

  if (logType === 'history') {
    const data = getLogData('lastStored')
    if (logExists('lastStored', id, mediaType, sno, eno)) {
      removeFromLocalStorage('history', Number(id), mediaType, sno, eno, data[0].index)
    }
    let historyLogs = getLogData(logType);
    historyLogs.push(newLog);
    localStorage.setItem(logType, JSON.stringify(historyLogs));
    localStorage.setItem('lastStored', JSON.stringify([newLog]))

    return;
  }

  let existingLogs = getLogData(logType);

  if (logExists(logType, id, mediaType)) {
    const logs = existingLogs.find(log =>
      Number(log.id) === Number(id) &&
      log.mediaType === mediaType
    );
    if (logs.length > 1) console.log('multiple log index exists for id', id)
    // Pass the log’s index along so we only remove that specific entry.
    await removeFromLocalStorage(logType, id, mediaType, logs.data.sno, logs.data.eno, logs.index);
  }

  existingLogs = getLogData(logType);
  existingLogs.push(newLog);
  localStorage.setItem(logType, JSON.stringify(existingLogs));
}


async function removeFromLocalStorage(logType, id, mediaType, sno = null, eno = null, index = null) {
  //console.log('removing', logType, id, mediaType, sno, eno, index)
  const logs = getLogData(logType);
  const updatedLogs = logs.filter(log => {
    const isSameLog = Number(log.id) === Number(id) &&
      log.mediaType === mediaType &&
      String(log.data.sno) === String(sno) &&
      String(log.data.eno) === String(eno);
    if (index) return !(Number(log.index) === Number(index))
    return !isSameLog;
  });

  localStorage.setItem(logType, JSON.stringify(updatedLogs));
}


function logExists(logType, id, mediaType, season = null, episode = null, progress = null) {
  const logs = getLogData(logType);
  return logs.some(log => {
    const idMatch = Number(log.id) === Number(id);
    const typeMatch = log.mediaType === mediaType;
    //optional params
    const seasonMatch = season === null || String(log.data.sno) === String(season);
    const episodeMatch = episode === null || String(log.data.eno) === String(episode);
    const progressMatch = progress === null || Number(log.progress) === Number(progress)
    return idMatch && typeMatch && seasonMatch && episodeMatch && progressMatch;
  });
}


async function toggleBookmark(logType, id, mediaType, sno = null, eno = null, index = null) {
  let temp = contWatching;
  contWatching = false;
  if (logExists(logType, id, mediaType)) {
    removeFromLocalStorage(logType, Number(id), mediaType, sno, eno, index);
  } else {
    logToLocalStorage(logType, id, mediaType, sno, eno);
  }
  contWatching = temp;
}

Array.prototype.sortDateDesc = function (desc = null) {
  const n = desc ? (-1) : 1;
  return this.sort((a, b) => (new Date(b.index) - new Date(a.index)) * n);
}

async function fetchHistoryItems(section, sectionId, items) {
  const container = section.querySelector('.grid-container');
  const type = container.classList.contains('vertical-card') ? 'vertical' : null;
  const logType = section.dataset.type;

  if (!items.length) {
    console.log('no data found for', sectionId);
    container.querySelector('.filler')?.remove();
    container.classList.remove('loading');
    return;
  } else {
    console.log('data found for', sectionId);
  }

  if (sectionId !== 'bookmarks') {
    setupCheckboxListeners(sectionId, items);
  }

  // Sort by descending
  const SORTED_ITEMS = items.slice().sortDateDesc(false);

  if (container.classList.contains('empty')) return;

  container.classList.remove('loading');
  container.querySelector('.filler')?.remove();

  // Keep track to avoid duplicates
  const existingItems = new Map();
  container.querySelectorAll("[data-id]").forEach(el => {
    const key = el.dataset.id + (el.dataset.index || '');
    existingItems.set(key, el);
  });

  const newItems = new Set(items.map(item => item.id + item.index));

  // intersection observation settings
  const options = {
    root: container,
    rootMargin: "60px",
    threshold: 0
  };
  
  const batchSize = 10
  const pending = new Set();
  const concurrencyLimit = 10;

  // Loading item when its intersection happens
  function loadItem(placeholder, item) {
    return (async () => {
      try {
        const { data } = await fetchMetaData(item.mediaType, item.id);
        let content;

        if (logType !== 'bookmarks' && item.mediaType === "tv") {
          const { data: tvData } = await fetchMetaData(item.mediaType, item.id, item.data.sno);
          content = renderLogItems(sectionId, data, item, tvData);
        } else {
          data.media_type = item.mediaType;
          content = logType !== "bookmarks"
            ? renderLogItems(sectionId, data, item)
            : renderGridItems(data, type);
        }

        if (!content.dataset.id && !content.dataset.index) {
          Object.assign(content.dataset, {id : item.id, index : item.index})
        }

        if (placeholder.isConnected) {
          container.replaceChild(content, placeholder);
        }
      } catch (error) {
        console.error(error);
        notifyAlert(error.message, "error", {});
      }
    })();
  }

  // IntersectionObserver for placeholders
  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const placeholder = entry.target;

        intersectionObserver.unobserve(placeholder);
        const item = placeholders.get(placeholder);
        if (!item) continue;

        if (pending.size >= concurrencyLimit) {
          // wait for some to complete
          Promise.race(pending).then((p) => pending.delete(p));
        }

        const task = loadItem(placeholder, item);
        pending.add(task);
        task.finally(() => pending.delete(task));
      }
    }
  }, options);

  // pagination
  let rendered = 0;

  const placeholders = new Map();

  function renderBatch(){
    if (rendered >= SORTED_ITEMS.length) return;

    const batch = SORTED_ITEMS.slice(rendered, rendered + batchSize);
    rendered += batchSize;

    for (const item of batch) {
      if (existingItems.has(item.id + item.index)) continue;
      const placeholder = document.createElement('div');
      placeholder.className = 'grid-item placeholder';
      const {id, mediaType, index} = item
      const {sno, eno} = item.data
      Object.assign(placeholder.dataset, {id, mediaType, index });
      if (sno && eno) {
        Object.assign(placeholder.dataset, { sno, eno });
      }

      container.appendChild(placeholder);
      placeholders.set(placeholder, item);
      intersectionObserver.observe(placeholder);
    }

    // If there are more, observe a sentinel for pagination
    if (rendered < SORTED_ITEMS.length) {
      const sentinel = document.createElement("div");

      sentinel.className = "load-sentinel";
      container.appendChild(sentinel);

      const paginationObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            paginationObserver.unobserve(sentinel);
            sentinel.remove();
            renderBatch();
          }
        }
      }, options);

      paginationObserver.observe(sentinel);
    }
  }

  // Initial render
  renderBatch();

  // Remove orphaned elements
  existingItems.forEach((el, key) => {
    if (!newItems.has(key)) {
      el.remove();
    }
  });
}

function renderLogItems(sectionId, data, item, tvData, type = null) {

  const {id, mediaType, index} = item
  const [sno, eno] = tvData ? [item.data.sno, item.data.eno] : ['', ''];
  const epData = tvData ? tvData?.episodes?.find(ep => ep.episode_number === Number(eno)) : '';
  const progress = Number(item.progress) || 0;
  const ring = type === 'vertical' ? 1 : null;
  const image = !tvData
    ? data.backdrop_path
      ? (IMAGE_342 + data.backdrop_path)
      : '/assets/images/no-image-hr.png'
    : epData?.still_path
      ? (IMAGE_342 + epData?.still_path)
      : (IMAGE_342 + data.backdrop_path);
  const name = (data.title || data.name);
  const info = `S${sno}:E${eno} ` + (epData?.name || '');
  const rating = truncate(!tvData ? data.vote_average : epData?.vote_average, 1);
  //const runTime = !tvData ? data.runtime : epData.runtime;
  
  const logItem = document.createElement('div')
  logItem.className = 'grid-item';
  Object.assign(logItem.dataset, {id, mediaType, name, index : index || null})
  if (tvData) {
    Object.assign(logItem.dataset, {sno, eno})
  }
  logItem.tabIndex = 0;
  
  logItem.innerHTML = `
    <div class="item-container"  draggable="true">
      <label class="selectable ${isActiveSelect[sectionId] ? 'active' : ''}">
        <input type="checkbox" />
        <span class="checkbox-button">
          <i class="fa-regular fa-square active"></i>
          <i class="fa-solid fa-square-check passive"></i>
        </span>
      </label>
      <div class="grid-actions">
        <div class="grid-options">
          <div class="flow-row">
            <h4>Actions</h4>
            <div tabindex="0" class="options-buttons">
              <i class="options-icon fa-solid fa-ellipsis-vertical"></i>
              <!-- <i class="options-x-icon fa-solid fa-xmark"></i> -->
              <div class="options-x-icon">
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20" height="20" viewBox="0,0,256,256">
                <g fill="#e6e6fa" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(8,8)"><path d="M7.21875,5.78125l-1.4375,1.4375l8.78125,8.78125l-8.78125,8.78125l1.4375,1.4375l8.78125,-8.78125l8.78125,8.78125l1.4375,-1.4375l-8.78125,-8.78125l8.78125,-8.78125l-1.4375,-1.4375l-8.78125,8.78125z"></path></g></g>
                </svg>
              </div>
            </div>
          </div>
          <hr>
          <div class="options-menu">
            ${progress < 99 ? `
            <div class="flow-row mark-item" data-type="watched">
              <button tabindex="0"><i class="fa-solid fa-eye"></i></button>
              <p>Mark As Watched</p>
            </div>` 
            : `
            <div class="flow-row mark-item" data-type="unwatch">
              <button tabindex="0"><i class="fa-solid fa-eye-slash"></i></button>
              <p>Mark Unwatched</p>
            </div>`}
            <div class="flow-row view-details">
              <button tabindex="0"><i class="fa-solid fa-square-arrow-up-right"></i></button>
              <p>Details</p>
            </div>
            <div class="flow-row remove">
              <button tabindex="0"><i class="fa-solid fa-trash-can"></i></button>
              <p>Remove</p>
            </div>
          </div>
        </div>
      </div>
      <img src="${image}" loading="lazy">
      <div class="grid-item-info">
        <span class="history-item-info">
          <h3>${capString(name, 40)}</h3>
          ${tvData ? `<p>${info}</p>` : ""}
          <span class="grid-rating">
            <p class="rating">
              ${rating 
                ? `<i class="fa-solid fa-star"></i>
                  ${rating}`
                : `<img class="nostar" src="/assets/icons/nostar.svg">`
                }
            </p>
          </span>
        </span>
        ${watchProgress(progress, ring)}
      </div>
    </div>
  `;
  return logItem
}

async function loadUserContent(sectionId, logType) {
  const section = document.getElementById(sectionId);
  const container = section?.querySelector('.grid-container')
  const logData = getLogData(logType);
  console.log(`loading user content for ${sectionId}`)
  if (!section) return

  if (logData.length > 0) {
    if (sectionId === 'continue-watching') {
      contWatching = true;
      section.style.display = "flex";
    }
    fetchHistoryItems(section, sectionId, logData);
  } else {
    if (sectionId === 'continue-watching') {
      section.style.display = "none"; // Hide section if history is empty
      contWatching = false;
    }
    container.classList.add('empty')
    fetchHistoryItems(section, sectionId, logData);
  }
  enableHorizontalWheelScroll(container, 5)
  if ( sectionId === 'bookmarks' ) return 
  setupScrollEdgeMask(container)
}

function resetHistory(logtype) {
  localStorage.setItem(logtype, '');
}

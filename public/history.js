


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
      return item;
    });
    localStorage.setItem(logType, JSON.stringify(updatedLog));
  })

  if (localStorage.getItem('watching') !== null) return;

  const historyData = getLogData('history');
  localStorage.removeItem('history');
  localStorage.setItem(logType, JSON.stringify(historyData));
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

  const existingItems = new Map();
  container.querySelectorAll("[data-id]").forEach(el => {
    const key = el.dataset.id + (el.dataset.index || '');
    existingItems.set(key, el);
  });

  const newItems = new Set(items.map(item => item.id + item.index));
  const SORTED_ITEMS = items.slice().sortDateDesc(false);

  const aborted = () => {
    if (container.classList.contains('empty')) {
      console.log('aborted')
      // container.querySelectorAll('.grid-item').forEach(obj => obj.remove())
      return true
    }
    return false
  }
  const placeholders = new Map();
  const pending = new Set();
  const concurrencyLimit = 4;

  // 1. Insert placeholders in the correct order
  for (const item of SORTED_ITEMS) {
    container.classList.remove('loading');
    container.querySelector('.filler')?.remove();

    if (aborted()) break
    const key = item.id + item.index;

    if (existingItems.has(key)) {
      existingItems.delete(key);
      continue;
    }

    const { id, mediaType, index, data: { sno, eno } } = item;
    
    const placeholder = document.createElement('div');
    placeholder.className = 'grid-item placeholder';
    placeholder.dataset.id = id;
    placeholder.dataset.index = index;
    placeholder.dataset.mediaType = mediaType;
    placeholder.dataset.sno = sno;
    placeholder.dataset.eno = eno;
    container.appendChild(placeholder);
    placeholders.set(key, placeholder);
  }

  // 2. Start processing each item
  for (const item of SORTED_ITEMS) {
    if (aborted()) break
    const { id, mediaType, index, data: { sno, eno } } = item;
    const key = id + index;

    if (!placeholders.has(key)) continue;

    const task = (async () => {
      try {
        const { data } = await fetchMetaData(mediaType, id);
        let content;

        if (logType !== 'bookmarks' && mediaType === "tv") {
          const { data: tvData } = await fetchMetaData(mediaType, id, sno);
          content = renderLogItems(sectionId, data, item, tvData);
        } else {
          data.media_type = mediaType;
          content = logType !== "bookmarks"
            ? renderLogItems(sectionId, data, item)
            : renderGridItems([data], type);
        }

        const wrapper = document.createElement("div");
        wrapper.innerHTML = content;
        const newElement = wrapper.firstElementChild;
        newElement.dataset.id = id;
        newElement.dataset.index = index;

        const placeholder = placeholders.get(key);
        if (placeholder && placeholder.parentNode && !aborted()) {
          container.replaceChild(newElement, placeholder);
        }

      } catch (error) {
        const msg = `Error fetching data for item ID ${id} for ${sectionId} : ${error.message}`;
        const data = { sectionId, logType, id, mediaType, sno, eno, index };
        const actions = [{ name: 'Fix', task: 'remove' }];
        notifyAlert(msg, "error", data, actions);
      }
    })();

    if (aborted()) break
    pending.add(task);
    task.finally(() => pending.delete(task));
    if (pending.size >= concurrencyLimit) {
      await Promise.race(pending);
    }
  }

  await Promise.allSettled(pending);

  // Remove old elements
  existingItems.forEach((el, key) => {
    if (!newItems.has(key)) {
      el.remove();
    }
  });
}

function renderLogItems(sectionId, data, item, tvData, type = null) {
  const [id, mediaType] = [item.id, item.mediaType];
  const index = item.index || null;
  const [sno, eno] = tvData ? [item.data.sno, item.data.eno] : ['', ''];
  const epData = tvData ? tvData?.episodes?.find(ep => ep.episode_number === Number(eno)) : '';
  const progress = Number(item.progress) || 0;
  const ring = type === 'vertical' ? 1 : null;
  const image = !tvData
    ? data.backdrop_path
      ? (IMAGE_342 + data.backdrop_path)
      : 'assets/images/no-image-hr.png'
    : epData?.still_path
      ? (IMAGE_342 + epData?.still_path)
      : (IMAGE_342 + data.backdrop_path);
  const name = (data.title || data.name);
  const info = `S${sno}:E${eno} ` + (epData?.name || '');
  const rating = truncate(!tvData ? data.vote_average : epData?.vote_average, 1);
  //const runTime = !tvData ? data.runtime : epData.runtime;

  return `
      <div tabindex="0" aria-pressed="true" class="grid-item"
           data-id="${id}"  data-index="${index}" 
           data-media-type="${mediaType}" data-name="${name}"
           ${tvData ? `data-sno="${sno}" data-eno="${eno}"` : ''}>
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
      </div>
  `;
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

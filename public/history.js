


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
  console.log('logging', logType, id, mediaType, sno, eno, progress)
  const newLog = {
    id: Number(id),
    mediaType,
    progress: progress,
    index: Date.now(),
    data: { sno: String(sno), eno: String(eno) }
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
  console.log('removing', logType, id, mediaType, sno, eno, index)
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
  const fragment = document.createDocumentFragment();
  const existingItems = new Map();

  container.querySelectorAll("[data-id]").forEach(el => {
    const key = el.dataset.id + (el.dataset.index || '');
    existingItems.set(key, el);
  });

  const newItems = new Set(items.map(item => item.id + item.index));

  // Sort items in descending order by date
  const sortedItems = items.slice().sortDateDesc(false);

  // Process all items and collect results
  const results = await Promise.allSettled(sortedItems.map(async (item) => {
    const { id, mediaType, index, data: { sno, eno } } = item;
    const key = id + index;
    if (existingItems.has(key)) {
      // Remove from existing items if already present and skip rendering
      existingItems.delete(key);
      return null;
    }

    try {
      const { data } = await fetchMetaData(mediaType, id);
      let content;
      if (section.dataset.type !== 'bookmarks' && mediaType === "tv") {
        const { data: tvData } = await fetchMetaData(mediaType, id, sno);
        content = renderLogItems(data, item, tvData);
      } else {
        data.media_type = mediaType;
        content = section.dataset.type !== "bookmarks"
          ? renderLogItems(data, item)
          : renderGridItems([data]);
      }

      const wrapper = document.createElement("div");
      wrapper.innerHTML = content;
      const newElement = wrapper.firstElementChild;
      newElement.dataset.id = id;
      newElement.dataset.index = index;
      return newElement;
    } catch (error) {
      const msg = `Error fetching data for item ID ${id} for ${sectionId} : ${error}`
      notifyAlert(msg)
      return null;
    }
  }));

  // Append elements in the original sorted order
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value !== null) {
      fragment.appendChild(result.value);
    }
  });

  // Remove old items that are no longer in the `items` list
  existingItems.forEach((el, key) => {
    if (!newItems.has(key)) {
      el.remove();
    }
  });

  container.appendChild(fragment);
  setupCheckboxListeners(sectionId);
}


function renderLogItems(data, item, tvData) {
  const [id, mediaType] = [item.id, item.mediaType];
  const index = item.index || null;
  const [sno, eno] = tvData ? [item.data.sno, item.data.eno] : ['', ''];
  const epData = tvData ? tvData?.episodes?.find(ep => ep.episode_number === Number(eno)) : '';
  const progress = Number(item.progress) || 0;
  //console.log() 
  // add fake data to through error then create function to prompt to delete that data
  // should be done on above function
  const image = !tvData
    ? data.backdrop_path
      ? (IMAGE_URL + data.backdrop_path)
      : 'https://placehold.co/440x661/383852/ccc?text=No+Image'
    : epData?.still_path
      ? (IMAGE_URL + epData?.still_path)
      : (IMAGE_URL + data.backdrop_path);
  const name = (data.title || data.name);
  const info = `S${sno}:E${eno} ` + (epData?.name || '');
  const rating = truncate(!tvData ? data.vote_average : epData?.vote_average, 1);
  //const runTime = !tvData ? data.runtime : epData.runtime;

  return `
      <div tabindex="0" aria-pressed="true" class="grid-item"
           data-id="${id}"  data-index="${index}" 
           data-media-type="${mediaType}" data-name="${name}"
           ${tvData ? `data-sno="${sno}" data-eno="${eno}"` : ''}>
        <div class="item-container">
          <label class="selectable">
            <input type="checkbox" />
            <span class="checkbox-button">
              <i class="fa-regular fa-square active"></i>
              <i class="fa-solid fa-square-check passive"></i>
            </span>
          </label>
          <div class="grid-actions">
            <div class="grid-options">
              <div tabindex="0" class="options-buttons">
                <i class="options-icon fa-solid fa-ellipsis-vertical"></i>
                <i class="options-x-icon fa-solid fa-xmark"></i>
              </div>
              <div class="options-menu">
                <button tabindex="0" role="button"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </div>
          </div>
          <img src="${image}" loading="lazy">
          <div class="grid-item-info">
            <span class="history-item-info">
              <h3>${capString(name, 40)}</h3>
              ${tvData ? `<p>${capString(info, 40)}</p>` : ""}
            </span>
            <span class="grid-rating">
              <p class="rating">
                <i class="fa-solid fa-star"></i>
                ${rating}
              </p>
            </span>
            ${watchProgress(progress)}
          </div>
        </div>
      </div>
  `;
}


function loadUserContent(sectionId, logType) {
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
  enableHorizontalWheelScroll(container, 2)
  setupScrollEdgeMask(container)
}

function resetHistory(logtype) {
  localStorage.setItem(logtype, '');
}

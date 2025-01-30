
function getLogData(logType) {
  const jsonData = localStorage.getItem(logType);
  return jsonData ? JSON.parse(jsonData) : [];
}

async function logToLocalStorage(logType, id, mediaType, sno = null, eno = null) {
  const existingLogs = getLogData(logType);
  const tvData = { sno, eno };
  const newLog = { id: Number(id), mediaType, data: tvData };

  if (logType === 'history') {
    existingLogs.push(newLog);
    localStorage.setItem(logType, JSON.stringify(existingLogs));
    return
  }
  
  if (logExists(logType, id, mediaType)) {
    removeFromLocalStorage(logType, Number(id), mediaType, sno, eno)
  }
  existingLogs.push(newLog);

  localStorage.setItem(logType, JSON.stringify(existingLogs));
}

function fixLog() {
  if ( localStorage.getItem('watching') !== null ) return

  const historyData = getLogData('history') // old history log
  localStorage.removeItem('history')
  localStorage.setItem('watching', JSON.stringify(historyData));
}

function logExists(logtype, id, mediaType) {
  const logs = getLogData(logtype);
  const hasItem = logs.some( log => {
    return Number(log.id) === Number(id) && log.mediaType === mediaType
  });
  return hasItem
}

async function removeFromLocalStorage(logType, id, mediaType, sno = null, eno = null) {
  const logs = getLogData(logType);
  const updatedLogs = logs.filter(log =>
    !(Number(log.id) === id && log.mediaType === mediaType &&
      String(log.data.sno) === String(sno) && String(log.data.eno) === String(eno))
  );

  localStorage.setItem(logType, JSON.stringify(updatedLogs));

}

async function toggleBookmark(logtype,id, mediaType, sno = null, eno = null) {
  temp = contWatching;
  contWatching = false;
  if( logExists(logtype, id, mediaType) ) {
    console.log('log exists')
    removeFromLocalStorage(logtype,Number(id),mediaType, sno, eno);
  } else {
    logToLocalStorage(logtype,id,mediaType, sno, eno)
  }
  contWatching = temp;
}

async function fetchHistoryItems(section, items) {
  const container = section.querySelector('.grid-container');
  const fragment = document.createDocumentFragment();
  const existingItems = new Map();

  // Store existing items for tracking (by unique key)
  container.querySelectorAll("[data-id]").forEach(el => {
    existingItems.set(el.dataset.id, el);
  });

  const newItems = new Set(items.map(item => item.id)); // Track current valid items
  const promises = items.slice().reverse().map(async (item) => {
    const { id, mediaType, data: { sno, eno } } = item;

    // Skip if already rendered and unchanged
    if (existingItems.has(id)) {
      existingItems.delete(id); // Mark as still valid
      return;
    }

    try {
      const { data } = await fetchMetaData(mediaType, id);
      let content;

      if (section.id !== 'bookmarks' && mediaType === "tv") {
        const { data: tvData } = await fetchMetaData(mediaType, id, sno);
        content = renderLogItems(data, item, tvData);
      } else {
        data.media_type = mediaType;
        content = section.id !== "bookmarks"
          ? renderLogItems(data, item)
          : renderGridItems([data]);
      }

      const wrapper = document.createElement("div");
      wrapper.innerHTML = content;
      const newElement = wrapper.firstElementChild;
      newElement.dataset.id = id; // Set unique identifier
      fragment.appendChild(newElement);
    } catch (error) {
      console.error(`Error fetching data for item ID ${id}:`, error);
    }
  });

  await Promise.allSettled(promises);

  // Remove old items that are no longer in the `items` list
  existingItems.forEach((el, id) => {
    if (!newItems.has(id)) {
      el.remove();
    }
  });

  container.classList.remove('loading')
  container.appendChild(fragment); // Efficient DOM update
}

function renderLogItems(data, item, tvData) {
  const [id, mediaType] = [item.id, item.mediaType];
  const [sno, eno] = tvData? [item.data.sno, item.data.eno] : [null,null];
  const epData = tvData?.episodes[eno - 1];

  const image = !tvData
    ? data.backdrop_path ? `${IMAGE_URL}${data.backdrop_path}` : 'https://placehold.co/440x661/383852/ccc?text=No+Image'
    : (IMAGE_URL + epData.still_path);
  const name = (data.title || data.name);
  const info = `S${sno}:E${eno} ` + epData?.name;
  const rating = truncate(!tvData
    ? data.vote_average
    : epData.vote_average
    , 1
  );

  const runTime = !tvData
    ? data.runtime
    : epData.runtime
  //

  return `
      <div tabindex="0" aria-pressed="true" class="grid-item"
      data-id="${id}" data-media-type="${mediaType}"
      data-sno="${sno}" data-eno="${eno}" data-name="${name}">
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
        <img src="${image}">
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
        </div>
      </div>
    `;
}

/* 
document.addEventListener('click' || 'keydown', (event) => {
    if( event.target.matches(".options-buttons")) {
      event.target.closest('.grid-options')?.classList.toggle('open');
      event.stopPropagation();
    };
}); */


function loadUserContent(sectionId,logType) {
  const section = document.getElementById(sectionId);
  const container = section?.querySelector('.grid-container')
  const tvData = getLogData(logType);
  if (!section) return

  if (tvData.length > 0) {
    if (sectionId === 'continue-watching') {
      contWatching = true;
      section.style.display = "flex";
    }
    fetchHistoryItems(section, tvData);
  } else {
    if (sectionId === 'continue-watching') {
      section.style.display = "none"; // Hide section if history is empty
      contWatching = false;
    }
    container.classList.add('empty')
    fetchHistoryItems(section, tvData);
  }
}

function resetHistory(logtype){
  localStorage.removeItem(logtype);
}

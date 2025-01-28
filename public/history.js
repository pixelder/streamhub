
function getLogData(logType) {
  const jsonData = localStorage.getItem(logType);
  return jsonData ? JSON.parse(jsonData) : [];
}

async function logToLocalStorage(logType, id, mediaType, sno = null, eno = null) {
  const existingLogs = getLogData(logType);
  const logData = { sno, eno };
  const logIndex = existingLogs.findIndex( log => 
    Number(log.id) === Number(id) && log.mediaType === mediaType
  )
  
  if (logIndex !== -1) {
    if (JSON.stringify(existingLogs[logIndex].data) !== JSON.stringify(logData)) {
      existingLogs[logIndex].data = logData;
    }
  } else {
    const newLog = { id: Number(id), mediaType, data: logData };
    existingLogs.push(newLog);
  }

  localStorage.setItem(logType, JSON.stringify(existingLogs));
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
  const gridContent = [];
  for (const item of items.reverse()) {
    const { id, mediaType, data: { sno, eno } } = item;
    try {
      const { data } = await fetchMetaData(mediaType, id);

      if (section.id === 'continue-watching' ) {
        if ( mediaType === "tv") {
          const response = await fetch(`${BASE_URL}/tv/${id}/season/${sno}?api_key=${API_KEY}`);
          const tvData = await response.json();
          gridContent.push(renderHistoryItems(data, item, tvData));
        } else {
          gridContent.push(renderHistoryItems(data, item));
        }
      } else {
        const resultItem = [data]
        resultItem.forEach(res => res.media_type = mediaType)
        gridContent.push(renderGridItems(resultItem))
      }
    } catch (error) {
      console.error(`Error fetching data for item ID ${id}:`, error);
    }
  }

  container.innerHTML = gridContent.join(""); // Batch update the DOM
}


function renderHistoryItems(data, item, tvData) {
  const [id, mediaType] = [item.id, item.mediaType];
  const [sno, eno] = tvData? [item.data.sno, item.data.eno] : [null,null];
  const epData = tvData?.episodes[eno - 1];
  //
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
  const logData = getLogData(logType);

  if (section) {
    if (logData.length > 0) {
      if (sectionId === 'continue-watching') {
        contWatching = true;
        section.style.display = "flex";
      }
      fetchHistoryItems(section, logData);
    } else {
      if (sectionId === 'continue-watching') {
        section.style.display = "none"; // Hide section if history is empty
        contWatching = false;
      }
      fetchHistoryItems(section, logData);
    }
  }
}

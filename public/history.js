async function logWatchHistory(logType, id, mediaType, sno = null, eno = null) {
  const existingLogs = JSON.parse(localStorage.getItem(logType)) || [];
  

  const logData = { sno, eno } ;

  const logIndex = existingLogs.findIndex(
    log => Number(log.id) === Number(id) && log.mediaType === mediaType
  );

  if (logIndex !== -1) {
    // Update the data only if it differs
    if (JSON.stringify(existingLogs[logIndex].data) !== JSON.stringify(logData)) {
      existingLogs[logIndex].data = logData;
    }
  } else {
    // Add a new log
    const newLog = { id: Number(id), mediaType, data: logData };
    existingLogs.push(newLog);
  }

  // Save the updated logs back to localStorage
  localStorage.setItem(logType, JSON.stringify(existingLogs));
}

async function removeFromHistory(logType, id, mediaType, sno, eno) {
  const logs = JSON.parse(localStorage.getItem(logType)) || [];
  
  sno = sno !== '' ? sno : null;
  eno = eno !== '' ? eno : null;

  const updatedLogs = logs.filter(log => 
    !(Number(log.id) === id && log.mediaType === mediaType &&
      String(log.data.sno) === String(sno) && String(log.data.eno) === String(eno))
  );

  // Save the updated logs back to localStorage
  localStorage.setItem(logType, JSON.stringify(updatedLogs));

  console.log("Updated Logs:", updatedLogs);
  continueWatching();
}




function watchHistoryCheck(logType) {
  const jsonData = localStorage.getItem(logType);
  return jsonData ? JSON.parse(jsonData) : [];
}

  
async function fetchHistoryItems(section, items) {
  const container = section.querySelector('.grid-container');
  const htmlContent = [];

  for (const item of items) {
    const { id, mediaType, data: { sno, eno } } = item;

    try {
      const { data } = await fetchMetaData(mediaType, id);

      if (mediaType === "tv") {
        const response = await fetch(`${BASE_URL}/tv/${id}/season/${sno}?api_key=${API_KEY}`);
        const tvData = await response.json();
        htmlContent.push(renderHistoryItems(data, item, tvData));
        openMenu;
      } else {
        htmlContent.push(renderHistoryItems(data, item));
        openMenu;
      }
    } catch (error) {
      console.error(`Error fetching data for item ID ${id}:`, error);
    }
  }

  container.innerHTML = htmlContent.join(""); // Batch update the DOM
  openMenu();
}


function renderHistoryItems(data, item, tvData) {
    const [id , mediaType] = [ item.id, item.mediaType];
    const [sno, eno] = tvData ? [item.data.sno, item.data.eno] : ["", ""];
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
    //

    return `
      <div tabindex="0" role="button" aria-pressed="false" class="grid-item"
      data-id="${id}" data-media-type="${mediaType}"
      data-sno="${sno}" data-eno="${eno}" data-name="${name}">
        <div class="grid-actions">
          <div class="grid-options">
            <div class="options-buttons">
              <i class="options-icon fa-solid fa-ellipsis-vertical"></i>
              <i class="options-x-icon fa-solid fa-xmark"></i>
            </div>
            <div class="options-menu">
              <button><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
        <img src="${image}" alt="${info}">
        <div class="grid-item-info">
          <span class="history-item-info">
            <h3>${capString(name, 40)}</h3>
            ${ tvData ? `<p>${capString(info, 40)}</p>` : ""}
          </span>
          <span class="grid-rating">
            <p class="rating">
            <i class="fa-solid fa-star"></i>
            ${rating}</p>
          </span>
        </div>
      </div>
    `;
}

function openMenu() {
  console.log('hi');
  document.addEventListener('click', (event) => {
    const optionsButton = event.target.closest('.options-buttons'); 
    optionsButton?.closest('.grid-options')?.classList.toggle('open');
  });
}


function continueWatching() {
  const section = document.getElementById('continue-watching');
  const history = watchHistoryCheck('history');

  if (history.length > 0) {
    section.style.display = "flex";
    fetchHistoryItems(section, history);
  } else {
    section.style.display = "none"; // Hide section if history is empty
  }
}



continueWatching();

  
/* const userData = watchHistoryCheck('history');
  if (userData) {
    console.log(userData.mediaType, userData.sno, userData.eno);
} */
/* function logWatchHistory(logType, id, mediaType, sno, eno) {
  const data = {mediaType, sno, eno };
  const jsonData = JSON.stringify({id, data});
  localStorage.setItem(logType, jsonData);
}
*/
async function logWatchHistory(logType, id, mediaType, sno, eno) {
  const existingLogs = JSON.parse(localStorage.getItem(logType)) || [];
  const logData = { sno, eno };

  const logIndex = existingLogs.findIndex(
    log => log.id === id && log.mediaType === mediaType
  );

  if (logIndex !== -1) {
    if (JSON.stringify(existingLogs[logIndex].data) !== JSON.stringify(logData)) {
      existingLogs[logIndex].data = logData;
    }
  } else {
    const newLog = { id, mediaType, data: logData };
    existingLogs.push(newLog);
  }

  // Store the updated logs back in localStorage
  localStorage.setItem(logType, JSON.stringify(existingLogs));
}
  
function watchHistoryCheck(logType) {
  const jsonData = localStorage.getItem(logType);
  if (jsonData) {
    console.log(jsonData);
    return JSON.parse(jsonData);
  }
  return null;
}
  
function continueWatching() {
  const section = document.getElementById('continue-watching');
  const history = watchHistoryCheck('history');
  if (history) {
    section.style.display = "flex";
    fetchHistoryItems(section, history);
  }
}

async function fetchHistoryItems(section, items) {
  const container = section.querySelector('.grid-container');
  container.innerHTML = ""; 
  for (const item of items.reverse()) {
    const { id, mediaType, data: { sno, eno } } = item;
    try {
      const { data } = await fetchMetaData(mediaType, id);

      if (mediaType === "tv") {
        const response = await fetch(`${BASE_URL}/tv/${id}/season/${sno}?api_key=${API_KEY}`);
        const tvData = await response.json();

        container.innerHTML += renderHistoryItems(data, item, tvData);
      } else {
        container.innerHTML += renderHistoryItems(data, item);
      }
    } catch (error) {
      console.error(`Error fetching data for item ID ${id}:`, error);
    }
  }
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

continueWatching();
//logWatchHistory('history', 987654,'tv', '4', '8');
  
/* const userData = watchHistoryCheck('history');
  if (userData) {
    console.log(userData.mediaType, userData.sno, userData.eno);
} */
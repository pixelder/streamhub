function truncate(num, precision) {
  return Math.floor(num * Math.pow(10, precision)) / Math.pow(10, precision);
}

function extractYear(dateString) {
  const date = new Date(dateString);
  return date.getFullYear();
}

function capString(str, maxLength) {
  if (str.length > maxLength) {
    return str.substring(0, maxLength - 3) + '...';
  }
  return str;
}

function abbvText(text, limit) {
  const words = text.split(' ');

  const filteredWords = words.filter(w => w !== w.toLowerCase());

  if ((words.length !== 1) && (text.length > limit)) {
    let abbreviation = '';
    for (const word of filteredWords) {
      abbreviation += word[0].toUpperCase();
    }
    return abbreviation;
  } else {
    return text;
  }
}

function convertDate(dateString) {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  return formatter.format(new Date(dateString));
}

function runtime(min) {
  const hour = Math.floor(min / 60.0);
  const minute = min - hour * 60.0;
  return (hour !== 0 ? `${hour}h` : '') + `${minute}m`;
}

function inBeta() {
  const msg = "This functionality is currently undergoing development!!";
  console.log(msg);
  return msg;
}

function isMobile() {
  const screenWidth = window.innerWidth <= 768;
  return screenWidth;
}

function loc() {
  return window.location.href;
}

async function handleSearch(event) {
  if (event) event.preventDefault(); // Prevent form submission

  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  window.location.href = `/search?q=${encodeURIComponent(query)}`;
  loc();
}

// Populate a section with content
function populateSection(sectionId, items) {
  const container = document.querySelector(`#${sectionId} .grid-container`);
  if (!isBrowsing) {
    container.innerHTML = renderGridItems(items)
    container.classList.remove('loading');
    return
  }

  currentPage++
  const msg = document.querySelector('.result-message');
  msg.classList.remove('show');
  msg.querySelector('label').innerText = 'Loading...';
  msg.style.display = 'flex';
  container.innerHTML += renderGridItems(items);
  if (items.length < 20) {
    pageEnd = true;
    msg.querySelector('label').innerText = 'No more results';
    msg.classList.add('show');
  } else {
    msg.classList.remove('show');
    msg.style.display = 'none';
  }
}

function renderGridItems(items) {
  return items
    .map(item => {
      const id = item.id;
      const mediaType = item.media_type;
      const bookmark = logExists('bookmarks', id, mediaType);
      const title = item.title || item.name;
      const rating = truncate(item.vote_average, 1);
      const year = extractYear(item.release_date || item.first_air_date);
      const image = item.poster_path
        ? `${IMAGE_URL}${item.poster_path}`
        : 'https://placehold.co/440x661/383852/ccc?text=No+Image';
      return `
         <div tabindex="0" class="grid-item" id="grid-item" data-id="${item.id}" data-media-type="${mediaType}">
           <div>
            <div class="grid-actions">
              <div class="grid-options ${bookmark ? 'open' : ''}">
                <div tabindex="0" class="options-buttons">
                  <i class="options-icon fa-regular fa-bookmark"></i>
                  <i class="options-x-icon fa-solid fa-bookmark"></i>
                </div>
              </div>
            </div>
             <img src="${image}" alt="${title}">
           </div>
           <div class="grid-item-info">
             <p>${capString(title, 40)}</p>
             <span class="grid-rating">
              <p class="rating">
                <i class="fa-solid fa-star"></i>
                ${rating}
              </p>
             </span>
             <p>${year}</p>
           </div>
         </div>
       `;
    })
    .join('');
}

//fetch Metadata
async function fetchMetaData(mediaType, id, season = null) {

  try {
    let url;
    if (mediaType === "movie") {
      url = `${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US&append_to_response=videos,release_dates,credits,images&include_image_language=en`;
    } else if (mediaType === "tv") {
      url = `${BASE_URL}/tv/${id}${season ? `/season/${season}` : ''}?api_key=${API_KEY}&language=en-US&append_to_response=videos,content_ratings,credits,images&include_image_language=en`;
    } else if (mediaType === "person") {
      url = `${BASE_URL}/person/${id}?api_key=${API_KEY}&language=en-US`;
    }
    // console.log(url)
    const response = await fetch(url);
    const data = await response.json();
    return { data, mediaType };
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

function openModal(event) {
  const gridItem = event.target.closest('.grid-item, .profile-item');
  const id = gridItem?.dataset.id; // Get the ID of the item
  //const sectionId = gridItem?.closest('section')?.id; // Find the parent section's ID
  const mediaType = gridItem?.dataset?.mediaType ?? gridItem?.closest('section')?.dataset?.type;
  console.log(mediaType, id)
  if (gridItem && !mediaType || !id) {
    console.error("Media type or ID not found");
    return;
  }

  fetchMetaData(mediaType, id).then(({ mediaType, data }) => {
    displayModal(mediaType, data);
  });
}

function getCountryCertification(data, mediaType) {
  const DEFAULT_COUNTRY = "US";
  const ORIGIN_COUNTRY = data.origin_displayCountry?.[0];

  let rating = "";
  let results = [];

  if (mediaType === "movie") {
    results = data.release_dates?.results || [];
    rating =
      results.find(item => item.iso_3166_1 === ORIGIN_COUNTRY)
        ?.release_dates?.[0]?.certification ||
      results.find(item => item.iso_3166_1 === DEFAULT_COUNTRY)
        ?.release_dates?.[0]?.certification ||
      "";
  } else {
    results = data.content_ratings?.results || [];
    rating =
      results.find(item => item.iso_3166_1 === ORIGIN_COUNTRY)
        ?.rating ||
      results.find(item => item.iso_3166_1 === DEFAULT_COUNTRY)
        ?.rating ||
      "";
  }

  return { displayCountry: ORIGIN_COUNTRY, rated: rating };
}

function displayModal(mediaType, data) {
  const modal = document.getElementById('info-modal');
  const modalContent = document.querySelector('.modal-content');
  const details = document.getElementById('modal-details');

  const backdropPath = data.backdrop_path
  document.documentElement.style.setProperty(
    '--modal-backdrop',
    `url(${backdropPath ? IMAGE_ORG + data.backdrop_path : ''})`
  );

  const contentLogoHTML = getContentLogoHTML(data);

  if (mediaType === 'person') {
    details.innerHTML = inBeta();
  } else {
    details.innerHTML = buildMediaDetailsHTML(data, mediaType, contentLogoHTML);
  }

  if (mediaType === 'movie') {
    insertMovieActions(data, mediaType);
    modalContent.style.height = 'fit-content';
  }

  if (mediaType === 'tv') {
    const userData = getLogData('watching')?.find(item => item.id === data.id)?.data;
    const season = userData?.sno;
    const episode = userData?.eno;
    tvContent(data, season, episode, 'modal');

    modalContent.style.height = !isMobile() ? '32rem' : '70%';

    const seasonMenu = document.querySelector('.seasons-menu');
    seasonMenu.insertAdjacentHTML('afterend', setUpModalActions(data, mediaType));
    console.log(data)
    if (releaseInfo(data) !== null) seasonMenu.insertAdjacentHTML('beforebegin', releaseInfo(data));
  }

  initializeModalListeners(mediaType, data, modalContent, details);

  modal.setAttribute('active', '')
  // modal.classList.add('active');
  details.focus();

  cappedOverview();
}

function getContentLogoHTML(data) {
  const name = data.name || data.title || data.original_title;
  const logoPath = data.images?.logos?.[0]?.file_path
  return `
    <span>
      <div class="modal-info-logo">
        ${logoPath ? `<img src="${IMAGE_URL}${logoPath}" alt="Logo">` : ''}
      </div>
      <div class="modal-info">
        ${!logoPath ? `<h1>${name.toUpperCase()}</h1>` : ''}
  `;
}

function buildMediaDetailsHTML(data, mediaType, contentLogoHTML) {
  const name = data.name || data.title || data.original_title;
  const releaseDate = data.release_date || data.first_air_date || data.air_date || '';
  const formattedDate = convertDate(releaseDate);
  const genresHTML = data.genres
    .map(genre => `<a href="#">${genre.name}</a>`)
    .slice(0, 5)
    .join(' ');
  const castHTML = (data.credits?.cast || [])
    .slice(0, 5)
    .map(cast => cast.name)
    .join(', ');
  const { rated } = getCountryCertification(data, mediaType);

  const detailsBodyHTML = `
    <div class="trailer-container"></div>
    <div class="modal-media">
      <div class="modal-cover">
        <img src="${IMAGE_URL}${data.poster_path}" alt="${name}">
      </div> 
      ${contentLogoHTML}
        <span class="ratings-genre">
          <i class="fa-solid fa-star"></i>
          <p data-title="${data.vote_count} votes">${truncate(data.vote_average, 1)}</p>
          <span class="modal-genre">
            ${genresHTML}
          </span>
        </span>
        <div class="synopsis">
          <p class="overview">
            ${data.overview || 'No description available.'}
          </p>
        </div>
        <p>Cast: ${castHTML}</p>
        <p class="tags">
          ${extractYear(formattedDate)} • 
          ${rated !== '' ? `${rated} • ` : ''} 
          ${data.original_language.toUpperCase()} 
          ${mediaType === 'movie' ? `• ${runtime(data.runtime)}` : ''}
        </p>
      </div>
    </span>
  </div>
  `;
  return detailsBodyHTML;
}

function releaseInfo(data) {
  const releaseDate = data.release_date || data.seasons[0].air_date;
  const releaseTimeStamp = new Date(releaseDate).getTime()
  if (Date.now() > releaseTimeStamp) return null;

  return `
    <div class="releasing-on">
      <p>Releasing on ${convertDate(releaseDate)}. </p>
    </div>
  `;
}

function insertMovieActions(data, mediaType) {
  const name = data.name || data.title || data.original_title;
  let released = true;
  if (releaseInfo(data) !== null ) released = false

  const actionHTML = `
    <div class="modal-actions">
      ${ released 
      ? `<button class="watch-btn" data-name="${name}" data-id="${data.id}">
          <i class="fa-solid fa-play"></i>Watch
        </button>`
      : releaseInfo(data) }
      ${setUpModalActions(data, mediaType)}
      </div>
    </div>
  `;
  // Insert action buttons immediately after the modal-media section.
  const modalMedia = document.querySelector('.modal-media');
  if (modalMedia) {
    modalMedia.insertAdjacentHTML('afterend', actionHTML);
  }
}

function setUpModalActions(data, mediaType) {
  const bookmark = logExists('bookmarks', data.id, mediaType)
  return `
    <button class="play-trailer" data-media-type="${mediaType}">
          <i class="fa-solid fa-video"></i>Trailer
    </button>
    <div class="item-actions">
      <label class="selectable active bookmark" data-id="${data.id}" data-media-type="${mediaType}">
        <input type="checkbox" ${bookmark ? `checked` : ''}/>
        <span class="checkbox-button">
          <i class="options-icon fa-regular fa-bookmark active"></i>
          <i class="options-x-icon fa-solid fa-bookmark passive"></i>
        </span>
      </label>
      <button tabindex="0" class="share">
        <i class="fa-solid fa-paper-plane"></i>
      </button>
    </div>
  `;
}

function initializeModalListeners(mediaType, data, modalContent, details) {
  const id = data.id;
  const name = data.name || data.title || data.original_title;
  shareItem(mediaType, id, name);

  if (document.modalWatchHandler) {
    ['click', 'keydown'].forEach(eventType => {
      details.removeEventListener(eventType, document.modalWatchHandler);
    });
  }

  const watchHandler = (e) => watchEventListeners(e, data);
  document.modalWatchHandler = watchHandler;

  ['click', 'keydown'].forEach(eventType => {
    details.addEventListener(eventType, watchHandler);
  });

  // Create a named function for the scroll event
  const backdropHandler = () => backdropAnim(details, modalContent);
  details.removeEventListener('scroll', backdropHandler);
  details.addEventListener('scroll', backdropHandler);
}

async function tvContent(data, sno, eno, ref) {
  const seasons = data.seasons.reverse();
  const id = data.id
  sno === null ? sno = -1 : "";
  const containerClass = ref === "modal" ? "episode-wrap" : "episode-player";
  const tvInfo = `
    <div class="tv-actions">
      <div class="seasons-menu">
        <select tabindex="0" id="season-dropdown">
          ${seasons.map(season => `
          <option value="${season.season_number}" 
          ${season.season_number === Number(sno) ? "selected" : ""}
          >Season ${season.season_number}</option>
          `).join("")}
        </select>
      </div>
    </div>
    <div class="season-info">
    <div class="episode-container ${containerClass}" id="episode-container">
    </div>
    </div>
    `;
  //modal
  document.querySelector(".modal-media")?.insertAdjacentHTML('afterend', tvInfo);
  //player
  ref !== "modal" ? document.querySelector(".player-episodes").innerHTML = tvInfo : "";

  //episode info
  const episodeContainer = document.getElementById('episode-container');

  const displaySeasonInfo = async (event) => {
    const selectedSeason = event.target.value;
    const { data: tvData } = await fetchMetaData('tv', id, selectedSeason);
    const seasonData = tvData
    episodeContainer.innerHTML = seasonData.episodes
      .map(episode => `
        <div id="${episode.episode_number}" class="episode episode-width" data-name="${data.name}" data-id="${data.id}" data-season="${selectedSeason}" data-episode="${episode.episode_number}" data-epname="${episode.name}">
          <div class="episode-items">
            <img tabindex="0" src="${episode.still_path ? IMAGE_URL + episode.still_path : 'https://placehold.co/500x281?text=No+Image+Available'}" alt="Episode ${episode.episode_number}">
            <div class="episode-info">
              <h3>${episode.episode_number}. ${episode.name}</h3>
              <p>Rated: ${episode.vote_average.toFixed(1)}</p>
              <p>${convertDate(episode.air_date)}</p>
            </div>
            <div class="synopsis">
              <p class="overview">${episode.overview || "No overview available"}</p>
            </div>
          </div>
        </div>
      `)
      .join("");
    document.querySelector('.play-trailer')?.setAttribute('data-sno',selectedSeason)
    if (ref != "modal") {
      document.getElementById('episode-container').classList.add('player-styling');
      document.querySelector('.now-playing > h4').innerHTML = `S${sno}:E${eno} ${seasonData.episodes.map(episode => episode.name)[eno - 1]}`;
      document.querySelectorAll('.episode').forEach(item => {
        if (item.dataset.episode === String(episode)) {
          item.classList.add('current');
        }
      });
    }

    whenInView('.player-styling, .modal', () => {
      scrollEpisodeIntoView(eno);
    });
    enableHorizontalWheelScroll('.player-styling', 3)
  }


  const seasonDropdown = document.getElementById('season-dropdown');
  seasonDropdown.removeEventListener('change', displaySeasonInfo);
  seasonDropdown.addEventListener('change', displaySeasonInfo);
  seasonDropdown.dispatchEvent(new Event('change'));

}

function watchEventListeners(event, data) {
  console.log('i ran');
  if (event.type === 'click' || event.type === 'keydown' && event.key === 'Enter') {
    if (event.target.classList.contains("watch-btn")) {

      const sanitizedData = Object.fromEntries(
        Object.entries(event.target.dataset).map(([key, data]) => [
          key, escapeHTML(data)
        ])
      );

      const { id, name } = sanitizedData
      console.log(id, name)
      const mediaType = "movie";

      //loadWatchPage(mediaType, name, id);
      window.location.href = `/watch/${mediaType}/${Number(id)}/${name}`;
      event.stopPropagation();
    }

    if (event.target.classList.contains("play-trailer")) {
      console.log('trailer button')
      event.stopPropagation();
    
      const container = document.querySelector('.trailer-container')
      const trailerBtn = event.target.closest(".play-trailer");

      const params = new URLSearchParams({
        autoplay : 1,
        controls : 0,
        rel : 0,
        color : 'white',
        iv_load_policy : 3
      });

      const playTrailer = () => {
        const { mediaType, sno } = event.target.dataset
        const tvData = mediaType === 'tv' ? { sno } : null ;
        console.log(tvData)
        const key = getTrailerVideoKey(data.videos.results, tvData)
        const trailerIframe = `
          <iframe id="ytplayer" class="${mediaType}-trailer" type="text/html"
            src="https://www.youtube.com/embed/${key + `?` + params}"
            frameborder="0" 
            scrolling="no"
          ></iframe>
        `;
        console.log(key)
        if (!key) {
            console.log('no trailer')
            const noTrailer = document.createElement('div');
            noTrailer.classList.add('temp-message')
            noTrailer.innerText = `no trailer available`;
            trailerBtn.appendChild(noTrailer)
            setTimeout(() => { trailerBtn.removeChild(noTrailer) }, 2000);
            return
        }
        container.innerHTML = trailerIframe
        trailerBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>Close Trailer`
      }

      const trailer = document.getElementById('ytplayer')

      if (trailer) {
        container.innerHTML = '';
        trailerBtn.innerHTML = `<i class="fa-solid fa-video"></i>Trailer`
        return
      }

      if (!trailer) playTrailer()
    }

    if (event.target.closest(".episode img")) {
      const episodeElement = event.target.closest(".episode");

      const sanitizedData = Object.fromEntries(
        Object.entries(episodeElement.dataset).map(([key, data]) => [
          key, escapeHTML(data)
        ])
      );

      const mediaType = "tv";

      const { name, id, season, episode, epname } = sanitizedData;
      //console.log( id, season, episode)
      //sourceValidator(mediaType, id, season, episode)


      const title = `${mediaType === "movie" ? name : `S${season}:E${episode} ${name}`}`;
      const info = `<h2>${name}</h2>
                    <h4>S${season}:E${episode} ${epname}</h4>`;
      const tvData = { season, episode, epname };

      if (document.getElementById('episode-container').classList.contains('player-styling')) {
        currentSeason = season;
        currentEpisode = episode;
        const source = getLoggedSource(Number(id)) || 1;

        loadSources(source, mediaType, Number(id), Number(season), Number(episode));

        window.history.pushState({}, '', `/watch/${mediaType}/${Number(id)}/${name}${season && episode ? `/${Number(season)}/${Number(episode)}` : ''}`);
        document.querySelector("title").innerText = title;
        if (info) { document.querySelector(".now-playing").innerHTML = info };

        scrollEpisodeIntoView(episode);
      }
      else {
        window.location.href = `/watch/${mediaType}/${id}/${name}${season && episode ? `/${season}/${episode}` : ''}`;
        //loadWatchPage(mediaType, name, id, tvData);
      }
      event.stopPropagation();
    }

    const bookmark = event.target.closest(".bookmark")
    if (bookmark) {
      const { mediaType, id, sno, eno, index } = bookmark.dataset;
      event.preventDefault()
      const checkbox = bookmark.querySelector("input[type='checkbox']")
      checkbox.checked = !checkbox.checked
      toggleBookmark('bookmarks', id, mediaType, sno, eno, index);
      console.log('toggling bookmark')
      event.stopPropagation()
    }
  }
}

function getTrailerVideoKey(data, tvData = null) {
  console.log(data)
  if (data.length < 1) return null;

  if (data.length === 1) {
    return data[0].key || null;
  }

  // Strict parameters.
  const candidates = data.reverse().filter(video =>
    video.site.toLowerCase() === 'youtube' &&
    video.iso_3166_1 === 'US' &&
    video.iso_639_1 === 'en'
  );

  if (!candidates.length) return null;

  // Optional parameters
  candidates.sort((a, b) => {
    const score = video => {
      let s = 0;
      if (video.name && typeof video.name === 'string') {
        const lowerName = video.name.toLowerCase();
        if (lowerName.includes('official')) s++;
        if (lowerName.includes('trailer')) s++;
        if (tvData && lowerName.includes(`season ${tvData.sno}`)) s++;
        if (video.official === true ) s++;
        if (video.type.toLowerCase() === 'trailer') s++;
      }
      return s;
    };
    return score(b) - score(a);
  });

  return candidates[0].key || null;
}

function escapeHTML(str) {
  var p = document.createElement("p");
  p.appendChild(document.createTextNode(str));
  return p.innerHTML;
}

async function sourceValidator(mediaType, id, season = null, eno = null) {
  const { data } = await fetchMetaData(mediaType, id, season)
  const episode = data.episodes.filter(ep => ep.episode_number === Number(eno))[0].episode_number

  return { id: Number(id), season: data.season_number, episode }
}

function scrollEpisodeIntoView(eno) {
  const episode = document.getElementById(eno);

  if (!episode) {
    return;
  }

  // Scroll vertically using scrollIntoView
  episode.scrollIntoView({ block: 'center', behavior: 'smooth' });

  // Scroll horizontally if needed
  const container = document.querySelector('.episode-container');
  if (!container) {
    console.error('.episode-container not found.');
    return;
  }

  // Responsive measurements based on screen size
  const episodeWidth = isMobile() ? 9.2 * 16 : 15 * 16; // Mobile: 8.6rem, PC: 15rem
  const gapWidth = isMobile() ? 0.6 * 16 : 0.8 * 16;   // Mobile: 0.6rem, PC: 0.8rem
  const totalEpisodeWidth = episodeWidth + gapWidth;

  // Calculate the index of the episode
  const allEpisodes = Array.from(container.querySelectorAll('.episode'));
  const episodeIndex = allEpisodes.indexOf(episode);

  if (episodeIndex === -1) {
    console.error('Episode element not found inside container.');
    return;
  }

  // Calculate the required scrollLeft position
  const targetScrollLeft = episodeIndex * totalEpisodeWidth;

  // Smooth scroll to the calculated position
  container.scrollTo({
    left: targetScrollLeft,
    behavior: 'smooth',
  });

  //
  // mask logic
  const scrollContainer = document.querySelector('.player-styling');

  scrollContainer?.addEventListener('scroll', () => {
    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    const scrollLeft = scrollContainer.scrollLeft;
    const buffer = 20;

    let maskGradient = scrollLeft <= buffer
      ? 'linear-gradient(to right, black, black 98%, transparent)'
      : scrollLeft >= maxScroll - buffer
        ? 'linear-gradient(to right, black, black 2%, black)'
        : 'linear-gradient(to right, black, black 98%, transparent)';

    scrollContainer.style.maskImage = maskGradient;
    scrollContainer.style.webkitMaskImage = maskGradient;
  });


}

let isListenerAttached = false; // Prevent multiple event listeners

function cappedOverview() {
  document.querySelectorAll('.synopsis .overview').forEach(text => {
    if (text.scrollHeight > text.offsetHeight + 5) {
      text.style.maskImage = "linear-gradient(to bottom, black, black 70%, transparent 98%)";
    }
  });

  if (!isListenerAttached) {
    document.addEventListener('click', (e) => {
      const container = e.target.closest('.synopsis');
      if (container) {
        container.classList.toggle('expanded');
        e.stopPropagation();
      }
    });

    isListenerAttached = true;
  }
}


function shareItem(mediaType, id, name) {
  const shareData = {
    text: `${name}`,
    url: `https://pixelstream.vercel.app/watch/${mediaType}/${id}/${encodeURIComponent(name)}`,
  };

  const btn = document.querySelector(".share");

  const message = document.createElement('div')
  message.classList.add('temp-message')
  message.innerHTML = `<p>Copied link to clipboard!</p>`

  btn?.addEventListener("click", async () => {
    try {
      await navigator.share(shareData);
    } catch (err) {
      await navigator.clipboard.writeText(shareData.url);
      console.log('Copied link to clipboard');
      btn.appendChild(message)
      setTimeout(() => {
        btn.removeChild(message)
      }, 2000);
    }
  });
}


function cropToFit() {
  const iframeFullscreen = document.querySelector(".iframefullscreen");
  const iframeExit = document.querySelector(".iframe-exit");
  const iframeElement = document.querySelector(".iframe-container");


  iframeFullscreen.addEventListener('click', (event) => {
    if (!document.fullscreenElement) {
      if (iframeElement.requestFullscreen) {
        iframeElement.requestFullscreen();
      } else if (iframeElement.webkitRequestFullscreen) { // Safari
        iframeElement.webkitRequestFullscreen();
      }
      iframeExit.style.opacity = '1';
    }
    event.stopPropagation();
  });

  // Exit fullscreen for the iframe
  iframeExit.addEventListener('click', (event) => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { // Safari
      document.webkitExitFullscreen();
    }
    iframeExit.style.opacity = '0'; // Hide exit button
    event.stopPropagation();
  });

  // Handle fullscreen change events
  document.addEventListener('fullscreenchange', () => {
    console.log('fullscreen');
    if (!document.fullscreenElement) {
      iframeExit.classList.remove('hidden');
      console.log('exited fullscreen');
    }
    else {
      wait('iframeExit', 3).then(() => {
        iframeExit.classList.add('hidden');
        console.log('button hidden');
      });
    }
  });
}

function waitTimeout() {
  const waitInstances = new Map(); // Map to track each wait instance by unique ID

  const wait = (id, duration) => {
    console.log(`wait initiated for ID: ${id}`);
    return new Promise((resolve, reject) => {
      if (waitInstances.has(id)) {
        clearTimeout(waitInstances.get(id).timeoutId);
        waitInstances.delete(id);
      }

      const instance = {
        isCanceled: false,
        timeoutId: setTimeout(() => {
          if (instance.isCanceled) {
            reject(new Error(`Wait canceled for ID: ${id}`));
          } else {
            resolve(`Wait completed for ID: ${id}`);
          }
          waitInstances.delete(id);
        }, duration * 1000),
      };

      waitInstances.set(id, instance);
    });
  };

  const cancel = (id) => {
    if (waitInstances.has(id)) {
      const instance = waitInstances.get(id);
      clearTimeout(instance.timeoutId);
      instance.isCanceled = true;
      waitInstances.delete(id);
      console.log(`Wait canceled for ID: ${id}`);
    } else {
      console.log(`No active wait found for ID: ${id}`);
    }
  };

  return { wait, cancel };
}

const { wait, cancel } = waitTimeout();

function whenInView(selector, callback) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target); // Call your function here
        observer.unobserve(entry.target);
      }
    });
  });
  const element = document.querySelector(selector);
  if (element) {
    observer.observe(element);
  }
}

function footerHTML() {
  const footer = document.querySelector('footer')
  footer ? footer.innerHTML = `
    <ul>
            <li><a href="/" id="home" onclick=setActiveIcon(this.id)>
                <i class="fa-solid fa-house"></i>
                <p>Home</p>
                </a>
            </li>
            <li><a href="/movie" id="movie" onclick=setActiveIcon(this.id)>
                    <i class="fa-solid fa-film"></i>
                    <p>Movies</p>
                </a></li>
            <li><a href="/tv" id="tv" onclick=setActiveIcon(this.id)>
                    <i class="fa-solid fa-display"></i>                    
                    <p>TV</p>
                </a>
            </li>
            <li><a href="/profile" id="profile" onclick=setActiveIcon(this.id)>
                    <i class="fa-solid fa-user"></i>                    
                    <p>You</p>
                </a>
            </li>
        </ul>
  ` : '';

}

function enableHorizontalWheelScroll(container, factor = 1) {
  const gridContainers = document.querySelectorAll(container); // Select all matching elements

  gridContainers.forEach(gridContainer => {
    // Check if the container is overflowing horizontally
    if (gridContainer.scrollWidth > gridContainer.clientWidth) {
      const scrollEvent = (e) => {
        e.preventDefault();
        gridContainer.scrollLeft += e.deltaY * factor; // Adjust scroll speed if needed
      };

      // Remove previous listener to prevent duplicates
      gridContainer.removeEventListener("wheel", scrollEvent);
      gridContainer.addEventListener("wheel", scrollEvent);
    }
  });
}



function setActiveIcon(button) {
  if (button === '') return;
  const footer = document.querySelector('footer')
  footer.querySelectorAll('a').forEach(btn => btn.classList.remove('active'))
  const active = document.getElementById(button);
  active?.classList.add('active')
}

// Helper function to get element's position
function isElementInView(element) {
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= window.innerHeight;
}

function backdropAnim(details, modalContent) {
  const scrollTop = details.scrollTop;
  const opacity = 0.8 - Math.min(scrollTop / 360, 0.8);
  modalContent.style.setProperty('--modal-backdrop-opacity', opacity);
}

let lastScrollY = window.scrollY;
let isScrollingDown = false;
let hideTimeout;

window.addEventListener('scroll', () => {

  const header = document.querySelector('header');
  const footer = document.querySelector('footer');
  const nav = document.querySelector("#header > nav > ul");
  const filter = document.querySelector('.filter-button');
  const input = document.getElementById('search-input');

  let end = ((window.scrollY + 10 + window.innerHeight) >= (document.body.scrollHeight)) || window.scrollY <= 40;

  if (window.scrollY > lastScrollY && !end) {
    // Scrolling down
    if (!isScrollingDown) {
      isScrollingDown = true;
      input.style.height = "1.8rem";
      nav.style.padding = isMobile() ? "0.4rem 0.6rem" : "0.4rem 1.4rem";
      header.style.height = isMobile() ? "3rem" : "2.8rem";
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        header.classList.add('hidden');
        footer ? footer.style.bottom = '-4rem' : '';
        (isMobile && filter) ? filter.style.bottom = '1rem' : '';
      }, 500);
    }
  } else if ((window.scrollY <= lastScrollY) || end) {
    isScrollingDown = false;
    clearTimeout(hideTimeout); // Cancel any pending hide

    input.style.height = "2rem";
    nav.style.padding = isMobile() ? "0.8rem 0.6rem" : "0.8rem 1.4rem";
    header.style.height = isMobile() ? "3.6rem" : "4rem";
    header.classList.remove('hidden');
    footer ? footer.style.bottom = '0rem' : '';
    (isMobile && filter) ? filter.style.bottom = '5rem' : '';
  }
  lastScrollY = window.scrollY;
});

function getConfirm({ title, message, success, decline, state = 1, exitInterval = 700 } = {}) {

  let successIcon
  let declineIcon
  switch (state) {
    case 1:
      successIcon = `<i class="fa-solid fa-circle-check"></i>`
      break;
  }

  const overlay = document.createElement('div');
  overlay.setAttribute('tabindex', '0');
  overlay.classList.add('dialog-overlay');
  overlay.innerHTML = `
    <div class="dialog">
      <h2>${title || `Are you sure?`}</h2>
      <div class="message-box">
        <span class="icon">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </span>
        <span class="message">
          <p>${message || `This action can not be undone. Do you wish to proceed?`}</p>
        </span>
      </div>
      <div class="dialog-buttons">
        <button tabindex="0" id="decline">Cancel</button>
        <button tabindex="0" id="accept"><i class="fa-solid fa-trash-can"></i>&nbsp;Delete</button>
      </div>
    </div>
  `;
  document.querySelector('main').appendChild(overlay);
  document.getElementById('decline').focus();
  return new Promise((resolve) => {
    const handleDialog = (e) => {
      const isOverlayClick = e.target.matches('.dialog-overlay');
      const isDecline = e.target.matches('#decline');
      const isAccept = e.target.matches('#accept');
      const isKeydown = e.type === 'keydown';
      const isEscapeKey = isKeydown && e.key === 'Escape';
      const isEnterKey = isKeydown && e.key === 'Enter';
      const isClick = e.type === 'click';

      const messageBox = overlay.querySelector('.message-box');
      const dialogButtons = overlay.querySelector('.dialog-buttons');

      // Ignore invalid clicks
      if (isClick && !isOverlayClick && !isDecline && !isAccept) return;

      if (isEscapeKey || (isClick && isOverlayClick)) {
        handleCancel(dialogButtons, messageBox);
        resolve(false);
      } else if ((isDecline || isAccept) && (isClick || isEnterKey)) {
        if (isDecline) {
          handleCancel(dialogButtons, messageBox);
          resolve(false);
        } else {
          handleAccept(dialogButtons, messageBox);
          resolve(true);
        }
      }

      if (isEscapeKey || isClick || isEnterKey) {
        setTimeout(() => document.querySelector('main').removeChild(overlay), exitInterval);
        ['click', 'keydown'].forEach((type) =>
          overlay.removeEventListener(type, handleDialog)
        );
      }
    };

    // Helper function to handle the cancel action
    const handleCancel = (dialogButtons, messageBox) => {
      dialogButtons.style.display = 'none';
      overlay.querySelector('h2').innerText = decline.title;
      messageBox.classList.add('green');
      messageBox.querySelector('.icon').innerHTML = declineIcon || successIcon;
      messageBox.querySelector('p').innerText = decline.message;
    };

    // Helper function to handle the accept action
    const handleAccept = (dialogButtons, messageBox) => {
      dialogButtons.style.display = 'none';
      overlay.querySelector('h2').innerText = success.title;
      messageBox.querySelector('.icon').innerHTML = successIcon;
      messageBox.querySelector('p').innerText = success.message;
    };

    ['click', 'keydown'].forEach(type => overlay.addEventListener(type, handleDialog));
  });
}

function setupCheckboxListeners(sectionID) {

  const container = document.querySelector(`#${sectionID} .grid-container`);
  if (!container.querySelector('.grid-item')) return console.log('no data found for', sectionID)
  console.log('data found for', sectionID)

  if (container._cleanupCheckboxListeners) {
    console.log("Cleaning up previous event listeners for", sectionID);
    container._cleanupCheckboxListeners();
  }

  let selectedItems = [];

  const selectAllBox = document.querySelector(
    `#${sectionID} .select-action .selectable input[type="checkbox"]`
  );
  const checkboxes = container.querySelectorAll(
    ".selectable input[type='checkbox']"
  );

  // --- Helper functions ---
  const displayCount = () => {
    const message = document.querySelector(
      `#${sectionID} .selection-count p`
    );
    if (message) {
      message.innerText = `${selectedItems.length} / ${checkboxes.length}`;
    }
  };

  const setupSelectedItems = (checkbox) => {
    const gridItem = checkbox.closest(".grid-item");
    if (!gridItem) return;

    const data = { ...gridItem.dataset };
    if (checkbox.checked) {
      if (!selectedItems.some((item) => item.index === data.index)) {
        selectedItems.push(data);
      }
    } else {
      selectedItems = selectedItems.filter((item) => item.index !== data.index);
    }
    displayCount();
  };

  const resetEditing = () => {
    selectAllBox.checked = false;
    checkboxes.forEach(cb => cb.checked = false);
    selectedItems = [];
    displayCount();
  };

  const toggleEditing = (section, gridItem) => {
    const editBtn = section.querySelector(".edit-button");
    editBtn.querySelectorAll("i").forEach((i) => i.classList.toggle("active"));

    section.querySelector(".delete-button")?.classList.toggle("active");
    section.querySelectorAll(".selectable").forEach((item) =>
      item.classList.toggle("active")
    );

    resetEditing();

    if (!gridItem) {
      setTimeout(() => {
        wasEditing = false;
      }, 1000);
      return;
    }
    wasEditing = true;
    console.log(wasEditing);
    const checkbox = gridItem.querySelector(".selectable input[type='checkbox']");
    checkbox.checked = true;
    setupSelectedItems(checkbox);
  };

  const selectAll = () => {
    checkboxes.forEach((checkbox) => {
      checkbox.checked = selectAllBox.checked;
      setupSelectedItems(checkbox);
    });
  };

  // --- End Helper functions ---

  // Array to keep track of cleanup functions.
  const cleanupFunctions = [];

  // Attach change listeners to each checkbox.
  checkboxes.forEach((checkbox) => {
    const handler = function () {
      setupSelectedItems(checkbox);
      selectAllBox.checked = checkboxes.length == selectedItems.length;
    };
    checkbox.addEventListener("change", handler);
    cleanupFunctions.push(() => {
      checkbox.removeEventListener("change", handler);
    });
  });

  // Action button click handler.
  const onActionButtonClick = (e) => {
    const section = e.target.closest("section");
    if (e.target.closest(".edit-button")) {
      toggleEditing(section);
      e.stopPropagation();
      return;
    }
    if (e.target.closest(".delete-button")) {
      console.log("delete-button");
      if (selectedItems.length < 1) return;
      getConfirm({
        title: `Delete ${selectedItems.length} items ? `,// from '${sectionID}'?`,
        success: {
          title: "Success!",
          message: `${selectedItems.length} items removed.`,// from ${sectionID}.`,
        },
        decline: {
          title: "Cancelled!",
          message: "Items not removed.",
        },
        exitInterval: 2000,
      }).then((confirmed) => {
        console.log("exited", confirmed);
        if (!confirmed) return;
        const sectionId = section.id;
        const logType = section.dataset.type;
        console.log(section.dataset);
        selectedItems.forEach((item) => {
          const { id, mediaType, index, sno, eno } = item;
          removeFromLocalStorage(logType, Number(id), mediaType, sno, eno, index)
          console.log(id, mediaType, index, sno, eno);
        });
        console.log(sectionId, logType, "item removed");
        loadUserContent(sectionId, logType);
        toggleEditing(section);
      });
      e.stopPropagation();
      return;
    }
  };

  const actionButtons = document.querySelector(`#${sectionID} .actions`);
  if (actionButtons) {
    // Remove any previously attached listener (if stored).
    if (actionButtons._onActionButtonClick) {
      actionButtons.removeEventListener(
        "click",
        actionButtons._onActionButtonClick
      );
    }
    actionButtons._onActionButtonClick = onActionButtonClick;
    actionButtons.addEventListener("click", onActionButtonClick);
    cleanupFunctions.push(() => {
      actionButtons.removeEventListener("click", onActionButtonClick);
      delete actionButtons._onActionButtonClick;
    });
  }

  // Grid item mouse down handler.
  const onGridItemMouseDown = (e) => {
    const section = e.target.closest("section");
    const item = e.target.closest(".grid-item");
    if (!item) return;

    let hold = false;
    const timer = setTimeout(() => {
      hold = true;
      console.log("Element is being held");
      const isActive = item.querySelector(".selectable.active");
      wasEditing = true;
      try {
        navigator.vibrate(50)
      } catch (err) {
        console.log(err)
      }
      toggleEditing(section, !isActive ? item : "");
    }, 750);

    const clearTimer = () => clearTimeout(timer);

    ["mouseup", "mouseout", "touchend"].forEach((eventType) => {
      item.addEventListener(eventType, clearTimer, { once: true });
    });
  };

  ["mousedown", "touchstart"].forEach((eventType) => {
    container.addEventListener(eventType, onGridItemMouseDown);
    cleanupFunctions.push(() => {
      container.removeEventListener(eventType, onGridItemMouseDown);
    });
  });

  // Attach the select-all listener.
  if (selectAllBox) {
    selectAllBox.addEventListener("click", selectAll);
    cleanupFunctions.push(() => {
      selectAllBox.removeEventListener("click", selectAll);
    });
  }

  // Store a cleanup function on the container so that the next time this function is called,
  // it can remove all the listeners that were added during the previous call.
  container._cleanupCheckboxListeners = () => {
    cleanupFunctions.forEach((fn) => fn());
    delete container._cleanupCheckboxListeners;
    console.log("Cleaned up event listeners for", sectionID);
  };
}

async function waitForTrue(variable) {
  while (!variable) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100 milliseconds
  }
}


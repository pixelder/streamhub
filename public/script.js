const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const OPTIONS = 'include_null_first_air_dates=false&language=en-US&page=1&sort_by=popularity.desc';

// Sections to populate
const sections = {
  'trending-movies': `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`,
  'trending-series': `${BASE_URL}/trending/tv/week?api_key=${API_KEY}`,
};

function isMobile() {
  const screenWidth = window.innerWidth <= 768;
  return screenWidth;
}

// Global variables for pagination tracking
let pageNumbers = {}; // Track the current page number for each section
let storedData = {}; // Store data for each section for persistent pagination
let isFetching = {}; // Track fetching state per section to avoid multiple fetches

async function fetchContent(sectionId, url, limit) {
  limit = isMobile() ? 20 : 14; // Set limit based on device size
  
  if (!pageNumbers[sectionId]) pageNumbers[sectionId] = 1; // Initialize page number if not set
  if (!isFetching[sectionId]) isFetching[sectionId] = false; // Initialize fetching state

  // Prevent multiple fetch requests while one is ongoing
  if (isFetching[sectionId]) return;

  try {
    isFetching[sectionId] = true; // Set fetching flag to true

    // Modify the URL to include the correct page number
    const pageUrl = `${url}&page=${pageNumbers[sectionId]}`;
    const response = await fetch(pageUrl);
    const data = await response.json();

    // Reset stored data for a new page
    storedData[sectionId] = data.results;

    // Determine the results to show based on the limit
    const accumulatedResults = storedData[sectionId].slice(0, limit);

    // Populate the section with the fetched results
    populateSection(sectionId, accumulatedResults);
    setupPagination(sectionId, url, limit);
  } catch (error) {
    console.error(`Error fetching data for ${sectionId}:`, error);
  } finally {
    isFetching[sectionId] = false;
  }
}

// Set up pagination buttons for the section
function setupPagination(sectionId, url, limit) {
  const prevButton = document.querySelector(`#${sectionId} .prev-page`);
  const nextButton = document.querySelector(`#${sectionId} .next-page`);

  // Remove previous event listeners to avoid duplication
  prevButton.replaceWith(prevButton.cloneNode(true)); // Reset the "previous" button
  nextButton.replaceWith(nextButton.cloneNode(true)); // Reset the "next" button

  const updatedPrevButton = document.querySelector(`#${sectionId} .prev-page`);
  const updatedNextButton = document.querySelector(`#${sectionId} .next-page`);

  // Previous page button functionality
  updatedPrevButton.addEventListener('click', () => {
    if (pageNumbers[sectionId] > 1) {
      pageNumbers[sectionId]--; // Decrement the page number
      fetchContent(sectionId, url, limit); // Fetch the previous page
    }
  });

  // Next page button functionality
  updatedNextButton.addEventListener('click', () => {
    pageNumbers[sectionId]++; // Increment the page number
    fetchContent(sectionId, url, limit); // Fetch the next page
  });
}

// Load content for each section
Object.entries(sections).forEach(([sectionId, url]) => {
  if (document.getElementById([sectionId])) {
    let limit = isMobile() ? 20 : 14;
    fetchContent(sectionId, url, limit);
  }
});

// Populate a section with content
function populateSection(sectionId, items) {
    const container = document.querySelector(`#${sectionId} .grid-container`);
    container.innerHTML = renderGridItems(items);
}


// Attach event listeners to each section's pagination buttons
/* document.querySelectorAll('.pagination-buttons').forEach((buttonsContainer) => {
  console.log('hi');
    const sectionId = buttonsContainer.closest('section').id;
    console.log(sectionId);
    buttonsContainer.querySelector('.prev-page').addEventListener('click', () => showPreviousPage(sectionId));
    buttonsContainer.querySelector('.next-page').addEventListener('click', () => showNextPage(sectionId));
}); */



document.addEventListener("DOMContentLoaded", () => {
  loadDiscoverContent(213, 8, 'movie'); // Netflix and Movies as default
});

function loadDiscoverContent(networkId = 213, providerId = 8, mediaType = 'movie') {
  const sectionId = 'discover-streaming';
    if (document.getElementById(sectionId)) {
    const url = `${BASE_URL}/discover/${mediaType}?api_key=${API_KEY}&with_networks=${networkId}&with_watch_providers=${providerId}&watch_region=US&${OPTIONS}`;
    let limit;
    storedData[sectionId] = [];
    pageNumbers['discover-streaming'] = 1;
    console.log(mediaType, url);
    fetchContent(sectionId, url, limit);
  }
}

function sectionMediaType(sectionId) {
  //return document.getElementById(sectionId).dataset.type;
  const mediaType = document.querySelector(".media-switch .active")?.dataset.type;
  if (sectionId === "discover-streaming") {
    return mediaType; // Returns either 'movie' or 'tv'
  }
  const url = sections[sectionId];
  if (!url) {
    console.log( "url null" );
    return null;
  } else return url.includes("/tv") ? "tv" : "movie";
}

document.querySelectorAll(".tab-menu .tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelector(".tab-menu .active").classList.remove("active");
    tab.classList.add("active");
    const mediaType = document.querySelector(".media-switch .active").dataset.type;
    const networkId = tab.dataset.network;
    const providerId = tab.dataset.provider;
    console.log(mediaType, networkId, providerId);
    loadDiscoverContent(networkId, providerId, mediaType);
  });
});

document.querySelectorAll(".media-tab").forEach(button => {
  button.addEventListener("click", () => {
    // Remove the active class from all buttons
    document.querySelector(".media-tab.active").classList.remove("active");

    // Add the active class to the clicked button
    button.classList.add("active");

    // Get the selected media type
    const mediaType = button.dataset.type;
    const networkId = document.querySelector(".tab-menu .active").dataset.network;
    const providerId = document.querySelector(".tab-menu .active").dataset.provider;
    console.log(mediaType, networkId, providerId);
    // Load content dynamically
    loadDiscoverContent(networkId, providerId, mediaType);
  });
});


function renderGridItems(items) {
   return items
     .map(item => {
       const mediaType = item.media_type;
       const title = item.title || item.name;
       const rating = truncate(item.vote_average, 1);
       const year = extractYear(item.release_date || item.first_air_date);
       const image = item.poster_path
         ? `${IMAGE_URL}${item.poster_path}`
         : 'https://placehold.co/440x661/383852/ccc?text=No+Image';
       return `
         <div tabindex="0" role="button" aria-pressed="false" class="grid-item" id="grid-item" data-id="${item.id}" data-media-type="${mediaType}">
           <div>
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
async function fetchMetaData(mediaType, id) {

  try {
    let url;
    if (mediaType === "movie") {
      url = `${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US&append_to_response=videos,release_dates,credits,images&include_image_language=en`;
    } else if (mediaType === "tv") {
      url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US&append_to_response=content_ratings,credits,images&include_image_language=en`;
    } else if (mediaType === "person") {
      url = `${BASE_URL}/person/${id}?api_key=${API_KEY}&language=en-US`;
    }
    const response = await fetch(url);
    const data = await response.json();
    return {data, mediaType};
    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
}

function openModal(event) {
  const gridItem = event.target.closest('.grid-item, .profile-item');
  const id = gridItem?.dataset.id; // Get the ID of the item
  const sectionId = gridItem?.closest('section')?.id; // Find the parent section's ID
  const mediaType = ( gridItem?.closest('section')?.dataset.type ?? sectionMediaType(sectionId) )
                  ?? gridItem.dataset.mediaType;
  console.log(id,mediaType,sectionId);
  if ( gridItem && !mediaType || !id) {
    console.error("Media type or ID not found");
    return;
  }

  fetchMetaData(mediaType, id).then(({ mediaType, data }) => {
    displayModal(mediaType, data);
  });
}

// Display modal with fetched data
function displayModal(mediaType, data) {
  const modal = document.getElementById('info-modal');
  const modalContent = document.querySelector(".modal-content");
  const details = document.getElementById('modal-details');
  
  const id = data.id;
  const name = data.name || data.title || data.original_title;
  const cast = data.credits?.cast.map(cast => cast.name).slice(0, 5).join(", "); 
  const rated = mediaType === "movie" 
    ? data.release_dates?.results?.find((item) => item.iso_3166_1 === "US")?.release_dates[0].certification
    : data.content_ratings?.results?.find((item) => item.iso_3166_1 === "US")?.rating || "";
  const logo = data.images?.logos?.[0]?.file_path
    ? `<span>
          <div class="modal-info-logo">
            <img src="${IMAGE_URL}${data.images.logos[0].file_path}" alt="Logo">
          </div>
          <div class="modal-info">`
    : `<span>
          <div class="modal-info-backdrop" style="background-image : url(${IMAGE_URL}${data.backdrop_path})"></div>
          <div class="modal-info">
            <h1>${name.toUpperCase()}</h1>`;

  if (mediaType !== "person") {
    const date = convertDate(  data.release_date || data.first_air_date || data.air_date);
    details.innerHTML = `
    <div class="modal-media">
      <div class="modal-cover">
        <img src="${IMAGE_URL}${data.poster_path}" alt="${name}"></img>
      </div>
      ${logo}
          <span class="ratings-genre">
            <i class="fa-solid fa-star"></i>
            <p data-title="${data.vote_count} votes">${truncate(data.vote_average, 1)}</p>
            <span class="modal-genre">
              ${data.genres.map(genre => `<a href="#">${genre.name}</a>` ).slice(0, 3).join(" ")}
            </span>
          </span>
          <div class="synopsis"><p class="overview">${data.overview || 'No description available.'}</p></div>
          <p>Cast : ${cast}</p>
          <p class="tags">${extractYear(date)} • ${rated !== "" ? `${rated} • `: ""} ${data.original_language.toUpperCase()} ${mediaType === "movie" ? `• ${runtime(data.runtime)}</p>` : "</p>"}
          </span>
      </div>
      </span>
    </div>`;
  } else
  if (mediaType === "person") {
    details.innerHTML = `${inBeta()}`;
  }
  
  const userData = watchHistoryCheck(id);

  if (mediaType === "movie") {
    document.querySelector(".modal-media")
    .insertAdjacentHTML('afterend', `
      <div class="modal-actions">
        <button class="watch-btn" 
        data-name="${name}" 
        data-id="${id}">
          Watch
        </button>
        <button class="share">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    `);
    modalContent.style.height = "fit-content";
  } else 
  if (mediaType === "tv") {
    let sno = userData?.sno;
    let eno = userData?.eno;
    tvContent(data, sno, eno, ref = "modal");
    if (!isMobile()) {
      modalContent.style.height = '32rem';
    }
    else {
      modalContent.style.height = '70%';
      document.getElementById("season-dropdown").insertAdjacentHTML('afterend', `
        <button class="share">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
        `);
    };
  };

  cappedOverview();
  shareItem(mediaType,id,name);

  modal.classList.add('active');

}

async function tvContent(data, sno, eno, ref) {
  const seasons = data.seasons.reverse();
  sno === null ? sno = -1 : "";
  const containerClass = ref === "modal" ? "episode-wrap" : "episode-player";
  const tvInfo =`
    <div class="season-info">
      <div class="seasons-menu">
        <select id="season-dropdown">
           ${seasons
              .map(season => `
                <option value="${season.season_number}" 
                ${season.season_number === Number(sno) ? "selected" : ""}>
                Season ${season.season_number}
                </option>
              `)
              .join("")}
        </select>
      </div>
    <div class="episode-container ${containerClass}" id="episode-container">
    </div>
    </div>
    `;
    //modal
    document.querySelector(".modal-media")?.insertAdjacentHTML('afterend',tvInfo);
    //player
    ref !== "modal" ? document.querySelector(".player-episodes").innerHTML = tvInfo : "";
  
  //episode info
  const episodeContainer = document.getElementById('episode-container');
    
  const displaySeasonInfo = async (event) => { 
    const selectedSeason = event.target.value;
    try {
      const response = await fetch(`${BASE_URL}/tv/${data.id}/season/${selectedSeason}?api_key=${API_KEY}`);
      seasonData = await response.json();
      episodeContainer.innerHTML = seasonData.episodes
        .map(episode => `
          <div id="${episode.episode_number}" class="episode episode-width" data-name="${data.name}" data-id="${data.id}" data-season="${selectedSeason}" data-episode="${episode.episode_number}" data-epname="${episode.name}">
            <div class="episode-items">
              <img src="${episode.still_path ? IMAGE_URL + episode.still_path : 'https://placehold.co/500x281?text=No+Image+Available'}" alt="Episode ${episode.episode_number}">
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

    } catch (error) {
      console.error('Error fetching season details:', error);
    }
    if (ref != "modal") {
      document.getElementById('episode-container').classList.add('player-styling');
      document.querySelector('.now-playing > h4').innerHTML = `S${sno}:E${eno} ${seasonData.episodes.map(episode => episode.name)[eno - 1]}`;
    };

    whenInView('.player-styling', () => {
      scrollEpisodeIntoView(eno);
    });
  };

  const seasonDropdown = document.getElementById('season-dropdown');
  seasonDropdown.removeEventListener('change', displaySeasonInfo);
  seasonDropdown.addEventListener('change', displaySeasonInfo);
  seasonDropdown.dispatchEvent(new Event('change'));

}


document.addEventListener("click", (event) => {
  if (event.target.classList.contains("watch-btn")) {
    const id = event.target.dataset.id;
    const name = event.target.dataset.name;
    const mediaType = "movie";

    //loadWatchPage(mediaType, name, id);
    window.location.href = `/watch/${mediaType}/${id}/${name}`;
  }

  if (event.target.closest(".episode img")) {
    const episodeElement = event.target.closest(".episode");
    const name = episodeElement.dataset.name;
    const id = episodeElement.dataset.id;
    const season = episodeElement.dataset.season;
    const episode = episodeElement.dataset.episode;
    const epname = episodeElement.dataset.epname;
    const mediaType = "tv";
    const title = `${mediaType === "movie" ? name : `S${season}:E${episode} ${name}`}`;
    const info = `<h2>${name}</h2>
                  <h4>S${season}:E${episode} ${epname}</h4>`;
    const tvData = { season, episode, epname };

    if (document.getElementById('episode-container').classList.contains('player-styling')) {    
      currentSeason = season;
      currentEpisode = episode;
      loadSources(source = 1, mediaType, id, season, episode);
      console.log("log2",source, season, episode);
      document.querySelector("title").innerHTML = title;
      if (info) {document.querySelector(".now-playing").innerHTML = info};
      window.history.pushState({}, '', `/watch/${mediaType}/${id}/${name}${season && episode ? `/${season}/${episode}` : ''}`);
    }
    else {
      window.location.href = `/watch/${mediaType}/${id}/${name}${season && episode ? `/${season}/${episode}` : ''}`;
      //loadWatchPage(mediaType, name, id, tvData);
    }

  }
});

let currentSeason = null;
let currentEpisode = null;

function loadWatchPage(mediaType, name = null, id, tvData = null) {
  season = tvData?.season;
  episode = tvData?.episode;
  currentSeason = season;
  currentEpisode = episode;
  const title = `${mediaType === "movie" ? name : `S${season}:E${episode} ${name}`} - PixelStream`;
  const info = `<h2>${name}</h2> ${mediaType === "movie" ? ""
             : `<h4>S${season}:E${episode} ${tvData?.epname}</h4>`}`;

  const watchPage = document.querySelector("main");

  watchPage.innerHTML = `
    <div class="watch-page">
      <div class="player-container">
        <div class="player">
          <!-- Placeholder until iframe loads -->
          <div class="loading">Loading player...</div>
          <div class="iframe-container">
          </div>
          <div class="player-toolbar">
            <div class="provider-menu">
              <button class="provider-change">
                <i class="fa-solid fa-server"></i>
              </button>
              <div class="providers">
                <p data-source="1">Vidlink</p>
                <p data-source="2">Embed.su</p>
                <p data-source="3">Vidsrc</p>
                <p data-source="4">Superstream</p>
                <p data-source="5">Multiembed</p>
                <p data-source="6">Moviesapi</p>
                <p data-source="7">AutoEmbed(Multi)</p>
              </div>
            </div>
            <div class="media-download">
              <button class="download">Download</button>
              <div class="get-dwnload">
              </div>
            </div>
            <div class="go-fullscreen">
              <button class="iframefullscreen" title="Go fullscreen">
                <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="now-playing">
      </div>
      <div class="player-episodes">
      </div>
    </div>
  `;
  document.querySelector("title").innerHTML = title;
  document.querySelector(".now-playing").innerHTML = info;

  //display metadata on watch page
  fetchMetaData(mediaType, id).then(({data}) => {
    const sno = season;
    const eno = episode;
    if (mediaType == 'tv') {
        tvContent(data, sno, eno, ref = "player");
    };
  });

  // Initialize default source
  let source = 1;
  loadSources(source, mediaType, id, season, episode);
  console.log( "log1",source, season, episode);



  // Add event listeners to dropdown items
  const sourceItems = document.querySelectorAll('.providers p');
  sourceItems.forEach(item => {
    item.addEventListener('click', () => {
      const selectedSource = parseInt(item.getAttribute('data-source'), 10); // Ensure source is an integer
      if (selectedSource && selectedSource !== source) {
        source = selectedSource; // Update the source
        loadSources(source, mediaType, id, currentSeason, currentEpisode);
        console.log( "log3",source, season, episode);
      }
    });
  });

  // load utils
  cropToFit();
}

// Sources
function loadSources(source, mediaType, id, season = null, episode = null) {
  console.log(source);
  let src = "";
  switch (source) {
    case 1:
      src = `https://vidlink.pro/${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`;
      break;
    case 2:
      src = `https://embed.su/embed/${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`;
      break;
    case 3:
      src = `https://vidsrc.icu/embed/${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`;
      break;
    case 4:
      src = `https://vidbinge.dev/embed/${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`;
      break;
    case 5:
      src = `https://multiembed.mov/?video_id=${id}&tmdb=1${season && episode ? `&s=${season}&p=${episode}` : ''}`;
      break;
    case 6:
      src = `https://moviesapi.club/${mediaType}/${id}${season && episode ? `-${season}-${episode}` : ''}`;
      break;
    case 7:
      src = `https://hin.autoembed.cc/${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`;
      break;
    default:
      console.error("Invalid source selected");
      return;
  }
  // indicicate loading...
  document.querySelector(".loading").style.display = "flex";

  const loadIframe = `
          <button class="iframe-exit">
            <i class="fa-solid fa-compress"></i>
          </button>
          <iframe
          src="${src}"
          referrerpolicy="origin"
          frameborder="0"
          scrolling="no"
          allowfullscreen
          style="display: none;"
          onload="showIframe(this)"
          class="iframe"
        ></iframe>
        `;
  document.querySelector(".iframe-container").innerHTML = loadIframe;
  
  (async () => {
      cancel();
      await wait(120); // 
      logWatchHistory('history', Number(id), mediaType, season, episode);
  })();
}

function showIframe(iframe) {
  iframe.style.display = "block";
  document.querySelector(".loading").style.display = "none";

}

function goBack() {
  window.history.back();
}


// header animation
let lastScrollY = window.scrollY;
let isScrollingDown = false;
let hideTimeout;

window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  const nav = document.querySelector("nav > ul");
  const input = document.getElementById('search-input');
  
  if (window.scrollY > lastScrollY) {
    // Scrolling down
    if (!isScrollingDown) {
      isScrollingDown = true;
      input.style.height = "1.8rem";
      nav.style.padding = isMobile() ? "0.4rem 0.6rem" : "0.4rem 1.4rem";
      header.style.height = isMobile() ? "3rem" : "2.8rem";
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
      header.classList.add('hidden');
      }, 750);
    }
  } else {
    // Scrolling up
    isScrollingDown = false;
    input.style.height = "2rem";
    nav.style.padding = isMobile() ? "0.8rem 0.6rem" : "0.8rem 1.4rem";
    header.style.height = isMobile() ? "3.6rem" : "4rem";
    clearTimeout(hideTimeout); // Cancel any pending hide
    header.classList.remove('hidden'); // No delay to reappear
  }
  lastScrollY = window.scrollY;
});

// Close modal on click
/*  function closeModal() {
  document.getElementById('info-modal').classList.remove('active');
  //.style.display = 'none';
  //window.history.pushState({}, '', `/`);
  //window.history.back();
} */

document.addEventListener('click', event => {
  const modal = document.getElementById('info-modal');
  const modalContent = document.querySelector('.modal-content');

  if (event.target.closest('.grid-item, .profile-item') && !event.target.closest('#continue-watching .grid-item')) {
      openModal(event); 
  } else if (!event.target.closest('.grid-item, .profile-item') && modal !== null) {
      if (modal.contains(event.target) && !modalContent.contains(event.target)) {
            modal.classList.remove('active');
      }
  } else if ( event.target.closest('#continue-watching .grid-item')) {
    
    const historyItem = event.target.closest('.grid-item').dataset;
    const [mediaType, id, name, sno, eno] = [historyItem.mediaType, historyItem.id, historyItem.name, historyItem.sno, historyItem.eno];
    
    if (!event.target.closest('.grid-actions')) {
      
      window.location.href = `/watch/${mediaType}/${id}/${name}${ sno && eno ? `/${sno}/${eno}`: "" }`;
    
    } else if (event.target.closest('.options-menu button')){
      removeFromHistory('history', Number(id), mediaType, sno, eno);
      console.log(mediaType, id, name, sno, eno);
    }
  }
});
document.addEventListener('keydown', event => {
  const modal = document.getElementById('info-modal');

  if (event.type === 'keydown') {
    if (event.key === 'Escape') {
        modal.classList.remove('active');
    } else if ( event.key === 'Enter' && 
                !modal.classList.contains('active') && 
                event.target.closest('.grid-item, .profile-item') &&
                !event.target.closest('#continue-watching .grid-item')
              ) {
        openModal(event);
    }
  }
});

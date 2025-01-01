const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const OPTIONS = 'include_null_first_air_dates=false&language=en-US&page=1&sort_by=popularity.desc';

// Sections to populate
const sections = {
  'trending-movies': `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&with_release_type=4`,
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
    let limit = isMobile() ? 20 : 14;
    fetchContent(sectionId, url, limit);
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
  const url = `${BASE_URL}/discover/${mediaType}?api_key=${API_KEY}&with_networks=${networkId}&with_watch_providers=${providerId}&watch_region=US&${OPTIONS}`;
  const sectionId = 'discover-streaming';
  let limit;
  storedData[sectionId] = [];
  pageNumbers['discover-streaming'] = 1;
  console.log(mediaType, url);
  fetchContent(sectionId, url, limit);
}

function sectionMediaType(sectionId) {
  //return document.getElementById(sectionId).dataset.type;
  const mediaType = document.querySelector(".media-switch .active")?.dataset.type;
  if (sectionId === "discover-streaming") {
    return mediaType; // Returns either 'movie' or 'tv'
  }
  const url = sections[sectionId];
  if (!url) return null;
     return url.includes("/tv") ? "tv" : "movie";
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


//
// Misc. functions 

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


// Function to render grid items
function renderGridItems(items) {
 //const mediaType = document.querySelector("section").dataset.type? type : null;
  return items
    .map(item => {
      const title = item.title || item.name;
      const rating = truncate(item.vote_average, 1);
      const year = extractYear(item.release_date || item.first_air_date);
      const image = item.poster_path
        ? `${IMAGE_URL}${item.poster_path}`
        : 'https://placehold.co/440x661/383852/ccc?text=No+Image';
      return `
        <div tabindex="0" role="button" aria-pressed="false" class="grid-item" id="grid-item" data-id="${item.id}" data-media-type="${item.media_type}">
          <div>
            <img src="${image}" alt="${title}">
          </div>
          <div class="grid-item-info">
            <p>${capString(title, 40)}</p>
            <span class="grid-rating">
              <i class="fa-solid fa-star"></i>
              <p class="rating">${rating}</p>
            </span>
            <p>${year}</p>
          </div>
        </div>
      `;
    })
    .join('');
}

// Handle Search
async function handleSearch(event) {
  if (event) event.preventDefault(); // Prevent form submission
  
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;
  
  const movieUrl = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  const tvUrl = `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  const peopleUrl = `${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;

  try {
    const [movie, tv, people] = await Promise.all([
      fetch(movieUrl).then(res => res.json()),
      fetch(tvUrl).then(res => res.json()),
      fetch(peopleUrl).then(res => res.json())
    ]);


    const movieResults = isMobile() ? movie.results.slice(0, 20) : movie.results.slice(0, 7).map(item => ({ ...item, media_type: 'movie' }));
    const tvResults = isMobile() ? tv.results.slice(0, 20) : tv.results.slice(0, 7).map(item => ({ ...item, media_type: 'tv' }));
    const peopleResults = isMobile() ? people.results.slice(0, 20) : people.results.slice(0, 7).map(item => ({ ...item, media_type: 'person' }));

    displaySearchResults({ movie: movieResults, tv: tvResults, people: peopleResults }, query);
  } catch (error) {
    console.error("Error fetching search results:", error);
  }
}


// Display search results
function displaySearchResults({ movie, tv, people }, query) {
  const mainContent = document.querySelector('main');
  mainContent.innerHTML = `
    <div id=search-results>
      <h1>Search Results for “${query}”</h1>
      <section id="movie-results" data-type="movie">
        <h3>Movies</h3>
        <div class="grid-container">
          ${renderGridItems(movie)}        
        </div>
      </section>
      <section id="tv-results" data-type="tv">
        <h3>TV Shows</h3>
        <div class="grid-container">
          ${renderGridItems(tv)}
        </div>
      </section>
      <section id="people-results" data-type="people">
      <h3>People</h3>
        <div class="grid-container">
        ${renderProfile(people)}  
        </div>
      </section>
      <div class="modal-overlay"></div>
      <div id="info-modal" class="modal">
          <div class="modal-content">
            <div id="modal-details">
              <!-- Dynamic content will be injected here -->
            </div>
          </div>
      </div> 
    </div>
  `;
}

function renderProfile(items) {
  return items
    .map(item => {
      const name = item.name || item.original_name;
//    const rating = truncate(item.vote_average, 1);
//    const year = extractYear(item.release_date || item.first_air_date);
      const image = item.profile_path
        ? `${IMAGE_URL}${item.profile_path}`
        : 'https://placehold.co/480x551/383852/ccc?text=No+Image';
      return `
        <div tabindex="0" class="profile-item" data-id="${item.id}" data-media-type="${item.media_type}">
          <span>
            <img src="${image}" alt="${name}">
          </span>
          <div class="profile-item-info">
            <p>${capString(name, 30)}</p>
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
      }
      const response = await fetch(url);
      const data = await response.json();
      return {data, mediaType};
    } catch (error) {
      console.error("Error fetching modal data:", error);
      return null;
    }
}

function convertDate(dateString) {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  return formatter.format(new Date(dateString));
}

function runtime(min) {
	const hour =  Math.floor(min / 60.0);
  min = min - hour * 60.0;
  return `${hour}h${min}m`;
}

async function openModal(event) {
  const gridItem = event.target.closest('.grid-item');
  const id = gridItem.dataset.id; // Get the ID of the item
  const sectionId = gridItem.closest('section')?.id; // Find the parent section's ID
  const mediaType = gridItem.closest('section')?.dataset.type ? gridItem.closest('section')?.dataset.type : sectionId ? sectionMediaType(sectionId) : null;
//  const mediaType = sectionId ? sectionMediaType(sectionId) : null;
  console.log(id,mediaType,sectionId);
  //console.error(id, sectionId, mediaType);
  if (!mediaType || !id) {
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
  const cast = data.credits.cast.map(cast => cast.name).slice(0, 5).join(", ");
  const date = convertDate(  data.release_date || data.first_air_date || data.air_date); 
  const rated = mediaType === "movie" 
    ? data.release_dates?.results?.find((item) => item.iso_3166_1 === "US" || "IN")?.release_dates[0]?.certification
    : data.content_ratings?.results?.find((item) => item.iso_3166_1 === "US" || "IN")?.rating;
  const logo = data.images?.logos?.[0]?.file_path
    ? `<span>
          <div class="modal-info-logo">
            <img src="${IMAGE_URL}${data.images.logos[0].file_path}" alt="Logo">
          </div>
          <div class="modal-info">`
    : `<span>
          <div class="modal-info-backdrop" style="background-image : url(${IMAGE_URL}${data.backdrop_path})"></div>
          <div class="modal-info">
            <h1>${name}</h1>`;
  //window.history.pushState({}, '', `/${mediaType}/${name}`);
  details.innerHTML = `
  <div class="modal-media">
    <div class="modal-cover">
      <img src="${IMAGE_URL}${data.poster_path}" alt="${name}"></img>
    </div>
    ${logo}
        <span class="ratings-genre"><i class="fa-solid fa-star"></i> <p data-title="${data.vote_count} votes">${truncate(data.vote_average, 1)}</p><span class="modal-genre">${data.genres
          .map(genre => `<a href="#">${genre.name}</a>` ).slice(0, 3).join(" ")}
          </span>
        </span>
        <div class="synopsis"><p class="overview">${data.overview || 'No description available.'}</p></div>
        <p>Cast : ${cast}</p>
        <p class="tags">${extractYear(date)} • ${rated !== "" ? `${rated} • `:""} ${data.original_language.toUpperCase()} ${mediaType === "movie" ? `• ${runtime(data.runtime)}</p>` : "</p>"}
        </span>
    </div>
    </span>
  </div>`;
  
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
    isMobile() ? modalContent.style.height = "fit-content" : modalContent.style.height = '30rem';
  } else 
  if (mediaType === "tv") {
    tvContent(data, sno = null, eno = null, ref = "modal");
    isMobile() ? modalContent.style.height = '70%' : modalContent.style.height = '30rem' ;
  }

  const shareData = {
    text: `${name}`,
    url: `https://pixelstream.vercel.app/watch/${mediaType}/${id}/${name}`,
  };
  
  const btn = document.querySelector(".share");
  
  // Share must be triggered by "user activation"
  btn?.addEventListener("click", async () => {
    try {
      await navigator.share(shareData);
    } catch (err) {
      console.log(`Error: ${err}`);
    }
  });
  

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
                ${season.name}
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

    cappedOverview();

    } catch (error) {
      console.error('Error fetching season details:', error);
    }
    if (ref != "modal") {
      document.getElementById('episode-container').classList.add('player-styling');
      document.querySelector('.now-playing > h4').innerHTML = `S${sno}:E${eno} ${seasonData.episodes.map(episode => episode.name)[eno - 1]}`;
    };

    scrollEpisodeIntoView(eno);
  };

  const seasonDropdown = document.getElementById('season-dropdown');
  seasonDropdown.removeEventListener('change', displaySeasonInfo);
  seasonDropdown.addEventListener('change', displaySeasonInfo);
  seasonDropdown.dispatchEvent(new Event('change'));

}

async function cappedOverview() {
  const container = document.querySelectorAll('.synopsis');
  container.forEach(container => {
    const text = container.querySelector('.overview');

    // Check if the text content overflows
    const isOverflowing = text.scrollHeight -10 > text.offsetHeight;
    if (isOverflowing) {
        text.style.maskImage = "linear-gradient(to bottom, black, black 70%, transparent 98%)";
        text.style.paddingBottom = "0.2rem";
    }

    // Toggle expansion and collapse
    text.addEventListener('click', () => {
        if (container.classList.contains('expanded')) {
            container.classList.remove('expanded');
        } else {
            container.classList.add('expanded');
        }
    });
  });
}

function scrollEpisodeIntoView(eno) {
  const episode = document.getElementById(eno);

  if (!episode) {
    //console.error(`Element with id "${eno}" not found.`);
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
  const episodeWidth = isMobile() ? 8.6 * 16 : 15 * 16; // Mobile: 9.6rem, PC: 15rem
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

  scrollContainer.addEventListener('scroll', () => {
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

document.addEventListener("click", (event) => {
  if (event.target.classList.contains("watch-btn")) {
    const id = event.target.dataset.id;
    const name = event.target.dataset.name;
    const mediaType = "movie";

   // loadWatchPage(mediaType, name, id);
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
    //const tvData = { season, episode, epname };

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
  const title = `${mediaType === "movie" ? name : `S${season}:E${episode} ${name}`}`;
  const info = `<h2>${name}</h2> ${mediaType === "movie" ? ""
             : `<h4>S${season}:E${episode} ${tvData?.epname}</h4>`
              }`;

  const watchPage = document.querySelector("main");
  let source = 1;

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
  

  const iframeFullscreen = document.querySelector(".iframefullscreen");
  const iframeExit = document.querySelector(".iframe-exit");
  const iframeElement = document.querySelector(".iframe-container");


  iframeFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        if (iframeElement.requestFullscreen) {
            iframeElement.requestFullscreen();
        } else if (iframeElement.webkitRequestFullscreen) { // Safari
            iframeElement.webkitRequestFullscreen();
        } else if (iframeElement.msRequestFullscreen) { // Older Microsoft browsers
            iframeElement.msRequestFullscreen();
        }
        iframeExit.style.display = "block";
    }
  });

    // Exit fullscreen for the iframe
  iframeExit.addEventListener('click', () => {
      if (document.exitFullscreen) {
          document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { // Safari
          document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { // Older Microsoft browsers
          document.msExitFullscreen();
      }
      iframeExit.style.display = "none"; // Hide exit button
  });

  // Handle fullscreen change events
  document.addEventListener('fullscreenchange', () => {
      // Check if iframe is no longer in fullscreen
      if (!document.fullscreenElement) {
          iframeExit.style.display = "none";
          setTimeout(() => {
            iframeExit.classList.remove('hidden');
          }, 3000);
      }
      else {
        setTimeout(() => {
          iframeExit.classList.add('hidden');
        }, 3000);

        // Assuming same-origin iframe
        const iframe = document.querySelector('iframe');

        // Detect fullscreen changes on the iframe
        iframe.addEventListener('fullscreenchange', () => {
            console.log('Iframe fullscreen state changed');
        });

        // Add event listeners to the iframe's content (same-origin only)
        iframe.contentWindow.addEventListener('keydown', (event) => {
            console.log(`Key pressed in iframe: ${event.key}`);
        });

        iframe.contentDocument.addEventListener('mousemove', () => {
            console.log('Mouse moved inside iframe');
        });
      }
  });

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

}

function showIframe(iframe) {
  iframe.style.display = "block";
  document.querySelector(".loading").style.display = "none";

}

function goBack() {
  window.history.back();
}


// Listen to popstate events for navigation



// header animation
let lastScrollY = window.scrollY;
let isScrollingDown = false;
let hideTimeout;

window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  //const nav = document.querySelector("nav > ul");
  //const input = document.getElementById('search-input');
  
  if (window.scrollY > lastScrollY) {
    // Scrolling down
    if (!isScrollingDown) {
      isScrollingDown = true;
     // header.style.height = "2.8rem";
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
      header.classList.add('hidden');
      }, 500); // 200ms delay before hiding
    }
  } else {
    // Scrolling up
    isScrollingDown = false;
   // header.style.height = "3.6rem";
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

  if (event.target.closest('.grid-item')) {
      openModal(event); 
  } else if (!event.target.closest('.grid-item') && modal !== null) {
      if (modal.contains(event.target) && !modalContent.contains(event.target)) {
            modal.classList.remove('active');
      }
  }
});
document.addEventListener('keydown', event => {
  const modal = document.getElementById('info-modal');

  if (event.type === 'keydown') {
    if (event.key === 'Escape') {
        modal.classList.remove('active');
    } else if (event.key === 'Enter' && !modal.classList.contains('active')) {
        openModal(event);
    }
  }
});


console.clear = () => {};
const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const OPTIONS = 'include_null_first_air_dates=false&language=en-US&page=1&sort_by=popularity.desc';

// Sections to populate
const sections = {
  'trending-movies': `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&with_release_type=4&page=1`,
  'trending-series': `${BASE_URL}/trending/tv/week?api_key=${API_KEY}`,
};

function loadDiscoverContent(networkId = 213, providerId = 8, mediaType = 'movie') {
  const url = `${BASE_URL}/discover/${mediaType}?api_key=${API_KEY}&with_networks=${networkId}&with_watch_providers=${providerId}&watch_region=US&${OPTIONS}`;
  const sectionId = 'discover-streaming';
  let limit = 14;
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

function capString(str, containerWidth) {
  const lines = str.split('\n'); // split the string into lines
  const wrappedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (wrappedLines.join('\n').length + line.length + 3 > containerWidth) { // 3 is for the ellipsis
      wrappedLines.push(line.substring(0, containerWidth - 3) + '..');
      break;
    }
    wrappedLines.push(line);
  }

  return wrappedLines.join('\n');
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
            <img loading="lazy" src="${image}" alt="${title}">
          </div>
          <div class="grid-item-info">
            <p>${capString(title, 45)}</p>
            <p>${rating}</p>
            <p>${year}</p>
          </div>
        </div>
      `;
    })
    .join('');
}

// Fetch and display data with a customizable limit
async function fetchContent(sectionId, url, limit = 14) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    populateSection(sectionId, data.results.slice(0, limit));
  } catch (error) {
    console.error(`Error fetching data for ${sectionId}:`, error);
  }
}

// Populate a section with content
function populateSection(sectionId, items) {
  const container = document.querySelector(`#${sectionId} .grid-container`);
  container.innerHTML = renderGridItems(items);
}

// Load content for each section
Object.entries(sections).forEach(([sectionId, url]) => {
  fetchContent(sectionId, url);
});

// Handle "show more" and "collapse" for sections
function expandSection(sectionId) {
  const sectionUrl = sections[sectionId];
  fetchContent(sectionId, sectionUrl, 24);

  document.querySelector(`#${sectionId} .show-more`).style.display = 'none';
  document.querySelector(`#${sectionId} .collapse`).style.display = 'block';
}

function collapseSection(sectionId) {
  const sectionUrl = sections[sectionId];
  fetchContent(sectionId, sectionUrl, 12);

  document.querySelector(`#${sectionId} .collapse`).style.display = 'none';
  document.querySelector(`#${sectionId} .show-more`).style.display = 'block';
}

document.addEventListener("DOMContentLoaded", () => {
  loadDiscoverContent(213, 8, 'movie'); // Netflix and Movies as default
});

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

    const movieResults = movie.results.slice(0, 7).map(item => ({ ...item, media_type: 'movie' }));
    const tvResults = tv.results.slice(0, 7).map(item => ({ ...item, media_type: 'tv' }));
    const peopleResults = people.results.slice(0, 7).map(item => ({ ...item, media_type: 'person' }));

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
    <h1>Search Results for "${query}"</h1>
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
    <div id="info-modal" class="modal">
      <div class="modal-content">
        <span class="close-btn" onclick="closeModal()">&times;</span>
        <div id="modal-details"></div>
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
        : 'https://placehold.co/440x551/383852/ccc?text=No+Image';
      return `
        <div tabindex="0" class="profile-item" data-id="${item.id}" data-media-type="${item.media_type}">
          <span>
            <img loading="lazy" src="${image}" alt="${name}">
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
      url = `${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US&append_to_response=videos,credits,images&include_image_language=en`;
    } else if (mediaType === "tv") {
      url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US&append_to_response=credits,images&include_image_language=en`;
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
  const isMobile = window.innerWidth <= 767;
  const modal = document.getElementById('info-modal');
  const modalContent = document.querySelector(".modal-content");
  const details = document.getElementById('modal-details');
  const id = data.id;
  const name = data.name || data.title || data.original_title;
  const cast = data.credits.cast.map(cast => cast.name).slice(0, 5).join(", ");
  const date = convertDate(  data.release_date || data.first_air_date || data.air_date);  
  const logo = data.images?.logos?.[0]?.file_path
    ? `<span>
          <div class="modal-info-logo">
            <img loading="lazy" src="${IMAGE_URL}${data.images.logos[0].file_path}" alt="Logo">
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
      <img loading="lazy" src="${IMAGE_URL}${data.poster_path}" alt="${name}"></img>
    </div>
    ${logo}
        <span class="ratings-genre"><i class="fa-solid fa-star"></i> <p>${truncate(data.vote_average, 1)}</p><span class="modal-genre">${data.genres
          .map(genre => `<a href="#">${genre.name}</a>` ).slice(0, 3).join(" ")}
          </span>
        </span>
        <p>${data.overview || 'No description available.'}</p>
        <p>Cast : ${cast}</p>
        <p>Date : ${date}</p>
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
      </div>
    `);
    isMobile ? modalContent.style.height = "fit-content" : modalContent.style.height = '30rem';
  } else 
  if (mediaType === "tv") {
    tvContent(data, sno = null, eno = null, ref = "modal");
    isMobile ? modalContent.style.height = '70%' : modalContent.style.height = '30rem' ;
  }


  modal.classList.add('active');// = 'top: 0;left: 0;width: 100dvw;height: 100dvh; opacity: 1;';
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
      const seasonData = await response.json();
      episodeContainer.innerHTML = seasonData.episodes
        .map(episode => `
          <div id="${episode.episode_number}" class="episode episode-width" data-name="${data.name}" data-id="${data.id}" data-season="${selectedSeason}" data-episode="${episode.episode_number}">
            <div class="episode-items">
              <img loading="lazy" src="${episode.still_path ? IMAGE_URL + episode.still_path : 'https://placehold.co/500x281?text=No+Image+Available'}" alt="Episode ${episode.episode_number}">
              <div class="episode-info">
                <h3>${episode.episode_number}. ${episode.name}</h3>
                <p>Rated: ${episode.vote_average.toFixed(1)}</p>
                <p>${convertDate(episode.air_date)}</p>
              </div>
              <p>${episode.overview || "No overview available"}</p>
            </div>
          </div>
        `)
        .join("");

    } catch (error) {
      console.error('Error fetching season details:', error);
    }
    ref != "modal"
    ? document.getElementById('episode-container').classList.add('player-styling')
    : console.log(" noice ");

    scrollEpisodeIntoView(eno);
  };

  const seasonDropdown = document.getElementById('season-dropdown');
  seasonDropdown.removeEventListener('change', displaySeasonInfo);
  seasonDropdown.addEventListener('change', displaySeasonInfo);
  seasonDropdown.dispatchEvent(new Event('change'));
}

function scrollEpisodeIntoView(eno) {
  const episode = document.getElementById(eno);

  if (!episode) {
    console.error(`Element with id "${eno}" not found.`);
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
  const isMobile = window.innerWidth <= 768; // Define your breakpoint
  const episodeWidth = isMobile ? 9.6 * 16 : 15 * 16; // Mobile: 9.6rem, PC: 15rem
  const gapWidth = 0.8 * 16;   // Mobile: 0.6rem, PC: 0.8rem
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
}



document.addEventListener("click", (event) => {
  if (event.target.classList.contains("watch-btn")) {
    const id = event.target.dataset.id;
    const name = event.target.dataset.name;
    const mediaType = "movie";
    const season = episode = null;

    //window.location.href = `watch/${mediaType}/${id}/${name}`;
    loadWatchPage(mediaType, name, id, season, episode);
  }

  if (event.target.closest(".episode img")) {
    const episodeElement = event.target.closest(".episode");
    const name = episodeElement.dataset.name;
    const id = episodeElement.dataset.id;
    const season = episodeElement.dataset.season;
    const episode = episodeElement.dataset.episode;
    const mediaType = "tv";
    const info = `${mediaType === "movie" ? name : `S${season}:E${episode} ${name}`}`;

    //window.location.href = `watch/${mediaType}/${id}/${name}${season && episode ? `/${season}/${episode}` : ''}`;
    if (document.getElementById('episode-container').classList.contains('player-styling')) {    
      loadSources(source = 1, mediaType, id, season, episode);
      document.querySelector("title").innerHTML = info;
      info !== null ? document.querySelector(".now-playing").innerHTML = info : null;
    }
    else {
      loadWatchPage(mediaType, name, id, season, episode);
    }

  }
});

function loadWatchPage(mediaType, name = null, id, season = null, episode = null) {
  const info = `${mediaType === "movie" ? name : `S${season}:E${episode} ${name}`}`;
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
              <button class="provider-change">Provider</button>
              <div class="providers">
                <p data-source="1">Vidlink</p>
                <p data-source="2">Embed.su</p>
                <p data-source="3">Vidsrc</p>
                <p data-source="4">Multiembed</p>
                <p data-source="5">Superstream</p>
              </div>
            </div>
            <div class="media-download">
              <button class="download">Download</button>
              <div class="get-dwnload">
              </div>
            </div>
          </div>
        </div>
      </div>
      <h2 class="now-playing"></h2>
      <div class="player-episodes">
      </div>
    </div>
  `;
  document.querySelector("title").innerHTML = info;
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

  // Add event listeners to dropdown items
  const sourceItems = document.querySelectorAll('.providers p');
  sourceItems.forEach(item => {
    item.addEventListener('click', () => {
      const selectedSource = parseInt(item.getAttribute('data-source'), 10); // Ensure source is an integer
      if (selectedSource && selectedSource !== source) {
        source = selectedSource; // Update the source
        loadSources(source, mediaType, id, season, episode);
      }
    });
  });
  
  //window.history.pushState({}, '', `/watch/${mediaType}/${id}/${name}${season && episode ? `/${season}/${episode}` : ''}`);
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
      src = `https://multiembed.mov/?video_id=${id}&tmdb=1${season && episode ? `&s=${season}&p=${episode}` : ''}`;
      break;
    case 5:
      src = `https://vidbinge.dev/embed/${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`;
      break;
    default:
      console.error("Invalid source selected");
      return;
  }

  const loadIframe = `
          <iframe
          src="${src}"
          referrerpolicy="origin"
          frameborder="0"
          scrolling="no"
          allowfullscreen
          style="display: none;"
          onload="showIframe(this)"
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
window.addEventListener("popstate", (event) => {
  if (event.state?.page === "watch") {
    loadWatchPage(event.state.id);
  } else {
    loadHomePage(); // Custom function to load home page
  }
});


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
 function closeModal() {
  document.getElementById('info-modal').classList.remove('active');
  //.style.display = 'none';
  //window.history.pushState({}, '', `/`);
  //window.history.back();
}

document.addEventListener('click', modalEvent);
document.addEventListener('keydown', modalEvent);

function modalEvent(event) {
    const modal = document.getElementById('info-modal');
    const modalContent = document.querySelector('.modal-content');

    if (event.type === 'click') {
        if (event.target.closest('.grid-item')) {
            openModal(event); 
        } else if (modal.contains(event.target) && !modalContent.contains(event.target)) {
            modal.classList.remove('active');
        }
    } else if (event.type === 'keydown') {
        if (event.key === 'Escape') {
            modal.classList.remove('active');
        } else if (event.key === 'Enter' && !modal.classList.contains('active')) {
            openModal(event);
        }
    }
}

console.clear = () => {};
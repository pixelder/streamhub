const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const OPTIONS = 'include_adult=false&include_null_first_air_dates=false&language=en-US';


let isMobile = window.innerWidth <= 768;
let isLoading = false;
let isBrowsing = false;

let pageNumbers = {}; // Track the current page number for each section
let storedData = {}; // Store data for each section for persistent pagination
let isFetching = {}; // Track fetching state per section to avoid multiple fetches


/* params */
let selectedGenres = []
let excludedGenres = []
let currentPage = 1
let sortMode = ''
let minVoteCount = 60
let currentYear = null
let selectedCountry = 'US';
let selectedLanguage = 'en';
/* params */

function loadSections() {

  const sections = {
    'trending-movies': `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`,
    'trending-series': `${BASE_URL}/trending/tv/week?api_key=${API_KEY}`,
    'discover-streaming': ``,
  };
  
  Object.entries(sections).forEach(([sectionId, url]) => {
    if ( document.getElementById([sectionId]) && sectionId !== 'discover-streaming' ) {
      fetchContent(sectionId, url);
    } else {
      loadDiscoverContent( 213, 8, 'movie', 'discover-streaming');
    }
  });
}

async function loadDiscoverContent(networkId, providerId, mediaType, sectionId) {

  const params = new URLSearchParams({
    with_genres: selectedGenres.join(','),
    without_genres: excludedGenres.join(','),
    page: currentPage,
    sort_by: sortMode,
    primary_release_year: currentYear,
    first_air_date: currentYear,
    with_origin_country: selectedCountry,
    with_original_language: selectedLanguage,
    'vote_count.gte': minVoteCount
  });

  if (document.getElementById(sectionId)) {
    const url = `${BASE_URL}/discover/${mediaType}?api_key=${API_KEY}&${params}&with_networks=${networkId}&with_watch_providers=${providerId}&watch_region=US&${OPTIONS}`;
    console.log(url);
    storedData[sectionId] = [];
    pageNumbers[sectionId] = 1;
    console.log(mediaType, isBrowsing);
    fetchContent(sectionId, url);
  }
}

async function fetchContent(sectionId, url) {
  const limit = ( isMobile || isBrowsing) ? 20 : 14; // Set limit based on device size
  //const limit = 20;
  if (!pageNumbers[sectionId]) pageNumbers[sectionId] = 1; // Initialize page number if not set
  if (!isFetching[sectionId]) isFetching[sectionId] = false; // Initialize fetching state

  // Prevent multiple fetch requests while one is ongoing
  if (isFetching[sectionId]) return;
  
  try {
    isFetching[sectionId] = true; // Set fetching flag to true

    // Modify the URL to include the correct page number
    const pageUrl = `${url}${ !isBrowsing ? `&page=${pageNumbers[sectionId]}` : ''}`;
    const response = await fetch(pageUrl);
    const data = await response.json();
    const media_type = url.includes('/movie') ? 'movie' : 'tv';
    console.log(pageUrl, media_type, data);
    
    storedData[sectionId] = data.results; // Reset stored data for a new page
    storedData[sectionId].forEach(res => res.media_type = media_type);

    const accumulatedResults = storedData[sectionId].slice(0, limit);

    populateSection(sectionId, accumulatedResults);
    setupPagination(sectionId, url);
  } catch (error) {
    console.error(`Error fetching data for ${sectionId}:`, error);
  } finally {
    isFetching[sectionId] = false;
  }
}

function setupPagination(sectionId, url) {
  const prevButton = document.querySelector(`#${sectionId} .prev-page`);
  const nextButton = document.querySelector(`#${sectionId} .next-page`);

  // Remove previous event listeners to avoid duplication
  prevButton?.replaceWith(prevButton.cloneNode(true)); // Reset the "previous" button
  nextButton?.replaceWith(nextButton.cloneNode(true)); // Reset the "next" button

  const updatedPrevButton = document.querySelector(`#${sectionId} .prev-page`);
  const updatedNextButton = document.querySelector(`#${sectionId} .next-page`);

  // Previous page button functionality
  updatedPrevButton?.addEventListener('click', () => {
    if (pageNumbers[sectionId] > 1) {
      pageNumbers[sectionId]--; // Decrement the page number
      fetchContent(sectionId, url); // Fetch the previous page
    }
  });

  // Next page button functionality
  updatedNextButton?.addEventListener('click', () => {
    pageNumbers[sectionId]++; // Increment the page number
    fetchContent(sectionId, url); // Fetch the next page
  });
}

function populateSection(sectionId, items) {
  const container = document.querySelector(`#${sectionId} .grid-container`);
  if (isBrowsing) {
    container.innerHTML += renderGridItems(items);
  } else {
    container.innerHTML = renderGridItems(items);
  }
}

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
            <div class="grid-actions">
              <div class="grid-options">
                <div class="options-buttons">
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

loadSections();

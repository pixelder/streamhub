const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const IMAGE_ORG = 'https://image.tmdb.org/t/p/original'
const OPTIONS = 'include_adult=false&include_null_first_air_dates=false&language=en-US';

let isLoading = false;
let isBrowsing = false;
let contWatching = false;
let pageEnd = false;

let pageNumbers = {}; // Track the current page number for each section
let storedData = {}; // Store data for each section for persistent pagination
let isFetching = {}; // Track fetching state per section to avoid multiple fetches

// parameters for discover call
let selectedGenres = []
let excludedGenres = []
let currentPage = 1
let sortMode = 'popularity.desc'
let minVoteCount = 200
let minRate = 5
let currentYear = null
let selectedCountry = ''
let selectedLanguage = ''

function loadSections() {

  const sections = {
    'trending-movies': `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`,
    'trending-series': `${BASE_URL}/trending/tv/week?api_key=${API_KEY}`,
  };
  
  Object.entries(sections).forEach(([sectionId, url]) => {
      fetchContent(sectionId, url);
    });

  discoverStreaming()
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
    'vote_average.gte': minRate,
    'vote_count.gte': minVoteCount,
    with_networks: networkId,
    with_watch_providers: providerId
  });

  if (document.getElementById(sectionId)) {
    const url = `${BASE_URL}/discover/${mediaType}?api_key=${API_KEY}&${params}&watch_region=US&${OPTIONS}`;
    storedData[sectionId] = [];
    pageNumbers[sectionId] = 1;
    fetchContent(sectionId, url);
  }
}

function discoverStreaming() {
  loadDiscoverContent( 213, 8, 'movie', 'discover-streaming');

  document.querySelectorAll(".tab-menu .tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelector(".tab-menu .active").classList.remove("active");
      tab.classList.add("active");
      const mediaType = document.querySelector(".media-switch .active").dataset.type;
      const networkId = tab.dataset.network;
      const providerId = tab.dataset.provider;
      minVoteCount = 60
      console.log(mediaType, networkId, providerId);
      loadDiscoverContent(networkId, providerId, mediaType, 'discover-streaming');
    });
  });

  document.querySelectorAll(".media-tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector(".media-tab.active").classList.remove("active");
      button.classList.add("active");
      const mediaType = button.dataset.type;
      const networkId = document.querySelector(".tab-menu .active").dataset.network;
      const providerId = document.querySelector(".tab-menu .active").dataset.provider;
      minVoteCount = 60
      console.log(mediaType, networkId, providerId);
      loadDiscoverContent(networkId, providerId, mediaType, 'discover-streaming');
    });
  });
}


async function fetchContent(sectionId, url) {
  const limit = (isMobile() || isBrowsing) ? 20 : 14; // Set limit based on device size
  //const limit = 20;
  if (!pageNumbers[sectionId]) pageNumbers[sectionId] = 1; // Initialize page number if not set
  if (!isFetching[sectionId]) isFetching[sectionId] = false; // Initialize fetching state

  // Prevent multiple fetch requests while one is ongoing
  if (isFetching[sectionId]) return;
  
  try {
    isFetching[sectionId] = true; // fetching for the sectionID

    const pageUrl = `${url}${ !isBrowsing ? `&page=${pageNumbers[sectionId]}` : ''}`;
    const response = await fetch(pageUrl);
    const data = await response.json();
    const media_type = url.includes('/movie') ? 'movie' : 'tv';
    storedData[sectionId] = data.results; // Reset stored data for a new page
    storedData[sectionId].forEach(res => res.media_type = media_type);
    
    currentPage = data.page;

    const accumulatedResults = storedData[sectionId].slice(0, limit);

    populateSection(sectionId, accumulatedResults);
    addPaginationButtons(sectionId, url);

  } catch (error) {
    console.error(`Error fetching data for ${sectionId}:`, error);
  } finally {
    isFetching[sectionId] = false; // Done Fetching for sectionId
  }
}

function addPaginationButtons(sectionId, url) {
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

document.addEventListener('DOMContentLoaded', () => {

  function handleRouting() {
    const path = window.location.pathname;
    if (path === '/movie') {
      loadExplorePage('movie');
      footerHTML();
      setActiveIcon('movie')
    } else if (path === '/tv') {
      loadExplorePage('tv');
      footerHTML();
      setActiveIcon('tv')
    } else if (path === '' || path === '/') {
      window.onload = function() {
        footerHTML();
        setActiveIcon('home')
        loadSections()
        loadUserContent('continue-watching','watching');
        fixLog()
        loc();
      }
    }
  }
  handleRouting();

  window.addEventListener('popstate', handleRouting);
});


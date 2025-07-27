const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_300 = 'https://image.tmdb.org/t/p/w300';
const IMAGE_342 = 'https://image.tmdb.org/t/p/w342';
const IMAGE_500 = 'https://image.tmdb.org/t/p/w500';
const IMAGE_ORG = 'https://image.tmdb.org/t/p/original';
const OPTIONS = 'include_adult=false&include_null_first_air_dates=false&language=en-US';

let isLoading = false;
let isBrowsing = false;
let sectionFetching = false
let contWatching = false;
let pageEnd = false;

let isFetching = {}; // Track fetching state per section
let lastUrl = '';

// parameters for discover call
let selectedGenres = []
let excludedGenres = []
let currentPage = 1
let selectedCast = []
let selectedCompany = []
let sortMode = 'popularity'
let sortOrder = 'desc'
let minVoteCount = 200
let minRate = 5
let currentYear = null
let selectedCountry = ''
let selectedLanguage = ''
let watchRegion = 'US';
let selectedNetworks = []
let selectedProviders = []

const sectionURLs = {
  'trending-movies': `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`,
  'trending-series': `${BASE_URL}/trending/tv/week?api_key=${API_KEY}`,
};

function loadSections() {
  
  Object.entries(sectionURLs).forEach(([sectionId, url]) => {
    fetchContent(sectionId, url).then(() => {
      document.querySelectorAll(`#${sectionId} .grid-container`)
        .forEach(container => {
          enableHorizontalWheelScroll(container,5)
          setupScrollEdgeMask(container)
      })
    })
  });

  setTimeout(() => {
    whenInView('#discover-streaming', () => {
      discoverStreaming()
    })
  }, 400);
}

async function loadDiscoverContent( mediaType, sectionId) {
  const section = document.getElementById(sectionId)
  const params = new URLSearchParams()

  const queryParameters = {
    with_genres: selectedGenres.join(','),
    without_genres: excludedGenres.join(','),
    page: currentPage,
    sort_by: `${sortMode}.${sortOrder}`,
    primary_release_year: currentYear,
    first_air_date_year: currentYear,
    with_cast: selectedCast,
    with_people: selectedCast,
    with_companies: selectedCompany,
    with_origin_country: selectedCountry,
    with_original_language: selectedLanguage,
    'vote_average.gte': minRate,
    'vote_count.gte': minVoteCount,
    with_networks: selectedNetworks.join(','),
    with_watch_providers: selectedProviders.join(','),
    watch_region: watchRegion
  };

  for (const [key, value] of Object.entries(queryParameters)) {
    if (
      value !== '' &&
      value !== null &&
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0)
    ) {
      params.append(key, value);
    }
  }
  
  if (section) {
    const url = `${BASE_URL}/discover/${mediaType}?api_key=${API_KEY}&watch_region=${watchRegion}&${params}&${OPTIONS}`;
    fetchContent(sectionId, url);
  }
}

function discoverStreaming() {
  const sectionId = 'discover-streaming';
  const container = document.querySelector(`#${sectionId} .grid-container`);
  if (!container) return;
 
  selectedNetworks = [213]
  selectedProviders = [8]

  loadDiscoverContent('movie', sectionId);

  enableHorizontalWheelScroll(container, 5);
  setupScrollEdgeMask(container);

  const getActiveTab = () => document.querySelector(".tab-menu .tab.active");
  const getActiveMedia = () => document.querySelector(".media-switch #media-toggle").checked ? 'movie': 'tv';

  const updateContent = () => {
    const expanded = container.closest('section').classList.contains('expanded');
    if (expanded) container.scrollTo({ top: 0 })
    else container.scrollTo({ left: 0 });
    currentPage = 1;
    pageEnd = false;
    minVoteCount = 60;

    const mediaType = getActiveMedia();
    const { network, provider } = getActiveTab()?.dataset || {};
    selectedNetworks = [network];
    selectedProviders = [provider];

    loadDiscoverContent( mediaType, sectionId);
  };

  document.querySelectorAll(".tab-menu .tab").forEach(tab => {
    tab.addEventListener("click", () => {
      if (tab.classList.contains('active')) return
      const activeTab = getActiveTab();
      activeTab.classList.remove("active");
      tab.classList.add("active");
      updateContent();
    });
  });

  document.querySelector(".media-switch").addEventListener("click", () => {
    updateContent();
  });
}


async function fetchContent(sectionId, url) {
  if (!isFetching[sectionId]) isFetching[sectionId] = false; // Initialize fetching state

  if (isFetching[sectionId]) return;  // Prevent multiple fetch requests while one is ongoing
  // if (url === lastUrl) return
  // lastUrl = url

  try {
    isFetching[sectionId] = true; // fetching for the sectionID
    console.log(`fetching page `, currentPage, sectionId)
    const response = await fetch(url)//pageUrl);
    const data = await response.json();
    const media_type = url.includes('/movie') ? 'movie' : 'tv';
    data.results.forEach(res => res.media_type = media_type )
    currentPage = data.page;

    populateSection(sectionId, data.results);

  } catch (error) {
    console.error(`Error fetching data for ${sectionId}:`, error);
  } finally {
    isFetching[sectionId] = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {

  async function loadHomePage() {
    loadUserContent('continue-watching','watching');
    loadSections()
    setUpExpandableSection()
    setActiveIcon('home')
  }

  function handleRouting() {
    const path = window.location.pathname;
    const searchPath = window.location.search
    const params = {}
  
    if (searchPath.length) {
      const URLPARAMS = new URLSearchParams(searchPath)
      for (let [key, value] of URLPARAMS.entries()) {
        params[key] = value
      }
    }
    if (path === '/' || path === '') {
      loadHomePage()
    }
    if (path === '/movie' || path === '/tv') {
      params.mediaType = path.replace('/', '')
      openModal(params)
      loadHomePage()
    } 
    if (path.includes('explore')) return
  }
  topNavBar()
  bottomNavBar();
  setUpScrollEvents()
  fixLog()
  loc();
  handleRouting();

  window.addEventListener('popstate', handleRouting);
});


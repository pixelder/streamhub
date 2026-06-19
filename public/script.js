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
    const url = `${BASE_URL}/discover/${mediaType}?api_key=${API_KEY}&${params}&${OPTIONS}`;
    fetchContent(sectionId, url);
  }
}

function discoverStreaming() {
  const sectionId = 'discover-streaming';
  const container = document.querySelector(`#${sectionId} .grid-container`);
  if (!container) return;
 
  selectedNetworks = [213]
  selectedProviders = [8]

  const media_toggle = document.querySelector("#media-toggle");
  const getActiveMedia = () => media_toggle.checked ? 'tv': 'movie';
  const getActiveTab = () => document.querySelector(".tab-menu .tab.active");

  const updateContent = () => {
    container.classList.add('loading')
    container.innerHTML = `
      <div class="filler flex-col">
        <div class="message">
          <div style="height: 100%; aspect-ratio: 1 / 1; 
            mask: url(/assets/icons/bars-rotate-fade.svg) no-repeat center; background: var(--font-color3);">
          </div>
          <h4>Loading...</h4>
        </div>
      </div>
    `
    container.scrollTo({ top: 0 });
    container.scrollTo({ left: 0 });
    currentPage = 1;
    pageEnd = false;
    minVoteCount = 60;

    const mediaType = getActiveMedia();
    const { network, provider } = getActiveTab()?.dataset || {};
    selectedNetworks = [network];
    selectedProviders = [provider];

    loadDiscoverContent( mediaType, sectionId);
  };

  media_toggle.addEventListener("change", () => {
    updateContent();
  });

  document.querySelectorAll(".tab-menu .tab").forEach(tab => {
    tab.addEventListener("click", () => {
      if (tab.classList.contains('active')) return
      const activeTab = getActiveTab();
      activeTab.classList.remove("active");
      tab.classList.add("active");
      updateContent();
    });
  });

  media_toggle.checked = false;
  loadDiscoverContent('movie', sectionId);
  enableHorizontalWheelScroll(container, 5);
  setupScrollEdgeMask(container);
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

    await checkEndofResults(url);
    populateSection(sectionId, data.results);

  } catch (error) {
    console.error(`Error fetching data for ${sectionId}:`, error);
  } finally {
    isFetching[sectionId] = false;
  }
}

async function checkEndofResults (url) {
  const URL = url.replace(/(page=)(\d+)/, (_, prefix, num) => `${prefix}${parseInt(num) + 1}`)
  const response = await fetch(URL);
  const data = await response.json();
  if (!data.results.length) {
    pageEnd = true
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.scrollTo(0,0)

  async function loadHomePage() {
    loadUserContent('continue-watching','watching');
    loadSections();
    setUpExpandableSection();
    setActiveIcon('home');
    (async () => {
      const seed = Math.floor(Date.now() / (1000 * 60 * 60)); // changes hourly
      const data = await getCarouselData(seed);
      const enriched = await enrichWithLogos(data)
      renderCarousel(enriched);
      cappedOverview();
    })();
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
    if (path === '/movie' || path === '/tv' || path === '/person') {
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


async function getCarouselData(seed = Date.now()) {
  const URL = BASE_URL + '/trending/all/week?api_key=' + API_KEY
  const data = await Promise.all(
    nthNaturalArray(1).map(async (page) => {
    const data = await fetchFromURL(URL + '&page=' + page)
    return data.results
  }))

  let items = data.flat()
    .filter(item => item.backdrop_path) // critical
    .filter(item => {
      const releaseDate = new ReleaseDate(item.release_date || item.first_air_date)
      if (!releaseDate?.isUpcoming()) return item
    })
    .slice(0, 10)
    .sort((a, b) => b.popularity - a.popularity)
  ;
  items = shuffleWithSeed(items, mulberry32(seed));
  return items;
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr
}

async function getLogo(type, id) {
  try {
    const url = `${BASE_URL}/${type}/${id}/images?api_key=${API_KEY}`;
    const data = await fetchFromURL(url);

    const logo = data.logos?.find(l => l.iso_639_1 === 'en') || data.logos?.[0];

    if (!logo) return null;

    return `${IMAGE_500}${logo.file_path}`;
  } catch (e) {
    return null;
  }
}

async function enrichWithLogos(items) {
  const promises = items.map(async item => {
    const logo = await getLogo(item.media_type, item.id);
    return {
      ...item,
      logo
    };
  });

  return Promise.all(promises);
}

function buildSlides(container, item, i) {
  const slide = document.createElement('div')
  slide.className = `slide ${i === 0 ? "active" : ""}`;
  slide.dataset.index = i;
  const title = item.title || item.name;
  const mediaType = item.media_type;
  const bookmark = logExists('bookmarks', item.id, mediaType);

  slide.innerHTML = 
     `<img class="slide-backdrop" src="${IMAGE_ORG}${item.backdrop_path}" />            
      <div class="overlay"></div>
      <div class="content">
        ${item.logo
            ? ` <div class="logo-container">
                  <img class="logo" src="${item.logo}" />
                </div>`
            : `<h1>${title}</h1>`
        }
        <div class="synopsis">
          <p class="overview">${item.overview || "No description available"}</p>
        </div>
        <div class="buttons" data-type="${mediaType}" data-id="${item.id}" data-name="${title}">
          <button class="play">
            <i class="fa-solid fa-play"></i> Play
          </button>
          <button class="detail">
            <i class="fa-solid fa-square-arrow-up-right"></i> Details
          </button>
          <label tabindex="0" for="bookmarkbox" class="selectable active bookmark" title="bookmark" data-id="${item.id}" data-media-type="${mediaType}">
            <input type="checkbox" id="bookmarkbox" ${bookmark ? 'checked' : ''}>
            <span class="checkbox-button">
              <i class="options-icon fa-regular fa-bookmark active"></i>
              <i class="options-x-icon fa-solid fa-bookmark passive"></i>
            </span>
          </label>
        </div>
      </div>
    `;
  container.append(slide)
}


function renderCarousel(items) {
  const container = document.getElementById("hero-carousel");
  
  container.innerHTML = `
    <div class="carousel">
      <div class="slides"></div>
      <div class="controls">
        <button id="prev"><i class="fa-solid fa-angle-left"></i></button>
        <div class="dots">
        </div>
        <button id="next"><i class="fa-solid fa-angle-right"></i></button>
      </div>
    </div>
  `;

  const slide_container = document.querySelector('.slides')
  items.map(async (item, i) => { 
    buildSlides(slide_container, item, i)
  })
  const dots = document.querySelector('.dots')
  dots.innerHTML = ` ${items.map((_, i) => `
    <span class="dot ${i === 0 ? "active" : ""}" data-index="${i}">
      <div class="dot-fill"></div>
    </span>
  `).join("")} `
  
  initCarousel();
}

function initCarousel() {
  const carousel = document.querySelector('.carousel');
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");

  const time = 5000;

  let index = 0;
  let timer = null;
  
  function showSlide(i) {
    slides.forEach(s => s.classList.remove("active"));
    dots.forEach(d => {
      d.classList.remove("active");
      const fill = d.querySelector(".dot-fill");
      if (!fill) return;
      fill.style.animation = "none";
      fill.offsetHeight; // force reflow
      fill.style.animation = null;
    });

    slides[i].classList.add("active");
    dots[i].classList.add("active");

    index = i;

    restartTimer();
  }

  function next() {
    showSlide((index + 1) % slides.length);
  }

  function prev() {
    showSlide((index - 1 + slides.length) % slides.length);
  }

  function startTimer() {
    timer = setTimeout(next, time);
  }

  function stopTimer() {
    clearTimeout(timer);
  }

  function restartTimer() {
    stopTimer();
    startTimer();
  }

  // Controls
  document.getElementById("next").onclick = next;
  document.getElementById("prev").onclick = prev;

  // Click delegation
  carouselEvents(carousel)

  // 🚀 Init
  showSlide(0); // handles timer start automatically
}

function carouselEvents(carousel) {
    carousel.addEventListener("click", (e) => {
    const dot = e.target.closest('.dot');
    const play = e.target.closest('.play');
    const detail = e.target.closest('.detail');
    const bmark = e.target.closest('.bookmark');

    if (bmark) {
      const { mediaType, id, sno, eno, index } = bmark.dataset;
      e.preventDefault()
      const manageBookmark = (mediaType, id) => {
        document.querySelectorAll('.grid-item').forEach(item => {
          if (item.dataset.id === id && item.dataset.mediaType === mediaType) {
            try {
              item.querySelector('.grid-options').classList.toggle('open')
            } catch (e) {
              console.error(e.message)
            }
          }
        })
      }
      const checkbox = bmark.querySelector("input[type='checkbox']")
      checkbox.checked = !checkbox.checked
      toggleBookmark('bookmarks', id, mediaType, sno, eno, index);
      manageBookmark(mediaType, id);
      console.log('toggling bookmark');
      e.stopPropagation()
    }

    if (play || detail) {
      const sanitizedData = Object.fromEntries(
        Object.entries(e.target.closest('.buttons').dataset).map(([key, data]) => [
          key, escapeHTML(data)
        ])
      );

      const { id, type } = sanitizedData;

      if (play) window.location.href = `/watch/${type}/${id}${type === 'tv' ? `/1/1` : ''}`;
      if (detail) openModal({ id, mediaType: type });

      e.stopPropagation();
      return;
    }

    if (dot) {
      showSlide(Number(dot.dataset.index));
      e.stopPropagation();
    }
  });
}
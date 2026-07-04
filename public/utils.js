const blacklist = { movie:[11845], tv:[], person:[] }

function truncate(num, precision) {
  return Math.floor(num * Math.pow(10, precision)) / Math.pow(10, precision);
}

function extractYear(dateString) {
  if (!dateString) return null
  const date = new Date(dateString);
  return date.getFullYear();
}

function capString(str, maxChars) {
  const chars = [...str];
  if (chars.length > maxChars) {
    return chars.slice(0, maxChars - 3).join('') + '...';
  }
  return str;
}


function capFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
  if (!dateString) return null
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  return formatter.format(new Date(dateString));
}

function convertDateFormat(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
}

function runtime(min, type = 'short') {
  const hour = Math.floor(min / 60.0);
  // Using Math.floor to ensure minutes are whole numbers before padding
  const minute = Math.floor(min - hour * 60.0);
  
  // Format to HH and MM strings with leading zeros
  const mm = String(minute).padStart(2, '0');
  
   if (type === 'long') return (hour !== 0 ? `${hour} hour ` : '') + `${minute} minutes`

  return (hour !== 0 ? `${hour}h` : '') + `${mm}m`;
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
function populateSection(sectionId, results) {
  const items = results.filter(item => !blacklist[item.media_type].includes(item.id))
  // const deleted = results.length - items.length
  const container = document.querySelector(`#${sectionId} .grid-container`);
  const type = container.classList.contains('vertical-card') ? 'vertical' : null;
  const msg = document.querySelector('.result-message');

  if (msg) msg.classList.remove('empty');

  container.classList.remove('loading');
  if ((!isBrowsing && !sectionFetching) || currentPage === 1) {
    container.innerHTML = '';
  }

  let index = 0; // Track next item to render

  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const target = entry.target;
      obs.unobserve(target);

      index++;
      if (index < items.length) {
        const item = items[index];
        const rendered = renderGridItems(item, type);
        container.appendChild(rendered);
        io.observe(rendered);  // observe the newly added element
      }
    }
  }, {
    root: isBrowsing ? document.body : container,
    rootMargin: '60px 200px',
    threshold: 0.1
  });

  if (items.length > 0) {
    const firstItem = renderGridItems(items[0], type);
    container.appendChild(firstItem);
    io.observe(firstItem); // start observing the first rendered item
  }


  if (pageEnd) {
    if (msg) {
      msg.classList.add('empty');
      msg.querySelector('.text').innerText = `No ${currentPage === 1 ? '' : 'more'} results`;
    }
  }

  if (msg) msg.classList.remove('loading');
  if (isBrowsing || sectionFetching) {
    currentPage++;
  }
}

function getProgressInfo(id, mediaType = 'movie', logData = null) {
  let logs = logData
  if (!logData) logs = getLogData('history');

  const watched = logExists('history', id, mediaType, null, null, 100)
  const LOG = logs && !watched ? logs.filter(log => {
    return Number(log.id) === Number(id) && log.mediaType === 'movie'
  }) : null;
  const progress = watched && mediaType === 'movie' ? 100 : Number(LOG?.sortDateDesc(false)[0]?.progress) || 0;
  return progress
}

function renderGridItems(item, type = null) {
  let logs = getLogData('history');
  const gridItem = document.createElement('div')
  gridItem.className = 'grid-item'
  gridItem.id = 'grid-item';
  Object.assign(gridItem.dataset, { id : item.id,  mediaType : item.media_type});
  gridItem.tabIndex = 0
  gridItem.draggable = true

  const id = item.id;
  const mediaType = item.media_type;
  const bookmark = logExists('bookmarks', id, mediaType);
  const progress = getProgressInfo(id, mediaType, logs)
  const ring = type === 'vertical' ? 1 : null;
  const title = item.title || item.name;
  const rating = truncate(item.vote_average, 1);
  const year = extractYear(item.release_date || item.first_air_date) || 'N/A';
  const releaseDate = new ReleaseDate(item.release_date || item.first_air_date)
  const upcoming = releaseDate?.isUpcoming()
  const image = item.poster_path
    ? `${IMAGE_342 + item.poster_path}`
    : '/assets/images/no-image.png ';

  gridItem.innerHTML =  `
      <div class="img-container">
      <div class="grid-actions bookmarks">
        <div class="grid-options ${bookmark ? 'open' : ''}">
          <div tabindex="0" class="options-buttons">
            <i class="options-icon fa-regular fa-bookmark"></i>
            <i class="options-x-icon fa-solid fa-bookmark"></i>
          </div>
        </div>
      </div>
      <img src="${image}">
      ${watchProgress(progress, ring)}
      ${upcoming ? `<div class="upcoming"><div class="text"></div></div>` : ''}
      </div>
      <div class="grid-item-info">
        <p>${capString(title, 40)}</p>
        <span class="grid-rating">
        <p class="rating">
          ${rating && !upcoming
              ? `<i class="fa-solid fa-star"></i>
                ${rating}`
              : `<img class="nostar" src="/assets/icons/nostar.svg">`
            }
        </p>
        </span>
        <p>${year}</p>
      </div>
  `
  return gridItem
}

function notifyAlert({ msg, type, data, actions, time = 3000 } = {}) {
  if (type === "error") console.error(msg)
  if (!type) console.log(msg)

  let container = document.querySelector('.notifications')
  if (!container) {
    container = document.createElement('div')
    container.classList.add('notifications')
    document.querySelector('main').appendChild(container)
  }

  const el = document.createElement('div');
  el.classList.add('msg');
  const p = document.createElement('p');
  el.appendChild(p);
  p.innerText = msg;

  // --- Safe removal function ---
  let removed = false;
  let timeoutId;

  function removeEl() {
    if (removed) return; // prevent double execution
    removed = true;
    clearTimeout(timeoutId); // cancel scheduled removal
    if (el.parentNode === container) {
      container.removeChild(el);
    }
  }

  if (actions) {
    const msgAction = document.createElement('div')
    msgAction.classList.add('msg-actions')

    actions?.push({ name: "Ignore" })

    actions?.forEach(act => {
      const action = document.createElement('button')
      action.classList.add("action-btn")
      if (act.task === 'remove') action.classList.add("remove")
      action.textContent = act.name
      const { logType, id, mediaType, sno, eno, index } = data || {}
      action.onclick = async (e) => {
        e.stopPropagation(); // prevent triggering el.onclick
        if (act.task === 'remove') {
          removeFromLocalStorage(logType, id, mediaType, sno, eno, index)
            .then(() => {
              notifyAlert({ msg: "Item removed successfully", type: "notification" })
            })
          if (act.reload) {
            console.log(act.reload.id, act.reload.logType)
            loadUserContent(act.reload.id, act.reload.logType)
          }
        }
        removeEl(); // also remove notification on action
      }
      msgAction.appendChild(action)
    })
    el.appendChild(msgAction)
  }

  container.appendChild(el)

  el.onclick = removeEl;
  timeoutId = setTimeout(removeEl, time);
}

function nthNaturalArray(n) {
  if (n < 1) return [];
  return Array.from({ length: n }, (_, i) => i + 1);
}

function popularity(item, type) {
  if (type = 'person') {
    let workPopularity = 1
    if (type.known_for) {
      type.known_for.forEach((known) => (workPopularity += known.popularity))
    }
    return workPopularity * item.popularity
  }
  return item.popularity
}

function activeSearchResults(callback, { selector, minLength, debounce } = {}) {
  const searchBar = document.querySelector(selector);
  if (!searchBar) return;
  let searchWait;

  searchBar.oninput = function () {
    const query = this.value;
    if (query.length < minLength) return;
    clearTimeout(searchWait);
    searchWait = setTimeout(() => {
      callback(query);
    }, debounce);
  };
}

async function fetchSearchResults(term, type, page, count = false) {
  console.log("fetching results")
  let TOTAL_COUNT = 0
  try {
    const searchURL = `${BASE_URL}/search/${type}?`

        const params = new URLSearchParams({
          query: encodeURIComponent(term),
          api_key: API_KEY,
          page: page,
        })
        const url = `${searchURL}${params}`//&include_adult=false&language=en-US`
        const response = await fetch(url)
        const output = await response.json()
        TOTAL_COUNT = Number(output.total_results)
        const data = output.results
    //   }),
    // )
    // const data = responses.flat()
    if (count) return {results: data, count: TOTAL_COUNT} 
    return data
  } catch (e) {
    console.log(e)
  }
}

async function fetchFromURL(url) {
  try {
    const response = await fetch(url)
    const data = await response.json()
    return data
  } catch (e) {
    const msg = `Error fetching from url ${url}: ${e}`
    notifyAlert({msg})
    return null;
  }
}

//fetch Metadata
async function fetchMetaData({mediaType = null, id = null, season = null, credits = null, options = 1}) {

  if (!id || !Number.isFinite(Number(id)) || (!['movie', 'tv', 'person'].includes(mediaType))) return;
     
  try {
    let url;
    const append = `external_ids,videos,credits,images&include_image_language=en`
    if (mediaType === "movie") {
      url = `${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US${options ? `&append_to_response=release_dates,${append}` : ''}`;
    } else if (mediaType === "tv") {
      url = `${BASE_URL}/tv/${id}${season ? `/season/${season}` : ''}?api_key=${API_KEY}&language=en-US${options ? `&append_to_response=content_ratings,${append}` : ''}`;
    } else if (mediaType === "person") {
      url = `${BASE_URL}/person/${id}?api_key=${API_KEY}&language=en-US${options ? `&append_to_response=${credits},external_ids` : ''}`;
    }
    // console.log('fetching metadata', id, mediaType)
    const response = await fetch(url);
    const data = await response.json();
    return { data, mediaType };
  } catch (error) {
    return error;
  }
}

let modalController = null;

function openModal(data, nav = null) {
  if (modalController) modalController.abort();
  modalController = new AbortController();
  const signal = modalController.signal;
  if (signal.aborted) return;

  const id = data?.id;
  const mediaType = data?.mediaType /*  ?? data?.closest('section')?.dataset?.type; */
  const credits = mediaType === 'person' ? 'combined_credits' : null;
  if (data && !mediaType || !id) {
    console.error("Media type or ID not found");
    return;
  }

  ['#top-bar', '#bottom-bar'].forEach(selector => {
    const bar = document.querySelector(selector)
    if (bar.classList.contains('detach')) {
      bar.classList.add('hidden')
    }
  })

  if (!nav) {
    prevData = []
    fwdData = []
  }

  fetchMetaData({mediaType, id, credits})
    .then(({ mediaType, data }) => {
      if (signal.aborted) return;
      designModal(mediaType, data);
    })
    .catch((error) => {
      if (error.name === 'AbortError') return;
      const msg = `Error fetching data for ${mediaType} id:${id}: ${error}`
      console.log(error)
      notifyAlert({msg})
    })
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
        ?.release_dates?.filter(item => item.certification !== '')[0]?.certification ||
      results.find(item => item.iso_3166_1 === DEFAULT_COUNTRY)
        ?.release_dates?.filter(item => item.certification !== '')[0]?.certification ||
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

let isViewingDetails = false

let fwdData = []
let prevData = []

async function designModal(mediaType, data) {
  const modal = document.getElementById('info-modal');
  const modalContent = document.querySelector('.modal-content');
  const details = document.getElementById('modal-details');
  Object.assign(details.dataset,{id: data.id, mediaType})

  modalContent.style.setProperty(
    '--modal-backdrop',
    `url(${data.backdrop_path ? IMAGE_ORG + data.backdrop_path : ''})`
  );
  modalContent.style.setProperty('--modal-backdrop-opacity', 1);

  try {
    mediaType !== 'person'
      ? await buildMediaDetailsHTML(data, mediaType, details)
      : await buildPersonDetailsHTML(data, details);
  } catch (error) {
    console.log(error)
  }

  if (mediaType === 'movie') {
    insertMovieActions(data, mediaType);
    modalContent.style.height = 'fit-content';
  }

  if (mediaType === 'tv') {
    const userData = getLogData('watching')?.find(item => item.id === data.id)?.data;
    const sno = isViewingDetails ? userData?.sno : null;
    const eno = isViewingDetails ? userData?.eno : null;
    modalContent.style.height = !isMobile() ? '35rem' : '70%';

    tvContent(data, sno, eno, 'modal')
      .then((season) => {
        const tvButtons = document.querySelector('.tv-actions');
        tvButtons.innerHTML += setUpModalActions(data, mediaType, season);
      })
      .then(() => isViewingDetails ? scrollEpisodeIntoView(eno) : '')
      .catch((e) => console.log(e))
  }

  if (mediaType === 'person') {
    modalContent.style.height = !isMobile() ? '35rem' : '70%';
    const section = document.querySelectorAll('.credit-section')

    section[0].classList.add('expanded')
    section.forEach(item => {
      item.querySelector('.section-header').addEventListener('click', () => {
        item.classList.toggle('expanded');
      })
    })
  }

  initializeModalListeners(mediaType, data, modalContent, details);

  if (prevData.length || fwdData.length) {
    const modalMedia = document.querySelector('.modal-media')
    const navContainer = document.createElement('div')
    navContainer.className = 'nav-btn-container'
    navContainer.style.cssText = 'width: 100%; flex: 1 0 auto;'

    const prevBtn = document.createElement('button')
    prevBtn.id = 'prev-btn'
    prevBtn.innerHTML = `<i class="fa-solid fa-angle-left"></i><p>Back</p>`
    navContainer.appendChild(prevBtn)

    const fwdBtn = document.createElement('button')
    fwdBtn.id = 'fwd-btn'
    fwdBtn.innerHTML = `<p>Previous</p><i class="fa-solid fa-angle-right"></i>`
    navContainer.appendChild(fwdBtn)

    if (prevData.length) {
      prevBtn.style.opacity = 'unset'
      const {id, mediaType} = prevData.at(-1)
      Object.assign(prevBtn.dataset, {id, mediaType})
    }

    if (fwdData.length) {
      fwdBtn.style.opacity = 'unset'
      const {id, mediaType} = fwdData.at(-1)
      Object.assign(fwdBtn.dataset, {id, mediaType})
    }

    modalMedia.prepend(navContainer)
  }

  modal.setAttribute('active', '')
  // modal.classList.add('active');
  details.focus();
  cappedOverview();
}

function getContentLogoHTML(data) {
  const name = data.name || data.title || data.original_title;
  const logoPath = data.images?.logos?.[0]?.file_path
  return `
    <div class="modal-info-logo flex-row">
      ${logoPath ? `<img src="${IMAGE_342}${logoPath}" alt="Logo">` : ''}
    </div>
    <div class="modal-info flex-col">
      ${!logoPath ? `<h1>${name.toUpperCase()}</h1>` : ''}
  `;
}

async function buildMediaDetailsHTML(data, mediaType, container) {
  const name = data.name || data.title || data.original_title;
  const releaseDate = data.release_date || data.first_air_date || data.air_date || '';
  const formattedDate = convertDate(releaseDate) || null;
  const contentLogoHTML = getContentLogoHTML(data);
  const genresHTML = data.genres
    .slice(0, 5)
    .map(genre => `
      <a href="/explore?type=${mediaType}&genre=${genre.id}" title="Explore ${genre.name} ${mediaType === 'movie' ? 'movies' : 'tv shows'}">
      ${genre.name.toUpperCase()}
      </a>
    `)
    .join(' ');
  const castHTML = data.credits?.cast
    .slice(0, 6)
    .map(cast => `<a href="javascript:void(0)" data-id="${cast.id}" data-media-type="person">${cast.name}</a>`)
    .join(', ');
  const companyHTML = (data.production_companies || [])
    .slice(0, 2)
    .map(item => `<a href="/explore?type=studio&company=${item.id}&title=${item.name}" title="Explore Company Page"> ${item.name}</a>`)
    .join(' • ');

  const { rated } = getCountryCertification(data, mediaType);
  const rating = truncate(data.vote_average, 1)
  let released = true;
  if (releaseInfo(data, mediaType) !== null) released = false;

  const progress = getProgressInfo(data.id, mediaType);
  const timeLeft = data.runtime - Math.floor(data.runtime * Number(progress) / 100);
  const watch_progress = `${runtime(timeLeft, 'long')} remaining`;

  const detailsHTML = `
    <div class="trailer-container"></div>
    <div class="modal-media">
      <!-- <div class="modal-cover">
        <img src="${IMAGE_300 + data.poster_path}" alt="${name}">
      </div> -->
      <span class="flex-col">
        ${contentLogoHTML}
        <span class="ratings-genre">
          <p data-title="${data.vote_count} votes">
          ${rating
            ? `<i class="fa-solid fa-star"></i>
                    ${rating}`
            : `<img class="nostar" src="/assets/icons/nostar.svg">`
          }
          </p>
          <span class="modal-genre">
            ${genresHTML}
          </span>
        </span>
        <div class="synopsis">
          <p class="overview">
            ${data.overview || 'No description available.'}
          </p>
        </div>
        ${castHTML ? `<p class="cast">Cast : ${castHTML} </p>` : `<p><em>No cast information available</em></p>`}
        ${companyHTML ? `<p class="company">${companyHTML}</p>` : ''}
        <div class="tags">${[
          formattedDate ? `<p class="year" data-date="${convertDateFormat(releaseDate)}">${extractYear(formattedDate)}</p>` : null,
          rated ? `<p>${rated}</p>` : null,
          data.original_language ? `<p>${data.original_language?.toUpperCase()}</p>` : null,
          mediaType === 'movie'
            ? data.runtime 
              ? `<p>${runtime(data.runtime)}</p>`
              : null
            : data.number_of_seasons 
              ? `<p>${pluralResolver(data.number_of_seasons, 'season', 's')}</p>`
              : null
          ].filter(Boolean).join(' • ')
        }</div>
      </div>
    </span>
    ${released ? '' : releaseInfo(data, mediaType)}
  </div>
  ${progress !== Number(0)
      ? progress === 100
        ? '<p class="watched-check"><i class="fa-solid fa-check"></i> Watched</p>'
        : `<p class="remaining-time">${watch_progress}</p>`
      : ''
    }
  `;

  container.innerHTML = detailsHTML
}

function tmdbGenderResolver(id) {
  if (id === 0) return `Not specified`
  if (id === 1) return `Female`
  if (id === 2) return `Male`
  if (id === 3) return `Other`
}

async function buildPersonDetailsHTML(data, container) {

  const links = [
    { id: data.id, url: `https://tmdb.org/person/${data.id}`, icon: "tmdb_short.svg", page: "tmdb" },
    { id: data.imdb_id, url: `https://www.imdb.com/name/${data.imdb_id}`, icon: "imdb_short.png", page: "imdb" },
    { id: data.external_ids?.wikidata_id, url: `https://www.wikidata.org/wiki/${data.external_ids?.wikidata_id}`, icon: "Wikidata-logo.svg", page: "wikidata" },
    { id: data.external_ids?.instagram_id, url: `https://instagram.com/${data.external_ids?.instagram_id}`, icon: "Instagram_Glyph_Gradient.svg", page: "instagram" },
    { id: data.external_ids?.twitter_id, url: `https://x.com/${data.external_ids?.twitter_id}`, icon: "twitter.svg", page: "twitter" },
    { id: data.external_ids?.youtube_id, url: `https://www.youtube.com/${data.external_ids?.youtube_id}`, icon: "yt_full.png", page: "youtube" }
  ];

  const detailsHTML = `
    <div class="modal-media" ${isMobile() ? '' : `style="flex-wrap: wrap; flex-direction: unset;"`}>
      ${data.profile_path ? `
        <div class="modal-cover portrait" style="display:flex">
            <img style="opacity:1" src="${IMAGE_300 + data.profile_path}">
        </div>` : ''
      }
      <div id="person-details">
        <h2 class="name">${data.name} ${data.birthday ? `<em>(${extractYear(data.birthday)} - ${data.deathday ? extractYear(data.deathday) : ''})
          </em>` : ''}
        </h2>
        <div class="info">
          <p class="department">Known For: ${data.known_for_department}</p>
          <p class="gender">Gender : ${tmdbGenderResolver(data.gender)}</p>
          <div class="biography synopsis">
            <p class="overview">${data.biography}</p>
          </div>
        </div>
        <div class="item-actions">
          ${links.filter(link => link.id).map(link => `
            <a class="external" title="visit ${link.page} page" href="${link.url}" target="_blank" rel="noopener noreferrer">
              <img src="/assets/icons/${link.icon}">
            </a>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="person-credits">
      <h2>Credits </h2>
      <div class="credit-container" style="all:inherit;">
      </div>
    </div>
    `
    container.innerHTML = detailsHTML
    creditResolver(data)
}

function creditResolver(data) {
  const creditOrder = data.known_for_department === 'Acting' ? ['cast', 'crew'] : ['crew', 'cast'];
  const crewCredits = data.combined_credits.crew
  crewCredits.sort((a, b) => { // put known for on top
    const score = (item) => {
      let s = 0;
      if (item.department === data.known_for_department) s++
      return s
    }
    return score(b) - score(a)
  })

  const departments = [... new Set(crewCredits.map(item => item.department))]

  const sectionHTML = (type) => {
    const section = document.createElement('div')
    section.className = 'credit-section'
    section.innerHTML = `
      <div class="section-header" style="padding-top: unset !important">
        <p class="credit-type">${type === "cast" ? 'Cast' : type}</p>
        <div class="expand-arrow"><i class="fa-solid fa-chevron-left"></i></div>
      </div>
      <div class="grid-container ${type.split(' ').join('-')}">
      </div>
    `
    return section
  }

  const container = document.querySelector('.credit-container')

  creditOrder.forEach(credit => {
    if (credit === 'cast') {
      container.appendChild(sectionHTML(credit))
      populateCreditSection(data, credit)
    }
    if (credit === 'crew') {
      departments.forEach(dep => {
        container.appendChild(sectionHTML(dep))
        populateCreditSection(data, dep)
      })
    }
  })
}

function populateCreditSection(data, type) {
  const container = document.querySelector(`
    .credit-section .grid-container.${CSS.escape(type.split(' ').join('-'))}
  `);
  const credits = type === 'cast'
    ? data.combined_credits.cast
    : data.combined_credits.crew.filter(c => c.department === type);

  // IntersectionObserver callback: when placeholder enters viewport, swap in the real item
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const placeholder = entry.target;
      const { item, profileData } = placeholder._creditData;
      
      // build the actual grid-item
      const gridItem = document.createElement('div');
      gridItem.className = 'grid-item';
      Object.assign(gridItem.dataset, {id: item.id, mediaType: item.media_type})
      gridItem.tabIndex = 0;

      const title = item.title || item.original_title || item.name || item.original_name || 'Title not specified';
      const year = extractYear(item.release_date || item.first_air_date);
      const mediaType = item.media_type === 'tv' ? 'TV' : 'Movie';
      const imgSrc = item.poster_path
        ? IMAGE_300 + item.poster_path
        : profileData.profile_path
          ? IMAGE_300 + profileData.profile_path
          : '/assets/images/no-image.png';

      gridItem.innerHTML = `
        <img src="${imgSrc}">
        <div class="credit-item-info">
          <p class="credit-name">${item.job || item.character || 'N/A'}</p>
          <p class="credit-media-title">${title}${year ? ` (${year})` : ''}</p>
          <p>${mediaType}</p>
        </div>
      `;

      // replace placeholder and stop observing it
      placeholder.replaceWith(gridItem);
      obs.unobserve(placeholder);
    });
  }, {
    root: document.querySelector('#modal-details'),
    rootMargin: '60px', // start loading a bit before it enters
    threshold: 0.1
  });

  // create all placeholders up front, attach data, and observe them
  credits.forEach(item => {
    if (item.adult) return;

    const ph = document.createElement('div');
    ph.className = 'grid-item placeholder';
    // stash the data so we can build later
    ph._creditData = { item, profileData: data };
    container.appendChild(ph);
    io.observe(ph);
  });
}


// use  https://api.themoviedb.org/3/credit/{credit_id} to get appear date of a tv show
// has appearing episode count. very inconsistent

function pluralResolver(count, str, suf) {
  if (count !== 1) return `${count} ${str}${suf}`
  return `${count} ${str}`
}

class ReleaseDate {
  constructor(dateString) {
    this.releaseDate = new Date(dateString);
  }

  isUpcoming() {
    const now = new Date();
    return this.releaseDate > now;
  }

  getCountDown() {
    const now = new Date();
    let diff = this.releaseDate - now;

    if (diff <= 0) return "Released";
    if (diff < 1000 * 60 * 60 * 24) return "Tomorrow";

    const daysTotal = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(daysTotal / 30);
    const days = daysTotal % 30;

    const parts = [];
    if (months > 0) parts.push(`${months}M`);
    if (days > 0 || months > 0) parts.push(`${days}D`);

    return parts.join(' ');
  }

  getFormattedDate(locale = 'en-US', options = { year: 'numeric', month: 'long', day: 'numeric' }) {
    return new Intl.DateTimeFormat(locale, options).format(this.releaseDate);
  }
}

function isFreshRelease(tvData) {
  if (!tvData || !Array.isArray(tvData.seasons)) return false;

  const today = new Date();
  const airedSeasons = tvData.seasons.filter(season => {
    if (season.season_number === 0 || !season.air_date) {
      return false;
    }
    const airDate = new Date(season.air_date);
    return airDate instanceof Date && !isNaN(airDate) && airDate < today;
  });

  return airedSeasons.length === 0;
}

function releaseInfo(data, mediaType) {
  const tvAirDate = data.seasons?.length > 0 ? data.seasons?.sort((a, b) => (new Date(b.air_date) - new Date(a.air_date)))[0].air_date : '';
  let releaseDate = new ReleaseDate(data.release_date || tvAirDate);
  const nextEpisode = new ReleaseDate(data.next_episode_to_air?.air_date)
  const running = releaseDate.isUpcoming() ? false : nextEpisode.isUpcoming() ? true : false;
  releaseDate = running ? nextEpisode : releaseDate;

  if (!releaseDate.isUpcoming()) return null;
  // console.log('upcoming')
  let HTML = ''
  const string = releaseDate.getCountDown() === 'Tomorrow' ? "Tomorrow" : `on ${releaseDate.getFormattedDate()}`
  if (mediaType === 'movie') {
    HTML = `
      <div class="releasing-on">
        <p>Releasing ${string}.</p>
      </div>
    `;
  }

  if (mediaType === 'tv') {
    HTML = `
      <div class="releasing-on">
        <p>${running ? 'Next Episode' : isFreshRelease(data) ? 'Airing' : 'New season'} ${string}.</p>
      </div>
    `;
  }
  // console.log(mediaType, HTML)
  return HTML
}

function insertMovieActions(data, mediaType) {
  const name = data.name || data.title || data.original_title;
  let released = true;
  if (releaseInfo(data, mediaType) !== null) released = false
  const progress = getProgressInfo(data.id, mediaType)
  const watched = progress === 100

  const actionHTML = `
    <div class="modal-actions">
      ${released
      ? `<button class="watch-btn ${watched ? 'watched' : ''}" title="watch movie" data-name="${name}" data-id="${data.id}">
          <i class="fa-solid fa-play"></i>
          ${progress !== Number(0)
            ? watched
              ? 'Rewatch'
              : `Resume
                    <div class="progress-indicator" style="--progress: ${progress};"></div>`
              : 'Watch'
            }
        </button>`
      : ''}
      ${setUpModalActions(data, mediaType)}
      </div>
    </div>
  `;
  // Insert action buttons immediately after the modal-media section.
  const details = document.querySelector('#modal-details');
  if (details) {
    details.innerHTML += actionHTML
  }
}

function setUpModalActions(data, mediaType, season = null) {
  const bookmark = logExists('bookmarks', data.id, mediaType)
  const imdb = data.imdb_id || data.external_ids?.imdb_id
  const name = data.name || data.title || data.original_title;
  const year = extractYear(data.release_date || data.first_air_date)

  const links = [
    { id: data.id, url: `https://tmdb.org/${mediaType}/${data.id}`, icon: "tmdb_short.svg", page: "tmdb" },
    { id: imdb, url: `https://www.imdb.com/title/${imdb}`, icon: "imdb_short.png", page: "imdb" },
  ]
  return `
    <button class="play-trailer" title="play trailer"
      data-media-type="${mediaType}"
      ${season ? `data-sno="${season}"` : ''}
    >
      <i class="fa-solid fa-video"></i>Trailer
    </button>

    <div class="item-actions">
      ${links.filter(link => link.id).map(link => `
        <a class="external" title="visit ${link.page} page" href="${link.url}" target="_blank" rel="noopener noreferrer">
          <img src="/assets/icons/${link.icon}">
        </a>
      `).join('')}
      <label tabindex="0" for="bookmarkbox" class="selectable active bookmark" title="bookmark" data-id="${data.id}" data-media-type="${mediaType}">
        <input type="checkbox" id="bookmarkbox" ${bookmark ? `checked` : ''}/>
        <span class="checkbox-button">
          <i class="options-icon fa-regular fa-bookmark active"></i>
          <i class="options-x-icon fa-solid fa-bookmark passive"></i>
        </span>
      </label>
      <button tabindex="0" class="item-options" title="options">
        <i class="fa-solid fa-ellipsis-vertical"></i>
      </button>
      <div class="item-menu" tabindex="0">
        <!-- <div class="item" tabindex="0">
          <i class="fa-solid fa-plus"></i>
          Add to playlist
        </div> -->
        <div class="item share" tabindex="0" title="share">
          <i class="fa-solid fa-paper-plane"></i>
          Share
        </div>
        <div class="item copy-name" tabindex="0" data-name="${name}">
          <i class="fa-solid fa-text-width"></i>
          Copy Name
        </div>
        <div class="item copy-id" tabindex="0" data-id="${data.id}">
          <i class="fa-solid fa-hashtag"></i>
          Copy id
        </div>
        <a class="item" href="https://www.imdb.com/title/${imdb}/parentalguide/" target="_blank" rel="noopener nofollow noreferrer">
          <i class="fa-solid fa-book"></i>
          Parental Guide
        </a>
        <a class="item" href="https://search.brave.com/ask?q=${name + ` (${year}) digital release date`}" target="_blank" rel="noopener nofollow noreferrer">
          <i class="fa-solid fa-square-up-right"></i>
          Check Digital Release
        </a>   

        <!-- <div class="item" tabindex="0">
          <i class="fa-solid fa-eye-slash"></i>
          Blacklist item
        </div> -->
      </div>
    </div>
  `;
}

function initializeModalListeners(mediaType, data, modalContent, details) {
  const id = data.id;
  const name = data.name || data.title || data.original_title;

  if (document.modalWatchHandler) {
    ['click', 'keydown'].forEach(eventType => {
      details.removeEventListener(eventType, document.modalWatchHandler);
    });
  }

  const eventHandler = (e) => modalEventsHandler(e, data);
  document.modalWatchHandler = eventHandler;

  ['click', 'keydown'].forEach(eventType => {
    details.addEventListener(eventType, eventHandler);
  });

  // Create a named function for the scroll event
  const backdropHandler = () => backdropAnim(details, modalContent);
  details.removeEventListener('scroll', backdropHandler);
  details.addEventListener('scroll', backdropHandler);

  whenExists('.share').then(() => {
    shareItem(mediaType, id, name);
  })
}

function watchProgress(progress, ring = null) {
  if (progress < 5) return ''
  if (ring) {
    if (progress === 100) {
      return `
        <div class="progress-wrapper watched">
          <div class="progress-ring" id="progressRing" style="background: conic-gradient(var(--success) 360deg, var(--color1) 0deg);">
            <div class="progress-label">
              <i class="fa-solid fa-check"></i>
            </div>
            <div class="progress-center"></div>
          </div>
        </div>
      `
    }
    const angle = 3.6 * Number(progress);
    return `
      <div class="progress-wrapper">
        <div class="progress-ring" id="progressRing" style="background: conic-gradient(var(--progress-color) ${angle}deg, var(--color1) 0deg);">
          <div class="progress-label">${Math.floor(progress)}%</div>
          <div class="progress-center"></div>
          <div class="dot fixed-dot"></div>
          <div class="dot-container" style="transform: rotate(${angle}deg);">
            <div class="dot moving-dot"></div>
          </div>	
        </div>
      </div>
    `
  }
  return `
    <div class="progress-bar">
      <div class="progress" style="width:${progress}%;"></div>
    </div>
  `
}

function updateWatchProgress(type, item, progress) {
  const { id, mediaType, sno, eno } = item?.dataset
  if (type === 'watched' || type === 'playing') {
    if (mediaType === 'tv') {
      const progressBar = item.querySelector('.progress')
      if (progressBar) {
        progressBar.style.width = `${progress}%`
        return
      }
      item.querySelector('.img-container').innerHTML += watchProgress(progress)
    } else {
      return
    }
    return
  }
  if (type === 'unwatch') {
    if (mediaType === 'tv') {
      item.querySelector('.img-container .progress-bar').remove()
    } else {
      //movie logic
      return
    }
    return
  }
}

async function markItemAs(type, item, section = null) {
  const logType = section?.dataset.type || null;
  const { id, mediaType, sno, eno, index } = item.dataset
  if (type === 'watched') {
    logToLocalStorage('history', Number(id), mediaType, sno, eno, 100)
    removeFromLocalStorage('watching', Number(id), mediaType, sno, eno, index)
    if (section.id === 'continue-watching' && mediaType === 'tv') {
      getNextEpisode(id, sno, eno).then((ep) => {
        // console.log(ep)
        if (ep) {
          logToLocalStorage('watching', Number(id), 'tv', ep.season_number, ep.episode_number);
        }
        if (section) loadUserContent(section.id, logType)
      });
    } else if (section) {
      loadUserContent(section.id, logType)
    }
  }
  if (type === 'unwatch') {
    removeFromLocalStorage('history', Number(id), mediaType, sno, eno)
    if (section.id === 'continue-watching') {
      logToLocalStorage('watching', Number(id), mediaType, sno, eno, 0)
    }
    loadUserContent(section.id, logType)
  }
}

async function seasonResolver(data, sno) {
  if (sno) return Number(sno)
  const max_season = data.number_of_seasons
  const ep_exists = (count) => {
    const ep_count = data.seasons
      .find(s => s.season_number === count)
      .episode_count
    return ep_count
  }
  if (ep_exists(max_season)) return max_season
  for (let i = max_season; i > 0; i--) {
    if (!ep_exists(i)) { 
      continue
    } else return i
  }
}

async function tvContent(data, sno, eno, ref) {
  const id = data.id;
  const backdrop = data.backdrop_path
  const seasons = [...data.seasons].sort((a, b) => a.season_number - b.season_number).reverse();
  const containerClass = ref === "modal" ? "episode-wrap" : "episode-player";
  const SEASON = await seasonResolver(data, sno) || data.seasons?.at(0)?.season_number
  const { data: seasonData } = await fetchMetaData({mediaType : 'tv', id, season : SEASON});
  localStorage.setItem('seasonData', JSON.stringify(seasonData));

  const buildEpisodeHTML = (episode, season, count) => {
    const ep = document.createElement('div')
    ep.className = `episode ${ref === 'modal' ? 'episode-width' : ''}`;
    ep.id = count;
    Object.assign(ep.dataset, {
      name: data.name, id, mediaType: "tv",
      season, episode: episode.episode_number,
      epname: episode.name
    });

    let logs = getLogData('history');
    
    const epLog = logs ? logs.filter(log => {
      return Number(log.id) === Number(id) && log.mediaType === 'tv' &&
        String(log.data.sno) === String(episode.season_number) &&
        String(log.data.eno) === String(episode.episode_number)
    }) : '';
    const airDate = new ReleaseDate(episode.air_date)
    const upcoming = airDate.isUpcoming()
    const progress = Number(epLog.sortDateDesc(false)[0]?.progress) || 0;
    const rating = truncate(episode.vote_average, 1)
    const IMAGE = episode.still_path
      ? IMAGE_300 + episode.still_path
      : backdrop ? IMAGE_300 + backdrop : '/assets/images/no-image-hr.svg';
    ep.innerHTML = `
      <div class="episode-items">
        <div tabindex="0" class="img-container">
          ${ upcoming ? `<p class="uc-text">Upcoming</p>` : ''}
          <img src="${IMAGE}" loading="lazy" alt="Episode ${episode.episode_number}">
          ${watchProgress(progress)}
        </div>
        <div class="episode-info">
          <h3>${episode.episode_number}. ${capString(episode.name, 65)}</h3>
          <p>${rating && !upcoming
      ? `Rated: ${rating}`
      : `Not yet rated`}
          </p>
          <p>${convertDate(episode.air_date) || ""}</p>
        </div>
        <div class="synopsis">
          <p class="overview">${episode.overview || "No overview available"}</p>
        </div>
      </div>
    `
    return ep;
  }

  const tvInfo = `
    <div class="tv-actions">
      <div class="seasons-menu">
        <select tabindex="0" id="season-dropdown">
          ${seasons.map(season => `
            <option value="${season.season_number}" ${season.season_number === SEASON ? "selected" : ""}>
              ${!season.season_number ? 'Specials' : `Season ${season.season_number}` }
            </option>`).join("")}
        </select>
      </div>
    </div>
    <div class="season-info">
      <div class="episode-container ${containerClass}" id="episode-container">
      </div>
    </div>`;

  const populateEpisodes = async function (container, data, season) {
    container.innerHTML = "";
    if (!data.episodes?.length) {
      const errDiv = document.createElement("div");
      errDiv.className = "ep-error";
      errDiv.innerHTML = `
        <i class="fa-solid fa-circle-exclamation"></i>
        <p>No episodes available</p>
      `;
      container.appendChild(errDiv);
      return;
    }
    const frag = document.createDocumentFragment();
    data.episodes.forEach((ep, i) =>
      frag.appendChild(buildEpisodeHTML(ep, season, i+1))
    );
    container.appendChild(frag);
  }


  if (ref === "modal") {
    document.querySelector("#modal-details").innerHTML += tvInfo;
    const episodeContainer = document.getElementById('episode-container')
    populateEpisodes(episodeContainer, seasonData, SEASON)
  } else {
    const epName = seasonData.episodes.find(episode => episode.episode_number === Number(eno))?.name
    const title = `S${sno}:E${eno} ${epName || ""}`
    document.querySelector('.now-playing > h4').innerText = title;

    document.querySelector(".player-episodes").innerHTML = tvInfo;
    const episodeContainer = document.getElementById('episode-container')
    episodeContainer.classList.add('player-styling');

    populateEpisodes(episodeContainer, seasonData, SEASON)

    whenInView('.player-styling', () => scrollEpisodeIntoView(eno));
    enableHorizontalWheelScroll(episodeContainer, 3);

    document.querySelectorAll('.episode').forEach(item => {
      if (item.dataset.episode === String(eno)) item.classList.add('current');
    });
  }

  document.querySelector('.tv-actions').addEventListener('change', async (event) => {
    if (event.target.matches('#season-dropdown')) {
      const selectedSeason = event.target.value;
      const { data: tvData } = selectedSeason !== sno
        ? await fetchMetaData({mediaType: 'tv', id, season: selectedSeason})
        : { data: seasonData };
      
      localStorage.setItem('seasonData', JSON.stringify(tvData));
      const episodeContainer = document.getElementById('episode-container')
      populateEpisodes(episodeContainer, tvData, selectedSeason).then(() => {
        document.querySelector('.play-trailer')?.setAttribute('data-sno', selectedSeason);
      })
      event.stopPropagation()
      return
    }
  })

  return SEASON
}

async function modalEventsHandler(event, data) {
  console.log('modal event');
  if (event.type === 'click' || event.type === 'keydown' && event.key === 'Enter') {
    
    if (event.target.classList.contains("watch-btn")) {
      const sanitizedData = Object.fromEntries(
        Object.entries(event.target.dataset).map(([key, data]) => [
          key, escapeHTML(data)
        ])
      );

      const { id, name } = sanitizedData
      const mediaType = "movie";

      //loadWatchPage(mediaType, name, id);
      window.location.href = `/watch/${mediaType}/${id}`;
      event.stopPropagation();
    }

    if (event.target.closest(".play-trailer")) {
      console.log('trailer button')
      event.stopPropagation();

      const container = document.querySelector('.trailer-container')
      const trailerBtn = event.target.closest(".play-trailer");

      const params = new URLSearchParams({
        autoplay: 1,
        controls: 0,
        rel: 0,
        color: 'white',
        iv_load_policy: 3
      });

      const playTrailer = () => {
        const { mediaType, sno } = event.target.dataset
        const seasonVideos = mediaType === 'tv' ? JSON.parse(localStorage.getItem('seasonData')).videos.results : '';
        const results = [...data.videos.results, ...seasonVideos]
        const key = getTrailerVideoKey(results, sno)
        const trailerIframe = `
          <div class="fs-button">
            <label tabindex="0" for="fs-box" class="selectable active">
              <input type="checkbox" id="fs-box">
              <span class="checkbox-button">
                <i class="options-icon fa-solid fa-expand active"></i>
                <i class="options-x-icon fa-solid fa-compress fa-bookmark passive"></i>
              </span>
            </label>
          </div>
          <iframe id="ytplayer" class="${mediaType}-trailer" type="text/html"
            src="https://www.youtube.com/embed/${key + `?` + params}"
            frameborder="0" 
            scrolling="no"
          ></iframe>
        `;
        //console.log(key)

        if (!key) {
          console.log('no trailer')
          toastMessage({el : trailerBtn, string : 'no trailer available', time: 2000})
          return
        }
        container.innerHTML = trailerIframe
        container.closest('#modal-details').scrollTo({top: 0})
        trailerBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>Close`
        
        const fs_btn = document.getElementById('fs-box')
        fs_btn.onchange = () => {
          if (fs_btn.checked & !document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
              alert(`Error: ${err.message}`);
            });
          } else {
            document.exitFullscreen();
          }
        }
      }

      const trailerEl = document.getElementById('ytplayer')

      if (trailerEl) {
        container.innerHTML = '';
        trailerBtn.innerHTML = `<i class="fa-solid fa-video"></i>Trailer`
        return
      }

      if (!trailerEl) playTrailer()
    }

    if (event.target.closest(".episode .img-container")) {
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

      const title = `S${season}:E${episode} ${name}`;
      const tvData = { season, episode, epname };
      const url = `/watch/${mediaType}/${id}/${season}/${episode}`

      if (document.getElementById('episode-container').classList.contains('player-styling')) {
        const info = `<h2>${name}</h2>
              <h4>S${season}:E${episode} ${epname}</h4>`;
        currentSeason = season;
        currentEpisode = episode;
        const source = getLoggedValue("DEF_SRC", (Number(id))) || 1;

        setUpPlayer(source, mediaType, Number(id), Number(season), Number(episode));

        window.history.pushState({}, '', url);
        document.querySelector("title").innerText = title;
        if (info) { document.querySelector(".now-playing").innerHTML = info };

        scrollEpisodeIntoView(episode);
      }
      else {
        window.location.href = url;
        //loadWatchPage(mediaType, name, id, tvData);
      }
      event.stopPropagation();
    }

    const bookmark = event.target.closest(".bookmark")
    if (bookmark) {
      const { mediaType, id, sno, eno, index } = bookmark.dataset;
      event.preventDefault()
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
      const checkbox = bookmark.querySelector("input[type='checkbox']")
      checkbox.checked = !checkbox.checked
      toggleBookmark('bookmarks', id, mediaType, sno, eno, index);
      manageBookmark(mediaType, id)
      console.log('toggling bookmark')
      event.stopPropagation()
    }

    const currentMedia = (el) => {
      const id = el.closest('#modal-details').dataset.id
      const mediaType = el.closest('#modal-details').dataset.mediaType
      return {id, mediaType}
    }
    const content = event.target.closest('.grid-item') 
    if (content) {
      if (currentMedia(content)) prevData.push(currentMedia(content))
      fwdData = []
      const {id, mediaType} = content.dataset
      openModal({id, mediaType}, true)
      event.stopPropagation()
    }

    if (event.target.closest('.nav-btn-container')) {
      const prevBtn = event.target.closest('#prev-btn')
      if (prevBtn) {
        if (currentMedia(prevBtn)) fwdData = [currentMedia(prevBtn)];
        const {id, mediaType} = prevBtn.dataset
        prevData.pop()
        openModal({id, mediaType}, true)
        event.stopPropagation()
      }

      const fwdBtn = event.target.closest('#fwd-btn')
      if (fwdBtn) {
        if (currentMedia(fwdBtn)) prevData.push(currentMedia(fwdBtn));
        const {id, mediaType} = fwdBtn.dataset
        fwdData.pop()
        openModal({id, mediaType}, true)
        event.stopPropagation()
      }

    }

    const cast = event.target.closest('.cast a')
    if (cast) {
      if (currentMedia(cast)) prevData.push(currentMedia(cast));
      fwdData = []
      const {id, mediaType} = cast.dataset
      openModal({id, mediaType}, true)
      event.stopPropagation()
    }

    const year = event.target.closest('.year');
    if (year) {
      const date = year.innerText
      year.innerText = year.dataset.date
      year.dataset.date = date
      event.stopPropagation()
    }

    const menu_btn = event.target.closest('.item-options')
    if (menu_btn) {
      menu_btn.classList.toggle('active');
      document.querySelector('.item-menu').classList.toggle('active')
      event.stopPropagation();
    } else {
      document.querySelector('.item-options')?.classList.remove('active');
      document.querySelector('.item-menu')?.classList.remove('active');
    }

    const menu = event.target.closest('.item-menu')
    if (menu) {
      const copy_id = event.target.closest('.copy-id')
      const copy_name = event.target.closest('.copy-name')
      const copy_data = copy_id?.dataset.id || copy_name?.dataset.name
      if (copy_name || copy_id) {
        try {
          await navigator.clipboard.writeText(copy_data)
          toastMessage({
            el: copy_name || copy_id,
            string: `Copied ${copy_id ? 'TMDB ID' : 'name'} to clipboard!`,
            time: 3000
          })
          return
        } catch (e) {
          console.error(e)
        }
      }
      event.stopPropagation()
    }
  }
}

function getTrailerVideoKey(data, sno) {
  //console.log(data, sno)

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
        const season = lowerName.includes(`season ${sno}`)
        if (video.official === true) s++;
        if (video.type.toLowerCase() === 'trailer') s++;
        if (lowerName.includes('trailer')) s = s + 5;
        if (lowerName.includes('teaser')) s = s + 3;
        if (lowerName.includes('official')) s++;
        if (sno && season) {
          s = s + 2;
          if (season && lowerName.includes('official')) s++;
          if (season && lowerName.includes('trailer')) s = s + 5;
          if (season && lowerName.includes('teaser')) s = s + 3;
          if (season && lowerName.includes('announcement')) s++;
          //console.log(lowerName, s, sno)
          return s
        }
        //console.log(lowerName, s, sno)
      }
      return s;
    };
    return score(b) - score(a);
  });
  //console.log(candidates)//[0].name, candidates[0].key)
  return candidates[0].key || null;
}

function escapeHTML(str) {
  var p = document.createElement("p");
  p.appendChild(document.createTextNode(str));
  return p.innerHTML;
}

async function sourceValidator(mediaType, id, season = null, eno = null) {
  const { data } = await fetchMetaData({mediaType, id, season, options: 0})
  const episode = data.episodes.filter(ep => ep.episode_number === Number(eno))[0].episode_number

  return { id: Number(id), season: data.season_number, episode }
}

function scrollEpisodeIntoView(eno) {
  const episode = Array.from(document.querySelectorAll('.episode')).filter(ep => {
    return String(ep.dataset.episode) === String(eno)
  })[0]

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

}

function setupScrollEdgeMask(container, reset = null) {
  if (!container) return;
  // let isScrolling = false;
  // let scrollTimeout;

  const defMask = (dir) => `linear-gradient(to ${dir}, black 95%, #000000c4 97%, transparent)`;

  container.style.maskImage = defMask("right")

  if (reset) return

  let lastScrollLeft = container.scrollLeft;

  const updateMask = () => {
    const maxScroll = container.scrollWidth - container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const buffer = 16;

    const getMask = () => {
      if (scrollLeft && maxScroll && scrollLeft >= maxScroll - buffer) return defMask("left")
      // if (isScrolling) return 'linear-gradient(to right, transparent, #000000c4 3%, black 5%, black 95%, #000000c4 97%, transparent)'
      return defMask("right")
    }
    const maskGradient = getMask()

    container.style.maskImage = maskGradient;
    container.style.webkitMaskImage = maskGradient;
  };

  const onScroll = () => {
    // isScrolling = true;
    if (container.scrollLeft === lastScrollLeft) return;
    lastScrollLeft = container.scrollLeft;
    updateMask();
    // clearTimeout(scrollTimeout);

    // scrollTimeout = setTimeout(() => {
    // isScrolling = false;
    // updateMask();
    // }, 100);
  };

  container.removeEventListener('scroll', onScroll);
  container.addEventListener('scroll', onScroll);
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
      const textField = container?.querySelector('.overview')
      if (!container) return
      textField.scrollTo({ top: 0, behavior: 'instant' })
      container.classList.toggle('expanded');
      e.stopPropagation();
    });

    isListenerAttached = true;
  }
}


function shareItem(mediaType, id, name) {
  const shareData = {
    text: `${name}`,
    url: `${window.location.protocol +'//'+ window.location.host +'/'}${mediaType}?id=${id}`,
  };

  const btn = document.querySelector(".share");

  btn.onclick = async () => {
    try {
      await navigator.share(shareData);
      return
    } catch (err) {
      await navigator.clipboard.writeText(shareData.url);
      const msg = 'Copied link to clipboard!';
      console.log(msg);
      toastMessage({ el: btn, string: msg, time: 3000})
    }
  }
}

let toastTimeout;

function toastMessage({ el, string, time = null }) {
  let message = document.querySelector('.temp-message');
  message?.remove();

  message = document.createElement('div');
  message.className = 'temp-message';

  message.innerHTML = `
    <p>${string}</p>
    ${time ? `<div class="timer-bar"></div>` : ``}
  `;

  document.body.appendChild(message);

  // ---- positioning (with screen-edge clamp) ----
  const rect = el.getBoundingClientRect();
  const x = Math.round(rect.left);
  const y = Math.round(rect.top);

  const margin = 8;
  const toastWidth = message.clientWidth;
  const viewportWidth = window.innerWidth;

  let left = x + (rect.width - toastWidth) / 2;
  left = Math.max(margin, Math.min(left, viewportWidth - toastWidth - margin));

  const top = y + rect.height + 2;

  message.style.top = `${top}px`;
  message.style.left = `${left}px`;

  // ---- timer bar animation ----
  clearTimeout(toastTimeout);

  if (time) {
    const bar = message.querySelector('.timer-bar');

    // force layout so transition works
    bar.getBoundingClientRect();

    bar.style.transition = `width ${time}ms linear`;
    bar.style.width = '0%';

    toastTimeout = setTimeout(() => {
      message.remove();
    }, time);
  }

  // ---- click to dismiss ----
  message.onclick = () => {
    clearTimeout(toastTimeout);
    message.remove();
  };
}

async function getNextEpisode(id, sno, eno) {
  const { data: currentSeason } = await fetchMetaData({mediaType: 'tv', id, season: sno, options: 0})
  const currentIndex = currentSeason.episodes.findIndex(
    ep => ep.episode_number === Number(eno)
  );

  if (currentIndex !== -1 && currentIndex + 1 < currentSeason.episodes.length) {
    return currentSeason.episodes[currentIndex + 1];
  }

  const { data: nextSeason } = await fetchMetaData({mediaType: 'tv', id, season: Number(sno) + 1, options: 0})
  if (nextSeason && nextSeason.episodes && nextSeason.episodes.length > 0) {
    //console.log(nextSeason.episodes[0].air_date)
    return nextSeason.episodes[0];
  }
  return null;
}


function cropToFit() {
  console.log('setting up crop to fit functionality')
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
  const waitInstances = new Map();

  const wait = (id, duration) => {
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
    }
  };

  const cancelAll = () => {
    waitInstances.forEach(instance => clearTimeout(instance.timeoutId));
    waitInstances.clear();
  };

  return { wait, cancel, cancelAll };
}

const { wait, cancel, cancelAll } = waitTimeout();

function checkElement(selector) {
  return document.querySelector(selector) ? true : false
}

async function whenExists(selector) {
    return new Promise((resolve) => {
      let element = checkElement(selector);
      if (element)  resolve(element);
      const observer = new MutationObserver((mutaions,observer) => {
        element = checkElement(selector);
        if (element) {
            observer.disconnect();
            resolve(element);
        }
      });
      observer.observe(document.body, {
          childList: true,
          subtree: true,
      });
    });
}

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

async function topNavBar() {
  const navbar = document.getElementById('top-bar') 
  if (!navbar) return
  navbar.innerHTML = `
    <ul class="flex-row">
      <li class="home"><a href="/"></a></li>
      <li class="nav-path">
        <a href="/explore">Explore <i class="fa-solid fa-angle-down"></i></a>
        <div class="nav-sub-path">
          <div><a href="/explore?type=movie">Movies</a></div>
          <div><a href="/explore?type=tv">TV Shows</a></div>
          <div><a href="/explore?type=anime">Anime</a></div>
        </div>
      </li>
      <li><a href="/#discover-streaming">What's Streaming</a></li>
      <li><a href="/sports">Sports</a></li>
      <li><a href="/tools">Tools</a></li>
      <li><a href="/library">Library</a></li>
      <form class="search-bar" onsubmit="return handleSearch(event)">
        <input type="search" id="search-input" placeholder="Search for movies, tv shows or a person" />
        <button type="reset" class="x-icon" >
          <i class="fa-solid fa-xmark"></i>
        </button>
        <button class="search-icon">
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
      </form>
    </ul>
  `
}

async function bottomNavBar() {
  const navbar = document.querySelector('#bottom-bar')
  const showLabel = true
  navbar.classList.add('detach')
  navbar ? navbar.innerHTML = `
    <ul>
      <li><a href="/" id="home">
          <i class="fa-solid fa-house"></i>
          ${showLabel ? '<p>Home</p>' : ''}
          </a>
      </li>
      <!-- <li><a href="javascript:void(0)" id="search" >
          <i class="fa-solid fa-magnifying-glass"></i>
          ${showLabel ? '<p>Search</p>' : ''}
          </a>
      </li> -->
      <li><a href="/explore" id="explore">
              <i class="fa-solid fa-compass"></i>
              ${showLabel ? '<p>Explore</p>' : ''}
          </a>
      </li>
      <li><a href="/sports" id="sports">
            <i class="fa-solid fa-basketball"></i>
            ${showLabel ? '<p>Sports</p>' : ''}
          </a>
      </li>
      <li><a href="/tools" id="tools">
            <i class="fa-solid fa-toolbox"></i>
            ${showLabel ? '<p>Tools</p>' : ''}
          </a>
      </li>
      <li><a href="/library" id="library">
              <i class="fa-solid fa-folder-tree"></i>
              ${showLabel ? '<p>Library</p>' : ''}
          </a>
      </li>
    </ul>
  ` : '';

  // let lastActive = null
  navbar.querySelectorAll('a').forEach(link => {
    link.onclick = function () {
      const id = this.id
      // if (id === 'search') {
      //   const input = document.querySelector('#search-input')
      //   this.classList.toggle('active')
      //   this.classList.contains('active') ? input.focus() : input.blur();
      //   // navbar.querySelector(`#${lastActive}`).classList.toggle('active');
      //   return
      // }
      setActiveIcon(id)
    }
  })
}

function setActiveIcon(button) {
  if (button === '') return;
  const bottomBar = document.querySelector('#bottom-bar')
  bottomBar.querySelectorAll('a').forEach(btn => btn.classList.remove('active'))
  const active = document.getElementById(button);
  active?.classList.add('active')
}

function enableHorizontalWheelScroll(container, factor = 1) {
  let hover = false
  let hovering = false
  let hoverTimeout
  const scrollEvent = (e) => {
    if (!hover) return
    if (container.scrollWidth <= container.clientWidth) return
    e.preventDefault();
    container.scrollLeft += e.deltaY * factor;
  }
  container?.addEventListener("wheel", scrollEvent);
  container?.addEventListener('mouseover', () => {
    if (hovering) return
    hover = false
    hovering = true
    hoverTimeout = setTimeout(() => {
      hover = true;
    }, 400)
  })
  container?.addEventListener('mouseleave', () => {
    hovering = false
    clearTimeout(hoverTimeout)
  })
}

// Helper function to get element's position
// function isElementInView(element) {
//   const rect = element.getBoundingClientRect();
//   return rect.top >= 0 && rect.bottom <= window.innerHeight;
// }

function backdropAnim(details, modalContent) {
  const scrollTop = details.scrollTop;
  const opacity = 1 - Math.min(scrollTop / 300, 1);
  modalContent.style.setProperty('--modal-backdrop-opacity', opacity);
}

function setUpScrollEvents() {
  let lastScrollY = document.body.scrollTop;
  let isScrollingDown = false;
  let hideTimeout, showTimeout;
  const header = document.querySelector('#top-bar') || '';
  const bottomBar = document.querySelector('#bottom-bar') || '';

  const overlayAnim = (value) => {
    document.querySelectorAll('.slide-backdrop').forEach(img => {
      img.style.opacity = 1 - Math.min(value / 350, 1).toFixed(1);
    }) 
  }
  
  document.body.addEventListener('scroll', () => {

    const scrolled = document.body.scrollTop;

    if (document.querySelector('.expandable.expanded')) return
    
    const threshold = 56; //px
    let top = scrolled <= threshold;
    let bottom = document.body.clientHeight + scrolled + 16 >= document.body.scrollHeight;
    let infScrolling = false;

    if (top) {
      header.classList.remove('detach')
    } else {
      header.classList.add('detach')
    }

    if (!bottomBar) return
    const hidden = bottomBar.classList.contains('hidden');

    const infScroll = () => {
      const msg = document.querySelector('.result-message')
      if (msg) {
        if (msg.classList.contains('loading')) {
          bottomBar.classList.add('hidden');
          infScrolling = true
        }
        if (msg.classList.contains('empty')) {
          infScrolling = false
        }
      }
    }

    if (bottom) {
      infScroll()
      if (infScrolling) return
      clearTimeout(hideTimeout);
      clearTimeout(showTimeout);
      bottomBar.classList.remove('detach','hidden')
    } else {
      bottomBar.classList.add('detach')
    }


    if (scrolled > lastScrollY) {
      overlayAnim(scrolled)
      if (!isScrollingDown && !hidden) {
        infScroll()
        isScrollingDown = true;
        clearTimeout(showTimeout);
        hideTimeout = setTimeout(() => {
          bottomBar.classList.add('hidden')
        }, 150);
      }
    }
    if (scrolled <= lastScrollY) {
      overlayAnim(scrolled)
      isScrollingDown = false;
      clearTimeout(hideTimeout); // Cancel any pending hide
      if (hidden) {
        showTimeout = setTimeout(() => {
            bottomBar.classList.remove('hidden')
        }, 150);
      }
    }
    lastScrollY = scrolled;
  });
}

function getConfirm({ title, message, success, decline, state = 1, acpt_btn, dcln_btn, exitInterval = 700 } = {}) {
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
        <button id="decline" style="${dcln_btn?.style || ''}">
          ${dcln_btn?.icon || '' }
          ${dcln_btn?.text || "Cancel"}
        </button>
        <button id="accept" style="${acpt_btn?.style || ''}">
          ${acpt_btn?.icon || '<i class="fa-solid fa-trash-can"></i>&nbsp;'}
          ${acpt_btn?.text || "Delete"}
        </button>
      </div>
    </div>
  `;
  document.querySelector('main').appendChild(overlay);
  const prevActive = document.activeElement;
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
        e.stopPropagation();
      }
      if ((isDecline || isAccept) && (isClick || isEnterKey)) {
        if (isAccept) {
          handleAccept(dialogButtons, messageBox);
          resolve(true);
          e.stopPropagation();
        } else {
          handleCancel(dialogButtons, messageBox);
          resolve(false);
          e.stopPropagation();
        }
      }

      if (isEscapeKey || isClick || isEnterKey) {
        setTimeout(() => {
          document.querySelector('main').removeChild(overlay)
          prevActive.focus()
        }, exitInterval);
        ['click', 'keydown'].forEach((type) =>
          overlay.removeEventListener(type, handleDialog)
        );
        e.stopPropagation()
      }
    };

    // Helper function to handle the cancel action
    const handleCancel = (dialogButtons, messageBox) => {
      dialogButtons.style.display = 'none';
      overlay.querySelector('h2').innerText = decline?.title;
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

let isActiveSelect = {}
async function setupCheckboxListeners(sectionID, items) {
  const section = document.querySelector(`#${sectionID}`)
  const container = document.querySelector(`#${sectionID} .grid-container`);
  section.querySelector('.edit-button').disabled = false

  let selectedItems = [];
  let logItems = items
  const total = () => logItems.length

  const MAIN_CHECKBOX = document.querySelector(
    `#${sectionID} .select-all input[type="checkbox"]`
  );
  
  const checkboxes = () => { return container.querySelectorAll(
    ".selectable input[type='checkbox']"
  )}

  // --- Helper functions ---
  const displayCount = () => {
    const message = document.querySelector(
      `#${sectionID} .selection-count p`
    );
    if (message) {
      message.innerText = `${selectedItems.length} / ${total()}`;
    }
  };

  const updateSelectedItems = (checkbox) => {
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
    MAIN_CHECKBOX.checked = false;
    checkboxes().forEach(cb => cb.checked = false);
    selectedItems = [];
    displayCount();
  };

  const toggleEditing = (section, gridItem) => {
    const editBtn = section.querySelector(".edit-button");
    editBtn.querySelectorAll("i").forEach((i) => i.classList.toggle("active"));
    section.querySelector(".delete-button")?.classList.toggle("active");
    section.querySelectorAll(".grid-options.open")?.forEach(item => item?.classList.remove("open"));
    section.querySelectorAll(".selectable")?.forEach(item => item?.classList.toggle("active"));
    isActiveSelect[sectionID] = !isActiveSelect[sectionID]

    section.querySelector('.select-all').setAttribute('tabindex', isActiveSelect[sectionID] ? '0' : '-1')
    section.querySelectorAll('.options-buttons')
      .forEach(op => op.setAttribute('tabindex', isActiveSelect[sectionID] ? '-1' : '0'))

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
    updateSelectedItems(checkbox);
  };

  const toggleAllCheckbox = () => {
    checkboxes().forEach((checkbox) => {
      checkbox.checked = MAIN_CHECKBOX.checked;
    });

    if (MAIN_CHECKBOX.checked) {
      selectedItems = logItems.map(item => {
        const base = {
          id: String(item.id),
          index: String(item.index),
          mediaType: item.mediaType
        };
        if (item.data.sno && item.data.eno) {
          base.sno = item.data.sno;
          base.eno = item.data.eno;
        }
        return base;
      });
    } else {
      selectedItems = []
    }

    console.log(selectedItems)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          container.querySelectorAll('.grid-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]') ?? ''
            if (checkbox)
            checkbox.checked = MAIN_CHECKBOX.checked
          })
        }
      });
    });
    observer.observe(container, {childList : true})
    displayCount()
  };

  const deleteAction = () => {
    const countString = pluralResolver(selectedItems.length, 'item' , 's')
    if (!selectedItems.length || !isActiveSelect[sectionID]) return;
    getConfirm({
      title: `Delete ${countString} ? `,
      success: { title: "Removed!", message: `${countString} removed successfully.` },
      decline: { title: "Cancelled!", message: "Items not removed." },
      exitInterval: 2000,
    }).then((confirmed) => {
      if (!confirmed) return;
      const logType = section.dataset.type;
      const findLog = (LOG, log) => {
        let isSameLog = LOG.MEDIATYPE === log.mediaType &&
          Number(LOG.ID) === Number(log.id) &&
          Number(LOG.INDEX) === Number(log.index);
          if (isSameLog && LOG.SNO && LOG.ENO) {
            isSameLog = String(LOG.SNO) === String(log.sno) &&
            String(LOG.ENO) === String(log.eno)
          }
        return isSameLog;
      }
      selectedItems.forEach((item) => {
        // const { id, mediaType, index, sno, eno } = item;
        // removeFromLocalStorage(logType, Number(id), mediaType, sno, eno, index)
        section.querySelectorAll('.grid-item').forEach(obj => {
          const {ID = obj.dataset.id, MEDIATYPE = obj.dataset.mediaType, INDEX= obj.dataset.index, SNO = obj.dataset.sno, ENO = obj.dataset.eno } = obj
          const OBJ = {ID, MEDIATYPE, INDEX, SNO, ENO}            
          const found_log = findLog(OBJ, item)
          if (found_log) {
            logItems = logItems.filter(log => {
              const LOG = { id : log.id, mediaType: log.mediaType, index: log.index, sno: log.data.sno, eno: log.data.eno }
              const found_log = findLog(OBJ, LOG)
              return !found_log
            })
            obj.remove()
          }
        })
      });
      console.log(logItems);
      localStorage.setItem(logType, JSON.stringify(logItems));
      if (!logItems.length || !section.querySelector('.grid-item')) {
        section.querySelector('.actions').style.display = 'flex'
        container.classList.add('empty')
      }
      console.log(sectionID, logType, "item removed");
      displayCount()
      toggleEditing(section);
    });
    return;
  }
  // --- End Helper functions ---

  section.addEventListener('click', (e) => {
    if (e.target.closest(".edit-button")) {
      toggleEditing(section);
      e.stopPropagation();
      return;
    }
    if (e.target.closest(".delete-button")) {
      deleteAction()
      e.stopPropagation();
      return
    }
  })
  
  // Attach change listeners for checkboxes.
  section.addEventListener('change', (e) => {
    if (e.target.closest(`.select-action input[type="checkbox"]`)) {
      toggleAllCheckbox()
      e.stopPropagation()
      return
    }
    const checkbox = e.target.closest(".grid-item .selectable input[type='checkbox']")
    if (checkbox) {
      updateSelectedItems(checkbox)
      MAIN_CHECKBOX.checked = checkboxes().length === selectedItems.length
      e.stopPropagation()
      return
    }
  })

  section.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const main_checkbox = e.target.closest(`.select-all`)
      if (main_checkbox) {
        const cb = main_checkbox.querySelector('input[type="checkbox"]')
        cb.checked = !cb.checked
        toggleAllCheckbox()
        e.stopPropagation()
        return
      }
      const item = e.target.closest(".grid-item")
      if (item) {
        const checkbox = item.querySelector(".selectable input[type='checkbox']")
        checkbox.checked = !checkbox.checked
        console.log(item, checkbox)
        updateSelectedItems(checkbox)
        MAIN_CHECKBOX.checked = checkboxes().length === selectedItems.length
      }
    }
    if (e.key === 'Delete' && isActiveSelect[sectionID] && selectedItems.length) {
      deleteAction()
      e.stopPropagation()
      return
    }
  })

  // checkboxes.forEach((checkbox) => {
  //   const handler = function () {
  //     updateSelectedItems(checkbox);
  //     MAIN_CHECKBOX.checked = checkboxes.length == selectedItems.length;
  //   };
  //   checkbox.addEventListener("change", handler);
  // });

  let isScrolling = false;
  let scrollTimeout;

  const onGridItemMouseDown = (e) => {
    const item = e.target.closest(".grid-item");
    const section = e.target.closest("section");

    if (!item || isScrolling) return;

    let timer = null;
    let isHeld = false;

    timer = setTimeout(() => {
      if (isScrolling) return;
      isHeld = true;
      console.log("Element is being held");

      const isActive = item.querySelector(".selectable.active");
      wasEditing = true;
      item.blur()
      try {
        navigator.vibrate(50);
      } catch (err) {
        console.warn("Vibrate error:", err);
      }
      toggleEditing(section, !isActive ? item : "");
    }, 500);

    const clearTimer = () => clearTimeout(timer);

    ["mouseup", "mouseout", "touchcancel", "touchend"].forEach((eventType) => {
      item.addEventListener(eventType, clearTimer, { once: true });
    });
  };

  container.addEventListener('scroll', () => {
    isScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
    }, 200);
  });

  ["mousedown", "touchstart"].forEach((eventType) => {
    container.addEventListener(eventType, onGridItemMouseDown);
  });

}

async function waitForTrue(variable) {
  while (!variable) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100 milliseconds
  }
}

const scrollHandlers = new WeakMap();
function setUpExpandableSection() {

  const handleSectionExpansion = (e) => {
    const section = e.target.closest('.expandable');
    const container = section.querySelector('.grid-container');
    const expanded = section.classList.contains('expanded');
    const windowBtns = e.target.closest('.close-window, .maximize')
    // const collapsed = section.classList.contains('collapsed')
    const searching = section.parentNode.className === 'results-container'
  
    if (windowBtns && !expanded) {
      // if (window.innerWidth < 400 && section.classList.contains('user-content')) return
      sectionFetching = true;
      currentPage = 1;
      section.classList.add('expanded');
      section.classList.add('in-view')
      removeLoggedValue("POS_DATA", section.id)
      logArrayToLocalStorage("POS_DATA", section.id, document.body.scrollTop)

      const y = section.getBoundingClientRect().top + document.body.scrollTop - 8;
      document.body.scrollTo({ top: y, behavior: 'smooth' });

      let pageWait;
      const loadPageOnScroll = () => {
        const buffer = 140;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const scrollEnd = scrollTop + clientHeight >= scrollHeight - buffer
        if (!scrollEnd || pageEnd) return
        clearTimeout(pageWait);
        pageWait = setTimeout(() => {
          console.log('hit border');
          if (currentPage === 1) currentPage++;
          if (section.id === 'discover-streaming') {
            const tab = section.querySelector(".tab-menu .active")
            const mediaType = section.querySelector(".media-switch #media-toggle").checked ? 'tv' : 'movie';
            selectedNetworks = [tab.dataset.network]
            selectedProviders = [tab.dataset.provider]
            loadDiscoverContent(mediaType, 'discover-streaming');
            return
          }
          
          if(!searching) {
            const url = sectionURLs[section.id] || '';
            if (url) {
              fetchContent(section.id, `${url}&page=${currentPage}`);
            }
          }

          if (searching) {
            const type = currentSection()
            currentPages[type]++
            getSearchResults(QUERY, type)
          }
        }, 200);
      };

      if (!section.classList.contains('user-content')) {
        // Remove any previous listener before adding new
        const previousHandler = scrollHandlers.get(container);
        if (previousHandler) container.removeEventListener("scroll", previousHandler);
        container.addEventListener("scroll", loadPageOnScroll);
        scrollHandlers.set(container, loadPageOnScroll);
      }

      ['#top-bar', '#bottom-bar'].forEach(selector => {
        document.querySelector(selector).classList.add('hidden')
      })

      return
    }

    if (windowBtns && expanded) {
      const handler = scrollHandlers.get(container);
      if (handler) container.removeEventListener("scroll", handler);

      sectionFetching = false;
      currentPage = 1;

      if (searching) currentPages = { movie: 1, tv: 1, person: 1}

      section.classList.remove('expanded');
      section.classList.remove('collapsed');
      const scroll = getLoggedValue("POS_DATA", section.id) || 0;
      document.body.scrollTo({ top: scroll, behavior: 'instant' });

      if (!section.classList.contains('user-content')) {
        container.querySelectorAll('.grid-item, .profile-item').forEach((item, index) => {
          if (index >= 20) item.remove();
        });
      }
      setupScrollEdgeMask(container, 'reset')
      document.getElementById('top-bar').classList.remove('hidden');
      return
    }

    if (e.target.closest('.section-header')) {
      return
      // let scroll = getLoggedValue("POS_DATA", section.id);
      // if (!scroll) {
      //   ("POS_DATA", section.id, document.body.scrollTop);
      //   // scroll = document.body.scrollTop
      // } else {
      //   removeLoggedValue("POS_DATA", section.id)
      //   document.body.scrollTo({ top: scroll, behavior: 'instant' });
      // }
      // section.classList.remove('expanded')
      // section.classList.toggle('collapsed')
      // document.getElementById('header').classList.remove('hidden');

      // if (!section.classList.contains('user-content')) {
      //   container.querySelectorAll('.grid-item').forEach((item, index) => {
      //     if (index >= 20) item.remove();
      //   });
      // }

      // return
    }
  }

  document.addEventListener('click', (e) => {
    const header = e.target.closest('.expandable .section-header');
    if (header) handleSectionExpansion(e);
  });

  document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
    const header = e.target.closest('.expandable .section-header');
    if (header) handleSectionExpansion(e);
  });

}

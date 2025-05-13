function truncate(num, precision) {
  return Math.floor(num * Math.pow(10, precision)) / Math.pow(10, precision);
}

function extractYear(dateString) {
  if (!dateString) return null
  const date = new Date(dateString);
  return date.getFullYear();
}

function capString(str, maxLength) {
  if (str.length > maxLength) {
    return str.substring(0, maxLength - 3) + '...';
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
  const type = container.classList.contains('vertical-card') ? 'vertical' : null;
  if (!isBrowsing && !sectionFetching) {
    container.innerHTML = renderGridItems(items, type)
    container.classList.remove('loading');
    return
  }

  // console.log(currentPage, container.innerHTML)
  if (currentPage === 1) {
    container.innerHTML = '';
    container.innerHTML = renderGridItems(items, type);
  } else {
    container.innerHTML += renderGridItems(items, type);
  }
  currentPage++

  if (items.length < 20) {
    pageEnd = true;
    const msg = document.querySelector('.result-message');
    if (!msg) return
    msg.classList.remove('loading');
    msg.querySelector('label').innerText = 'No more results';
  }
}

function renderGridItems(items, type = null) {
  let logs = getLogData('history');
  return items
    .map(item => {
      const id = item.id;
      const mediaType = item.media_type;
      const bookmark = logExists('bookmarks', id, mediaType);
      const watched = logExists('history', id, mediaType, null, null, 100)
      const LOG = logs && !watched ? logs.filter(log => {
        return Number(log.id) === Number(id) && log.mediaType === 'movie'
      }) : null;
      const progress = watched && mediaType === 'movie' ? 100 : Number(LOG?.sortDateDesc(false)[0]?.progress) || 0;
      const ring = type === 'vertical' ? 1 : null;
      const title = item.title || item.name;
      const rating = truncate(item.vote_average, 1);
      const year = extractYear(item.release_date || item.first_air_date) || 'N/A';
      const releaseDate = new ReleaseDate(item.release_date || item.first_air_date)
      const upcoming = releaseDate?.isUpcoming()
      const image = item.poster_path
        ? `${IMAGE_342 + item.poster_path}`
        : 'assets/images/no-image.png ';
      //: 'https://placehold.co/440x661/383852/ccc?text=No+Image';
      return `
         <div tabindex="0" class="grid-item" draggable="true" id="grid-item" data-id="${item.id}" data-media-type="${mediaType}">
           <div class="img-container">
            <div class="grid-actions">
              <div class="grid-options ${bookmark ? 'open' : ''}">
                <div tabindex="0" class="options-buttons">
                  <i class="options-icon fa-regular fa-bookmark"></i>
                  <i class="options-x-icon fa-solid fa-bookmark"></i>
                </div>
              </div>
            </div>
            <img src="${image}" loading="lazy" alt="${title}">
            ${watchProgress(progress, ring)}
            ${upcoming ? `<div class="upcoming">Upcoming</div>` : ''}
           </div>
           <div class="grid-item-info">
             <p>${capString(title, 40)}</p>
             <span class="grid-rating">
              <p class="rating">
                ${rating && !upcoming
          ? `<i class="fa-solid fa-star"></i>
                  ${rating}`
          : `<img class="nostar" src="assets/icons/nostar.svg">`
        }
              </p>
             </span>
             <p>${year}</p>
           </div>
         </div>
       `;
    })
    .join('');
}

function notifyAlert(msg, type = null, data = null, actions = null) {
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
  el.innerText = msg;

  if (actions) {
    const msgAction = document.createElement('div')
    msgAction.classList.add('msg-actions')
    actions?.push({ name: "Ignore" })
    actions?.forEach(act => {
      const action = document.createElement('button')
      action.classList.add("action-btn")
      act.task === 'remove' ? action.classList.add("remove") : "";
      action.textContent = `${act.name}`
      if (act.task === 'remove') {
        const { logType, id, mediaType, sno, eno, index } = data
        action.onclick = () => {
          removeFromLocalStorage(logType, id, mediaType, sno, eno, index).then(() => {
            notifyAlert("Item removed successfully")
          })
        }
      }
      msgAction.appendChild(action)
    })
    el.appendChild(msgAction)
  }

  container.appendChild(el)
  el.onclick = () => { container.removeChild(el) }
  setTimeout(() => { container.removeChild(el) }, 5000)
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


async function fetchSearchResults(term, type, pages) {
  console.log("fetching results")
  try {
    const searchURL = `${BASE_URL}/search/${type}?`
    const responses = await Promise.all(
      nthNaturalArray(pages).map(async (page) => {
        const params = new URLSearchParams({
          api_key: API_KEY,
          query: encodeURIComponent(term),
          page: page,
        })
        const url = `${searchURL}${params}`
        const response = await fetch(url)
        const output = await response.json()
        return output.results
      }),
    )
    const data = responses.flat()
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
    notifyAlert(msg)
    return null;
  }
}

//fetch Metadata
async function fetchMetaData(mediaType = null, id = null, season = null, credits = null, options = 1) {

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
    //console.log(url)
    const response = await fetch(url);
    const data = await response.json();
    return { data, mediaType };
  } catch (error) {
    return error;
  }
}

let modalController = null;

function openModal(event) {

  if (modalController) modalController.abort();
  modalController = new AbortController();
  const signal = modalController.signal;
  if (signal.aborted) return; 
  
  const content = event.target.closest('.grid-item, .profile-item');
  const id = content?.dataset.id;
  const mediaType = content?.dataset?.mediaType ?? content?.closest('section')?.dataset?.type;
  const credits = mediaType === 'person' ? 'combined_credits' : null;
  console.log(mediaType, id)
  if (content && !mediaType || !id) {
    console.error("Media type or ID not found");
    return;
  }

  fetchMetaData(mediaType, id, null, credits)
    .then(({ mediaType, data }) => {
      if (signal.aborted) return; 
      displayModal(mediaType, data);
    })
    .catch((error) => {
      if (error.name === 'AbortError') return;
      const msg = `Error fetching data for ${mediaType} id:${id}: ${error}`
      console.log(error)
      notifyAlert(msg)
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

function displayModal(mediaType, data) {
  const modal = document.getElementById('info-modal');
  const modalContent = document.querySelector('.modal-content');
  const details = document.getElementById('modal-details');
  document.documentElement.style.setProperty(
    '--modal-backdrop',
    `url(${data.backdrop_path ? IMAGE_ORG + data.backdrop_path : ''})`
  );

  modalContent.style.setProperty('--modal-backdrop-opacity', 1);

  const contentLogoHTML = getContentLogoHTML(data);

  mediaType !== 'person'
    ? details.innerHTML = buildMediaDetailsHTML(data, mediaType, contentLogoHTML)
    : details.innerHTML = buildPersonDetailsHTML(data);

  if (mediaType === 'movie') {
    insertMovieActions(data, mediaType);
    modalContent.style.height = 'fit-content';
  }

  if (mediaType === 'tv') {
    const userData = getLogData('watching')?.find(item => item.id === data.id)?.data;
    const sno = isViewingDetails ? userData?.sno : null;
    const eno = isViewingDetails ? userData?.eno : null;
    modalContent.style.height = !isMobile() ? '32rem' : '70%';
   
    tvContent(data, sno, eno, 'modal')
      .then((season) => {
        const tvButtons = document.querySelector('.tv-actions');
        tvButtons.innerHTML += setUpModalActions(data, mediaType, season);
      })
      .then(() => isViewingDetails ? scrollEpisodeIntoView(eno) : '')
      .catch((e) => console.log(e))
  }

  if (mediaType === 'person') {
    modalContent.style.height = !isMobile() ? '32rem' : '70%';
    const section = document.querySelectorAll('.credit-section')

    section[0].classList.add('expanded')
    section.forEach(item => {
      item.querySelector('.section-header').addEventListener('click', () => {
        item.classList.toggle('expanded');
      })
    })
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
        ${logoPath ? `<img src="${IMAGE_342}${logoPath}" loading="lazy" alt="Logo">` : ''}
      </div>
      <div class="modal-info">
        ${!logoPath ? `<h1>${name.toUpperCase()}</h1>` : ''}
  `;
}

function buildMediaDetailsHTML(data, mediaType, contentLogoHTML) {
  const name = data.name || data.title || data.original_title;
  const releaseDate = data.release_date || data.first_air_date || data.air_date || '';
  const formattedDate = convertDate(releaseDate) || null;
  const genresHTML = data.genres
    .slice(0, 5)
    .map(genre => `<a href="#">${genre.name}</a>`)
    .join(' ');
  const castHTML = data.credits?.cast
    .slice(0, 5)
    .map(cast => cast.name)
    .join(', ');
  const companyHTML = (data.production_companies || [])
    .slice(0, 2)
    .map(item => item.name)
    .join(' • ')
  //console.log(companyHTML)
  //console.log(data)
  const { rated } = getCountryCertification(data, mediaType);
  const rating = truncate(data.vote_average, 1)
  let released = true;
  if (releaseInfo(data, mediaType) !== null) released = false

  const detailsBodyHTML = `
    <div class="trailer-container"></div>
    <div class="modal-media">
      <!-- <div class="modal-cover">
        <img src="${IMAGE_300 + data.poster_path}" loading="lazy" alt="${name}">
      </div> -->
      ${contentLogoHTML}
        <span class="ratings-genre">
          <p data-title="${data.vote_count} votes">
          ${rating
      ? `<i class="fa-solid fa-star"></i>
              ${rating}`
      : `<img class="nostar" src="assets/icons/nostar.svg">`
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
        <p class="tags">
          ${extractYear(formattedDate)} • 
          ${rated !== '' ? `${rated} • ` : ''} 
          ${data.original_language.toUpperCase()} 
          ${mediaType === 'movie' ? `• ${runtime(data.runtime)}` : `• ${pluralResolver(data.number_of_seasons, 'season', 's')}`}
        </p>
      </div>
    </span>
  </div>
  ${released ? '' : releaseInfo(data, mediaType)}
  `;
  return detailsBodyHTML;
}

function tmdbGenderResolver(id) {
  if (id === 0) return `Not specified`
  if (id === 1) return `Female`
  if (id === 2) return `Male`
  if (id === 3) return `Other`
}

function buildPersonDetailsHTML(data) {

  const links = [
    { id: data.id, url: `https://tmdb.org/person/${data.id}`, icon: "tmdb_short.svg", page: "tmdb" },
    { id: data.imdb_id, url: `https://www.imdb.com/name/${data.imdb_id}`, icon: "imdb_short.png", page: "imdb" },
    { id: data.external_ids?.wikidata_id, url: `https://www.wikidata.org/wiki/${data.external_ids?.wikidata_id}`, icon: "Wikidata-logo.svg", page: "wikidata" },
    { id: data.external_ids?.instagram_id, url: `https://instagram.com/${data.external_ids?.instagram_id}`, icon: "Instagram_Glyph_Gradient.svg", page: "instagram" },
    { id: data.external_ids?.twitter_id, url: `https://x.com/${data.external_ids?.twitter_id}`, icon: "twitter.svg", page: "twitter" },
    { id: data.external_ids?.youtube_id, url: `https://www.youtube.com/${data.external_ids?.youtube_id}`, icon: "yt_full.png", page: "youtube" }
  ];

  return `
    <div class="modal-media" ${isMobile() ? '' : `style="flex-direction:row ;justify-content: flex-start !important;"`}>
      ${data.profile_path ? `
        <div class="modal-cover portrait" style="display:flex">
            <img style="opacity:1" loading="lazy" src="${IMAGE_300 + data.profile_path}">
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
            <button class="external" title="visit ${link.page} page">
              <a style="all:inherit" href="${link.url}" target="_blank" rel="noopener noreferrer">
                <img loading="lazy" src="/assets/icons/${link.icon}">
              </a>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="person-credits">
      <h2>Credits </h2>
        ${creditResolver(data)}
    </div>
    `
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

  let HTML = ''
  const sectionHTML = (data, type) => {
    return `
      <div class="credit-section">
        <div class="section-header" style="padding-top: unset !important">
          <p class="credit-type">${type === "cast" ? 'Cast' : type}</p>
          <div class="expand-arrow"><i class="fa-solid fa-chevron-left"></i></div>
        </div>
        <div class="grid-container ${type}">
            ${populateCreditSection(data, type)}
        </div>
      </div>
    `
  }

  creditOrder.forEach(credit => {
    if (credit === 'cast') {
      HTML += sectionHTML(data, credit)
    }
    if (credit === 'crew') {
      departments.forEach(dep => {
        HTML += sectionHTML(data, dep)
      })
    }
  })

  return HTML
}

function populateCreditSection(data, type) {
  let HTML = ''
  const credits = data.combined_credits
  // use  https://api.themoviedb.org/3/credit/{credit_id} to get appear date of a tv show

  const itemHTML = (item, data) => {
    const title = item.title || item.original_title || item.name || item.original_name;
    const year = extractYear(item.release_date || item.first_air_date) || '';
    const mediaType = item.media_type === 'tv' ? 'TV' : 'Movie';
    return `<div class="grid-item" data-id="${item.id}" data-media-type="${item.media_type}">
      <img loading="lazy" src="${IMAGE_300 + (item.poster_path || data.profile_path)}">
      <div class="credit-item-info">
        <p class="credit-name">${item.job || item.character || `N/A`}</p>
        <p class="credit-media-title"> ${title || 'Title not specified'} ${year ? `(${year})` : ''}</p>
        <p>${mediaType}</p>
      </div>
    </div>
    `
  }

  if (type === 'cast') {
    credits.cast.map(item => {
      HTML += itemHTML(item, data)
      //console.log(item)
    })
  }

  if (type !== 'cast') {
    credits.crew.filter(item => item.department === type)
      .map(item => {
        HTML += itemHTML(item, data)
        //console.log(item)
      })
  }
  return HTML
}

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
        <p>${running ? 'Next Episode' : isFreshRelease(data) ? 'Airing' : 'New season'} ${string}.<p>
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
  const actionHTML = `
    <div class="modal-actions">
      ${released
      ? `<button class="watch-btn" title="watch movie" data-name="${name}" data-id="${data.id}">
          <i class="fa-solid fa-play"></i>Watch
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
  const links = [
    { id: data.id, url: `https://tmdb.org/${mediaType}/${data.id}`, icon: "tmdb_short.svg", page: "tmdb" },
    { id: (data.imdb_id || data.external_ids?.imdb_id), url: `https://www.imdb.com/title/${data.imdb_id || data.external_ids.imdb_id}`, icon: "imdb_short.png", page: "imdb" },
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
        <button class="external" title="visit ${link.page} page">
          <a style="all:inherit" href="${link.url}" target="_blank" rel="noopener noreferrer">
            <img src="/assets/icons/${link.icon}">
          </a>
        </button>
      `).join('')}
      <label class="selectable active bookmark" title="bookmark" data-id="${data.id}" data-media-type="${mediaType}">
        <input type="checkbox" ${bookmark ? `checked` : ''}/>
        <span class="checkbox-button">
          <i class="options-icon fa-regular fa-bookmark active"></i>
          <i class="options-x-icon fa-solid fa-bookmark passive"></i>
        </span>
      </label>
      <button tabindex="0" class="share" title="share">
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

function watchProgress(progress, ring = null) {
  if (progress < 5) return ''
  if (ring) {
    if ( progress === 100 ) {
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
        console.log(ep)
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

async function tvContent(data, sno, eno, ref) {
  const id = data.id;
  const backdrop = data.backdrop_path
  const seasons = [...data.seasons].sort((a, b) => a.season_number - b.season_number).reverse();
  const containerClass = ref === "modal" ? "episode-wrap" : "episode-player";
  const season = sno || data.seasons?.at(0)?.season_number || data.number_of_seasons
  sno = sno ?? -1
  const { data: seasonData } = await fetchMetaData('tv', id, season);
  localStorage.setItem('seasonData', JSON.stringify(seasonData));
  const generateEpisodesHTML = (episodes, season) => {
    let HTML = ''
    let epCount = 0;
    let logs = getLogData('history');
    episodes?.map(episode => {
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
        : backdrop ? IMAGE_300 + backdrop : 'assets/images/no-image-hr.svg';
      epCount++
      HTML += `
        <div id="${epCount}" class="episode episode-width" 
          data-name="${data.name}" data-id="${id}" data-media-type="tv"
          data-season="${season}" data-episode="${episode.episode_number}" data-epname="${episode.name}">
          <div class="episode-items">
            <div class="img-container">
              <img tabindex="0" src="${IMAGE}" loading="lazy" alt="Episode ${episode.episode_number}">
              ${watchProgress(progress)}
            </div>
            <div class="episode-info">
              <h3>${episode.episode_number}. ${episode.name}</h3>
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
        </div>
      `
    });
    return HTML;
  }

  const tvInfo = `
    <div class="tv-actions">
      <div class="seasons-menu">
        <select tabindex="0" id="season-dropdown">
          ${seasons.map(season => `
            <option value="${season.season_number}" ${season.season_number === Number(sno) ? "selected" : ""}>
              Season ${season.season_number}
            </option>`).join("")}
        </select>
      </div>
    </div>
    <div class="season-info">
      <div class="episode-container ${containerClass}" id="episode-container">
        ${generateEpisodesHTML(seasonData.episodes, season)}
      </div>
    </div>`;

  if (ref === "modal") {
    document.querySelector("#modal-details").innerHTML += tvInfo;
  } else {
    const epName = seasonData.episodes.find(episode => episode.episode_number === Number(eno))?.name
    const title = `S${sno}:E${eno} ${epName || ""}`
    document.querySelector('.now-playing > h4').innerText = title;

    document.querySelector(".player-episodes").innerHTML = tvInfo;
    const episodeContainer = document.getElementById('episode-container')
    episodeContainer.classList.add('player-styling');
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
        ? await fetchMetaData('tv', id, selectedSeason)
        : { data: seasonData };

      localStorage.setItem('seasonData', JSON.stringify(tvData));
      document.getElementById('episode-container').innerHTML = generateEpisodesHTML(tvData.episodes, selectedSeason);
      document.querySelector('.play-trailer')?.setAttribute('data-sno', selectedSeason);
      event.stopPropagation()
      return
    }
  })

  return season
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
          <iframe id="ytplayer" class="${mediaType}-trailer" type="text/html"
            src="https://www.youtube.com/embed/${key + `?` + params}"
            frameborder="0" 
            scrolling="no"
          ></iframe>
        `;
        //console.log(key)
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
        trailerBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>Close`
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

        setUpPlayer(source, mediaType, Number(id), Number(season), Number(episode));

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
      const manageBookmark = (mediaType, id) => {
        document.querySelectorAll('.grid-item').forEach(item => {
          if (item.dataset.id === id && item.dataset.mediaType === mediaType) {
            item.querySelector('.grid-options').classList.toggle('open')
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
  const { data } = await fetchMetaData(mediaType, id, season)
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

function setupScrollEdgeMask(container) {
  if (!container) return;
  // let isScrolling = false;
  // let scrollTimeout;

  const defMask = (dir) => `linear-gradient(to ${dir}, black 95%, #000000c4 97%, transparent)`;
  container.style.maskImage = defMask("right")

  let lastScrollLeft = container.scrollLeft;

  const updateMask = () => {
    const maxScroll = container.scrollWidth - container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const buffer = 20;

    const getMask = () => {
      if (scrollLeft >= maxScroll - buffer) return defMask("left")
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
    url: `https://pixelstream.vercel.app/watch/${mediaType}/${id}/${encodeURIComponent(name)}${mediaType === 'tv' ? '/1/1' : ''}`,
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

async function getNextEpisode(id, sno, eno) {
  const { data: currentSeason } = await fetchMetaData('tv', id, sno)
  const currentIndex = currentSeason.episodes.findIndex(
    ep => ep.episode_number === Number(eno)
  );

  if (currentIndex !== -1 && currentIndex + 1 < currentSeason.episodes.length) {
    return currentSeason.episodes[currentIndex + 1];
  }

  const { data: nextSeason } = await fetchMetaData('tv', id, Number(sno) + 1)
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

// bottom nav
function bottomNavBar() {
  const navbar = document.querySelector('.bottom-bar')
  navbar ? navbar.innerHTML = `
    <ul>
            <li><a href="/" id="home">
                <i class="fa-solid fa-house"></i>
                <p>Home</p>
                </a>
            </li>
            <li><a href="javascript:void(0)" id="search" >
                <i class="fa-solid fa-magnifying-glass"></i>
                <p>Search</p>
                </a>
            </li>
            <li><a href="/movie" id="movie">
                    <i class="fa-solid fa-film"></i>
                    <p>Movies</p>
                </a></li>
            <li><a href="/tv" id="tv">
                    <i class="fa-solid fa-display"></i>                    
                    <p>TV</p>
                </a>
            </li>
            <li><a href="/library" id="library">
                    <i class="fa-solid fa-folder-tree"></i>
                    <p>Library</p>
                </a>
            </li>
        </ul>
  ` : '';

  // let lastActive = null
  navbar.querySelectorAll('a').forEach(link => {
    link.onclick = function () {
      const id = this.id
      if (id === 'search') {
        const input = document.querySelector('#search-input')
        this.classList.toggle('active')
        this.classList.contains('active') ? input.focus() : input.blur();
        // navbar.querySelector(`#${lastActive}`).classList.toggle('active');
        return
      }
      setActiveIcon(id)
    }
  })
}

function setActiveIcon(button) {
  if (button === '') return;
  const bottomBar = document.querySelector('.bottom-bar')
  bottomBar.querySelectorAll('a').forEach(btn => btn.classList.remove('active'))
  const active = document.getElementById(button);
  active?.classList.add('active')
}

function enableHorizontalWheelScroll(container, factor = 1) {
  const scrollEvent = (e) => {
    if (container.scrollWidth <= container.clientWidth) return
    e.preventDefault();
    container.scrollLeft += e.deltaY * factor;
  }
  container.removeEventListener("wheel", scrollEvent);
  container.addEventListener("wheel", scrollEvent);
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
  const bottomBar = document.querySelector('.bottom-bar');
  const nav = document.querySelector("#header > nav > ul");
  const filter = document.querySelector('.button-container');
  const input = document.getElementById('search-input');

  let end = ((window.scrollY + 10 + window.innerHeight) >= (document.body.scrollHeight)) || window.scrollY <= 40;

  if (window.scrollY > lastScrollY && !end) {
    // Scrolling down
    if (!isScrollingDown) {
      isScrollingDown = true;
      input.style.height = "1.8rem";
      nav.style.padding = isMobile() ? "0.4rem 0.6rem" : "0.4rem 1.4rem";
      header.style.height = "3rem"//isMobile() ? "3rem" : "2.8rem";
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        header.classList.add('hidden');
        (isMobile() && bottomBar) ? bottomBar.style.bottom = '-4rem' : '';
        (isMobile() && filter) ? filter.style.bottom = '1.4rem' : '';
      }, 500);
    }
  } else if ((window.scrollY <= lastScrollY) || end) {
    isScrollingDown = false;
    clearTimeout(hideTimeout); // Cancel any pending hide

    input.style.height = "2rem";
    nav.style.padding = isMobile() ? "0.8rem 0.6rem" : "0.8rem 1.4rem";
    header.style.height = isMobile() ? "3.6rem" : "4rem";
    header.classList.remove('hidden');
    (isMobile() && bottomBar) ? bottomBar.style.bottom = '0rem' : '';
    (isMobile() && filter) ? filter.style.bottom = '5rem' : '';
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

async function setupCheckboxListeners(sectionID) {

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
      e.stopPropagation();
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

const scrollHandlers = new WeakMap();

function setUpExpandableSection() {

  const handleSectionExpansion = (e) => {
    const section = e.target.closest('.expandable');
    const container = section.querySelector('.grid-container');
    const expanded = section.classList.contains('expanded');
    const windowBtns = e.target.closest('.close-window, .maximize')
    // const collapsed = section.classList.contains('collapsed')

    if (windowBtns && !expanded) {
      if (window.innerWidth < 400 && section.classList.contains('user-content')) return
      sectionFetching = true;
      currentPage = 1;
      section.classList.add('expanded');
      section.classList.remove('collapsed')
      localStorage.removeItem(`LAST_Y_POSSITION-${section.id}`)
      localStorage.setItem(`LAST_Y_POSSITION-${section.id}`, window.scrollY);

      const y = section.getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo({ top: y, behavior: 'smooth' });

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
            //tab.classList.add("active");
            const mediaType = section.querySelector(".media-switch .active").dataset.type;
            selectedNetworks = [tab.dataset.network]
            selectedProviders = [tab.dataset.provider]
            loadDiscoverContent( mediaType, 'discover-streaming');
            return
          }
          const url = sectionURLs[section.id];
          if (url) {
            fetchContent(section.id, `${url}&page=${currentPage}`);
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

      document.getElementById('header').classList.add('hidden');
      return
    }

    if (windowBtns && expanded) {
      const handler = scrollHandlers.get(container);
      if (handler) container.removeEventListener("scroll", handler);

      sectionFetching = false;
      currentPage = 1;
      section.classList.remove('expanded');
      section.classList.remove('collapsed');
      const scroll = localStorage.getItem(`LAST_Y_POSSITION-${section.id}`) || 0;
      window.scrollTo({ top: scroll, behavior: 'instant' });
      if (!section.classList.contains('user-content')) {
        container.querySelectorAll('.grid-item').forEach((item, index) => {
          if (index >= 20) item.remove();
        });
      }
      document.getElementById('header').classList.remove('hidden');
      return
    }

    if (e.target.closest('.section-header')) {
      let scroll = localStorage.getItem(`LAST_Y_POSSITION-${section.id}`);
      if (!scroll) {
        localStorage.setItem(`LAST_Y_POSSITION-${section.id}`, window.scrollY);
        // scroll = window.scrollY
      } else {
        localStorage.removeItem(`LAST_Y_POSSITION-${section.id}`)
        window.scrollTo({ top: scroll, behavior: 'instant' });
      }
      section.classList.remove('expanded')
      section.classList.toggle('collapsed')

      if (!section.classList.contains('user-content')) {
        container.querySelectorAll('.grid-item').forEach((item, index) => {
          if (index >= 20) item.remove();
        });
      }

      return
    }
  }

  document.querySelectorAll('.expandable .section-header ')
    .forEach(item => item.addEventListener('click', (e) => {
      handleSectionExpansion(e)
    })
    )
}

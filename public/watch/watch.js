const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_ORG = 'https://image.tmdb.org/t/p/original';
const IMAGE_300 = 'https://image.tmdb.org/t/p/w300';
const IMAGE_342 = 'https://image.tmdb.org/t/p/w342';


let currentSeason = null;
let currentEpisode = null;
let newSource = 1

let historyEntry = false;
let loggedToHistory = false;
let historyIndex = Date.now();

const providers = [
  { ds: "1", name: "VidLink" },
  {
    ds: "2", name: "VidPlay",
    settings: [{
      type: "version",
      switches: [
        { value: "2", active: true , label: "v2"},
        { value: "3", active: false, label: "v3" }
      ]
    }]
  },
  {
    ds: "100", name: "Anime", hiddenOn: 'movie',
    settings: [{
      type: "format",
      switches: [
        { value: "sub", active: true, label: "Sub" },
        { value: "dub", active: false, label: "Dub" }
      ]
    }]
  },
  {
    ds: "101", name: "Anime2", hiddenOn: 'movie',
    settings: [{
      type: "format",
      switches: [
        { value: "0", active: false, label: "Sub" },
        { value: "1", active: true, label: "Dub" }
      ]
    }]
  },
  { ds: "8", name: "VidFast" },
  { ds: "6", name: "111Movies" },
  { ds: "10", name: "VidSu" },
  { ds: "3", name: "VidSrc" },
  { ds: "4", name: "Whvx", hidden: 'true' },
  { ds: "5", name: "VidEasy", hiddenOn: 'tv' },
  { ds: "7", name: "PrimeWire" },
  { ds: "9", name: "AutoEmbed+" }
];

function pageHTML(mediaType) {

  const buildProviderHTML = () => {

    const generateSettingsHTML = (settingsArray, ds) => {
      if (!settingsArray || !Array.isArray(settingsArray)) return '';
      return settingsArray
        .map(({ type, switches }) => {
          const switchesHTML = switches.map(sw => {
            const isActive = sw.active ? ' active' : '';
            return `<button class="switch${isActive}" data-type=${type} data-${type}="${sw.value}"></button>`;
          }).join('');
          return `
            <span class="provider-settings" data-source="${ds}">
              <p class="type ${type}">
                ${switches.find(item => item.active).label}
              </p>
              <div class="switch-buttons">
                ${switchesHTML}
              </div>
            </span>
          `;
        })
        .join('');
    };

    const providersHTML = providers
      .map(({ ds, name, settings, hiddenOn, hidden }) => {
        const styleAttr = (mediaType === `${hiddenOn}` || hidden === 'true') ? "style='display:none'" : "";
        const settingsHTML = generateSettingsHTML(settings, ds);
        return `
          <div class="provider" role="button" aria-pressed="false" tabindex="0" data-source="${ds}" ${styleAttr}>
            <p class="provider-name" >${name}</p>
            ${settingsHTML}
          </div>
        `;
      })
      .join('');

    return `${providersHTML}`
  };

  return `
    <div class="watch-page">
      <div class="player-container">
        <div class="player">
        <div class="loading">
          <div style="height: 30px; aspect-ratio: 1 / 1; background: var(--font-color1);
            mask: url(/assets/icons/bars-rotate-fade.svg) no-repeat center;">
          </div>&nbsp;Loading player...
        </div>
          <div class="iframe-container"></div>
          <div class="player-toolbar">
            <div class="provider-menu">
              <button class="provider-change">
                <i class="fa-solid fa-server"></i>
              </button>
              <div class="providers">
                <div class="pv-header">
                  <div class="flow-row">
                    <h4>Providers</h4>
                    <button class="close-btn">
                      <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="32" height="32" viewBox="0,0,256,256">
                      <g fill="#e6e6fa" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(8,8)"><path d="M7.21875,5.78125l-1.4375,1.4375l8.78125,8.78125l-8.78125,8.78125l1.4375,1.4375l8.78125,-8.78125l8.78125,8.78125l1.4375,-1.4375l-8.78125,-8.78125l8.78125,-8.78125l-1.4375,-1.4375l-8.78125,8.78125z"></path></g></g>
                      </svg>
                    </button>
                  </div>
                  <hr>
                </div>
                <div class="provider-list">
                  ${buildProviderHTML()}
                </div>
              </div>
            </div>
            <div class="media-download">
              <button class="download">Download</button>
              <div class="get-dwnload"></div>
            </div>
            <div class="go-fullscreen">
              <button class="iframefullscreen" title="Go fullscreen">
                <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="now-playing"></div>
      <div class="player-episodes"></div>
    </div>
  `;
}

async function loadWatchPage(mediaType, NAME = null, id, tvData = null) {
  //console.log('loading watchpage')
  const season = tvData?.season;
  const episode = tvData?.episode;
  currentSeason = Number(season);
  currentEpisode = episode;

  document.querySelector("#main-content").innerHTML = pageHTML(mediaType)

  const { data } = await fetchMetaData({mediaType, id, options: 0})
  const name = data.title ?? data.name;

  if (data.backdrop_path) {
    document.querySelector('meta[property=og\\:image]').setAttribute('content', IMAGE_ORG + data.backdrop_path);
  }

  const title = `${mediaType === "movie"
    ? `${name}`
    : `S${season}:E${episode} ${name}`} - PixelStream`;
  const info = `<h2>${name}</h2> ${mediaType === "tv"
    ? `<h4>S${season}:E${episode} ${tvData?.epname}</h4>`
    : ""}`;
  
  document.querySelector("title").innerText = title;
  document.querySelector(".now-playing").innerHTML = info;
  localStorage.setItem('current-media-title', name);
  history.replaceState('', '', `/watch/${mediaType}/${id}/${name}${mediaType === 'tv' ? `/${season}/${episode}` : ''}`)

  if (mediaType == 'tv') {
    tvContent(data, season, episode, ref = "player")
      .then(() => {
        const container = document.getElementById('episode-container');
        setupScrollEdgeMask(container);
        ['click', 'keydown'].forEach(eventType => {
          container.removeEventListener(eventType, modalEventsHandler)
          container.addEventListener(eventType, modalEventsHandler)
        });
      });
  }

  let source = getLoggedSource(id) || 1;
  setUpPlayer(source, mediaType, id, season, episode);

  // Add event listeners to dropdown items
  let showing = false;
  let leaveTimeout = null
  let persistant = false;
  let forceClosed = false;
  const providerMenu = document.querySelector('.providers');

  ['mouseover', 'mouseout', 'click'].forEach(type => {
    document.querySelector('.provider-menu').addEventListener(type, (e) => {
      const changebtn = e.target.closest('.provider-change')
      if (e.type === 'mouseover' && !persistant) {
        if ( forceClosed ) return
        clearTimeout(leaveTimeout);
        providerMenu.classList.add('show');
        showing = true;
        setTimeout(() => showing = false, 800);
      }
      if (e.type === 'mouseout' && !persistant) {
        leaveTimeout = setTimeout(() => {
          forceClosed = false;
          providerMenu.classList.remove('show');
        }, 250)
      }

      if (e.type === 'click' && changebtn) {
        if (providerMenu.classList.contains('show') && !showing) {
          persistant = false;
          forceClosed = true;
          providerMenu.classList.remove('show');
          changebtn.style.backgroundColor = 'unset';
        } else {
          clearTimeout(leaveTimeout)
          persistant = true;
          changebtn.style.backgroundColor = 'var(--color1)';    
          providerMenu.classList.add('show');
        }
      }
    })
  })

  document.querySelector('main').addEventListener('click', (e) => {
    if (e.target.closest('.provider-change') || e.target.closest('.providers')) return
    providerMenu.classList.remove('show');
    document.querySelector('.provider-change').style.backgroundColor = 'unset';
    persistant = false
  })

  providerMenu.addEventListener('click', (e) => {
    const settingsChanged = !!e.target.closest('.provider-settings > .switch-buttons')
    if (e.target.closest('.provider.selected') && !settingsChanged) return
    const provider = e.target.closest('.provider')
    const close = e.target.closest('.close-btn')
    if (provider) {
      console.log('changing provider')
      newSource = Number(provider.getAttribute('data-source'));
      let settings = getProviderSettings(provider) || [null]
      if (settingsChanged) settings = setProviderSettings(provider);
      if (newSource || settingsChanged) {
        setUpPlayer(newSource, mediaType, id, currentSeason, currentEpisode, settings);
      }
    }

    if (close) {
      close.closest('.providers').classList.remove('show')
      document.querySelector('.provider-change').style.backgroundColor = 'unset';
      forceClosed = true
      persistant = false
    }
  })
}

function setUpPlayer(source, mediaType, id, season = null, episode = null, settings = [null]) {
  loc();

  const sourceSelector = document.querySelectorAll('.provider');
  sourceSelector.forEach(item => {
    if (item.dataset.source === String(source)) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
  const episodeSelector = document.querySelectorAll('.episode');
  episodeSelector.forEach(item => {
    if (item.dataset.episode === String(episode)) {
      item.classList.add('current');
    } else {
      item.classList.remove('current');
    }
  });

  historyEntry = false;
  loggedToHistory = false;
  historyIndex = Date.now();
  loadSource(source, mediaType, id, season, episode, settings)
}

async function loadSource(source, mediaType, id, season = null, episode = null, settings = [null]) {
  document.querySelector(".loading").style.display = "flex";
  const iframe = document.querySelector(".iframe-container")
  iframe.innerHTML = ''
  //console.log('loading source ifram')
  const loadIframe = await getSourceIframe(source, mediaType, id, season, episode, settings)
  // indicicate loading...
  iframe.innerHTML = loadIframe;
}

function setProviderSettings(item) {
  item.querySelectorAll('.switch').forEach(btn => {
    btn.classList.toggle('active');
  })
  const ds = item.dataset.source
  const label = item.querySelector(".type")
  label.innerText = providers.find(item => item.ds === ds)
    .settings[0].switches.find(sw => !sw.active).label
  providers.find(item => item.ds === ds)
    .settings[0].switches.map(sw => sw.active = !sw.active)
  return getProviderSettings(item)
}

function getProviderSettings(item) {
  const btn = item.querySelector('.switch.active')
  if (!btn) return
  const { type } = btn.dataset
  const settings = { [type]: btn.dataset[type] }
  //console.log(settings[type])
  if (!settings) return
  return settings
}

async function animeEpisodeCounter(metadata, tvData) {
  //console.log('counting anime ep no.', tvData)
  if (document.querySelectorAll('.episode')[0]?.id > String(tvData.eno)) return tvData.eno

  let epCount = 0
  const { sno, eno } = tvData
  if (!metadata.seasons) return epCount
  metadata?.seasons.forEach(season => {
    //console.log(season.season_number, Number(sno), Number(eno) )
    if (season.season_number === 0 || season.season_number > Number(sno)) return
    if (season.season_number === Number(sno)) {
      epCount += Number(eno)
    } else {
      epCount += season.episode_count
    }
  })

  return epCount
}

async function animeResolver(mediaType, id, tvData) {
  //console.log('fetching ani list id ')
  const { data: metadata } = await fetchMetaData({mediaType, id, options: 0})
  const ep = await animeEpisodeCounter(metadata, tvData)
  const title = metadata.original_name || metadata.original_title || metadata.name || metadata.title
  //console.log(title)
  const query = `
    query {
      Media(search: "${title}", type: ANIME) {
        id
        idMal
        title {
          romaji
          english
        }
      }
    }
  `;

  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  return { data: data.data.Media, ep }
}

async function resolveSource(source, mediaType, id, tvData) {
  //console.log('resolving source')
  if (source === 100 || source === 101) {
    const { data, ep } = await animeResolver(mediaType, id, tvData);
    console.log('AniID: ',data.id,ep);
    return { ID: data.id, ep };
  }
  return { ID: id };
}

async function getSourceIframe(source, mediaType, id, season = null, episode = null, settings = [null]) {
  let src = "";

  const tvData = { sno: season, eno: episode }
  const { ID: ID, ep } = await resolveSource(source, mediaType, id, tvData)

  const urlPath = `${mediaType}/${ID}${season && episode ? `/${season}/${episode}` : ''}`

  const { version, format } = settings ? settings : [null];

  switch (source) {
    case 100:
      src = `https://vidsrc.cc/v2/embed/anime/ani${ID}/${ep}/${format || 'sub'}`
      break;
    case 101:
      src = `https://vidsrc.icu/embed/anime/${ID}/${ep}/${format || '1'}`
      break;
    case 1:
      src = `https://vidlink.pro/${urlPath}?poster=false`;
      break;
    case 2:
      src = `https://vidsrc.cc/v${version || 2}/embed/${urlPath}`;
      break;
    case 3:
      src = `https://vidsrc.icu/embed/${urlPath}`;
      break;
    case 4:
      src = `https://vidbinge.dev/embed/${urlPath}`;
      break;
    case 5:
      src = `https://player.videasy.net/${urlPath}`;
      break;
    case 6:
      src = `https://111movies.com/${urlPath}`;
      break;
    case 7:
      src = `https://primewire.tf/embed/${mediaType}?tmdb=${ID}${season && episode ? `&season=${season}&episode=${episode}` : ''}`;
      break;
    // case 8:
    //   src = `https://multiembed.mov/?video_id=${ID}&tmdb=1${season && episode ? `&s=${season}&e=${episode}` : ''}`;
    //   break;
    case 8:
      src = `https://vidfast.pro/${urlPath}?poster=false&nextButton=false`
      break;
    case 9:
      src = `https://hin.autoembed.cc/${urlPath}`;
      break;
    case 10:
      src = `https://vidsrc.su/embed/${urlPath}`;
      break;
    default:
      console.error("Invalid source selected");
      return;
  }

  const iframeHTML = `
    <button class="iframe-exit">
      <i class="fa-solid fa-compress"></i>
    </button>
    <iframe
      data-id="${id}"
      data-media-type="${mediaType}"
      src="${src}"
      frameborder="0"
      scrolling="no"
      allowfullscreen
      style="display: none;"
      onload="showIframe(this)"
      class="iframe${source === 5 ? ` zoom` : ''}"
    ></iframe>
  `;

  //console.log(src)
  return iframeHTML
}

function getLoggedSource(id) {
  //console.log('getting logged source id')
  return Number(localStorage.getItem(id))
}

function showIframe(iframe) {
  //console.log('source iframe is loaded')
  iframe.style.display = "initial";
  document.querySelector(".loading").style.display = "none";
  const { id, mediaType } = iframe.dataset
  setupLogging(Number(id), mediaType)
  cropToFit()
}

function setupLogging(id, mediaType) {
  let defaultLogWait;
  let logInterval;
  let logFlag = false;
  const taskId = "logHistory";

  const defLoggingSys = (duration) => {
    cancel(taskId);

    wait(taskId, duration)
      .then(() => {
        ['watching', 'history'].forEach(logType => {
          if (logType === 'history') {
            if (historyEntry) removeFromLocalStorage('history', Number(id), mediaType, currentSeason, currentEpisode, historyIndex)
            if (!historyEntry) historyEntry = true
          }
          logToLocalStorage(logType, Number(id), mediaType, currentSeason, currentEpisode, null, historyIndex);
        });
        localStorage.setItem(id, newSource);
      })
      .catch((err) => {
        if (!err.message.includes("Wait canceled")) {
          console.error("Error:", err.message);
        }
      });
  };

  const updatePageStatus = (progress) => {
    // const seasonSelector = document.querySelector('#season-dropdown')
    // seasonSelector.querySelector('option').forEach(item => {
    //   if (item.value === currentSeason ) {
    //     item.setAttribute('selected', '')
    //   } else {
    //     item.removeAttribute('selected','')
    //   }
    // })
    console.log('updateing', currentSeason, currentEpisode)
    const currentEp = document.querySelector('.episode.current');
    updateWatchProgress('playing', currentEp, progress);
    // if (currentEp.dataset.episode === String(currentEpisode)) return
    // const episodeSelector = document.querySelectorAll('.episode');
    // episodeSelector.forEach(item => {
    //   if (item.dataset.episode === String(currentEpisode)) {
    //     item.classList.add('current');
    //     const name = localStorage.getItem('current-media-title')
    //     history.replaceState('', '', `/watch/tv/${id}/${name}/${currentSeason}/${currentEpisode}`)
    //     updateEpisode = false;
    //   } else {
    //     item.classList.remove('current');
    //   }
    // });

  };

  const postMsgLogging = (e) => {
    if (e) clearTimeout(defaultLogWait);
    const allowedOrigin = e.origin === 'https://vidsrc.cc';
    if (e.data.type === 'MEDIA_DATA' && !allowedOrigin) return;
    if (!logFlag) return
    logFlag = false;
    // console.log(e)
    // const { season, episode} = e.data.data
    // console.log(season , currentSeason, episode, currentEpisode)
    // if ((Number(season) !== Number(currentSeason)) || (Number(episode) !== Number(currentEpisode) )) {
    //   if (!season || !episode) return
    //   currentSeason = season
    //   currentEpisode = episode
    //   updatePageStatus()
    // }
    const event = e.data.event || e.data.data?.event || e.data.type;
    if (event !== 'timeupdate' && !allowedOrigin) return;
    const { currentTime, duration } = e.data.data
    const progress = truncate(100 * (currentTime / duration), 2);

    if (5 < progress && progress < 85) {
      ['watching', 'history'].forEach(logType => {
        if (logType === 'history') {
          if (historyEntry) removeFromLocalStorage('history', Number(id), mediaType, currentSeason, currentEpisode, historyIndex)
          if (!historyEntry) historyEntry = true
        }
        logToLocalStorage(logType, Number(id), mediaType, currentSeason, currentEpisode, progress, historyIndex);
      });
      localStorage.setItem(id, newSource);
      updatePageStatus(progress);
    }

    if (progress > 85) {
      if (loggedToHistory) return
      loggedToHistory = true
      removeFromLocalStorage('history', Number(id), mediaType, currentSeason, currentEpisode, historyIndex)
      logToLocalStorage('history', Number(id), mediaType, currentSeason, currentEpisode, 100);
      if (mediaType === 'movie') {
        removeFromLocalStorage('watching', Number(id), mediaType);
        return
      } 
      if (mediaType === 'tv') {
        getNextEpisode(id, currentSeason, currentEpisode).then((ep) => {
          if (ep) {
            logToLocalStorage('watching', Number(id), 'tv', ep.season_number, ep.episode_number);
          }
        });
        updatePageStatus(100);
      }
    }
  };

  // Cleanup existing listeners/intervals if any
  cleanupLogging();

  // Start initial log delay
  defaultLogWait = setTimeout(() => {
    clearInterval(logInterval)
    defLoggingSys(20);
  }, 100000);

  // Set up logging interval
  logInterval = setInterval(() => {
    logFlag = true;
  }, 10000);

  // Attach listener
  window.addEventListener('message', postMsgLogging);

  // Attach cleanup to global store (or return function to call later)
  window._loggingCleanup = () => {
    clearTimeout(defaultLogWait);
    clearInterval(logInterval);
    cancelAll();
    window.removeEventListener('message', postMsgLogging);
    console.log('🧼 Logging cleaned up.');
  };
}

function cleanupLogging() {
  if (typeof window._loggingCleanup === 'function') {
    window._loggingCleanup();
    delete window._loggingCleanup;
  }
}

const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';


let currentSeason = null;
let currentEpisode = null;

function loadWatchPage(mediaType, name = null, id, tvData = null) {
  season = tvData?.season;
  episode = tvData?.episode;
  currentSeason = season;
  currentEpisode = episode;

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
                <div class="provider">
                  <p class="provider-name" data-source="1">Vidlink</p>
                </div>
                <div class="provider">                
                  <p class="provider-name" data-source="2">VidPlay</p>
                  <span class="provider-settings">
                    <p class="version">v3</p>
                    <div class="switch-buttons">
                      <button class="switch" data-version="2"></button>
                      <button class="switch active" data-version="3"></button>
                    </div>
                  </span>
                </div>
                <div class="provider">                
                  <p class="provider-name" data-source="3">Vidsrc</p>
                </div>
                <div class="provider"> 
                  <p class="provider-name" data-source="4">Whvx</p>
                </div>
                <div class="provider" ${mediaType === 'tv' ? `style='display:none'` : ''}> 
                  <p class="provider-name" data-source="5">Videasy</p>
                </div>
                <div class="provider"> 
                  <p class="provider-name" data-source="6">111movies</p>
                </div>
                <div class="provider"> 
                  <p class="provider-name" data-source="7">Primewire</p>
                </div>
                <div class="provider"> 
                  <p class="provider-name" data-source="8">Multiembed</p>
                </div> 
                <div class="provider"> 
                  <p class="provider-name" data-source="9">AutoEmbed(Multi)</p>
                </div>
                <div class="provider"> 
                  <p class="provider-name" data-source="10">VidSu</p>
                </div>
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

  //display metadata on watch page
  fetchMetaData(mediaType, id).then(({ data }) => {
    
    const name = data.title ?? data.name

    const title = `${mediaType === "movie" ? name : `S${season}:E${episode} ${name}`} - PixelStream`;
    const info = `<h2>${name}</h2> ${mediaType === "movie" ? ""
      : `<h4>S${season}:E${episode} ${tvData?.epname}</h4>`}`;

    document.querySelector("title").innerText = title;
    document.querySelector(".now-playing").innerHTML = info;
    
    history.replaceState('','',`/watch/${mediaType}/${id}/${name}${mediaType === 'tv' ? `/${season}/${episode}` : ''}`)
  
    if (mediaType == 'tv') {
      const sno = season;
      const eno = episode;
      tvContent(data, sno, eno, ref = "player");
    }
  });

  // set default source and load Iframe
  let source = getLoggedSource(id) || 1;
  loadSources(source, mediaType, id, season, episode);

  // Add event listeners to dropdown items
  const sourceSelector = document.querySelectorAll('.provider');
  sourceSelector.forEach(item => {
    item.addEventListener('click', (e) => {
      const provider = item.querySelector('.provider-name')
      const lastSource = provider.classList.contains('selected');
      const settingsChange = e.target.closest('.provider-settings > .switch-buttons')
      source = Number(provider.getAttribute('data-source'));
      let settings = getProviderSettings(item) || [ null ]
      if (settingsChange) settings = setProviderSettings(item);
      console.log(source, settings)
      if (!lastSource || settingsChange) loadSources(source, mediaType, id, currentSeason, currentEpisode, settings);
    });
  });

  // load utils
  cropToFit();

  if ( mediaType === "movie" ) return;

  ['click','keydown'].forEach(eventType => {
    document.removeEventListener(eventType, watchEventListeners)  
    document.addEventListener(eventType, watchEventListeners)
  });
}

function setProviderSettings(item) {
  item.querySelectorAll('.switch').forEach(btn => btn.classList.toggle('active'));
  return getProviderSettings(item)
}

function getProviderSettings(item) {
  const btn = item.querySelector('.switch.active')
  const settings = btn?.dataset
  if (!settings) return
  item.querySelector('.version').innerText = `v${settings.version}`
  return settings
}

// Sources
function loadSources(source, mediaType, id, season = null, episode = null, settings = [ null ]) {
  loc();
  const loadIframe = getSourceIframe(source, mediaType, id, season, episode, settings)
  // indicicate loading...
  document.querySelector(".loading").style.display = "flex";
  document.querySelector(".iframe-container").innerHTML = loadIframe;

  //move this to only change when source does not send error
  const sourceSelector = document.querySelectorAll('.provider-name');
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

  const taskId = "logHistory";
  const duration = 120;
  cancel(taskId);

  wait(taskId, duration)
    .then(() => {
      logToLocalStorage('history', Number(id), mediaType, season, episode);
      logToLocalStorage('watching', Number(id), mediaType, season, episode);
      localStorage.setItem(id, source);
    })
    .catch((err) => {
      if (err.message.includes("Wait canceled")) {
        console.log("Wait was canceled before completion.");
      } else {
        console.error("Error:", err.message);
      }
    });
}

function getSourceIframe(source, mediaType, id, season = null, episode = null, settings = [ null ]) {
  let src = "";
  const urlPath = `${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`
  
  const { version } = settings ? settings : [ null ];

  switch (source) {
    case 1:
      src = `https://vidlink.pro/${urlPath}?poster=false`;
      break;
    case 2:
      src = `https://vidsrc.cc/v${version || 3}/embed/${urlPath}`;
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
      src = `https://primewire.tf/embed/${mediaType}?tmdb=${id}${season && episode ? `&season=${season}&episode=${episode}` : ''}`;
      break;
    case 8:
      src = `https://multiembed.mov/?video_id=${id}&tmdb=1${season && episode ? `&s=${season}&e=${episode}` : ''}`;
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

  //  referrerpolicy="origin"

  const iframeHTML = `
    <button class="iframe-exit">
      <i class="fa-solid fa-compress"></i>
    </button>
    <iframe
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
  return Number(localStorage.getItem(id))
}

function showIframe(iframe) {
  //console.log(iframe)
  iframe.style.display = "block";
  document.querySelector(".loading").style.display = "none";
}
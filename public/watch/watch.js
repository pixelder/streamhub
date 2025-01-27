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
  const title = `${mediaType === "movie" ? name : `S${season}:E${episode} ${name}`} - PixelStream`;
  const info = `<h2>${name}</h2> ${mediaType === "movie" ? ""
    : `<h4>S${season}:E${episode} ${tvData?.epname}</h4>`}`;

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
                <p data-source="1">Vidlink</p>
                <p data-source="2">VidPlay</p>
                <p data-source="3">Vidsrc</p>
                <p data-source="4">Whvx</p>
                <p data-source="5">Multiembed</p>
                <p data-source="6">111movies</p>
                <p data-source="7">AutoEmbed(Multi)</p>
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
  fetchMetaData(mediaType, id).then(({ data }) => {
    if (mediaType == 'tv') {
      const sno = season;
      const eno = episode;
      tvContent(data, sno, eno, ref = "player");
    };
  });

  // Initialize default source
  let source = localStorage.getItem(id) | 1;
  loadSources(source, mediaType, id, season, episode);

  // Add event listeners to dropdown items
  const sourceSelector = document.querySelectorAll('.providers p');
  sourceSelector.forEach(item => {
    item.addEventListener('click', () => {
      const selectedSource = parseInt(item.getAttribute('data-source'), 10); // Ensure source is an integer
      if (selectedSource && selectedSource !== source) {
        source = selectedSource; // Update the source
        loadSources(source, mediaType, id, currentSeason, currentEpisode);
      }
    });
  });

  // load utils
  cropToFit();
  ['click','keydown'].forEach(eventType => {
    document.removeEventListener(eventType, watchEventListeners)  
    document.addEventListener(eventType, watchEventListeners)
  });
}

// Sources
function loadSources(source, mediaType, id, season = null, episode = null) {
  loc();
  let src = "";
  switch (source) {
    case 1:
      src = `https://vidlink.pro/${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`;
      break;
    case 2:
      src = `https://vidsrc.cc/v2/embed/${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`;
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
      src = `https://111movies.com/${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`;
      break;
    case 7:
      src = `https://hin.autoembed.cc/${mediaType}/${id}${season && episode ? `/${season}/${episode}` : ''}`;
      break;
    default:
      console.error("Invalid source selected");
      return;
  }

  const sourceSelector = document.querySelectorAll('.providers p');
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
 
  const taskId = "logHistory";
  const duration = 120;
  cancel(taskId);

  wait(taskId, duration)
    .then(() => {
      logWatchHistory('history', Number(id), mediaType, season, episode);
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

function showIframe(iframe) {
  iframe.style.display = "block";
  document.querySelector(".loading").style.display = "none";
}
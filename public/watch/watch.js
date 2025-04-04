const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';


let currentSeason = null;
let currentEpisode = null;

async function loadWatchPage(mediaType, NAME = null, id, tvData = null) {
  //console.log('loading watchpage')
  const season = tvData?.season;
  const episode = tvData?.episode;
  currentSeason = season;
  currentEpisode = episode;

  const buildWatchPage = () => {
    const providers = [
      { ds: "100", name: "Anime", hiddenOn: 'movie',
        settings: [
          {
            type: "format",
            label: [
              { active: false, value: "SUB" },
              { active: true, value: "DUB" }
            ],
            switches: [
              { value: "0", active: false},
              { value: "1", active: true}
            ]
          }
        ]
      },
      { ds: "1", name: "Vidlink" },
      { ds: "2", name: "VidPlay",
        settings: [
          {
            type: "version",
            label: [
              { active: true, value:  "v3" },
              { active: false, value: "v2" }
            ],
            switches: [
              { value: "2", active: false },
              { value: "3", active: true }
            ]
          }
        ]
      },
      { ds: "3", name: "Vidsrc" },
      { ds: "4", name: "Whvx", hidden: 'true'},
      { ds: "5", name: "Videasy", hiddenOn: 'tv' },
      { ds: "6", name: "111movies" },
      { ds: "7", name: "Primewire" },
      { ds: "8", name: "Multiembed" },
      { ds: "9", name: "AutoEmbed(Multi)" },
      { ds: "10", name: "VidSu" }
    ];
  
    const generateSettingsHTML = (settingsArray,ds) => {
      if (!settingsArray || !Array.isArray(settingsArray)) return '';
      return settingsArray
        .map(({ type, label, switches }) => {
          const switchesHTML = switches.map(sw => {
              const activeClass = sw.active ? ' active' : '';
              return `<button class="switch${activeClass}" data-type=${type} data-${type}="${sw.value}"></button>`;
          }).join('');
          return `
            <span class="provider-settings" data-source="${ds}">
              <p class="type ${type}" data-status="${label.find(item => item.active).active}">${label.find(item => item.active).value}</p>
              <div class="switch-buttons" data-active=${label.find(item => item.active).value} data-inactive=${label.find(item => !item.active).value} >
                ${switchesHTML}
              </div>
            </span>
          `;
        })
        .join('');
    };
  
    // Generate provider HTML dynamically.
    const providersHTML = providers
      .map(({ ds, name, settings, hiddenOn, hidden}) => {
        // Conditionally hide providers for TV.
        const styleAttr = (mediaType === `${hiddenOn}` || hidden === 'true') ? "style='display:none'" : "";
        const settingsHTML = generateSettingsHTML(settings, ds);
        return `
          <div class="provider" ${styleAttr}>
            <p class="provider-name" data-source="${ds}">${name}</p>
            ${settingsHTML}
          </div>
        `;
      })
      .join('');
  
    return `
      <div class="watch-page">
        <div class="player-container">
          <div class="player">
            <!-- Placeholder until iframe loads -->
            <div class="loading">Loading player...</div>
            <div class="iframe-container"></div>
            <div class="player-toolbar">
              <div class="provider-menu">
                <button class="provider-change">
                  <i class="fa-solid fa-server"></i>
                </button>
                <div class="providers">
                  ${providersHTML}
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
  };

  document.querySelector("#main-content").innerHTML = buildWatchPage()

  const {data} = await fetchMetaData(mediaType, id)
  const name = data.title ?? data.name

  const title = `${mediaType === "movie" 
    ? `${name} - PixelStream`
    : `S${season}:E${episode} ${name}`} - PixelStream`;
  const info = `<h2>${name}</h2> ${mediaType === "tv" 
    ? `<h4>S${season}:E${episode} ${tvData?.epname}</h4>`
    : "" }`;

  document.querySelector("title").innerText = title;
  document.querySelector(".now-playing").innerHTML = info;

  history.replaceState('','',`/watch/${mediaType}/${id}/${name}${mediaType === 'tv' ? `/${season}/${episode}` : ''}`)
  
  if (mediaType == 'tv') {
    await tvContent(data, season, episode, ref = "player");
    ['click','keydown'].forEach(eventType => {
      document.removeEventListener(eventType, watchEventListeners)  
      document.addEventListener(eventType, watchEventListeners)
    });
  }

  let source = getLoggedSource(id) || 1;
  loadSources(source, mediaType, id, season, episode);

  // Add event listeners to dropdown items
  const sourceSelector = document.querySelectorAll('.provider');
  sourceSelector.forEach(item => {
    item.addEventListener('click', (e) => {
      const provider = item.querySelector('.provider-name')
      const lastSource = provider.classList.contains('selected');
      const settingsChanged = !!e.target.closest('.provider-settings > .switch-buttons')
      source = Number(provider.getAttribute('data-source'));
      let settings = getProviderSettings(item) || [ null ]
      if (settingsChanged) settings = setProviderSettings(item);
      if (!lastSource || settingsChanged) {
        loadSources(source, mediaType, id, currentSeason, currentEpisode, settings);
      }
    });
  });
}

async function animeEpisodeCounter(metadata, tvData) {
  //console.log('counting anime ep no.')
  if (document.querySelectorAll('.episode')[0]?.dataset.id > Number(tvData.eno)) return tvData.eno

  let epCount = 0
  const { sno , eno } = tvData
  if (!metadata.season) return epCount
  metadata?.seasons.forEach(season => {
    //console.log(season.season_number, Number(sno), Number(eno) )
    if ( season.season_number === 0 || season.season_number > Number(sno) ) return
    if ( season.season_number === Number(sno)) {
      epCount += Number(eno)
    } else {
      epCount += season.episode_count
    }
  })

  return epCount
}

async function resolveSource(source,mediaType,id, tvData ) {
  //console.log('resolving source')
  if (source === 100) {
    const { data, ep } = await animeResolver(mediaType,id, tvData);
    console.log('AniID: ',data.id);
    return { ID : data.id, ep };
  }
  return { ID : id };
}

async function animeResolver(mediaType,id, tvData) {
  //console.log('fetching ani list id ')
  const { data: metadata}  = await fetchMetaData(mediaType,id)
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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  return { data : data.data.Media , ep}
}

async function loadSources(source, mediaType, id, season = null, episode = null, settings = [ null ], ) {
  loc();
  //console.log('loading source ifram')
  const loadIframe = await getSourceIframe(source, mediaType, id, season, episode, settings)
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

function setProviderSettings(item) {
  item.querySelectorAll('.switch').forEach(btn =>{
    btn.classList.toggle('active');
  })
  const label = item.querySelector(".type")
  const button = item.querySelector(".switch-buttons")
  const status = label.dataset.status
  label.innerText = `${button.dataset[status === 'true' ? 'inactive' : 'active']}`
  label.setAttribute('data-status', `${status === 'true' ? '' : 'true'}` )
  return getProviderSettings(item)
}

function getProviderSettings(item) {
  const btn = item.querySelector('.switch.active')
  if (!btn) return
  const { type }  = btn.dataset
  const settings = {[type]: btn.dataset[type]}
  //console.log(settings[type])
  if (!settings) return
  return settings
}

async function getSourceIframe(source, mediaType, id, season = null, episode = null, settings = [ null ]) {
  let src = "";
  //console.log('generating source iframe')
  
  const tvData = { sno: season, eno: episode}
  const { ID : ID , ep } = await resolveSource(source,mediaType,id,tvData)
  const urlPath = `${mediaType}/${ID}${season && episode ? `/${season}/${episode}` : ''}`

  const { version, format } = settings ? settings : [ null ];

  switch (source) {
    case 100:
      src = `https://vidsrc.icu/embed/anime/${ID}/${ep}/${format || '1'}`
      break;
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
      src = `https://primewire.tf/embed/${mediaType}?tmdb=${ID}${season && episode ? `&season=${season}&episode=${episode}` : ''}`;
      break;
    case 8:
      src = `https://multiembed.mov/?video_id=${ID}&tmdb=1${season && episode ? `&s=${season}&e=${episode}` : ''}`;
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
  iframe.style.display = "block";
  document.querySelector(".loading").style.display = "none";
  cropToFit()
}
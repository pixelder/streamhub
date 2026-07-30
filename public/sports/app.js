

// --- Configuration & Constants ---
const API_BASE = "https://streamed.st/api";
const CACHE_TTL_STREAMS = 5; // minutes
const CACHE_TTL_CATEGORIES = 1440; // minutes (24h)
const LIVE_THRESHOLD = 600 * 1000; // 10 minutes before kickoff (ms)

const ICON_MAP = Object.freeze({
  "football": "fa-futbol",
  "soccer": "fa-futbol",
  "basketball": "fa-basketball",
  "nba": "fa-basketball",
  "americanfootball": "fa-football",
  "nfl": "fa-football",
  "baseball": "fa-baseball",
  "mlb": "fa-baseball-bat-ball",
  "tennis": "fa-table-tennis-paddle-ball",
  "motorsports": "fa-flag-checkered",
  "f1": "fa-flag-checkered",
  "fight": "fa-hand-fist",
  "mma": "fa-hand-fist",
  "boxing": "fa-hand-fist",
  "hockey": "fa-hockey-puck",
  "nhl": "fa-hockey-puck",
  "rugby": "fa-football",
  "cricket": "fa-baseball-bat-ball",
  "darts": "fa-bullseye",
  "snooker": "fa-bowling-ball",
  "golf": "fa-golf-ball-tee",
  "afl": "fa-futbol"
});

// --- Application State ---
let currentCategory = "all";
let searchQuery = "";
let streamCache = [];
let timeCheckerInterval = null;
let streamRefreshInterval = null;
let isMinimized = false;
let miniPlayerListenersAttached = false;
let searchDebouncingTimer = null;

let currentEmbedUrl = "";
let currentMatch = null;
let activeSourceIndex = 0;
let currentSourceStreams = [];

const collapsedSections = new Set();

// --- Utility Functions ---

function normalizeStr(str) {
  return String(str || "").toLowerCase().replace(/[-_ ]/g, "");
}

function getIcon(id) {
  if (!id) return "fa-trophy";
  const normalizedId = normalizeStr(id);
  return ICON_MAP[normalizedId] || "fa-trophy";
}

function debounce(fn, delay = 250) {
  return (...args) => {
    clearTimeout(searchDebouncingTimer);
    searchDebouncingTimer = setTimeout(() => fn(...args), delay);
  };
}

// --- Lazy Loading Observer ---
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const card = entry.target;
    if (entry.isIntersecting && !card._isRendered) {
      populateCardContent(card, card._matchData, card._isLive);
      card._isRendered = true;
      cardObserver.unobserve(card); // Unobserve once populated to free resources
    }
  });
}, { rootMargin: "300px 0px" });

// --- Initialization ---

async function init() {
  setupDraggableMiniPlayer();
  setupSearchInput();
  setupCollapsibleSections();

  await fetchCategories();
  await fetchStreams();

  let lastRenderSignature = getRenderSignature(streamCache);

  if (timeCheckerInterval) clearInterval(timeCheckerInterval);
  timeCheckerInterval = setInterval(() => {
    if (!streamCache.length) return;
    const currentSignature = getRenderSignature(streamCache);
    if (currentSignature !== lastRenderSignature) {
      processAndRenderStreams(streamCache);
      lastRenderSignature = currentSignature;
    }
  }, 30000);

  if (streamRefreshInterval) clearInterval(streamRefreshInterval);
  streamRefreshInterval = setInterval(async () => {
    const previousSignature = getRenderSignature(streamCache);
    await fetchStreams(true);
    const nextSignature = getRenderSignature(streamCache);
    if (previousSignature !== nextSignature) {
      processAndRenderStreams(streamCache);
    }
  }, CACHE_TTL_STREAMS * 60 * 1000);
}

// --- UI Section Controllers ---

function setupCollapsibleSections() {
  bindSectionToggle("live-group-header", "live-stream-group", "live-toggle-btn");
  bindSectionToggle("upcoming-group-header", "upcoming-stream-group", "upcoming-toggle-btn");
}

function bindSectionToggle(headerId, groupId, btnId) {
  const header = document.getElementById(headerId);
  const group = document.getElementById(groupId);
  const btn = document.getElementById(btnId);

  if (header && group) {
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-controls", groupId);

    const toggle = () => toggleSection(groupId, group, btn);

    header.addEventListener("click", toggle);
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  }
}

function toggleSection(sectionId, containerEl, btnEl) {
  const isCollapsed = collapsedSections.has(sectionId);
  if (isCollapsed) {
    collapsedSections.delete(sectionId);
    containerEl.classList.remove("collapsed");
  } else {
    collapsedSections.add(sectionId);
    containerEl.classList.add("collapsed");
  }

  const nowCollapsed = !isCollapsed;
  containerEl.setAttribute("aria-expanded", String(!nowCollapsed));

  if (btnEl) {
    const sym = btnEl.querySelector(".btn-symbol");
    if (sym) sym.textContent = nowCollapsed ? "[ + ]" : "[ − ]";
  }
}

function setupSearchInput() {
  const searchInput = document.getElementById("stream-search-input");
  if (!searchInput) return;

  const handleSearch = debounce((e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    processAndRenderStreams(streamCache);
  }, 250);

  searchInput.addEventListener("input", handleSearch);
}

function getRenderSignature(matches) {
  const now = Date.now();
  return matches
    .map(match => `${match.id}-${now >= Number(match.date) - LIVE_THRESHOLD}`)
    .join("|");
}

// --- API Cache Layer ---

async function fetchWithCache(cacheKey, url, ttlMinutes, forceRefresh = false) {
  let staleData = null;
  try {
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
      const parsed = JSON.parse(cachedItem);
      staleData = parsed.data;
      if (!forceRefresh && Date.now() < parsed.expiry) {
        return parsed.data;
      }
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    const data = await response.json();

    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        expiry: Date.now() + ttlMinutes * 60 * 1000
      })
    );
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return staleData;
  }
}

// --- Category Handling ---

async function fetchCategories() {
  const data = await fetchWithCache("sf_categories", `${API_BASE}/sports`, CACHE_TTL_CATEGORIES);
  if (!Array.isArray(data)) return;

  const container = document.getElementById("categories-bar");
  if (!container) return;

  container.replaceChildren();

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "category-btn active";
  allButton.textContent = "All";
  allButton.setAttribute("aria-pressed", "true");
  allButton.addEventListener("click", () => filterCategory("all", allButton));
  container.appendChild(allButton);

  data.forEach(sport => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-btn";
    button.setAttribute("aria-pressed", "false");

    const categoryLabel = sport.name || sport.id;

    const iconClass = getIcon(sport.id);
    button.innerHTML = `
      <i class="fa-solid ${iconClass} category-logo" aria-hidden="true"></i> 
      <span>${escapeHTML(categoryLabel)}</span>
    `;    

    button.addEventListener("click", () => filterCategory(sport.id, button));
    container.appendChild(button);
  });
}

function filterCategory(category, element) {
  currentCategory = category;
  document.querySelectorAll(".category-btn").forEach(btn => {
    btn.classList.remove("active");
    btn.setAttribute("aria-pressed", "false");
  });
  if (element) {
    element.classList.add("active");
    element.setAttribute("aria-pressed", "true");
  }
  processAndRenderStreams(streamCache);
}

// --- Streams Engine ---

async function fetchStreams(forceRefresh = false) {
  const data = await fetchWithCache("sf_streams", `${API_BASE}/matches/all`, CACHE_TTL_STREAMS, forceRefresh);
  if (Array.isArray(data)) {
    streamCache = data;
    processAndRenderStreams(streamCache);
    return;
  }
  streamCache = [];
  renderStreamsError("Unable to load network feeds.");
}

function renderStreamsError(message) {
  const liveGrid = document.getElementById("live-streams-display");
  const upcomingGrid = document.getElementById("upcoming-streams-display");
  if (liveGrid) liveGrid.replaceChildren(createEmptyState(message));
  if (upcomingGrid) upcomingGrid.replaceChildren();
}

function formatDateHeader(timestampMs) {
  const date = new Date(Number(timestampMs));
  if (Number.isNaN(date.getTime())) return "DATE_UNKNOWN";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "TOMORROW";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function processAndRenderStreams(matches) {
  const liveGrid = document.getElementById("live-streams-display");
  const upcomingGrid = document.getElementById("upcoming-streams-display");
  const liveCountEl = document.getElementById("live-count");
  const upcomingCountEl = document.getElementById("upcoming-count");

  if (!liveGrid || !upcomingGrid) return;

  cardObserver.disconnect();
  liveGrid.replaceChildren();
  upcomingGrid.replaceChildren();

  syncSectionState("live-stream-group", "live-toggle-btn");
  syncSectionState("upcoming-stream-group", "upcoming-toggle-btn");

  const now = Date.now();
  const activeCategoryNorm = normalizeStr(currentCategory);

  const filteredMatches = matches.filter(match => {
    const matchCategoryNorm = normalizeStr(match.category);
    const matchesCategory = currentCategory === "all" || matchCategoryNorm === activeCategoryNorm;

    const homeName = match.teams?.home?.name || "";
    const awayName = match.teams?.away?.name || "";
    const matchTitle = match.title || "";
    const leagueName = match.category || "";

    const matchesSearch = !searchQuery ||
      matchTitle.toLowerCase().includes(searchQuery) ||
      homeName.toLowerCase().includes(searchQuery) ||
      awayName.toLowerCase().includes(searchQuery) ||
      leagueName.toLowerCase().includes(searchQuery);

    return matchesCategory && matchesSearch;
  });

  const liveStreams = [];
  const upcomingStreams = [];

  filteredMatches.forEach(match => {
    const matchTimestamp = Number(match.date);
    if (!Number.isFinite(matchTimestamp)) return;

    if (now >= matchTimestamp - LIVE_THRESHOLD) {
      liveStreams.push(match);
    } else {
      upcomingStreams.push(match);
    }
  });

  liveStreams.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || Number(a.date) - Number(b.date));
  upcomingStreams.sort((a, b) => Number(a.date) - Number(b.date));

  if (liveCountEl) liveCountEl.textContent = `[${liveStreams.length}]`;
  if (upcomingCountEl) upcomingCountEl.textContent = `[${upcomingStreams.length}]`;

  if (!liveStreams.length) {
    liveGrid.appendChild(createEmptyState("No live transmissions match parameters."));
  } else {
    liveStreams.forEach(match => liveGrid.appendChild(createCardWrapper(match, true)));
  }

  if (!upcomingStreams.length) {
    upcomingGrid.appendChild(createEmptyState("No upcoming transmissions match parameters."));
  } else {
    let currentDateKey = null;
    let currentGrid = null;

    upcomingStreams.forEach(match => {
      const dateKey = formatDateHeader(match.date);
      const subgroupId = `date-group-${normalizeStr(dateKey)}`;

      if (dateKey !== currentDateKey) {
        currentDateKey = dateKey;

        const dateSection = document.createElement("div");
        dateSection.className = "date-group-section";
        dateSection.id = subgroupId;

        const isCollapsed = collapsedSections.has(subgroupId);
        if (isCollapsed) dateSection.classList.add("collapsed");

        const dateHeader = document.createElement("div");
        dateHeader.className = "date-group-header";
        dateHeader.setAttribute("role", "button");
        dateHeader.setAttribute("tabindex", "0");
        dateHeader.setAttribute("aria-expanded", String(!isCollapsed));
        dateHeader.innerHTML = `
          <div class="date-header-title">
            <span class="date-prefix">//</span> ${escapeHTML(dateKey)}
          </div>
          <button class="cyber-toggle-btn sub-toggle-btn" type="button" aria-label="Toggle Date Section">
            <span class="btn-symbol">${isCollapsed ? "[ + ]" : "[ − ]"}</span>
          </button>
        `;

        dateHeader.addEventListener("click", (e) => {
          e.stopPropagation();
          const btnEl = dateHeader.querySelector(".cyber-toggle-btn");
          toggleSection(subgroupId, dateSection, btnEl);
        });

        currentGrid = document.createElement("div");
        currentGrid.className = "streams-grid";

        dateSection.append(dateHeader, currentGrid);
        upcomingGrid.appendChild(dateSection);
      }

      currentGrid.appendChild(createCardWrapper(match, false));
    });
  }
}

function syncSectionState(groupId, btnId) {
  const group = document.getElementById(groupId);
  const btn = document.getElementById(btnId);
  if (!group) return;

  const isCollapsed = collapsedSections.has(groupId);
  group.classList.toggle("collapsed", isCollapsed);
  group.setAttribute("aria-expanded", String(!isCollapsed));
  if (btn) {
    const sym = btn.querySelector(".btn-symbol");
    if (sym) sym.textContent = isCollapsed ? "[ + ]" : "[ − ]";
  }
}

function createEmptyState(message) {
  const emptyDiv = document.createElement("div");
  emptyDiv.className = "no-streams";
  emptyDiv.textContent = message;
  return emptyDiv;
}

function createCardWrapper(match, isLive) {
  const card = document.createElement("div");
  card.className = `stream-card ${!isLive ? "upcoming-card" : ""}`;
  card.style.minHeight = "240px";
  card.style.contentVisibility = "auto";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");

  const onSelect = () => selectMatch(match);
  card.addEventListener("click", onSelect);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  });

  card._matchData = match;
  card._isLive = isLive;
  card._isRendered = false;

  cardObserver.observe(card);
  return card;
}

function populateCardContent(card, match, isLive) {
  const thumbnailBox = document.createElement("div");
  thumbnailBox.className = "thumbnail-box";

  const badgeGroup = document.createElement("div");
  badgeGroup.className = "badge-group";

  if (match.popular) {
    const popularTag = document.createElement("span");
    popularTag.className = "badge popular-badge";
    popularTag.textContent = "⚡ POPULAR";
    badgeGroup.appendChild(popularTag);
  }

  if (!isLive) {
    const badge = document.createElement("span");
    badge.className = "badge upcoming-badge";
    badge.textContent = "UPCOMING";
    badgeGroup.appendChild(badge);
  }

  thumbnailBox.appendChild(badgeGroup);

  const homeBadge = match.teams?.home?.badge;
  const awayBadge = match.teams?.away?.badge;

  if (homeBadge && awayBadge) {
    const matchupContainer = document.createElement("div");
    matchupContainer.className = "matchup-container";

    const homeName = match.teams?.home?.name || "Home";
    const homeDiv = document.createElement("div");
    homeDiv.className = "team-wrapper";
    homeDiv.innerHTML = `
      <img class="team-badge-img" 
            src="https://streamed.st/api/images/badge/${escapeHTML(homeBadge)}.webp" 
            alt="${escapeHTML(homeName)}"
            onerror="this.onerror=null; this.src='/assets/icons/favicon.png';" />
      <span class="team-name">${escapeHTML(homeName)}</span>
    `;

    const vsDiv = document.createElement("div");
    vsDiv.className = "vs-divider";
    vsDiv.textContent = "VS";

    const awayName = match.teams?.away?.name || "Away";
    const awayDiv = document.createElement("div");
    awayDiv.className = "team-wrapper";
    awayDiv.innerHTML = `
      <img class="team-badge-img" 
            src="https://streamed.st/api/images/badge/${escapeHTML(awayBadge)}.webp" 
            alt="${escapeHTML(awayName)}"
            onerror="this.onerror=null; this.src='/assets/icons/favicon.png';" />
      <span class="team-name">${escapeHTML(awayName)}</span>
    `;

    matchupContainer.append(homeDiv, vsDiv, awayDiv);
    thumbnailBox.appendChild(matchupContainer);
  } else {
    const image = document.createElement("img");
    image.className = "single-poster";
    const FALLBACK_POSTER = "/assets/images/no-image-hr.svg";
    let posterUrl = FALLBACK_POSTER;

    if (match.poster && typeof match.poster === "string" && match.poster.trim() !== "" && match.poster !== "null") {
      if (match.poster.startsWith("http")) {
        posterUrl = match.poster;
      } else if (match.poster.startsWith("/")) {
        posterUrl = `https://streamed.st${match.poster}.webp`;
      } else {
        posterUrl = `https://streamed.st/api/images/proxy/${match.poster}.webp`;
      }
    }

    if (posterUrl === FALLBACK_POSTER) image.style.scale = "0.6";
    image.onerror = function () {
      this.onerror = null;
      this.src = FALLBACK_POSTER;
      this.style.scale = "0.6";
    };
    image.src = posterUrl;
    thumbnailBox.appendChild(image);
  }

  const details = document.createElement("div");
  details.className = "stream-details";

  const meta = document.createElement("div");
  meta.className = "stream-meta";

  const categoryName = match.category ? match.category.toUpperCase() : "GENERAL";
  const iconClass = getIcon(match.category);

  meta.innerHTML = `
    <span class="stream-league">
      <i class="fa-solid ${iconClass}" aria-hidden="true"></i> ${escapeHTML(categoryName)}
    </span>
    <span class="stream-time ${isLive ? "live-time-accent" : ""}">${formatStreamTime(match.date, isLive)}</span>
  `;

  const title = document.createElement("div");
  title.className = "stream-title-wrapper";
  title.innerHTML = `<div class="stream-title">${escapeHTML(match.title || "Untitled Transmission")}</div>`;

  const statusRow = document.createElement("div");
  statusRow.className = "stream-status-row";

  details.append(meta, title, statusRow);
  card.append(thumbnailBox, details);
}

function formatStreamTime(timestampMs, isLive = false) {
  if (isLive) return "LIVE";

  const matchDate = new Date(Number(timestampMs));
  if (Number.isNaN(matchDate.getTime())) return "TIME_UNKNOWN";

  const now = new Date();
  const isToday = matchDate.toDateString() === now.toDateString();

  if (isToday) {
    return `TODAY ${matchDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return matchDate.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// --- Match & Source Selection ---

async function fetchSourceStreams(sourceObj) {
  if (!sourceObj || !sourceObj.source || !sourceObj.id) return null;
  try {
    const response = await fetch(`${API_BASE}/stream/${sourceObj.source}/${sourceObj.id}`);
    if (!response.ok) return null;
    const streams = await response.json();
    return Array.isArray(streams) && streams.length > 0 ? streams : null;
  } catch (err) {
    console.error(`Error fetching streams for source ${sourceObj.source}:`, err);
    return null;
  }
}

async function selectMatch(match) {
  if (!match.sources || !match.sources.length) return;

  currentMatch = match;
  activeSourceIndex = 0;

  let workingStreams = null;
  let workingSourceIndex = 0;

  for (let i = 0; i < match.sources.length; i++) {
    const streams = await fetchSourceStreams(match.sources[i]);
    if (streams) {
      workingStreams = streams;
      workingSourceIndex = i;
      break;
    }
  }

  if (workingStreams) {
    activeSourceIndex = workingSourceIndex;
    currentSourceStreams = workingStreams;
    currentEmbedUrl = workingStreams[0].embedUrl;

    renderSourceAndStreamSwitcher(currentMatch.sources, currentSourceStreams);
    loadStream(currentEmbedUrl, currentMatch.title, currentMatch.category);
  } else {
    activeSourceIndex = 0;
    currentSourceStreams = [];
    currentEmbedUrl = "";

    renderSourceAndStreamSwitcher(currentMatch.sources, []);
    loadStream("", currentMatch.title, currentMatch.category);
  }
}

async function loadSourceStream(sourceIdx) {
  if (!currentMatch || !currentMatch.sources[sourceIdx]) return;

  activeSourceIndex = sourceIdx;
  const selectedSource = currentMatch.sources[sourceIdx];

  const streams = await fetchSourceStreams(selectedSource);

  if (streams) {
    currentSourceStreams = streams;
    currentEmbedUrl = streams[0].embedUrl;

    renderSourceAndStreamSwitcher(currentMatch.sources, currentSourceStreams);
    loadStream(currentEmbedUrl, currentMatch.title, currentMatch.category);
  } else {
    currentSourceStreams = [];
    currentEmbedUrl = "";

    const player = document.getElementById("live-player");
    if (player) player.src = "";

    renderSourceAndStreamSwitcher(currentMatch.sources, []);
  }
}

function renderSourceAndStreamSwitcher(sources, availableStreams) {
  const container = document.getElementById("player-sources");
  if (!container) return;

  container.replaceChildren();

  const sourcesRow = document.createElement("div");
  sourcesRow.className = "selector-row sources-row";

  const sourcesPrefix = document.createElement("span");
  sourcesPrefix.className = "row-prefix prefix-cyan";
  sourcesPrefix.textContent = "SOURCES //";
  sourcesRow.appendChild(sourcesPrefix);

  sources.forEach((src, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isCurrentActive = idx === activeSourceIndex;
    btn.className = `source-btn ${isCurrentActive ? "active" : ""}`;

    const sourceLabel = (src.source || src.name || `SRC_${idx + 1}`).toUpperCase();
    const countBadge = (isCurrentActive && availableStreams && availableStreams.length > 0)
      ? `<span class="src-badge-count">${availableStreams.length}</span>`
      : "";

    btn.innerHTML = `
      <span class="src-name">${escapeHTML(sourceLabel)}</span>
      ${countBadge}
    `;
    btn.addEventListener("click", () => loadSourceStream(idx));
    sourcesRow.appendChild(btn);
  });

  container.appendChild(sourcesRow);

  if (availableStreams && availableStreams.length > 0) {
    const linksRow = document.createElement("div");
    linksRow.className = "selector-row links-row";

    const linksPrefix = document.createElement("span");
    linksPrefix.className = "row-prefix prefix-yellow";
    linksPrefix.textContent = "QUALITY / STREAM //";
    linksRow.appendChild(linksPrefix);

    const streamGrid = document.createElement("div");
    streamGrid.className = "cyber-stream-grid";

    availableStreams.forEach((st, streamIdx) => {
      const streamBtn = document.createElement("button");
      streamBtn.type = "button";
      const isActive = st.embedUrl === currentEmbedUrl;
      streamBtn.className = `cyber-feed-btn ${isActive ? "active" : ""}`;

      const isHd = st.isHd || st.hd || st.quality === "HD" || st.quality === "1080p" || st.quality === "720p";
      const language = st.language || st.lang || "";
      const description = st.description || st.channel || st.name || st.title || st.streamName || "";

      const labelText = (language && description)
        ? `${language} - ${description}`
        : (description || language || `Stream ${streamIdx + 1}`);

      const viewerBadge = (st.viewers !== undefined && st.viewers !== null)
        ? `<span class="feed-viewers"><i class="fa-solid fa-eye" aria-hidden="true"></i> ${escapeHTML(String(st.viewers))}</span>`
        : "";

      streamBtn.innerHTML = `
        <span class="feed-index">#${streamIdx + 1}</span>
        ${isHd ? '<span class="feed-badge-hd">HD</span>' : ""}
        <span class="feed-meta" title="${escapeHTML(labelText)}">${escapeHTML(labelText)}</span>
        ${viewerBadge}
      `;

      streamBtn.addEventListener("click", () => {
        currentEmbedUrl = st.embedUrl;
        loadStream(currentEmbedUrl, currentMatch.title, currentMatch.category);
        renderSourceAndStreamSwitcher(sources, availableStreams);
      });

      streamGrid.appendChild(streamBtn);
    });

    linksRow.appendChild(streamGrid);
    container.appendChild(linksRow);
  } else {
    const emptyNotice = document.createElement("div");
    emptyNotice.className = "no-source-feeds-notice";
    emptyNotice.innerHTML = `<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> No active stream feeds available for this source. Try selecting another source above.`;
    container.appendChild(emptyNotice);
  }
}

// --- Video Player Controls ---

function scrollToPlayer() {
  const wrapper = document.getElementById("player-wrapper");
  const nav = document.getElementById("top-bar");
  if (!wrapper) return;

  requestAnimationFrame(() => {
    setTimeout(() => {
      const elementPosition = wrapper.offsetTop;
      const offsetPosition = elementPosition - (nav ? nav.offsetHeight : 0) - 16;

      try {
        document.body.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      } catch (e) {
        document.body.scrollTo(0, offsetPosition);
      }
    }, 60);
  });
}

function loadStream(embedUrl, titleText, leagueText) {
  const layout = document.getElementById("main-layout");
  const wrapper = document.getElementById("player-wrapper");
  const player = document.getElementById("live-player");
  const title = document.getElementById("player-title");
  const league = document.getElementById("player-league");

  if (!wrapper || !layout) return;

  if (title) title.textContent = titleText || "";
  if (league) league.textContent = (leagueText || "LIVE STREAM").toUpperCase();

  if (player) {
    player.classList.remove("loaded");
    player.style.opacity = "0";

    if (!embedUrl) {
      player.onload = null;
      player.src = "";
    } else {
      player.onload = () => {
        if (player.src && player.src !== "about:blank") {
          player.classList.add("loaded");
          player.style.opacity = "1";
        }
      };
      player.src = embedUrl;
    }
  }

  wrapper.classList.add("active");
  layout.classList.add("player-active");

  if (isMinimized) {
    isMinimized = false;
    resetMiniPlayerStyles(wrapper);
  }

  scrollToPlayer();
}

function reloadPlayer() {
  const player = document.getElementById("live-player");
  if (player && currentEmbedUrl) {
    player.classList.remove("loaded");
    player.style.opacity = "0";

    player.onload = () => {
      player.classList.add("loaded");
      player.style.opacity = "1";
    };

    player.src = "";
    requestAnimationFrame(() => { player.src = currentEmbedUrl; });
  }
}

function closePlayer() {
  const wrapper = document.getElementById("player-wrapper");
  const layout = document.getElementById("main-layout");
  const player = document.getElementById("live-player");

  if (!wrapper || !player) return;

  wrapper.classList.remove("active");
  if (layout) layout.classList.remove("player-active");

  resetMiniPlayerStyles(wrapper);

  player.onload = null;
  player.src = "";
  player.classList.remove("loaded");
  player.style.opacity = "0";

  currentEmbedUrl = "";
  currentMatch = null;
  isMinimized = false;
}

function resetMiniPlayerStyles(wrapper) {
  wrapper.classList.remove("mini");
  wrapper.style.left = "";
  wrapper.style.top = "";
  wrapper.style.right = "";
  wrapper.style.bottom = "";
  wrapper.style.width = "";
}

function toggleMiniPlayer() {
  const wrapper = document.getElementById("player-wrapper");
  if (!wrapper) return;

  isMinimized = !isMinimized;
  if (isMinimized) {
    wrapper.classList.add("mini");
  } else {
    resetMiniPlayerStyles(wrapper);
    scrollToPlayer();
  }
}

function setupDraggableMiniPlayer() {
  if (miniPlayerListenersAttached) return;
  const wrapper = document.getElementById("player-wrapper");
  if (!wrapper) return;
  const header = wrapper.querySelector(".player-controls");
  if (!header) return;

  miniPlayerListenersAttached = true;
  let isDragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  header.addEventListener("pointerdown", dragStart);
  document.addEventListener("pointermove", drag);
  document.addEventListener("pointerup", dragEnd);
  document.addEventListener("pointercancel", dragEnd);

  function dragStart(e) {
    if (!wrapper.classList.contains("mini") || e.target.closest(".control-buttons")) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    if (header.setPointerCapture) {
      header.setPointerCapture(e.pointerId);
    }

    const rect = wrapper.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    wrapper.style.left = `${startLeft}px`;
    wrapper.style.top = `${startTop}px`;
    wrapper.style.right = "auto";
    wrapper.style.bottom = "auto";
  }

  function drag(e) {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Keep mini player bounded within the visible viewport
    const newLeft = Math.max(10, Math.min(window.innerWidth - wrapper.offsetWidth - 10, startLeft + deltaX));
    const newTop = Math.max(10, Math.min(window.innerHeight - wrapper.offsetHeight - 10, startTop + deltaY));

    wrapper.style.left = `${newLeft}px`;
    wrapper.style.top = `${newTop}px`;
  }

  function dragEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    if (e && header.releasePointerCapture && header.hasPointerCapture(e.pointerId)) {
      header.releasePointerCapture(e.pointerId);
    }
  }
}

// --- Window Exports & Bootstrapping ---

window.StreamApp = {
  reloadPlayer,
  closePlayer,
  toggleMiniPlayer,
  filterCategory,
  selectMatch
};

document.addEventListener("DOMContentLoaded", () => {
  if (typeof topNavBar === "function") topNavBar();
  if (typeof bottomNavBar === "function") bottomNavBar();
  if (typeof setActiveIcon === "function") setActiveIcon("sports");
  if (typeof setUpScrollEvents === "function") setUpScrollEvents();
  init();
})
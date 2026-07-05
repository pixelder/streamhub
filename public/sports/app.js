const API_BASE = "https://streamfree.top/api/v1";

let currentCategory = "all";
let streamCache = [];
let timeCheckerInterval = null;
let streamRefreshInterval = null;
let isMinimized = false;
let miniPlayerListenersAttached = false;

// Cache configuration, in minutes
const CACHE_TTL_STREAMS = 5;
const CACHE_TTL_CATEGORIES = 1440; // 24 hours

const LIVE_THRESHOLD = 600; // Treat as live 10 minutes before match_timestamp

async function init() {
    setupDraggableMiniPlayer();

    await fetchCategories();
    await fetchStreams();

    let lastRenderSignature = getRenderSignature(streamCache);

    if (timeCheckerInterval) {
        clearInterval(timeCheckerInterval);
    }

    // Re-render only when an upcoming event crosses into the live window.
    timeCheckerInterval = setInterval(() => {
        if (!streamCache.length) return;

        const currentSignature = getRenderSignature(streamCache);

        if (currentSignature !== lastRenderSignature) {
            processAndRenderStreams(streamCache);
            lastRenderSignature = currentSignature;
        }
    }, 30000);

    if (streamRefreshInterval) {
        clearInterval(streamRefreshInterval);
    }

    // Refresh from the server periodically.
    // This removes streams that the API no longer reports as live.
    streamRefreshInterval = setInterval(async () => {
        const previousSignature = getRenderSignature(streamCache);

        await fetchStreams(true);

        const nextSignature = getRenderSignature(streamCache);

        if (previousSignature !== nextSignature) {
            processAndRenderStreams(streamCache);
        }
    }, CACHE_TTL_STREAMS * 60 * 1000);
}

function getRenderSignature(streams) {
    const now = Math.floor(Date.now() / 1000);

    return streams
        .map(stream => {
            const isLive = now >= stream.match_timestamp - LIVE_THRESHOLD;
            return `${stream.stream_key}-${isLive}`;
        })
        .join("|");
}

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

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

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

async function fetchCategories() {
    const data = await fetchWithCache(
        "sf_categories",
        `${API_BASE}/categories`,
        CACHE_TTL_CATEGORIES
    );

    if (!data?.categories || !Array.isArray(data.categories)) {
        return;
    }

    const container = document.getElementById("categories-bar");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const allButton = document.createElement("button");
    allButton.className = "category-btn";
    allButton.textContent = "All";
    allButton.addEventListener("click", () => filterCategory("all", allButton));
    container.appendChild(allButton);

    const fragment = document.createDocumentFragment();

    data.categories.forEach(category => {
        const button = document.createElement("button");

        button.className = "category-btn";
        button.textContent = category;

        button.addEventListener("click", () => {
            filterCategory(category, button);
        });

        fragment.appendChild(button);
    });

    container.appendChild(fragment);

    const activeButton = [...container.querySelectorAll(".category-btn")].find(
        button => button.textContent.toLowerCase() === currentCategory.toLowerCase()
    );

    (activeButton || allButton).classList.add("active");
}

async function fetchStreams(forceRefresh = false) {
    const data = await fetchWithCache(
        "sf_streams",
        `${API_BASE}/streams`,
        CACHE_TTL_STREAMS,
        forceRefresh
    );

    if (data?.streams && Array.isArray(data.streams)) {
        streamCache = data.streams;
        processAndRenderStreams(streamCache);
        return;
    }

    streamCache = [];

    const liveGrid = document.getElementById("live-streams-display");
    const upcomingGrid = document.getElementById("upcoming-streams-display");

    if (liveGrid) {
        liveGrid.replaceChildren(createEmptyState("Unable to load events."));
    }

    if (upcomingGrid) {
        upcomingGrid.replaceChildren(createEmptyState("No upcoming events scheduled."));
    }
}

function filterCategory(category, element) {
    currentCategory = category;

    document.querySelectorAll(".category-btn").forEach(button => {
        button.classList.remove("active");
    });

    if (element) {
        element.classList.add("active");
    }

    processAndRenderStreams(streamCache);
}

function processAndRenderStreams(streams) {
    const liveGrid = document.getElementById("live-streams-display");
    const upcomingGrid = document.getElementById("upcoming-streams-display");

    if (!liveGrid || !upcomingGrid) {
        return;
    }

    liveGrid.replaceChildren();
    upcomingGrid.replaceChildren();

    const currentUnixTime = Math.floor(Date.now() / 1000);

    const displayStreams = currentCategory === "all"
        ? streams
        : streams.filter(stream =>
            String(stream.category || "").toLowerCase() === currentCategory.toLowerCase()
        );

    if (!displayStreams.length) {
        liveGrid.appendChild(createEmptyState("No events found for this category."));
        upcomingGrid.appendChild(createEmptyState("No upcoming events scheduled."));
        return;
    }

    const liveStreams = [];
    const upcomingStreams = [];

    displayStreams.forEach(stream => {
        const matchTimestamp = Number(stream.match_timestamp);

        if (!Number.isFinite(matchTimestamp)) {
            return;
        }

        if (currentUnixTime >= matchTimestamp - LIVE_THRESHOLD) {
            liveStreams.push(stream);
        } else {
            upcomingStreams.push(stream);
        }
    });

    // Keep chronological proximity sort for general grid layout order
// --- CYBER TELEMETRY AUDIT: SORT BY TOTAL VIEWERS (DESCENDING) ---
    liveStreams.sort((a, b) => {
        const viewersA = Number(a.viewers) || 0;
        const viewersB = Number(b.viewers) || 0;
        return viewersB - viewersA; // Highest traffic nodes bubble to the absolute top
    });

    upcomingStreams.sort((a, b) => {
        return a.match_timestamp - b.match_timestamp;
    });

    const liveFragment = document.createDocumentFragment();
    const upcomingFragment = document.createDocumentFragment();

    if (!liveStreams.length) {
        liveFragment.appendChild(
            createEmptyState("No events are live at this exact moment.")
        );
    } else {
        // Since the array is now strictly sorted by viewers, 
        // index === 0 is guaranteed to be your highest peak-traffic stream.
        liveStreams.forEach((stream, index) => {
            const isFeatured = index === 0;
            liveFragment.appendChild(createCard(stream, isFeatured, true));
        });
    }
    
    if (!upcomingStreams.length) {
        upcomingFragment.appendChild(
            createEmptyState("No upcoming events scheduled.")
        );
    } else {
        upcomingStreams.forEach(stream => {
            upcomingFragment.appendChild(createCard(stream, false, false));
        });
    }

    liveGrid.appendChild(liveFragment);
    upcomingGrid.appendChild(upcomingFragment);
}

function createEmptyState(message) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "no-streams";
    emptyDiv.textContent = message;
    return emptyDiv;
}

function createCard(stream, isFeatured, isLive) {
    const card = document.createElement("div");

    card.className = [
        "stream-card",
        isFeatured ? "featured-live" : "",
        !isLive ? "upcoming-card" : ""
    ].filter(Boolean).join(" ");

    card.addEventListener("click", () => {
        loadStream(stream.embed_url, stream.name, stream.league);
    });

    // 1. Thumbnail Container & Badges
    const thumbnailBox = document.createElement("div");
    thumbnailBox.className = "thumbnail-box";

    const badge = document.createElement("span");
    badge.className = `live-badge ${!isLive ? "upcoming-badge" : ""}`;
    badge.textContent = isLive
        ? (isFeatured ? "🔥 Top Live" : "Live")
        : "Upcoming";

    const image = document.createElement("img");
    image.src = stream.thumbnail_url || "";
    image.alt = stream.name || "Stream thumbnail";
    image.loading = "lazy";

    image.onerror = () => {
        image.onerror = null;
        image.src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&auto=format&fit=crop";
    };

    thumbnailBox.append(badge, image);

    // 2. Stream Details (Wrapper with left-axis color anchor)
    const details = document.createElement("div");
    details.className = "stream-details";

    // --- Meta Row (Telemetry Data Layout) ---
    const meta = document.createElement("div");
    meta.className = "stream-meta";
    
    const league = document.createElement("span");
    league.className = "stream-league";
    league.textContent = stream.league || "Unknown league";
    
    const category = document.createElement("span");
    category.className = "stream-category";
    category.textContent = stream.category || "Unknown sport";

    const time = document.createElement("span");
    time.className = "stream-time";
    time.textContent = formatStreamTime(stream.match_timestamp);

    meta.append(league, category, time);

    // --- Title Row (Prefixed with DATA_NODE//) ---
    const titleWrapper = document.createElement("div");
    titleWrapper.className = "stream-title-wrapper";

    const title = document.createElement("div");
    title.className = "stream-title";
    title.textContent = stream.name || "Untitled event";

    titleWrapper.append(title);

    // --- Footer Status Row (Automated Matrix Readout) ---
    const statusRow = document.createElement("div");
    statusRow.className = "stream-status-row";

    // 3. Complete Component Compilation
    details.append(meta, titleWrapper, statusRow);
    card.append(thumbnailBox, details);

    return card;
}
function formatStreamTime(timestamp) {
    const matchDate = new Date(Number(timestamp) * 1000);

    if (Number.isNaN(matchDate.getTime())) {
        return "Time unavailable";
    }

    const now = new Date();

    const isToday =
        matchDate.getFullYear() === now.getFullYear() &&
        matchDate.getMonth() === now.getMonth() &&
        matchDate.getDate() === now.getDate();

    if (isToday) {
        return `Today, ${matchDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })}`;
    }

    return matchDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function resetMiniPlayerPosition(wrapper) {
    wrapper.style.left = "";
    wrapper.style.top = "";
    wrapper.style.right = "";
    wrapper.style.bottom = "";
    wrapper.style.width = "";
    wrapper.style.height = "";
}

function toggleMiniPlayer() {
    const wrapper = document.getElementById("player-wrapper");
    const layout = document.getElementById("main-layout");

    if (!wrapper || !layout) {
        return;
    }

    isMinimized = !isMinimized;

    if (isMinimized) {
        resetMiniPlayerPosition(wrapper);
        wrapper.classList.add("mini");
        layout.classList.add("mini-active");
    } else {
        wrapper.classList.remove("mini");
        layout.classList.remove("mini-active");
        resetMiniPlayerPosition(wrapper);

        if (window.innerWidth < 900) {
            wrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }
}

function closePlayer() {
    const wrapper = document.getElementById("player-wrapper");
    const layout = document.getElementById("main-layout");
    const player = document.getElementById("live-player");

    if (!wrapper || !layout || !player) {
        return;
    }

    wrapper.classList.remove("active", "mini", "dragging");
    layout.classList.remove("player-active", "mini-active");

    resetMiniPlayerPosition(wrapper);

    player.src = "";
    currentEmbedUrl = "";
    isMinimized = false;
}

function reloadPlayer() {
    const player = document.getElementById("live-player");

    if (!player || !currentEmbedUrl) {
        return;
    }

    // Clearing first forces a fresh iframe navigation.
    player.src = "";
    
    requestAnimationFrame(() => {
        player.src = currentEmbedUrl;
    });
}

function loadStream(embedUrl, name, league) {
    const layout = document.getElementById("main-layout");
    const wrapper = document.getElementById("player-wrapper");
    const player = document.getElementById("live-player");
    const title = document.getElementById("player-title");
    const leagueElement = document.getElementById("player-league");

    if (!layout || !wrapper || !player || !embedUrl) {
        return;
    }

    currentEmbedUrl = embedUrl;

    if (title) {
        title.textContent = name || "Live stream";
    }

    if (leagueElement) {
        leagueElement.textContent = league || "";
    }

    player.src = currentEmbedUrl;

    wrapper.classList.add("active");
    layout.classList.add("player-active");

    if (isMinimized) {
        isMinimized = false;
        wrapper.classList.remove("mini");
        layout.classList.remove("mini-active");
        resetMiniPlayerPosition(wrapper);
    }

    if (window.innerWidth < 900) {
        wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function setupDraggableMiniPlayer() {
    if (miniPlayerListenersAttached) {
        return;
    }

    const wrapper = document.getElementById("player-wrapper");

    if (!wrapper) {
        return;
    }

    const header = wrapper.querySelector(".player-controls");

    if (!header) {
        return;
    }

    miniPlayerListenersAttached = true;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    header.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    header.addEventListener("touchstart", dragStart, { passive: false });
    document.addEventListener("touchmove", drag, { passive: false });
    document.addEventListener("touchend", dragEnd);

    function getPointerPosition(event) {
        if (event.type.startsWith("touch")) {
            const touch = event.touches[0] || event.changedTouches[0];

            return {
                x: touch.clientX,
                y: touch.clientY
            };
        }

        return {
            x: event.clientX,
            y: event.clientY
        };
    }

    function dragStart(event) {
        if (!wrapper.classList.contains("mini")) {
            return;
        }

        if (event.target.closest(".control-buttons")) {
            return;
        }

        const pointer = getPointerPosition(event);
        const rect = wrapper.getBoundingClientRect();

        isDragging = true;
        wrapper.classList.add("dragging");

        startX = pointer.x;
        startY = pointer.y;
        startLeft = rect.left;
        startTop = rect.top;

        wrapper.style.left = `${rect.left}px`;
        wrapper.style.top = `${rect.top}px`;
        wrapper.style.right = "auto";
        wrapper.style.bottom = "auto";
    }

    function drag(event) {
        if (!isDragging) {
            return;
        }

        event.preventDefault();

        const pointer = getPointerPosition(event);

        const deltaX = pointer.x - startX;
        const deltaY = pointer.y - startY;

        const maxLeft = Math.max(0, window.innerWidth - wrapper.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - wrapper.offsetHeight);

        const nextLeft = Math.max(0, Math.min(startLeft + deltaX, maxLeft));
        const nextTop = Math.max(0, Math.min(startTop + deltaY, maxTop));

        wrapper.style.left = `${nextLeft}px`;
        wrapper.style.top = `${nextTop}px`;
    }

    function dragEnd() {
        if (!isDragging) {
            return;
        }

        isDragging = false;
        wrapper.classList.remove("dragging");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    topNavBar();
    bottomNavBar();
    setActiveIcon("sports");
    setUpScrollEvents();
    init();
});
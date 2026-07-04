const API_BASE = "https://streamfree.top/api/v1";
let currentCategory = 'all';
let streamCache = []; // Holds the active dataset
let timeCheckerInterval;
let isMinimized = false;

// Cache Configuration (in minutes)
const CACHE_TTL_STREAMS = 5;
const CACHE_TTL_CATEGORIES = 1440; // 24 hours


// Initialize application
// Initialize application
async function init() {
    setupDraggableMiniPlayer(); // Initialize drag listeners
    
    await fetchCategories();
    await fetchStreams();
    
    // THE OBSERVER (Optimized)
    let lastRenderSignature = "";

    timeCheckerInterval = setInterval(() => {
        if (streamCache.length > 0) {
            // 1. Calculate a signature of the current state
            // We look at the IDs and their status (Live vs Upcoming)
            const currentSignature = streamCache.map(s => {
                const isLive = (Math.floor(Date.now() / 1000) >= (s.match_timestamp - 600));
                return `${s.id}-${isLive}`;
            }).join('|');

            // 2. Only re-render if something changed
            if (currentSignature !== lastRenderSignature) {
                processAndRenderStreams(streamCache);
                lastRenderSignature = currentSignature;
            }
        }
    }, 30000);
}

// Generic Cache Helper
async function fetchWithCache(cacheKey, url, ttlMinutes) {
    try {
        const cachedItem = localStorage.getItem(cacheKey);
        
        if (cachedItem) {
            const parsed = JSON.parse(cachedItem);
            const now = new Date().getTime();
            
            // If cache hasn't expired, return local data
            if (now < parsed.expiry) {
                return parsed.data;
            }
        }

        // If no cache or expired, fetch from server
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Save to cache with new expiry time
        const expiryTime = new Date().getTime() + (ttlMinutes * 60 * 1000);
        localStorage.setItem(cacheKey, JSON.stringify({ data, expiry: expiryTime }));
        
        return data;
    } catch (err) {
        console.error(`Error fetching ${url}:`, err);
        // Fallback: If network fails but we have stale cache, use it anyway
        const staleData = localStorage.getItem(cacheKey);
        return staleData ? JSON.parse(staleData).data : null;
    }
}

// Fetch categories from API or Cache
async function fetchCategories() {
    const data = await fetchWithCache('sf_categories', `${API_BASE}/categories`, CACHE_TTL_CATEGORIES);
    
    if (data && data.categories) {
        const container = document.getElementById('categories-bar');
        
        // Preserve the "All" button, remove the rest if re-rendering
        container.innerHTML = `<button class="category-btn active" onclick="filterCategory('all', this)">All</button>`;
        
        const fragment = document.createDocumentFragment();
        
        data.categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.textContent = cat;
            btn.onclick = () => filterCategory(cat, btn);
            fragment.appendChild(btn);
        });
        
        container.appendChild(fragment);
    }
}

// Fetch ALL streams once, cache them, and rely on client-side filtering
async function fetchStreams() {
    // We do NOT append ?category= anymore. We fetch everything to cache it locally.
    const data = await fetchWithCache('sf_streams', `${API_BASE}/streams`, CACHE_TTL_STREAMS);
    
    if (data && data.streams) {
        streamCache = data.streams; 
        processAndRenderStreams(streamCache);
    } else {
        document.getElementById('live-streams-display').innerHTML = `<div class="no-streams">Unable to load events.</div>`;
    }
}

// Change categories dynamically (INSTANT - No API call)
function filterCategory(category, element) {
    currentCategory = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        document.querySelector('.category-btn').classList.add('active');
    }

    // Just re-process the existing local array!
    processAndRenderStreams(streamCache);
}

// Process, split, sort, and render
function processAndRenderStreams(streams) {
    const liveGrid = document.getElementById('live-streams-display');
    const upcomingGrid = document.getElementById('upcoming-streams-display');
    
    // Clear out current grids
    liveGrid.innerHTML = '';
    upcomingGrid.innerHTML = '';

    const currentUnixTime = Math.floor(Date.now() / 1000);
    const LIVE_THRESHOLD = 600; // 10 minutes

    // 1. FILTER
    let displayStreams = streams;
    if (currentCategory !== 'all') {
        displayStreams = streams.filter(s => s.category.toLowerCase() === currentCategory.toLowerCase());
    }

    // 2. DOM FRAGMENTS
    const liveFragment = document.createDocumentFragment();
    const upcomingFragment = document.createDocumentFragment();

    if (!displayStreams || displayStreams.length === 0) {
        liveGrid.innerHTML = `<div class="no-streams">No events found for this category.</div>`;
        upcomingGrid.innerHTML = `<div class="no-streams">No upcoming events scheduled.</div>`;
        return;
    }

    // 3. SPLIT & SORT
    const liveStreams = [];
    const upcomingStreams = [];

    displayStreams.forEach(stream => {
        if (currentUnixTime >= (stream.match_timestamp - LIVE_THRESHOLD)) {
            liveStreams.push(stream);
        } else {
            upcomingStreams.push(stream);
        }
    });

    liveStreams.sort((a, b) => Math.abs(currentUnixTime - a.match_timestamp) - Math.abs(currentUnixTime - b.match_timestamp));
    upcomingStreams.sort((a, b) => a.match_timestamp - b.match_timestamp);

    // 4. RENDER TO FRAGMENTS FIRST
    if (liveStreams.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'no-streams';
        emptyDiv.textContent = 'No events are live at this exact moment.';
        liveFragment.appendChild(emptyDiv);
    } else {
        liveStreams.forEach((stream, index) => liveFragment.appendChild(createCard(stream, index === 0, true)));
    }

    if (upcomingStreams.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'no-streams';
        emptyDiv.textContent = 'No upcoming events scheduled.';
        upcomingFragment.appendChild(emptyDiv);
    } else {
        upcomingStreams.forEach(stream => upcomingFragment.appendChild(createCard(stream, false, false)));
    }

    // 5. ATTACH TO DOM ONCE
    liveGrid.appendChild(liveFragment);
    upcomingGrid.appendChild(upcomingFragment);
}

// Helper function to build the card HTML
function createCard(stream, isFeatured, isLive) {
    const card = document.createElement('div');
    card.className = `stream-card ${isFeatured ? 'featured-live' : ''} ${!isLive ? 'upcoming-card' : ''}`;
    card.onclick = () => loadStream(stream.embed_url, stream.name, stream.league);

    const matchDate = new Date(stream.match_timestamp * 1000);
    const today = new Date();
    let formattedTime = matchDate.toDateString() === today.toDateString() 
        ? `Today, ${matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
        : matchDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    let badgeText = isLive ? (isFeatured ? "🔥 Top Live" : "Live") : "Upcoming";

    card.innerHTML = `
        <div class="thumbnail-box">
            <span class="live-badge ${!isLive ? 'upcoming-badge' : ''}">${badgeText}</span>
            <img src="${stream.thumbnail_url}" onerror="this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&auto=format&fit=crop'" alt="${stream.name}">
        </div>
        <div class="stream-details">
            <div class="stream-meta">
                <span class="stream-league">${stream.league || stream.category}</span>
                <span class="stream-time">${formattedTime}</span>
            </div>
            <div class="stream-title">${stream.name}</div>
        </div>
    `;
    return card;
}

// Toggle between main view and mini-player (UPDATED)
function toggleMiniPlayer() {
    const wrapper = document.getElementById('player-wrapper');
    const layout = document.getElementById('main-layout');
    
    isMinimized = !isMinimized;
    
    if (isMinimized) {
        // Reset styles so it snaps to default bottom-right before they drag it
        wrapper.style.cssText = ''; 
        wrapper.classList.add('mini');
        layout.classList.add('mini-active');
    } else {
        wrapper.classList.remove('mini');
        layout.classList.remove('mini-active');
        // Clear out any drag coordinates or custom resizing
        wrapper.style.cssText = ''; 
        
        if (window.innerWidth < 900) {
            wrapper.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Close the player completely and kill the audio (UPDATED)
function closePlayer() {
    const wrapper = document.getElementById('player-wrapper');
    const layout = document.getElementById('main-layout');
    const player = document.getElementById('live-player');
    
    wrapper.classList.remove('active', 'mini');
    layout.classList.remove('player-active', 'mini-active');
    wrapper.style.cssText = ''; // Clean up drag styles
    
    player.src = ""; 
    isMinimized = false;
}

// Launch stream into player (Updated)
function loadStream(embedUrl, name, league) {
    const layout = document.getElementById('main-layout');
    const wrapper = document.getElementById('player-wrapper');
    const player = document.getElementById('live-player');
    
    document.getElementById('player-title').textContent = name;
    document.getElementById('player-league').textContent = league || "";
    
    player.src = embedUrl;
    
    // Ensure player is visible
    wrapper.classList.add('active');
    layout.classList.add('player-active');
    
    // Automatically expand the player if it was minimized
    if (isMinimized) {
        isMinimized = false;
        wrapper.classList.remove('mini');
        layout.classList.remove('mini-active');
    }
    
    if (window.innerWidth < 900) {
        wrapper.scrollIntoView({ behavior: 'smooth' });
    }
}

// --- Drag functionality for the Mini Player ---
function setupDraggableMiniPlayer() {
    const wrapper = document.getElementById('player-wrapper');
    const header = wrapper.querySelector('.player-controls');
    
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    // Mouse Events
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch Events (Mobile)
    header.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
        // Only allow dragging if minimized
        if (!wrapper.classList.contains('mini')) return;
        // Do not drag if they are clicking the minimize/close buttons
        if (e.target.closest('.control-buttons')) return;

        isDragging = true;
        wrapper.classList.add('dragging');

        // Get coordinates (handles both mouse and touch)
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        // Lock in current dimensions/positions before drag so it doesn't snap to CSS defaults
        const rect = wrapper.getBoundingClientRect();
        
        // Convert fixed CSS bottom/right to absolute top/left coordinates
        wrapper.style.left = rect.left + 'px';
        wrapper.style.top = rect.top + 'px';
        wrapper.style.bottom = 'auto'; 
        wrapper.style.right = 'auto';  
        
        startLeft = rect.left;
        startTop = rect.top;
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault(); // Prevents highlighting text while dragging

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const dx = clientX - startX;
        const dy = clientY - startY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        // Keep the player entirely inside the viewport
        const maxX = window.innerWidth - wrapper.offsetWidth;
        const maxY = window.innerHeight - wrapper.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));

        // Apply new position
        wrapper.style.left = newLeft + 'px';
        wrapper.style.top = newTop + 'px';
    }

    function dragEnd() {
        if (!isDragging) return;
        isDragging = false;
        wrapper.classList.remove('dragging');
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // Start app
    topNavBar()
    bottomNavBar();
    setActiveIcon('sports');
    setUpScrollEvents()
    init();
})
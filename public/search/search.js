const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_300 = 'https://image.tmdb.org/t/p/w300';
const IMAGE_342 = 'https://image.tmdb.org/t/p/w342';
const IMAGE_ORG = 'https://image.tmdb.org/t/p/original';

let contWatching = false;
let currentPages = { movie: 1, tv: 1, person: 1}
let QUERY = ''
let pageEnd = false

function currentSection() {
  return document.querySelector('section.expanded')?.dataset.type || null
}

function buildSearchPage(term) {
  const query = escapeHTML(term)
  const input = document.getElementById('search-input')
  input.value = query;
  input.placeholder = 'Search for movies, tv shows or a person'
  input.closest('form').setAttribute('action', `javascript:void(0);`)
  input.closest('form').removeAttribute('onsubmit', '')
  input.closest('form').onsubmit = () => input.blur()

  document.querySelector("title").innerText = query + ` - Pixelstream`

  // <p class="search-title">Searching results for <b>"${query}"</b></p>
  document.getElementById('main-content').innerHTML = `
  <div id=search-results>
    <div class="search-title"></div>
    <div class="results-container"></div>
  </div>
  <div class="modal-overlay"></div>
  <div id="info-modal" class="modal">
    <div class="modal-content">
      <div id="modal-details">
      </div>
    </div>
  </div> 
  `

  document.addEventListener('click', (e) => {
    const hideBtn = e.target.closest('.expand-arrow')
    if (!hideBtn) return;
    const section = hideBtn.closest('section')
    section.classList.toggle('in-view');
    if (section.classList.contains('expanded')) section.classList.remove('expanded')
  })
}

async function getSearchResults(query, TYPE) {

  QUERY = escapeHTML(query)

  if (!document.getElementById('search-results')) {
    buildSearchPage(query)
  }

  const mediaTypes = TYPE ? [TYPE] : ["movie", "tv", "person"];

  const finalResults = { movie: [], tv: [], person: [] };
  
  if (!TYPE) document.querySelector(".results-container").innerHTML = ''
  
  let TOTAL_COUNT = 0
  const start_time = Date.now()
  let TIME = 0
  try {
    const fetchAndRender = mediaTypes.map(async (type) => {
      const output = await fetchSearchResults(query, type, currentPages[type], true)
      TIME = Date.now() - start_time
      const data = output.results
      TOTAL_COUNT = TOTAL_COUNT + Number(output.count)
      data.sort((a, b) => popularity(b, type) - popularity(a, type))
      data.filter(item => popularity(item, type) > 0.01);
      data.forEach(item => item.media_type = type)
      finalResults[type] = data;//.slice(0, isMobile() ? 20 : 14);
      finalResults[type].count = output.count
      finalResults[type].pages = currentPages[type]
      if (type === 'person') finalResults[type] = data.slice(0, 30)
    })
    await Promise.all(fetchAndRender)
    finalResults.query = escapeHTML(query);
    finalResults.time = (TIME / 1000).toFixed(1)+'s';
    finalResults.total_results = TOTAL_COUNT;
    mediaTypes.forEach(async (type) => populateSearchResults(type, finalResults))

  } catch (e) {
    console.error("Error fetching search results:", e);
  } finally {

    const length = Object.keys(finalResults).reduce((sum, key) => {
      return sum + finalResults[key].length;
    }, 0);

    updateUI(length, query, finalResults.time, finalResults.total_results)
  }
}

function updateUI(length, term, time, count) {
  const query = escapeHTML(term)

  const status = document.querySelector('.search-title')
  status.innerHTML = `
    <p>Showing results for <b><em>'${query}'</em></b></p>
    <p class="count">About ${count.toLocaleString("en-IN")} results in ${time}</p>
  `;

  if (!term.trim().length) {
    status.innerHTML = `<p><em>>> type something to search <<</em></p>`
    return
  }

  if (length < 1) {
    status.innerHTML = `<p>No results for <b>"${query}"</b></p>`
  }

  document.querySelector("title").innerText = query + ` - Pixelstream`
  window.history.replaceState('', '', `/search?q=${query}`)

  document.querySelectorAll('.grid-container')
    .forEach(container => {
      enableHorizontalWheelScroll(container,5)
      setupScrollEdgeMask(container)
    }
  )
}

function populateSearchResults(type, results) {
  const resultsContainer = document.querySelector(".results-container");
  let section = document.getElementById(`${type}-results`);

  const createSection = () => {
    const resultType =
      type === "tv" ? "TV Shows" :
      type === "person" ? "People" :
      "Movies";

    resultsContainer.insertAdjacentHTML("beforeend", `
      <section id="${type}-results" data-type="${type}" data-query="${QUERY}" class="expandable in-view">
        <div class="section-header">
          <h3>${resultType}</h3>
          <div class="actions">
            <div class="expand-arrow">
              <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="maximize" tabindex="0">
              <i class="fa-solid fa-angle-right"></i>
            </div>
            <div class="close-window" tabindex="0">
              <i class="fa-solid fa-xmark"></i>
            </div>
          </div>
        </div>

        <div class="grid-container ${type === "person" ? "profiles" : "vertical-card"}"></div>
      </section>
    `);

    return document.getElementById(`${type}-results`);
  };

  if (!section) {
    section = createSection();
  }

  const grid = section.querySelector(".grid-container");

  const items = results[type] || [];

  const renderItem = (item) => {
    return type === "person"
      ? renderProfile(item)
      : renderGridItems(item, "vertical");
  };

  let index = 0;

  const io = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      observer.unobserve(entry.target);

      index++;

      if (index < items.length) {
        const nextCard = renderItem(items[index]);
        grid.appendChild(nextCard);

        // Observe only the newly appended last card.
        observer.observe(nextCard);
      } else {
        observer.disconnect();
      }
    }
  }, {
    root: null, // viewport; use grid here only if grid itself scrolls
    rootMargin: "200px",
    threshold: 0.1
  });

  if (items.length > 0) {
    const firstCard = renderItem(items[0]);
    grid.appendChild(firstCard);
    io.observe(firstCard);
  }
}

function renderProfile(item) {
  const profile = document.createElement('div')
  profile.className = 'profile-item'
  Object.assign(profile.dataset, {id : item.id, mediaType: 'person'})
  profile.tabIndex = 0

  const name = item.name || item.original_name;
  const image = item.profile_path
    ? `${IMAGE_300 + item.profile_path}`
    : '/assets/images/no-image.png';
  profile.innerHTML =  `
    <span>
      <img src="${image}">
    </span>
    <div class="profile-item-info">
      <p class="name">${capString(name, 30)}</p>
      <p><em>${item.known_for_department}</em><p>
    </div>
  `;
  return profile
}

window.addEventListener('DOMContentLoaded', () => {
  // topNavBar() done in ejs
  bottomNavBar()
  setActiveIcon('search')
  setUpScrollEvents()
  setUpExpandableSection()
  activeSearchResults(getSearchResults,{  
    selector  : '#search-input',
    minLength : 0,
    debounce : 300
  })
})

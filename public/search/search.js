const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_300 = 'https://image.tmdb.org/t/p/w300';
const IMAGE_342 = 'https://image.tmdb.org/t/p/w342';
const IMAGE_ORG = 'https://image.tmdb.org/t/p/original';

let contWatching = false;

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
  const container = document.querySelector('.results-container')
  container.addEventListener('click', (e) => {
    const sectionHeader = e.target.closest('.section-header')
    if (!sectionHeader) return;
    sectionHeader.closest('section').classList.toggle('expanded');
  })
}

async function getSearchResults(query) {

  if (!document.getElementById('search-results')) {
    buildSearchPage(query)
  }

  const mediaTypes = ["movie", "tv", "person"];
  const pages = { movie: 3, tv: 3, person: 5 }

  const finalResults = { movie: [], tv: [], person: [] };
  document.querySelector(".results-container").innerHTML = ''
  
  try {
    const fetchAndRender = mediaTypes.map(async (type) => {
      const data = await fetchSearchResults(query, type, pages[type])
      data.sort((a, b) => popularity(b, type) - popularity(a, type))
      data.filter(item => popularity(item, type) > 0.01);
      data.forEach(item => item.media_type = type)
      finalResults[type] = data;//.slice(0, isMobile() ? 20 : 14);
      if (type === 'person') finalResults[type] = data.slice(0, 30)
    })
    await Promise.all(fetchAndRender)
    mediaTypes.forEach(async (type) => populateSearchResults(type, finalResults))

  } catch (e) {
    console.error("Error fetching search results:", e);
  } finally {
    updateUI(finalResults,query)
  }
}

function updateUI(results, term) {
  const query = escapeHTML(term)

  const length = Object.keys(results).reduce((sum, key) => {
    return sum + results[key].length;
  }, 0);

  document.querySelector('.search-title')?.remove()
  const container = document.querySelector(".results-container")

  if (!term.trim().length) {
    container.insertAdjacentHTML('beforebegin', `
      <p class="search-title"><em>>> type something to search <<</em></p>
    `)
    return
  }

  if (length < 1) {
    container.insertAdjacentHTML('beforebegin', `
      <p class="search-title">No results for <b>"${query}"</b></p>
    `)
  }

  document.querySelector("title").innerText = query + ` - Pixelstream`
  window.history.replaceState('', '', `/search?q=${query}`)
}

function populateSearchResults(type, results) {
  const container = document.querySelector(".results-container")
  let section = document.getElementById(`${type}-results`);

  const populateResults = (type) => {
    const resultType = type === 'tv' ? 'TV Shows' : type === 'person' ? 'People' : 'Movies'
    container.innerHTML += `
      <section id="${type}-results" data-type="${type}" class="expanded">
        <div class="section-header" style="padding-top: unset !important">
          <h3>${resultType}</h3>
          <div class="expand-arrow"><i class="fa-solid fa-chevron-left"></i></div>
        </div>
        <div class="grid-container ${type === "person" ? "profiles" : "vertical-card"} ">
        </div>
      </section>
    `;
  }
  if (!section)  {
    populateResults(type);
    results[type].forEach(item => {
      document.querySelector(`#${type}-results .grid-container`)
        ?.appendChild(type === 'person' ? renderProfile(item) : renderGridItems(item, 'vertical'))
    })
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
      <img src="${image}" alt="${name}">
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
  activeSearchResults(getSearchResults,{  
    selector  : '#search-input',
    minLength : 0,
    debounce : 300
  })
})

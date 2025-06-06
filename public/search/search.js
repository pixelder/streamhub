const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_300 = 'https://image.tmdb.org/t/p/w300';
const IMAGE_342 = 'https://image.tmdb.org/t/p/w342';
const IMAGE_ORG = 'https://image.tmdb.org/t/p/original';

let contWatching = false;

function buildSearchPage(query) {

  const input = document.getElementById('search-input')
  input.value = query;
  input.closest('form').setAttribute('action', `javascript:void(0);`)
  input.closest('form').removeAttribute('onsubmit', '')
  input.closest('form').onsubmit = () => input.blur()

  document.querySelector("title").innerText = query + ` - Pixelstream`

  document.getElementById('main-content').innerHTML = `
  <div id=search-results>
    <h1 class="search-title">Searching Results for “${query}”</h1>
    <div class="results-container"></div>
    <div class="modal-overlay"></div>
    <div id="info-modal" class="modal">
        <div class="modal-content">
          <div id="modal-details">
          </div>
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

  try {
    mediaTypes.forEach(async (type) => {
      fetchSearchResults(query, type, pages[type]).then((data) => {
        data.sort((a, b) => popularity(b, type) - popularity(a, type))
        data.filter(item => popularity(item, type) > 0.01);
        data.forEach(item => item.media_type = type)
        finalResults[type] = data.slice(0, isMobile() ? 20 : 14);
        if (type === 'person') finalResults[type] = data.slice(0, isMobile() ? 20 : 12)
        updateSearchResultsUI(type, finalResults, query)
      })
    })
  } catch (e) {
    console.error("Error fetching search results:", e);
  }

  try {
    document.querySelector(".results-container").innerHTML = ''
  } catch (e) {
    console.log(e)
  }
}

function updateSearchResultsUI(type, results, query) {

  const length = Object.keys(results).reduce((sum, key) => {
    return sum + results[key].length;
  }, 0);
  const searchTitle = document.querySelector('.search-title')
  searchTitle.innerText = `${length < 1 ? `No` : `Search`} Results for “${query}”`

  document.querySelector("title").innerText = query + ` - Pixelstream`
  window.history.replaceState('', '', `/search?q=${query}`)

  const container = document.querySelector(".results-container")

  if (length < 1) {
    container.innerHTML = ""
    return
  }

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
          ${type === "person" ? renderProfile(results[type]) : renderGridItems(results[type], type = 'vertical')}
        </div>
      </section>
    `;

  }

  if (!section) populateResults(type);
}

function renderProfile(items) {

  return items
    .map(item => {
      const name = item.name || item.original_name;
      const image = item.profile_path
        ? `${IMAGE_300 + item.profile_path}`
        : 'assets/images/no-image.png';
      return `
        <div tabindex="0" class="profile-item" data-id="${item.id}" data-media-type="person">
          <span>
            <img src="${image}" loading="lazy" alt="${name}">
          </span>
          <div class="profile-item-info">
            <p class="name">${capString(name, 30)}</p>
            <p><em>${item.known_for_department}</em><p>
          </div>
        </div>
      `;
    })
    .join('');
}

window.addEventListener('DOMContentLoaded', () => {
  // topNavBar() done in ejs
  bottomNavBar()
  setActiveIcon('search')
  setUpScrollEvents()
  activeSearchResults(getSearchResults,{  
    selector  : '#search-input',
    minLength : 3,
    debounce : 300
  })
})

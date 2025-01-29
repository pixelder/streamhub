
const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const IMAGE_ORG = 'https://image.tmdb.org/t/p/original'

let contWatching = false

async function getSearchResults(query) {

  document.getElementById('search-input').value = query;
  document.querySelector("title").innerText = query + ` - Pixelstream`

  const params = new URLSearchParams({
    api_key : API_KEY,
    query : encodeURIComponent(query)
  })
  
  const mediaType = [ 'movie', 'tv','person' ]

  const searchUrls = Object.fromEntries(
    mediaType.map( type => 
      [ type, `${BASE_URL}/search/${type}?${params}`]
    )
  )

  try {
    const [movie, tv, person] = await Promise.all(
      Object.values(searchUrls).map( url => fetch(url).then( res => res.json() ) )
    );

    const mediaType = { movie, tv, person }

    Object.entries(mediaType).forEach(([mediaType,data]) => {
      data.results.forEach(item => item.media_type = mediaType)
    })

    const finalResults = Object.fromEntries(
      Object.entries(mediaType).map(([mediaType,data]) => [
        mediaType,
        data.results.slice( 0, isMobile() ? 20 : 14)  
      ])
    )

    displaySearchResults(finalResults, query);
  } catch (error) {
    console.error("Error fetching search results:", error);
  }
}

// Display search results
function displaySearchResults({ movie, tv, person }, query) {
  const mainContent = document.querySelector('main');
  mainContent.innerHTML = `
    <div id=search-results>
      <h1>Search Results for “${query}”</h1>
      <section id="movie-results" data-type="movie">
        <h3>Movies</h3>
        <div class="grid-container">
          ${renderGridItems(movie)}        
        </div>
      </section>
      <section id="tv-results" data-type="tv">
        <h3>TV Shows</h3>
        <div class="grid-container">
          ${renderGridItems(tv)}
        </div>
      </section>
      <section id="person-results" data-type="person">
      <h3>Person</h3>
        <div class="grid-container profiles">
        ${renderProfile(person)}  
        </div>
      </section>
      <div class="modal-overlay"></div>
      <div id="info-modal" class="modal">
          <div class="modal-content">
            <div id="modal-details">
              <!-- Dynamic content will be injected here -->
            </div>
          </div>
      </div> 
    </div>
  `;
}

function renderProfile(items) {
  return items
    .map(item => {
      const name = item.name || item.original_name;
      const image = item.profile_path
        ? `${IMAGE_URL}${item.profile_path}`
        : 'https://placehold.co/480x551/383852/ccc?text=No+Image';
      return `
        <div tabindex="0" class="profile-item" data-id="${item.id}" data-media-type="person">
          <span>
            <img src="${image}" alt="${name}">
          </span>
          <div class="profile-item-info">
            <p>${capString(name, 30)}</p>
          </div>
        </div>
      `;
    })
    .join('');
}

window.onload = function() {
  footerHTML()
}
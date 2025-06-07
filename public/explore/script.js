const container = document.querySelectorAll('.cards-container')
container.forEach(item => item.addEventListener('click', (e) => {
  const card = e.target.closest('.explore-card') 
	if (!card) return
	let params = {}
	params = JSON.parse(JSON.stringify(card.dataset))
	params = resolvedParams(params)
	loadExplorePage(params)
}))

const GENRE_URL = `https://api.themoviedb.org/3/genre`
const IMAGE_92 = `https://image.tmdb.org/t/p/w92`

let isMovie = null;

const CONFIG_PARAMS = [ 
	{
		'type' : 'anime',
	 	'data' : { 
			'title' : 'Anime',
			'type' : 'tv',
		 	'lang' : 'ja',
		 	'genre' : 16,
			'reg' : 'JP',
			'voteCount' : 10
		}
	},
	{
		'type' : 'anime-movies',
	 	'data' : { 
			'title' : 'Anime Movies',
			'type' : 'movie',
		 	'lang' : 'ja',
		 	'genre' : 16,
			'reg' : 'JP',
			'voteCount' : 10
		}
	},
	{
		'type' : 'top-rated-movies',
	 	'data' : { 
			'title' : 'Top Rated Movies',
			'type' : 'movie',
		 	'sortBy' : 'vote_average',
			'voteCount' : 10000,
			'minRating' : 7,
		}
	},
	{
		'type' : 'top-rated-tv-shows',
	 	'data' : { 
			'title' : 'Top Rated TV Shows',
			'type' : 'tv',
		 	'sortBy' : 'vote_average',
			'voteCount' : 3000,
			'minRating' : 7,
		}
	},
	{
		'type' : 'hindi-movies',
	 	'data' : { 
			'title' : 'Hindi Movies',
			'type' : 'movie',
			'lang' : 'hi',
		 	'reg' : 'IN'
		}
	},
	{
		'type' : 'indian-tv-shows',
	 	'data' : { 
			'title' : 'Indian TV Shows',
			'type' : 'tv',
			'lang' : 'hi',
		 	'reg' : 'IN',
			'voteCount' : 10,
			'minRating' : 3
		}
	}
]

function resolvedParams(params) {
	let PARAMS = params
	const preconf = CONFIG_PARAMS.find(item => item.type === params.type.toLowerCase())
	if (preconf) {
		PARAMS = preconf.data
		PARAMS.preconf = [true];
		PARAMS.preconf.title = preconf.type
	}
	if (PARAMS.type !== 'tv' && PARAMS.type !== 'movie') return
	return PARAMS
}


window.addEventListener('DOMContentLoaded', () => {
  const handleRouting = () => {   
    const urlParams = new URLSearchParams(window.location.search);
    let params = {}
    if (Number(urlParams.size)) {
      for (let [key, value] of urlParams.entries()) {
        params[key] = value
      }
			params = resolvedParams(params)
      loadExplorePage(params)
    }
  }
	topNavBar()
  bottomNavBar()
	setActiveIcon('explore')
  setUpScrollEvents()
  handleRouting()
  document.querySelector('main').style.display = 'flex';
})

function loadExplorePage(PARAMS) {
  if (!PARAMS) return
  const mediaType = PARAMS.type
  const title = PARAMS.title
  let params = [];
  params = new URLSearchParams(PARAMS);
  const paramString = PARAMS.preconf ? `type=${PARAMS.preconf.title}` : params.toString() ;

	!loc().includes(paramString) ? window.history.pushState('', '', `/explore?${paramString}`) : '';
  document.querySelector('title').innerText = `${title ? title : mediaType === 'tv' ? 'Browse TV Series' : 'Browse Movies'} - Pixelstream`;
	window.addEventListener('popstate', function () {
		console.log('active');
		window.location.href = `${loc()}`;
	});
	loc();

  for (let [key, value] of params.entries()) {
    params[key] = value
  }
  
	isBrowsing = true;
	buildExploreHtml(params).then(() => {

		setFilterVariables(params) // reset all filters variable to default set values

		renderGenreChips(mediaType, params.genre); // builds genre chips with name and id from api
		renderNationAndLangSelector(params);

		loadDiscoverContent(mediaType, `browse-${mediaType}s`); // load initial content

		setupFilterParams();

		searchResultFunction("#search-with-cast")
		searchResultFunction("#search-with-company")

		setupExploreEventListeners(mediaType)
	})

}

async function buildExploreHtml(params) {
  const { type: mediaType, title, sort} = params
	isMovie = mediaType === 'movie' ? true : false;
	const main = document.querySelector('main');
	const sectionTitle = title ? `${title}` :  mediaType === 'tv' ? 'Browse TV Series' : 'Browse Movies';
	main.innerHTML = `
		<section id="browse-${mediaType}s" data-type="${mediaType}">
			<div class="section-header">
				<h2>${sectionTitle}</h2>
			</div>
			<div class="filters">
				<div class="form-group">
					<div class="flow-row">
							<label>Genre</label>
							<div class="genre-counter"><p></p></div>
					</div>
					<div class="genre-chips" id="genreChips">
					</div>
				</div>
				<div class="form-group">
          <label>Sort by</label>
          <div class="flow-row">
            <select id="sort">
                <option value="popularity" "selected">Popular</option>
                <option value="vote_average">Rating</option>
                <option value="${isMovie ? 'primary_release_date' : 'first_air_date'}">Date</option>
                <option value="${isMovie ? 'title' : 'name'}">Name</option>
            </select>
            <label id="sort-order" class="selectable active">
                <input type="checkbox" />
                <span class="checkbox-button">
                <i class="fa-solid fa-sort-down active"></i> 
                <i class="fa-solid fa-sort-up passive"></i>
                </span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>Year</label>
          <input type="number" id="year-picker" min="1888" max="2099" step="1" value="" placeholder="eg. 2024" />
        </div>
        <div class="form-group">
          <label>Minimum Rating</label>
          <div class="min-rating">
              <input id="min-rating-number" type="number" value="5" min="0" step="0.1" max="10">
              <p>0</p>
              <input id="min-rating-slider" type="range" value="5" min="0" step="0.1" max="10">
              <p>10</p>
          </div>
        </div>
        <div class="form-group button-container">
          <button class="go-up"><i class="fa-solid fa-angles-up"></i></button>
          <button class="filter-button"><i class="fa-solid fa-filter"></i></button>
        </div>
        <div class="filter-overlay"></div>
        <div class="filter-menu">
          <h3>More Filters</h3>
          <button class="close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="32" height="32" viewBox="0,0,256,256">
            <g fill="#e6e6fa" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(8,8)"><path d="M7.21875,5.78125l-1.4375,1.4375l8.78125,8.78125l-8.78125,8.78125l1.4375,1.4375l8.78125,-8.78125l8.78125,8.78125l1.4375,-1.4375l-8.78125,-8.78125l8.78125,-8.78125l-1.4375,-1.4375l-8.78125,8.78125z"></path></g></g>
            </svg>
          </button>
          <div class="form-group">
              <div class="flow-row">
                <label for="search-with-cast">Cast</label>
                <div class="caution">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  <p>For Movies Only</p>
                </div>
              </div>
              <div class="search-container" id="search-with-cast" type="person">
                  <div class="search-box">
                    <form class="flow-row" action="javascript:void(0);">
                      <input id="cast-input" type="search" placeholder="eg. Tom Cruise">
                      <button type="reset" class="x-icon" >
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                      </button>
                    </form>
                    <div class="select-container">
                    </div>
                    <div class="result-container">
                        <div class="results">
                        </div>
                    </div>
                  </div>
              </div>
          </div>
          <div class="form-group">
            <label for="search-with-company">Production Company</label>
            <div class="search-container" id="search-with-company" type="company">
              <div class="search-box">
                <form class="flow-row" action="javascript:void(0);">	
                  <input id="company-input" type="search" placeholder="eg. Studio Ghibli">
                  <button type="reset" class="x-icon" >
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>
                </form>
                <div class="select-container">
                </div>
                <div class="result-container">
                  <div class="results">
                  </div>
                </div>
              </div>
            </div>
          </div>
  				<div class="flow-row">
            <div class="form-group">
              <label for="countryFilter">Country</label>
              <select id="countryFilter">
                  <option value="">Any</option>
              </select>
            </div>
            <div class="form-group">
              <label for="languageFilter">Language</label>
              <select id="languageFilter">
                  <option value="">Any</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="min-vote-slider">Minimum vote count</label>
            <div class="vote-count">
              <input id="min-vote-number" type="number" value="200" min="0" step="10">
              <p>0</p>
              <input id="min-vote-slider" type="range" value="200" min="0" step="1" max="1000">
              <p>1000+</p>
            </div>
          </div>
          <div class="form-group menu-buttons">
            <button class="apply">Apply</button>
            <button class="reset-button" onclick=setFilterVariables()>Reset</button>
          </div>
        </div>
      </div>
			<div class="grid-container vertical-card"></div>
			<div class="result-message">
					<label>Loading...</label>
					<hr class="hr">
					<div class="message">
							<p>Have you tried</p>
							<ul>
									<li>lowering the <strong>minimum vote count</strong> ?</li>
									<li>lowering the <strong>minimum rating value</strong> ?</li>
									<li>selecting the proper country or language ?</li>
							</ul>  
					</div>  
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
	` ;
	return new Promise((resolve) => resolve(true))
}

async function setupExploreEventListeners(mediaType) {

	const filters = document.querySelector('.filters');

	['click', 'change'].forEach(eventType => {
		filters.removeEventListener(eventType, filterEventHandler);
		filters.addEventListener(eventType, filterEventHandler);
	});

	let pageWait
	window.addEventListener("scroll", () => {
		if (window.scrollY > 260) {
			document.querySelector('.button-container').classList.add('detach')
		} else {
			document.querySelector('.button-container').classList.remove('detach')
		}
		const threshold = 180;
		if (window.scrollY + document.body.offsetHeight  >= document.querySelector('main').clientHeight - threshold) {
			console.log('hit border', currentPage)
			if (!pageEnd) {
				clearTimeout(pageWait)
				pageWait = setTimeout(() => {
					console.log('loading page', currentPage)
					loadDiscoverContent(mediaType, `browse-${mediaType}s`);
				}, (200));
			}
		}
	})

	document.body.addEventListener("focus", function (event) {
		if (!event.target.closest('.search-container')) return
		const target = event.target;
		console.log(target.tagName)
		switch (target.tagName) {
			case "INPUT":
				// case "TEXTAREA":
				// case "SELECT":
				document.body.classList.add("keyboard");
				break;
		}
	}, true);

	document.body.addEventListener("blur", function () {
		console.log('blur')
		document.body.classList.remove("keyboard");
	}, true);
}

function setupFilterParams({ reset = false } = {}) {
	const minVoteSlider = document.getElementById("min-vote-slider")
	const minVoteNumber = document.getElementById("min-vote-number")
	const minRateSlider = document.getElementById("min-rating-slider")
	const minRateNumber = document.getElementById("min-rating-number")
	const sortBy = document.getElementById("sort")
	const sortOrderButton = document.getElementById("sort-order");
	const checkbox = sortOrderButton.querySelector('input[type="checkbox"]')
	const yearPicker = document.getElementById("year-picker")
	const countryFilter = document.getElementById("countryFilter")
	const languageFilter = document.getElementById("languageFilter")
	const genreContainer = document.getElementById("genreChips");
	const searchBox = document.querySelectorAll(".search-box input")

	if (reset) {
		// On reset // after setFilterVariables()
		sortBy.value = sortMode
		checkbox.checked = false;
		sortOrder = 'desc'
		yearPicker.value = currentYear
		minVoteNumber.value = minVoteCount
		minVoteSlider.value = minVoteCount
		minRateNumber.value = minRate
		minRateSlider.value = minRate
		countryFilter.value = selectedCountry
		languageFilter.value = selectedLanguage

		searchBox.forEach(box => {
			box.value = '';
			const section = box.closest('.search-container')
			section.querySelector('.select-container').innerHTML = ''
			section.querySelector('.results').innerHTML = ''
		})

		updateSelectedGenres(genreContainer)
		return
	}

	// Connect the fields with variables
	sortBy.oninput = function () {
		sortMode = this.value
		sortOrder = checkbox.checked ? 'asc' : 'desc'
	}

	sortOrderButton.onclick = function () {
		sortOrder = checkbox.checked ? 'asc' : 'desc'
	}

	yearPicker.oninput = function () {
		currentYear = this.value
	}

	minVoteSlider.oninput = function () {
		minVoteNumber.value = this.value
		minVoteCount = this.value
	}

	minVoteNumber.oninput = function () {
		minVoteSlider.value = this.value
		minVoteCount = this.value
	}

	minRateSlider.oninput = function () {
		minRateNumber.value = this.value
		minRate = this.value
	}

	minRateNumber.oninput = function () {
		minRateSlider.value = this.value
		minRate = this.value
	}

	countryFilter.oninput = function () {
		selectedCountry = this.value
	}

	languageFilter.oninput = function () {
		selectedLanguage = this.value
	}

}

function setFilterVariables(params = null) {
	const { genre, lang, reg, voteCount, minRating, sortBy} = params || '';
	selectedGenres = genre ? [Number(genre)] : []
	excludedGenres = []
	currentPage = 1
	sortMode = sortBy ? sortBy : 'popularity';
	sortOrder = 'desc'
	selectedCast = []
	selectedCompany = []
	minVoteCount = voteCount ? voteCount : 200;
	minRate = minRating ? minRating : 5;
	currentYear = null
	selectedCountry = reg ? reg.toUpperCase() : '';
	selectedLanguage = lang || '';

	setupFilterParams({ reset: true });
	resetSection();
	pageEnd = false;
}

async function renderGenreChips(mediaType, selected = null) {
	const genreContainer = document.getElementById("genreChips");

	const createChip = (genre, genreContainer) => {
		const chip = document.createElement('div');
		chip.classList.add('chip');
		chip.textContent = genre.name;
		chip.dataset.id = genre.id;
		if (chip.dataset.id.toString() === selected?.toString()) chip.classList.add('selected')

		let clickTimer = null;

		chip.addEventListener('click', () => {
			if (clickTimer) {
				clearTimeout(clickTimer);
				clickTimer = null;
				handleChipClick(genre.id, 'double', genreContainer);
			} else {
				clickTimer = setTimeout(() => {
					clickTimer = null;
					handleChipClick(genre.id, 'single', genreContainer);
				}, 300);
			}
		});

		genreContainer.appendChild(chip);
	}

	const url = `${GENRE_URL}/${mediaType}/list?api_key=${API_KEY}`
	fetchFromURL(url).then((data) => {
		data.genres.forEach(genre => {
			createChip(genre, genreContainer)
		});
	})

	enableHorizontalWheelScroll(genreContainer, 2)
}

async function renderNationAndLangSelector(params = null) {
	// Fetch countries
	const { reg, lang } = params
	const counteryURL = `${BASE_URL}/configuration/countries?language=en-US&api_key=${API_KEY}`
	const counteryList = ['AS', 'US', 'AU', 'GB', 'IE', 'JP', 'KO', 'IN', 'RU', 'MX', 'FR', 'DE',];
	fetchFromURL(counteryURL).then((data) => {
		const countries = data
		const countrySelect = document.getElementById('countryFilter');
		countries.forEach(country => {
			if (counteryList.includes(country.iso_3166_1)) {
				const option = document.createElement('option');
				option.value = country.iso_3166_1;
				option.textContent = abbvText(country.english_name, 13);
				if (option.value.toLowerCase() === reg?.toLowerCase()) option.setAttribute('selected', '')
				countrySelect.appendChild(option);
			}
		});
	}).catch((e) => {
		console.log(e)
		notifyAlert(e)
	})

	// Fetch languages
	const languageURL = `${BASE_URL}/configuration/languages?api_key=${API_KEY}`
	const languagelist = ['en', 'ja', 'ko', 'hi', 'as', 'ru', 'es', 'fr', 'de']
	fetchFromURL(languageURL).then((data) => {
		const languages = data;
		const languageSelect = document.getElementById('languageFilter');
		languages.forEach(language => {
			if (languagelist.includes(language.iso_639_1)) {
				const option = document.createElement('option');
				option.value = language.iso_639_1;
				option.textContent = language.english_name;
				if (option.value.toLowerCase() === lang?.toLowerCase()) option.setAttribute('selected', '')
				languageSelect.appendChild(option);
			}
		});
	}).catch((e) => {
		console.log(e)
		notifyAlert(e)
	})
}

function handleChipClick(genreId, type, genreContainer) {
	genreId = parseInt(genreId);

	if (type === 'single') {
		// Check if it's in the excludedGenres list
		if (excludedGenres.includes(genreId)) {
			// Single click on excluded genre -> remove from excludedGenres only
			excludedGenres = excludedGenres.filter(id => id !== genreId);
		} else if (selectedGenres.includes(genreId)) {
			// Single click on selected genre -> remove from selectedGenres
			selectedGenres = selectedGenres.filter(id => id !== genreId);
		} else {
			// Single click on unselected genre -> add to selectedGenres
			selectedGenres.push(genreId);
		}
	} else if (type === 'double') {
		// Double click to exclude
		if (!excludedGenres.includes(genreId)) {
			excludedGenres.push(genreId);
			selectedGenres = selectedGenres.filter(id => id !== genreId); // Ensure it's not in selectedGenres
		} else {
			excludedGenres = excludedGenres.filter(id => id !== genreId);
		}
	}

	updateSelectedGenres(genreContainer);
	resetSection();
}

function updateSelectedGenres(genreContainer) {
	genreContainer.querySelectorAll('.chip').forEach(chip => {
		const genreId = parseInt(chip.dataset.id);
		chip.classList.toggle('selected', selectedGenres.includes(genreId));
		chip.classList.toggle('excluded', excludedGenres.includes(genreId));
	});
	document.querySelector('.genre-counter p').innerText = `${selectedGenres.length || '0'} selected • ${excludedGenres.length || '0'} excluded`
}

function resetSection() {
	try {
		const mediaType = isMovie ? 'movie' : 'tv';
		const gridContainer = document.querySelector(".grid-container")
		const msg = document.querySelector('.result-message');
		msg.querySelector('label').innerText = 'Loading...'
		msg.classList.add('loading')
		gridContainer.innerHTML = '';
		currentPage = 1;
		pageEnd = false;

		loadDiscoverContent(mediaType, `browse-${mediaType}s`);
	} catch (e) {
		console.log(e)
		notifyAlert(e)
	}
}

function filterEventHandler(event) {
	const filterMenu = document.querySelector('.filter-menu');
	const filterOverlay = document.querySelector('.filter-overlay');
	if (event.type === 'click') {
		if (event.target.closest('.filter-button')) {
			const isMenuVisible = filterMenu.style.display === 'flex';
			filterMenu.style.display = isMenuVisible ? 'none' : 'flex';
			filterMenu.toggleAttribute('active')
			filterOverlay.style.display = isMenuVisible ? 'none' : 'flex';
			event.stopPropagation();
		}
		if (event.target.closest('.go-up')) {
			window.scrollTo({ top: 0 })
		}
		if (event.target.closest('.filter-overlay, .close-btn, .apply')) {
			filterMenu.style.display = 'none';
			filterMenu.toggleAttribute('active')
			filterOverlay.style.display = 'none';
			event.stopPropagation();
		};

		if (event.target.closest('.apply')) {
			resetSection();
			pageEnd = false
		}

		if (!event.target.closest('.search-box')) {
			document.querySelectorAll('.search-container').forEach(el => {
				el.removeAttribute('expanded', '')
			})
		}
	} else if (event.type === 'change') {
		resetSection();
		pageEnd = false
	}
}

function searchResultFunction(sectionId) {
	const section = document.querySelector(`${sectionId}`)
	const type = section.getAttribute("type")
	const searchBox = section.querySelector(".search-box input")
	const resultsContainer = section.querySelector(".results")
	const selectedContainer = section.querySelector(".select-container")

	let searchWait
	let currentSearchResults = [] // Store the latest search results
	let selectedSearchItems = [] // Store full item objects for selected items

	searchBox.oninput = function () {
		const term = this.value;
		if (term.length < 1) resetResults()
		if (term.length < 3) return
		if (type === "person" && selectedCast < 1) selectedSearchItems = []
		if (type === "company" && selectedCompany < 1) selectedSearchItems = []

		clearTimeout(searchWait)
		searchWait = setTimeout(() => {
			fetchSearchResults(term, type, 5).then((data) => {
				if (type === "person")
					data.sort((a, b) => popularity(b, type) - popularity(a, type))
				populateResults(data)
				currentSearchResults = data
			})
		}, 300)
	}

	const resetResults = () => {
		resultsContainer.innerHTML = ""
		currentSearchResults = []
	}

	const populateResults = function (data) {
		resultsContainer.innerHTML = ""
		if (data.length < 1) {
			resultsContainer.innerHTML = "No Results"
			return
		}
		data.forEach((item) => {
			const dataExists = selectedSearchItems.some(
				(selected) => Number(selected.id) === item.id,
			)
			if (dataExists) return
			const resultEl = resultHTML(item)
			resultsContainer.appendChild(resultEl)
		})
	}

	const resultHTML = function (item) {
		const result = document.createElement("div")
		result.classList.add("result")
		result.setAttribute("data-id", item.id)
		result.setAttribute("data-name", item.name)
		let IMG = '/assets/images/no-image-transparent-dark.svg'
		if (type === `person` && item.profile_path) IMG = `${IMAGE_92 + item.profile_path}`
		if (type === `company` && item.logo_path) IMG = `${IMAGE_92 + item.logo_path}`
		result.innerHTML = `<div class="img-container"><img src='${IMG}' loading="lazy" alt=""></div><p>${item.name}</p>`
		return result
	}

	const selectedHTML = function (item) {
		const selectedItem = document.createElement("div")
		selectedItem.classList.add("select-item")
		selectedItem.setAttribute("data-id", item.id)
		selectedItem.setAttribute("data-name", item.name)
		selectedItem.innerText = item.name
		return selectedItem
	}

	const updateSelectItems = () => {
		let data = []
		selectedSearchItems.map((item) => data.push(item.id))
		if (type === "person") selectedCast = data
		if (type === "company") selectedCompany = data
		console.log(selectedCast, selectedCompany)
		resetSection();
		pageEnd = false
	}

	const insertResultInOrder = (newEl, item) => {
		let inserted = false
		const children = Array.from(resultsContainer.children)
		const newIndex = currentSearchResults.findIndex((it) => it.id == item.id)
		for (let child of children) {
			const childId = child.getAttribute("data-id")
			const childIndex = currentSearchResults.findIndex((it) => it.id == childId)
			if (newIndex < childIndex) {
				resultsContainer.insertBefore(newEl, child)
				inserted = true
				break
			}
		}
		if (!inserted) resultsContainer.appendChild(newEl)
	}
	const sectionEventListener = (e) => {

		console.log('clicked on section')
		const result = e.target.closest(".result")
		const select = e.target.closest(".select-item")
		const id = result?.getAttribute("data-id") || select?.getAttribute("data-id")
		const container = e.target.closest('.search-box')
		const clearBtn = e.target.closest('.x-icon')
		if (result) {
			const item = currentSearchResults.find((item) => item.id == id)
			if (item && !selectedSearchItems.some((selected) => selected.id == id)) {
				selectedSearchItems.push(item)
				result.classList.add("removing") // Start animation
				updateSelectItems()
				setTimeout(() => {
					result.remove() // Remove after animation
					const selectedEl = selectedHTML(item)
					selectedContainer.appendChild(selectedEl)
				}, 200)
			}
		}
		if (select) {
			selectedSearchItems = selectedSearchItems.filter((item) => item.id != id)
			updateSelectItems()
			select.classList.add("removing") // Start animation
			setTimeout(() => {
				select.remove() // Remove after animation
				const item = currentSearchResults.find((item) => item.id == id)
				if (!item) return
				const newResultEl = resultHTML(item)
				insertResultInOrder(newResultEl, item)
			}, 200)
		}
		if (container) {
			document.querySelectorAll('.search-container').forEach(item => item.removeAttribute('expanded', ''))
			section.setAttribute('expanded', '')
			searchBox.focus()
		}

		if (clearBtn) {
			console.log('clearing')
			resetResults()
			selectedContainer.innerHTML = ''
			selectedSearchItems = []
			updateSelectItems()
		}

		// if (clearBtn) {
		// 	selectedSearchItems.pop();
		// 	updateSelectItems()
		// 	selectedContainer.lastChild.classList.add('removing')
		// 	setTimeout(() => {
		// 		selectedContainer.lastChild.remove() // Remove after animation
		// 		const item = currentSearchResults.find((item) => item.id == selectedContainer.lastChild)
		// 		if (!item) return
		// 		const newResultEl = resultHTML(item)
		// 		insertResultInOrder(newResultEl, item)
		// 	}, 200)
		// }
	}
	const form = section.closest('.form-group')
	form.removeEventListener("click", sectionEventListener)
	form.addEventListener("click", sectionEventListener)
}


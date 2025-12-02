const GENRE_URL = `https://api.themoviedb.org/3/genre`
const IMAGE_92 = `https://image.tmdb.org/t/p/w92`

let isMovie = null;

const CONFIG_PARAMS = [
	{
		'type': 'anime',
		'data': {
			'title': 'Explore Anime', 'type': 'tv', 'lang': 'ja',
			'genre': 16, 'reg': 'JP', 'voteCount': 10
		},
		'filters': { 'genre': 'hidden' }
	},
	{
		'type': 'anime-movies',
		'data': {
			'title': 'Explore Anime Movies', 'type': 'movie', 'lang': 'ja',
			'genre': 16, 'reg': 'JP', 'voteCount': 10
		},
		'filters': { 'genre': 'hidden', 'year': 'hidden' }
	},
	{
		'type': 'top-rated-movies',
		'data': {
			'title': 'Top Rated Movies', 'type': 'movie',
			'sortBy': 'vote_average', 'voteCount': 10000, 'minRating': 7,
		},
		'filters': { 'sort': 'hidden' }
	},
	{
		'type': 'top-rated-tv-shows',
		'data': {
			'title': 'Top Rated TV Shows', 'type': 'tv',
			'sortBy': 'vote_average', 'voteCount': 3000, 'minRating': 7
		},
		'filters': { 'sort': 'hidden' }

	},
	{
		'type': 'indian-movies',
		'data': {
			'title': 'Indian Movies', 'type': 'movie', 'reg': 'IN',
			'voteCount': 1, 'minRating': 3
		}
	},
	{
		'type': 'indian-tv-shows',
		'data': {
			'title': 'Indian TV Shows', 'type': 'tv',
			'reg': 'IN', 'voteCount': 3, 'minRating': 3
		}
	},
	{
		'type': 'studio',
		'data': [{
			'type': 'studio-ghibli',
			'data': {
				'title': 'Studio Ghibli', 'type': 'movie',
				'company': 10342, 'voteCount': 10, 'minRating': 3
			},
			'filters': { 'genre': 'hidden', 'minRate': 'hidden', 'year': 'hidden' }
		},
		{
			'type': 'marvel-studios',
			'data': {
				'title': 'Marvel Studios', 'type': 'movie',
				'company': 420, 'voteCount': 10, 'minRating': 3
			},
			'filters': { 'genre': 'hidden', 'minRate': 'hidden', 'year': 'hidden' }
		},
		{
			'type': 'production-ig',
			'data': {
				'title': 'Production I.G.', 'type': 'tv',
				'company': 529, 'voteCount': 3, 'minRating': 3
			},
			'filters': { 'genre': 'hidden', 'minRate': 'hidden', 'year': 'hidden' }
		}]
	}
]

function exploreCardsEvent() {
	const container = document.querySelectorAll('.cards-container')
	const paramsHandler = async (e) => {
		if (e.type === 'keydown' && e.key !== 'Enter') return
		const card = e.target.closest('.explore-card')
		if (!card) return
		let params = {}
		params = JSON.parse(JSON.stringify(card.dataset))
		params = await resolvedParams(params)
		loadExplorePage(params)
	}
	container.forEach(item => {
		item.addEventListener('click', paramsHandler)
		item.addEventListener('keydown', paramsHandler)
	})
}

window.addEventListener('DOMContentLoaded', () => {
	let exploring = false
	const handleRouting = async () => {
		const urlParams = new URLSearchParams(window.location.search);
		let params = {}
		if (Number(urlParams.size)) {
			exploring = true
			for (let [key, value] of urlParams.entries()) {
				params[key] = escapeHTML(value)
			}
			window.history.replaceState('','',`/explore?${new URLSearchParams(params).toString()}`)
			params = await resolvedParams(params)
			loadExplorePage(params)
		}
	}
	topNavBar()
	bottomNavBar()
	setActiveIcon('explore')
	setUpScrollEvents()
	handleRouting().then(() => {
		if (!exploring) {
			exploreCardsEvent()
		}
	})
	document.querySelector('main').style.display = 'flex';
})

async function resolvedParams(params) {
	let PARAMS = params
	let preconf = false
	const isStudio = PARAMS.type === 'studio'
	if (isStudio) {
		preconf = CONFIG_PARAMS
			.find(item => item.type === 'studio').data
			.find(studio => studio.type === params.title);
	} else {
		preconf = CONFIG_PARAMS.find(item => item.type === params.type.toLowerCase())
	}
	if (preconf) {
		PARAMS = preconf.data
		PARAMS.preconf = {
			'title' : preconf.type,
			'filters' : preconf.filters
		}
	}
	if (isStudio) {
		let DEF_TYPE = 'movie'
		if (preconf) {
			PARAMS.preconf.title = `studio&title=${preconf.type}`
			DEF_TYPE = preconf.data.type
		}
		if (!preconf) {
			const tvText = ['tv', 'television']
			if (tvText.some(txt => PARAMS.title.toLowerCase().includes(txt))) {
				DEF_TYPE = 'tv';
			}
			PARAMS.type = DEF_TYPE
			PARAMS.minRating = '0' 
			PARAMS.voteCount = '0'
			PARAMS.preconf = {
				'title' : 'studio',
				'filters' : {'genre': 'hidden', 'minRate' : 'hidden', 'year': 'hidden'}
			}
		}
		setupMediaToggle(PARAMS, DEF_TYPE)
	}

	if (PARAMS.type === 'tv' || PARAMS.type === 'movie' || PARAMS.type === 'studio') return PARAMS
}

async function setupMediaToggle(params, DEF_TYPE) {

	let PARAMS = params;
	const setActiveMedia = ( section, mediaType) => {
		section.setAttribute('data-type', mediaType)
		section.setAttribute('id', `browse-${mediaType}s`)
		isMovie = mediaType === 'movie' ? true : false;
	}
	const updateActiveMedia = (DEF_TYPE) => {
		const active = media_switch().checked ? 'tv' : 'movie';
		if (active !== DEF_TYPE) {
			media_switch().checked = !media_switch().checked
		}
	}
	const buildMediaSwitch = function () {
		return `
			<div class="form-group">
				<label>Media Type</label>
				<div class="media-switch">
          <input type="checkbox" id="media-toggle" class="switch-input">
          <label for="media-toggle" class="media-label">
            <div class="media-tab movie">Movies</div>
            <div class="media-tab tv">TV Shows</div>
            <div class="media-indicator"></div>
          </label>
        </div>
			</div>
		`
	}

	const media_switch = () => document.querySelector('.media-switch #media-toggle');	

	whenExists('.button-container').then(() => {
		document.querySelector('.button-container')
			.insertAdjacentHTML('beforebegin', buildMediaSwitch(params))
	}).then(() => {
		updateActiveMedia(DEF_TYPE)
		document.querySelector('#media-toggle').addEventListener('change', () => {
			const section = media_switch().closest('section');
			const mediaType = media_switch().checked ? 'tv' : 'movie';
			setActiveMedia( section, mediaType);
			PARAMS.type = mediaType
			// setFilterVariables(PARAMS)
			renderGenreChips(mediaType, PARAMS.genre);
			currentPage = 1
			loadDiscoverContent(mediaType, section.id)
		})
	})
}

function loadExplorePage(PARAMS) {
	if (!PARAMS) return
	const mediaType = PARAMS.type
	isMovie = mediaType === 'movie' ? true : false;
	const title = PARAMS.title
	const params = new URLSearchParams(PARAMS);
	const paramString = PARAMS.preconf ? `type=${PARAMS.preconf.title}` : params.toString();

	!loc().includes(paramString) ? window.history.pushState('', '', `/explore?${paramString}`) : '';
	document.querySelector('title').innerText = `${title ? title : !isMovie ? 'Explore TV Series' : 'Explore Movies'} - Pixelstream`;
	window.addEventListener('popstate', function () {
		window.location.href = `${loc()}`;
	});
	loc();

	isBrowsing = true;
	buildExploreHtml(PARAMS).then(() => {

		setFilterVariables(PARAMS) // reset all filters variable to default set values

		renderGenreChips(mediaType, PARAMS.genre); // builds genre chips with name and id from api
		renderNationAndLangSelector(PARAMS);

		loadDiscoverContent(mediaType, `browse-${mediaType}s`); // load initial content

		setupFilterParams();
		searchResultFunction("#search-with-cast")
		searchResultFunction("#search-with-company", {id : PARAMS.company, name:  PARAMS.company ? PARAMS.title : ''})

		setupExploreEventListeners()
	})
}

async function buildExploreHtml(params) {
	const { type: mediaType, title } = params
	const main = document.querySelector('main');
	const sectionTitle = title ? `${title}` : !isMovie ? 'Explore TV Series' : 'Explore Movies';
	main.innerHTML = `
		<section id="browse-${mediaType}s" data-type="${mediaType}">
			<div class="section-header">
				<h2>${sectionTitle}</h2>
			</div>
			<div class="filters">
			 ${buildFilterHtml(params)}
      </div>
			<div class="grid-container vertical-card"></div>
			<div class="result-message">
					<div class="text">Loading...</div>
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

function buildFilterHtml(params) {
	const { genre, sort, year, minRate } = params.preconf?.filters ? params.preconf?.filters : false
	const genreFilter = function () {
		return `
			<div class="form-group">
				<div class="flow-row">
						<label>Genre</label>
						<div class="genre-counter"><p></p></div>
				</div>
				<div class="genre-chips" id="genreChips" tabindex="0">
				</div>
			</div>
		`
	}

	const sortFilter = function () {
		return `
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
		`
	}

	const yearFilter = function () {
		return `
			<div class="form-group">
				<label>Year</label>
				<input type="number" id="year-picker" min="1888" max="2099" step="1" value="" placeholder="eg. 2024" />
			</div>
		`
	}

	const minRateFilter = function () {
		return `
			<div class="form-group">
				<label>Minimum Rating</label>
				<div class="min-rating">
						<input id="min-rating-number" type="number" value="5" min="0" step="0.1" max="10">
						<p>0</p>
						<input id="min-rating-slider" type="range" value="5" min="0" step="0.1" max="10">
						<p>10</p>
				</div>
			</div>

		`
	}

	const filterActions = function () {
		return `
			<div class="form-group button-container">
				<button class="go-up"><i class="fa-solid fa-angles-up"></i></button>
				<button class="filter-button"><i class="fa-solid fa-filter"></i></button>
			</div>
		`
	}

	const castSearchBox = function () {
		return `
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
							<div class="results" tabindex="-1">
							</div>
						</div>
					</div>
				</div>
			</div>
		`
	}

	const companySearchBox = function () {
		return `
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
							<div class="results" tabindex="-1">
							</div>
						</div>
					</div>
				</div>
			</div>
		`
	}

	const countrySelectFilter = function () {
		return `
			<div class="form-group" id="countrySelect"></div>
		`
	}
	const languageSelectFilter = function () {
		return `
			<div class="form-group" id="langSelect"></div>
		`
	}

	const minVoteFilter = function () {
		return `
			<div class="form-group">
				<label for="min-vote-slider">Minimum vote count</label>
				<div class="vote-count">
					<input id="min-vote-number" type="number" value="200" min="0" step="10">
					<p>0</p>
					<input id="min-vote-slider" type="range" value="200" min="0" step="1" max="1000">
					<p>1000+</p>
				</div>
			</div>
		`
	}

	return `
		${!genre ? genreFilter() : ''}
		${!sort ? sortFilter() : ''}
		${!year ? yearFilter() : ''}
		${!minRate ? minRateFilter() : ''}
		${filterActions()}
		<div class="filter-overlay"></div>
		<div class="filter-menu">
			<div class="flow-row">
				<h3>Filters</h3>
				<button class="close-btn">
				</button>
			</div>
			${genre ? genreFilter() : ''}
			${sort ? sortFilter() : ''}
			${year ? yearFilter() : ''}
			${minRate ? minRateFilter() : ''}
			${castSearchBox()}
			${companySearchBox()}
			<div class="flow-row">
				${countrySelectFilter()}
				${languageSelectFilter()}
			</div>
			${minVoteFilter()}
			<div class="form-group menu-buttons">
				<button class="apply">Apply</button>
				<button class="reset-button" onclick=setFilterVariables()>Reset</button>
			</div>
		</div>
	`
}

async function setupExploreEventListeners() {

	const filters = document.querySelector('.filters');

	['click', 'change'].forEach(eventType => {
		filters.removeEventListener(eventType, filterEventHandler);
		filters.addEventListener(eventType, filterEventHandler);
	});

	let pageWait
	document.body.addEventListener("scroll", () => {
		if (document.body.scrollTop > 260) {
			document.querySelector('.button-container')?.classList.add('detach')
		} else {
			document.querySelector('.button-container')?.classList.remove('detach')
		}
		const threshold = 180;

		if (document.body.clientHeight + document.body.scrollTop >= document.body.scrollHeight - threshold) {
			const mediaType = isMovie ? 'movie' : 'tv';
			if (pageEnd) {
				console.log('End of results')
				return
			}
			document.querySelector('.result-message').classList.add('loading');
			clearTimeout(pageWait)
			pageWait = setTimeout(() => {
				console.log('loading page', currentPage)
				loadDiscoverContent(mediaType, `browse-${mediaType}s`);
			}, (200));
		} else {
			document.querySelector('.result-message').classList.remove('loading');
		}
	})

	document.body.addEventListener("focus", function (event) {
		if (!event.target.closest('.search-container')) return
		const target = event.target;
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
	const checkbox = sortOrderButton?.querySelector('input[type="checkbox"]')
	const yearPicker = document.getElementById("year-picker")
	const countryFilter = document.querySelector('#countrySelect input')
	const languageFilter = document.querySelector('#languageSelect input')
	const genreContainer = document.getElementById("genreChips");
	const searchBox = document.querySelectorAll(".search-box input")

	if (reset) {
		// On reset // after setFilterVariables()
		if (sortBy) sortBy.value = sortMode
		if (checkbox) checkbox.checked = false;
		sortOrder = 'desc'
		if (yearPicker) yearPicker.value = currentYear
		if (minVoteNumber) minVoteNumber.value = minVoteCount
		if (minVoteSlider) minVoteSlider.value = minVoteCount
		if (minRateNumber) minRateNumber.value = minRate
		if (minRateSlider) minRateSlider.value = minRate
		if (countryFilter) countryFilter.value = selectedCountry
		if (languageFilter) languageFilter.value = selectedLanguage

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
	if (sortBy) sortBy.oninput = function () {
		sortMode = this.value
		sortOrder = checkbox.checked ? 'asc' : 'desc'
	}
	if (sortOrderButton) sortOrderButton.onclick = function () {
		sortOrder = checkbox.checked ? 'asc' : 'desc'
	}
	if (yearPicker) yearPicker.oninput = function () {
		currentYear = this.value
	}
	if (minVoteSlider) minVoteSlider.oninput = function () {
		minVoteNumber.value = this.value
		minVoteCount = this.value
	}
	if (minVoteNumber) minVoteNumber.oninput = function () {
		minVoteSlider.value = this.value
		minVoteCount = this.value
	}
	if (minRateSlider) minRateSlider.oninput = function () {
		minRateNumber.value = this.value
		minRate = this.value
	}
	if (minRateNumber) minRateNumber.oninput = function () {
		minRateSlider.value = this.value
		minRate = this.value
	}
	// if (countryFilter) countryFilter.oninput = function () {
	// 	selectedCountry = this.value
	// }
	// if (languageFilter) languageFilter.oninput = function () {
	// 	selectedLanguage = this.value
	// }
}

function setFilterVariables(params = null) {
	const { genre, lang, reg, voteCount, minRating, sortBy, company } = params || '';
	selectedGenres = genre ? [Number(genre)] : []
	excludedGenres = []
	currentPage = 1
	sortMode = sortBy ? sortBy : 'popularity';
	sortOrder = 'desc'
	selectedCast = []
	selectedCompany = company ? [Number(company)] : []
	minVoteCount = voteCount ? voteCount : 200;
	minRate = minRating ? minRating : 5;
	currentYear = null;
	selectedCountry = reg ? reg.toUpperCase() : '';
	selectedLanguage = lang || '';

	setupFilterParams({ reset: true });
	resetSection();
	pageEnd = false;
}

async function renderGenreChips(mediaType, selected = null) {
	const genreContainer = document.getElementById("genreChips");
	genreContainer.innerHTML = ''

	const chipList = []
	const createChip = (genre, genreContainer) => {
		const chip = document.createElement('button');
		chip.classList.add('chip');
		chip.textContent = genre.name;
		chip.dataset.id = genre.id;
		chipList.push(genre.id)
		if ( selected?.toString() === chip.dataset.id.toString()) {
			chip.classList.add('selected')
		}
		genreContainer?.appendChild(chip);
	}

	const url = `${GENRE_URL}/${mediaType}/list?api_key=${API_KEY}`
	fetchFromURL(url)
		.then((data) => {
			data.genres.forEach(genre => {
				createChip(genre, genreContainer)
			})
		})
		.then(() => {
			const touched = document.querySelectorAll(`.chip.selected`)
			const touchedList = Array.from(touched)

			touchedList.forEach(chip => {
				const position = Array.from(document.querySelectorAll('.chip'))[0]
				genreContainer.insertBefore(chip, position)
			})
		})

	let clickTimer = null;

	genreContainer?.addEventListener('click', async (e) => {
		const chip = e.target.closest('.chip');
		if (!chip) return;
		const { id } = chip.dataset;

		if (clickTimer) {
			clearTimeout(clickTimer);
			clickTimer = null;
			await handleChipClick(id, 'double', chipList);
			updateSelectedGenres(genreContainer);
			resetSection();
		} else {
			clickTimer = setTimeout(async () => {
				clickTimer = null;
				await handleChipClick(id, 'single', chipList);
				updateSelectedGenres(genreContainer);
				resetSection();
			}, 300);
		}
	});

	enableHorizontalWheelScroll(genreContainer, 2)
}

async function handleChipClick(genreId, type, chipList) {

	genreId = parseInt(genreId);
	const chip = document.querySelector(`.chip[data-id="${genreId}"]`)
	const parent = chip.parentElement;
	// const unTouched = () => document.querySelectorAll('.chip:not(.excluded, .selected)')
	const order = ({exclude, remove} = {}) => {
		const i = chipList.findIndex(el => el === Number(chip.dataset.id))
		let index = 0
		Array.from(document.querySelectorAll('.chip')).forEach(item => {
			if (!remove && item.classList.contains('selected')) {
				if (exclude) {
					index++
					return
				}
				const j = chipList.findIndex(el => el === Number(item.dataset.id))
				if (i > j) index++
			}
			if (!remove && exclude && item.classList.contains('excluded')) {
				const j = chipList.findIndex(el => el === Number(item.dataset.id))
				if (i > j) index++
			}
			if (remove) {
			   if (item.classList.contains('selected') || item.classList.contains('excluded')) {
			      index++
			   } else {
    				const j = chipList.findIndex(el => el === Number(item.dataset.id))
				    if (i > j) index++
			   }
			}
		})
		return Array.from(document.querySelectorAll('.chip'))[index]
	}

	const ADD = ({exclude} = {}) => {
		const position = exclude
			? order({exclude: true})
			: order()
		parent.insertBefore(chip, position)
	}

	const REMOVE = () => {
	  const position = order({remove: true})
		parent.insertBefore(chip, position)
	}

	if (type === 'single') {
		// Check if it's in the excludedGenres list
		if (excludedGenres.includes(genreId)) {
			// Single click on excluded genre -> remove from excludedGenres only
			excludedGenres = excludedGenres.filter(id => id !== genreId);
			REMOVE()
		} else if (selectedGenres.includes(genreId)) {
			// Single click on selected genre -> remove from selectedGenres
			selectedGenres = selectedGenres.filter(id => id !== genreId);
			REMOVE()
		} else {
			// Single click on unselected genre -> add to selectedGenres
			selectedGenres.push(genreId);
			ADD()
		}
	} else if (type === 'double') {
		// Double click to exclude
		if (!excludedGenres.includes(genreId)) {
			excludedGenres.push(genreId);
			selectedGenres = selectedGenres.filter(id => id !== genreId); // Ensure it's not in selectedGenres
			ADD({exclude: true})
		} else {
			excludedGenres = excludedGenres.filter(id => id !== genreId);
			REMOVE()
		}
	}

}

function updateSelectedGenres(container) {
	container?.scrollTo({left:0})
	container?.querySelectorAll('.chip').forEach(chip => {
		const genreId = parseInt(chip.dataset.id);
		chip.classList.toggle('selected', selectedGenres.includes(genreId));
		chip.classList.toggle('excluded', excludedGenres.includes(genreId));
	});
	const status = document.querySelector('.genre-counter p')
	if (status) status.innerText = `${selectedGenres.length || '0'} selected • ${excludedGenres.length || '0'} excluded`
}

class SelectMenu {
	constructor({ el, type, preselect = null }) {
		this.el = el;
		this.type = type; // "language" or "country"
		this.preselect = preselect;
		this.data = [];
		this.selected = null;
		this.hoverIndex = -1;

		this.createUI();
		this.fetchData();
		this.addOutsideListener();
	}

	// -----------------------
	// UI
	// -----------------------
	createUI() {
		this.el.classList.add("selectMenu-container");

		this.el.innerHTML = `
			<label for="${this.type}-input">${capFirstLetter(this.type)}</label>
			<div class="input-wrapper">
				<input id="${this.type}-input" class="select-input" placeholder="Select ${this.type}..." />
				<button class="clear-btn">✕</button>
			</div>
			<div class="selectMenu">
				<div class="select-list"></div>
			</div>
		`;

		this.input = this.el.querySelector(".select-input");
		this.clearBtn = this.el.querySelector(".clear-btn");
		this.list = this.el.querySelector(".select-list");

		this.input.addEventListener("focus", () => this.openList());

		this.input.addEventListener("input", () => {
			this.hoverIndex = -1;
			this.renderList();
			this.openList();
		});

		this.input.addEventListener("keydown", (e) => this.handleKeys(e));

		this.clearBtn.addEventListener("click", () => {
			this.input.value = "";
			this.selected = null;
			this.hoverIndex = -1;

			// reset external state
			if (this.type === "country") selectedCountry = "";
			else selectedLanguage = "";

			this.renderList();
			this.closeList();
		});
	}

	// -----------------------
	// DATA
	// -----------------------
	async fetchData() {
		const url =
			this.type === "language"
				? `${BASE_URL}/configuration/languages?api_key=${API_KEY}`
				: `${BASE_URL}/configuration/countries?language=en-US&api_key=${API_KEY}`;

		const res = await fetch(url);
		this.data = await res.json();

		// handle preselect
		if (this.preselect) {
			const match = this.data.find(
				x => x.iso_639_1 === this.preselect || x.iso_3166_1 === this.preselect
			);
			if (match) {
				this.selected = match;

				// update external state correctly
				if (this.type === "country") selectedCountry = match.iso_3166_1;
				else selectedLanguage = match.iso_639_1;

				this.input.value = match.english_name || match.name || match.native_name;
			}
		}

		this.renderList();
	}

	// -----------------------
	// KEYBOARD EVENTS
	// -----------------------
	handleKeys(e) {
		const items = this.getListItems();
		if (!items.length) return;

		switch (e.key) {
			case "Tab": 
				this.closeList();
				break;

			case "ArrowDown":
				e.preventDefault();
				if (this.hoverIndex + 1 < items.length) {
					this.hoverIndex += 1;
					this.updateHover(items);
				}
				break;

			case "ArrowUp":
				e.preventDefault();
				if (this.hoverIndex > 0) {
					this.hoverIndex -= 1;
					this.updateHover(items);
				}
				break;

			case "Enter":
				e.preventDefault();
				if (this.hoverIndex >= 0) {
					const item = this.filtered[this.hoverIndex];
					this.selectItem(item);
				}
				break;

			case "Escape":
				this.closeList();
				break;
		}
	}

	updateHover(items) {
		items.forEach(el => el.classList.remove("hover"));
		if (this.hoverIndex >= 0) {
			items[this.hoverIndex].classList.add("hover");
			items[this.hoverIndex].scrollIntoView({ block: "nearest" });
		}
	}

	// -----------------------
	// RENDER
	// -----------------------
	renderList() {
		const q = this.input.value.toLowerCase();

		// preserve filtered array for keyboard enter
		this.filtered = this.data.filter(item => {
			const name = item.english_name || item.name || item.native_name || "";
			return name.toLowerCase().includes(q);
		});

		this.list.innerHTML = "";
		this.hoverIndex = -1;

		this.filtered.forEach((item, i) => {
			const name = item.english_name || item.name || item.native_name || "";
			const code = item.iso_639_1 || item.iso_3166_1;

			const div = document.createElement("div");
			div.className = "list-item";
			div.dataset.code = code;
			div.innerHTML = `
				<p>${name}</p>
				<p class="abbr">${code}</p>
			`;

			if (this.selected && code === this.getSelectedCode()) {
				div.classList.add("active");
			}

			div.addEventListener("mouseenter", () => {
				this.hoverIndex = i;
				this.updateHover(this.getListItems());
			});

			div.addEventListener("click", () => this.selectItem(item));

			this.list.appendChild(div);
		});
	}

	selectItem(item) {
		this.selected = item;

		const code = item.iso_639_1 || item.iso_3166_1;

		// update external variable reliably
		if (this.type === "country") selectedCountry = code;
		else selectedLanguage = code;

		this.input.value =
			item.english_name || item.name || item.native_name;

		this.closeList();
	}

	getListItems() {
		return Array.from(this.list.querySelectorAll(".list-item"));
	}

	// -----------------------
	// UTILS
	// -----------------------
	getSelectedCode() {
		return this.selected?.iso_639_1 || this.selected?.iso_3166_1;
	}

	openList() {
		if (this.getListItems().length > 0) {
			this.list.classList.add("open");
		}
	}

	closeList() {
		this.list.classList.remove("open");
	}

	addOutsideListener() {
		document.addEventListener("click", e => {
			if (!this.el.contains(e.target)) this.closeList();
		});
	}
}
	
async function renderNationAndLangSelector(params = null) {
	// Fetch countries
	const { reg, lang } = params

	new SelectMenu({
		el: document.getElementById("countrySelect"),
		type: "country",
		preselect: reg
	});

	new SelectMenu({
		el: document.getElementById("langSelect"),
		type: "language",
		preselect: lang
	});
}

// async function renderNationAndLangSelector(params = null) {
// 	// Fetch countries
// 	const { reg, lang } = params
// 	const counteryURL = `${BASE_URL}/configuration/countries?language=en-US&api_key=${API_KEY}`
// 	const counteryList = ['AS', 'US', 'AU', 'GB', 'IE', 'JP', 'KO', 'IN', 'RU', 'MX', 'FR', 'DE'];
// 	fetchFromURL(counteryURL).then((data) => {
// 		const countries = data
// 		const countrySelect = document.getElementById('countryFilter');
// 		countries.forEach(country => {
// 			if (counteryList.includes(country.iso_3166_1)) {
// 				const option = document.createElement('option');
// 				option.value = country.iso_3166_1;
// 				option.textContent = abbvText(country.english_name, 13);
// 				if (option.value.toLowerCase() === reg?.toLowerCase()) option.setAttribute('selected', '')
// 				countrySelect.appendChild(option);
// 			}
// 		});
// 	}).catch((e) => {
// 		console.log(e)
// 		notifyAlert(e)
// 	})

// 	// Fetch languages
// 	const languageURL = `${BASE_URL}/configuration/languages?api_key=${API_KEY}`
// 	const languagelist = ['en', 'ja', 'ko', 'hi', 'as', 'ru', 'es', 'fr', 'de']
// 	fetchFromURL(languageURL).then((data) => {
// 		const languages = data;
// 		console.log(data)
// 		const languageSelect = document.getElementById('languageFilter');
// 		languages.forEach(language => {
// 			if (languagelist.includes(language.iso_639_1)) {
// 				const option = document.createElement('option');
// 				option.value = language.iso_639_1;
// 				option.textContent = language.english_name;
// 				if (option.value.toLowerCase() === lang?.toLowerCase()) option.setAttribute('selected', '')
// 				languageSelect.appendChild(option);
// 			}
// 		});
// 	}).catch((e) => {
// 		console.log(e)
// 		notifyAlert(e)
// 	})
// }

function resetSection() {
	try {
		const mediaType = isMovie ? 'movie' : 'tv';
		const gridContainer = document.querySelector(".grid-container")
		const msg = document.querySelector('.result-message');
		msg.querySelector('.text').innerText = 'Loading...'
		msg.classList.add('loading')
		msg.classList.remove('empty')
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
			document.body.scrollTo({ top: 0 })
		}
		if (event.target.closest('.filter-overlay, .close-btn, .apply')) {
			filterMenu.style.display = 'none';
			filterMenu.toggleAttribute('active')
			filterMenu.querySelector('.select-list.open')?.classList.remove('open')
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

function searchResultFunction(sectionId, params) {
	const section = document.querySelector(`${sectionId}`)
	const type = section?.getAttribute("type")
	const searchBox = section?.querySelector(".search-box input")
	const resultsContainer = section?.querySelector(".results")
	const selectedContainer = section?.querySelector(".select-container")

	let searchWait
	let currentSearchResults = [] // Store the latest search results
	let selectedSearchItems = [ params ?? ''] // Store full item objects for selected items

	if (searchBox) searchBox.oninput = function () {
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
		section.setAttribute('expanded', '')
		data.forEach((item) => {
			const dataExists = selectedSearchItems.some(
				(selected) => Number(selected.id) === item.id,
			)
			if (dataExists) return
			const resultEl = resultHTML(item)
			resultsContainer.appendChild(resultEl)
			// resultsContainer.firstChild.focus()
		})
	}

	const resultHTML = function (item) {
		const result = document.createElement("div")
		result.classList.add("result")
		Object.assign(result.dataset, {id: item.id, 'name': item.name})
		result.tabIndex = 0;

		let IMG = '/assets/images/no-image-transparent-dark.svg'
		if (type === `person` && item.profile_path) IMG = `${IMAGE_92 + item.profile_path}`
		if (type === `company` && item.logo_path) IMG = `${IMAGE_92 + item.logo_path}`
		result.innerHTML = `<div class="img-container"><img src='${IMG}' loading="lazy" alt=""></div><p>${item.name}</p>`
		return result
	}

	const selectedHTML = function (item) {
		const selectedItem = document.createElement("div")
		selectedItem.classList.add("select-item")
		Object.assign(selectedItem.dataset, {id: item.id, 'name': item.name})
		selectedItem.tabIndex = 0;
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
		console.log('search section')
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

	if (params?.name) {
		selectedContainer.appendChild(selectedHTML(params))
	}

	const form = section?.closest('.form-group')
	if (!form) return
	form.addEventListener("click", sectionEventListener)
	form.addEventListener("keydown", (e) => {
		if (e.key !== 'Enter') return
		sectionEventListener(e)
	})
}


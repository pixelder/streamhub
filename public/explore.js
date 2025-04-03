const GENRE_URL = `https://api.themoviedb.org/3/genre`

let isMovie = null;

function loadExplorePage(mediaType) {
	document.querySelector('title').innerText = `Browse ${mediaType !== 'tv' ? mediaType : `serie`}s | Pixelstream`;
	console.log(loc());
	!loc().includes(`/${mediaType}`) ? window.history.pushState('', '', `/${mediaType}`) : '';
	window.addEventListener('popstate', function () {
		console.log('active');
		window.location.href = `${loc()}`;
	});
	loc();
	isBrowsing = true;
	isMovie = mediaType === 'movie' ? true : false;
	const main = document.querySelector('main');
	const sectionTitle = mediaType === 'tv' ? 'Browse TV Series' : 'Browse Movies';
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
                            <i class="fa-solid fa-arrow-down-wide-short active"></i> 
                            <i class="fa-solid fa-arrow-up-short-wide passive"></i>
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
                <button class="filter-button"><i class="fa-solid fa-filter"></i>Filters</button>
                <div class="filter-overlay"></div>
                <div class="filter-menu">
                    <h2>More Filters</h2>
                    <div class="form-group">
                        <div class="flow-row">
													<label for="search-with-cast">Cast</label>
													<div class="caution">
														<i class="fa-solid fa-triangle-exclamation"></i>
														<p>For Movies Only</p>
													</div>
												</div>
                        <div class="search-container" id="search-with-cast" type="person">
                            <label for="cast-input" class="search-box">
															<form class="flow-row" action="javascript:void(0);">
																<input id="cast-input" type="search" placeholder="eg. Hugh Jackman, Tom Cruise">
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
														</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="search-with-company">Production Company</label>
                        <div class="search-container" id="search-with-company" type="company">
                            <label for="company-input" class="search-box">
															<form class="flow-row" action="javascript:void(0);">	
																<input id="company-input" type="search" placeholder="eg. Studio Ghibli, Marvel Studios">
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
														</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="min-vote-slider">Minimum vote count</label>
                        <div class="vote-count">
                            <input id="min-vote-number" type="number" value="200" min="0" step="10" max="1000">
                            <p>0</p>
                            <input id="min-vote-slider" type="range" value="200" min="0" step="1" max="1000">
                            <p>1000</p>
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
                    <button class="reset-button" onclick=filterReset()>Reset</button>
                </div>
            </div>
            <div class='grid-container'></div>
            <div class='result-message'>
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
    `;

	filterReset()
	loadDiscoverContent('', '', mediaType, `browse-${mediaType}s`);

	fetchGenres(mediaType);
	fetchCountriesAndLanguages();

	let pageWait

	window.addEventListener("scroll", () => {
		if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 250) {
			console.log('hit border', currentPage)
			if (!pageEnd) {
				clearTimeout(pageWait)
				pageWait = setTimeout(() => {
					console.log('loading page', currentPage)
					loadDiscoverContent('', '', mediaType, `browse-${mediaType}s`);
				}, (200));
			}
		}
	})

	filterParams();

	const filters = document.querySelector('.filters');

	['click', 'change'].forEach(eventType => {
		filters.removeEventListener(eventType, filterEvents);
	});
	['click', 'change'].forEach(eventType => {
		filters.addEventListener(eventType, filterEvents);
	});

	searchResultFunction("#search-with-cast")
	searchResultFunction("#search-with-company")

	document.body.addEventListener("focus", function(event) {
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

	document.body.addEventListener("blur", function() {
			console.log('blur')
			document.body.classList.remove("keyboard");
	}, true);
	//filters.dispatchEvent(/* new Event('click') ||  */new Event('change', () => {console.log('hi')}));
}


function filterParams() {
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

	// New values
	sortBy.oninput = function () {
		checkbox.checked = false
		sortMode = this.value
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

	// On reset
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
}

function filterReset() {
	selectedGenres = []
	excludedGenres = []
	currentPage = 1
	sortMode = 'popularity'
	sortOrder = 'desc'
	selectedCast = []
	selectedCompany = []
	minVoteCount = 200
	minRate = 5
	currentYear = null
	selectedCountry = '';
	selectedLanguage = '';

	filterParams();
	resetSection();
	pageEnd = false;
}

function fetchGenres(mediaType) {
	const genreContainer = document.getElementById("genreChips");
	const createChip = (genre, genreContainer, mediaType) => {
		const chip = document.createElement('div');
		chip.classList.add('chip');
		chip.textContent = genre.name;
		chip.dataset.id = genre.id;
		let clickTimer = null;

		chip.addEventListener('click', () => {
			if (clickTimer) {
				clearTimeout(clickTimer);
				clickTimer = null;
				handleChipClick(genre.id, 'double', genreContainer, mediaType);
			} else {
				clickTimer = setTimeout(() => {
					clickTimer = null;
					handleChipClick(genre.id, 'single', genreContainer, mediaType);
				}, 300);
			}
		});

		genreContainer.appendChild(chip);
	}
	
	const url = `${GENRE_URL}/${mediaType}/list?api_key=${API_KEY}`
	fetchFromURL(url).then((data) => {
		data.genres.forEach(genre => {
				createChip(genre,genreContainer,mediaType)
		});
	})

	enableHorizontalWheelScroll(genreContainer, 2)
}

async function fetchCountriesAndLanguages() {
	// Fetch countries
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
				languageSelect.appendChild(option);
			}
		});
	}).catch((e) => {
		console.log(e)
		notifyAlert(e)
	})
}

function handleChipClick(genreId, type, genreContainer, mediaType) {
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
	const mediaType = isMovie ? 'movie' : 'tv';
	const gridContainer = document.querySelector(".grid-container")
	const msg = document.querySelector('.result-message');
	msg.querySelector('label').innerText = 'Loading...'
	msg.classList.add('loading')
	gridContainer.innerHTML = '';
	currentPage = 1;

	loadDiscoverContent('', '', mediaType, `browse-${mediaType}s`);
}


function filterEvents(event) {
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
		if (event.target.closest('.filter-overlay')) {
			filterMenu.style.display = 'none';
			filterMenu.toggleAttribute('active')
			filterOverlay.style.display = 'none';
			event.stopPropagation();
		};

		if (!event.target.closest('.search-box')) {
			document.querySelectorAll('.search-container').forEach(el => {
				el.removeAttribute('expanded','')
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
		let IMG
		if (type === `person` &&  item.profile_path ) IMG = `${IMAGE_URL + item.profile_path}`
		if (type === `company` &&  item.logo_path ) IMG = `${IMAGE_URL + item.logo_path}`
		result.innerHTML = `<div class="img-container"><img src='${IMG}' loading="lazy" alt="No image available"></div><p>${item.name}</p>`
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
			if ( item && !selectedSearchItems.some((selected) => selected.id == id)) {
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
			document.querySelectorAll('.search-container').forEach(item => item.removeAttribute('expanded',''))
			section.setAttribute('expanded', '')
			// searchBox.focus()
		}

		if (clearBtn) {
			console.log('clearing')
			resetResults()
			selectedContainer.innerHTML = ''
			selectedSearchItems = []
			updateSelectItems()
		}
	}
	const form = section.closest('.form-group')
	form.removeEventListener("click", sectionEventListener)
	form.addEventListener("click", sectionEventListener)
}

const GENRE_URL = `https://api.themoviedb.org/3/genre`

let isMovie = null;


function loadExplorePage(mediaType) {
    document.querySelector('title').innerText = `Browse ${mediaType !== 'tv' ? mediaType : `serie`}s | Pixelstream`;
    console.log(loc());
    !loc().includes(`/${mediaType}`) ? window.history.pushState('', '', `/${mediaType}`) : '';
    window.addEventListener('popstate', function() {
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
            <h2>${sectionTitle}</h2>
            <div class="filters">
                <div class="form-group">
                    <label>Genre</label>
                    <div class="genre-chips" id="genreChips">
                    </div>
                </div>
                <div class="form-group">
                    <label>Sort by</label>
                    <select id="sort">
                        <option value="popularity.desc" "selected">Popularity</option>
                        <option value="vote_average.desc">Rating</option>
                        <option value="${isMovie ? 'primary_release_date.desc' : 'first_air_date.desc'}">Date</option>
                        <option value="${isMovie ? 'title.desc' : 'name.desc'}">Name</option>
                    </select>
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
                <button class="filter-button"><i class="fa-solid fa-filter"></i>       Filter</button>
                <div class="filter-overlay"></div>
                <div class="filter-menu">
                    <h2>More Filters</h2>
                    <div class="form-group">
                        <label for="min-vote-slider">Minimum vote count</label>
                        <div class="vote-count">
                            <input id="min-vote-number" type="number" value="200" min="0" step="10" max="500">
                            <p>0</p>
                            <input id="min-vote-slider" type="range" value="200" min="0" step="35" max="500">
                            <p>500</p>
                        </div>
                    </div>
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
                    <div class="form-group">
                        <button class="reset-button" onclick=filterReset()>Reset</button>
                    </div>
                </div>
            </div>
            <div class='grid-container'></div>
            <div class='result-message'>
                <label>No more results</label>
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
    loadDiscoverContent( '', '', mediaType,`browse-${mediaType}s`);
    
    fetchGenres(mediaType);
    fetchCountriesAndLanguages();
    
    window.addEventListener("scroll", () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
            if ( !pageEnd ) {
                console.log('loading page',currentPage)
                loadDiscoverContent( '', '', mediaType,`browse-${mediaType}s`);
            }
        }
    })

    filterParams();

    const filters = document.querySelector('.filters');
    
    ['click', 'change'].forEach(eventType => {
        filters.removeEventListener(eventType, filterAddEventLister);
    });
    ['click', 'change'].forEach(eventType => {
        filters.addEventListener(eventType, filterAddEventLister);
    });

    const msg = document.querySelector('.result-message');
    msg.classList.remove('show');
    //filters.dispatchEvent(/* new Event('click') ||  */new Event('change', () => {console.log('hi')}));
}


function filterParams() {
    const minVoteSlider = document.getElementById("min-vote-slider")
    const minVoteNumber = document.getElementById("min-vote-number")
    const minRateSlider = document.getElementById("min-rating-slider")
    const minRateNumber = document.getElementById("min-rating-number")
    const sortBy = document.getElementById("sort")
    const yearPicker = document.getElementById("year-picker")
    const countryFilter = document.getElementById("countryFilter")
    const languageFilter = document.getElementById("languageFilter")
    const genreContainer = document.getElementById("genreChips");
    
    // New values
    sortBy.oninput = function () {
        sortMode = this.value
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
    yearPicker.value = currentYear
    minVoteNumber.value = minVoteCount
    minVoteSlider.value = minVoteCount
    minRateNumber.value = minRate
    minRateSlider.value = minRate
    countryFilter.value = selectedCountry
    languageFilter.value = selectedLanguage

    updateChips(genreContainer)
}


function filterReset() {
    selectedGenres = []
    excludedGenres = []
    currentPage = 1
    sortMode = 'popularity.desc'
    minVoteCount = 200
    minRate = 5
    currentYear = null
    selectedCountry = '';
    selectedLanguage = '';
    
    filterParams();
    resetSection();
    pageEnd = false;
}

async function fetchGenres(mediaType) {
    const genreContainer = document.getElementById("genreChips");
    const response = await fetch(`${GENRE_URL}/${mediaType}/list?api_key=${API_KEY}`);
    const data = await response.json();
    data.genres.forEach(genre => {
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
    });

    enableHorizontalWheelScroll('.genre-chips', 2)
}

async function fetchCountriesAndLanguages() {
    // Fetch countries
    const countryResponse = await fetch(`https://api.themoviedb.org/3/configuration/countries?language=en-US&api_key=${API_KEY}`);
    const countries = await countryResponse.json();
    const counteryList = ['AS','US','AU', 'GB', 'IE', 'JP', 'KO', 'IN', 'RU', 'MX', 'FR', 'DE',];
    const countrySelect = document.getElementById('countryFilter');
    countries.forEach(country => {
        if ( counteryList.includes(country.iso_3166_1) ) {
            const option = document.createElement('option');
            option.value = country.iso_3166_1;
            option.textContent = abbvText(country.english_name, 13);
            countrySelect.appendChild(option);
        }
    });

    // Fetch languages
    const languageResponse = await fetch(`https://api.themoviedb.org/3/configuration/languages?api_key=${API_KEY}`);
    const languages = await languageResponse.json();
    const languagelist = [ 'en', 'ja', 'ko', 'hi', 'as','ru','es', 'fr', 'de']
    const languageSelect = document.getElementById('languageFilter');
    languages.forEach(language => {
        if (languagelist.includes(language.iso_639_1)) {
            const option = document.createElement('option');
            option.value = language.iso_639_1;
            option.textContent = language.english_name;
            languageSelect.appendChild(option);
        }
    });
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

    updateChips(genreContainer);
    resetSection();
}

function updateChips(genreContainer) {
    genreContainer.querySelectorAll('.chip').forEach(chip => {
        const genreId = parseInt(chip.dataset.id);
        chip.classList.toggle('selected', selectedGenres.includes(genreId));
        chip.classList.toggle('excluded', excludedGenres.includes(genreId));
    });
}

function resetSection() {
    const mediaType = isMovie ? 'movie' : 'tv';
    const gridContainer = document.querySelector(".grid-container")
    gridContainer.innerHTML = '';
    currentPage = 1;
    loadDiscoverContent( '', '', mediaType,`browse-${mediaType}s`);
}


function filterAddEventLister(event) {
    const filterMenu = document.querySelector('.filter-menu');
    const filterOverlay = document.querySelector('.filter-overlay');
    
    if ( event.type === 'click' ) {
        if (event.target.closest('.filter-button')) {
            const isMenuVisible = filterMenu.style.display === 'flex';
            filterMenu.style.display = isMenuVisible ? 'none' : 'flex';
            filterOverlay.style.display = isMenuVisible ? 'none' : 'flex';
            event.stopPropagation();
        } else if (event.target.closest('.filter-overlay')) {
            filterMenu.style.display = 'none';
            filterOverlay.style.display = 'none';
            event.stopPropagation();
        };
    } else if ( event.type === 'change') {
        resetSection();
        pageEnd = false
    }
}
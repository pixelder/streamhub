const GENRE_URL = `https://api.themoviedb.org/3/genre`

let isMovie = null;
function loadExplorePage(mediaType) {
    isBrowsing = true;
    isMovie = mediaType === 'movie' ? true : false; 
    const main = document.querySelector('main');
    const sectionTitle = mediaType === 'tv' ? 'Browse TV Series' : 'Browse Movies';
    main.innerHTML = `
        <section id="browse-${mediaType}s" data-type="${mediaType}">
            <h2>${sectionTitle}</h2>
            <div class="filters">
                <div class="genre-chips" id="genreChips"></div>
                <select id="sort">
                    <option value="popularity.desc" "selected">Popularity</option>
                    <option value="vote_average.desc">Rating</option>
                    <option value="${isMovie ? 'primary_release_date.desc' : 'first_air_date.desc'}">Date</option>
                    <option value="${isMovie ? 'title.desc' : 'name.desc'}">Name</option>
                </select>
                <input type="number" id="year-picker" min="1888" max="2099" step="1" value="" placeholder="eg. 2024" />
                <button class="filter-button"><i class="fa-solid fa-filter"></i>       Filter</button>
                <div class="filter-overlay"></div>
                <div class="filter-menu">
                    <h3>More Filters</h3>
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
            </div>
            <div class='grid-container'></div>
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
    loadDiscoverContent( '', '', mediaType,`browse-${mediaType}s`);
    fetchGenres(mediaType);
    fetchCountriesAndLanguages();
    
    window.addEventListener("scroll", () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 10) {
            currentPage++
            loadDiscoverContent( '', '', mediaType,`browse-${mediaType}s`);
        }
    })


    const filters = document.querySelector('.filters');
    console.log(filters);
    
    ['click', 'change'].forEach(eventType => {
        filters.removeEventListener(eventType, filterAddEventLister);
    });
    ['click', 'change'].forEach(eventType => {
        filters.addEventListener(eventType, filterAddEventLister);
    });

    filters.dispatchEvent(new Event('click') || new Event('change'));
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
}

async function fetchCountriesAndLanguages() {
    // Fetch countries
    const countryResponse = await fetch(`https://api.themoviedb.org/3/configuration/countries??language=en-US&api_key=${API_KEY}`);
    const countries = await countryResponse.json();

    const countrySelect = document.getElementById('countryFilter');
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.iso_3166_1;
        option.textContent = country.iso_3166_1;
        countrySelect.appendChild(option);
    });

    //countrySelect.insertAdjacentText("afterend", `    ${selectedCountry}`);

    // Fetch languages
    const languageResponse = await fetch(`https://api.themoviedb.org/3/configuration/languages?api_key=${API_KEY}`);
    const languages = await languageResponse.json();

    const languageSelect = document.getElementById('languageFilter');
    languages.forEach(language => {
        const option = document.createElement('option');
        option.value = language.iso_639_1;
        option.textContent = language.iso_639_1;
        languageSelect.appendChild(option);
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
        } else if (event.target.closest('.filter-overlay')) {
            filterMenu.style.display = 'none';
            filterOverlay.style.display = 'none';
        };
    } else if ( event.type === 'change') {
        if ( event.target.closest('#sort')) {
            sortMode = event.target.value;
        } else if ( event.target.closest('#year-picker')) {
            currentYear = event.target.value;
        } else if ( event.target.closest('#countryFilter')) {
            selectedCountry = event.target.value || 'US';
        } else if ( event.target.closest('#languageFilter')) {
            selectedLanguage = event.target.value || 'en';
        }
        resetSection();
    }
}
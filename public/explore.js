const GENRE_URL = `https://api.themoviedb.org/3/genre`

function loadExplorePage(mediaType) {
    isBrowsing = true;
    const isMovie = mediaType === 'movie' ? true : false; 
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
                    <option value="${isMovie ? 'primary_release_date.desc' : 'first_air_date.desc'}">Release Date</option>
                    <option value="${isMovie ? 'title.desc' : 'name.desc'}">Name</option>
                </select>
                <input type="number" id="year-picker" min="1887" max="2099" step="1" value="" placeholder="eg. 2024" />
                <button class="filter-button"><i class="fa-solid fa-filter"></i>       Filter</button>
                <div class="filter-menu"></div>
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
    
    window.addEventListener("scroll", () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 10) {
            currentPage++
            loadDiscoverContent( '', '', mediaType,`browse-${mediaType}s`);
        }
    })
    const sortBy = async (event) => {
        sortMode = event.target.value;
        resetSection(mediaType);
    }

    const sortByYear = async (event) => {
        currentYear = event.target.value;
        resetSection(mediaType);
    }

    const sortDropdown = document.getElementById('sort');
    sortDropdown.removeEventListener('change', sortBy);
    sortDropdown.addEventListener('change', sortBy);
    sortDropdown.dispatchEvent(new Event('change'));

    const yearPicker = document.getElementById('year-picker');
    yearPicker.removeEventListener('change', sortByYear);
    yearPicker.addEventListener('change', sortByYear);
    yearPicker.dispatchEvent(new Event('change'));
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
    resetSection(mediaType);
}

function updateChips(genreContainer) {
    genreContainer.querySelectorAll('.chip').forEach(chip => {
        const genreId = parseInt(chip.dataset.id);
        chip.classList.toggle('selected', selectedGenres.includes(genreId));
        chip.classList.toggle('excluded', excludedGenres.includes(genreId));
    });
}

function resetSection(mediaType) {
    const gridContainer = document.querySelector(".grid-container")
    gridContainer.innerHTML = '';
    currentPage = 1;
    loadDiscoverContent( '', '', mediaType,`browse-${mediaType}s`);
}

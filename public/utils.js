function truncate(num, precision) {
  return Math.floor(num * Math.pow(10, precision)) / Math.pow(10, precision);
}

function extractYear(dateString) {
  const date = new Date(dateString);
  return date.getFullYear();
}

function capString(str, maxLength) {
  if (str.length > maxLength) {
    return str.substring(0, maxLength - 3) + '...';
  }
  return str;
}

function abbvText(text, limit) {
  const words = text.split(' ');

  const filteredWords = words.filter(w => w !== w.toLowerCase());
  
  if ((words.length !== 1) && (text.length > limit)) {
      let abbreviation = '';
      for (const word of filteredWords) {
          abbreviation += word[0].toUpperCase();
      }
      return abbreviation;
  } else {
    return text;
  }
}

function convertDate(dateString) {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  return formatter.format(new Date(dateString));
}

function runtime(min) {
  const hour = Math.floor(min / 60.0);
  const minute = min - hour * 60.0;
  return (hour !== 0 ? `${hour}h` : '') + `${minute}m`;
}

function inBeta() {
  const msg = "This functionality is currently undergoing development!!";
  console.log(msg);
  return msg;
}

function isMobile() {
  const screenWidth = window.innerWidth <= 768;
  return screenWidth;
}

function loc() {
  return window.location.href;
}

async function handleSearch(event) {
  if (event) event.preventDefault(); // Prevent form submission

  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  window.location.href = `/search?q=${encodeURIComponent(query)}`;
  loc();
}

// Populate a section with content
function populateSection(sectionId, items) {
  const container = document.querySelector(`#${sectionId} .grid-container`);
  
  if (!isBrowsing) return container.innerHTML = renderGridItems(items);
  
  currentPage++
  const msg = document.querySelector('.result-message');
  msg.classList.remove('show');
  msg.querySelector('label').innerText = 'Loading...';
  msg.style.display = 'flex';
  container.innerHTML += renderGridItems(items);
  if (items.length < 20) {
    pageEnd = true;
    msg.querySelector('label').innerText = 'No more results';
    msg.classList.add('show');
  } else {
    msg.classList.remove('show');
    msg.style.display = 'none';
  }
}

function renderGridItems(items) {
  return items
    .map(item => {
      const id = item.id;
      const mediaType = item.media_type;
      const bookmark = logExists('bookmarks', id, mediaType);
      const title = item.title || item.name;
      const rating = truncate(item.vote_average, 1);
      const year = extractYear(item.release_date || item.first_air_date);
      const image = item.poster_path
      ? `${IMAGE_URL}${item.poster_path}`
      : 'https://placehold.co/440x661/383852/ccc?text=No+Image';
      return `
         <div tabindex="0" class="grid-item" id="grid-item" data-id="${item.id}" data-media-type="${mediaType}">
           <div>
            <div class="grid-actions">
              <div class="grid-options ${bookmark? 'open': ''}">
                <div tabindex="0" class="options-buttons">
                  <i class="options-icon fa-regular fa-bookmark"></i>
                  <i class="options-x-icon fa-solid fa-bookmark"></i>
                </div>
              </div>
            </div>
             <img src="${image}" alt="${title}">
           </div>
           <div class="grid-item-info">
             <p>${capString(title, 40)}</p>
             <span class="grid-rating">
              <p class="rating">
                <i class="fa-solid fa-star"></i>
                ${rating}
              </p>
             </span>
             <p>${year}</p>
           </div>
         </div>
       `;
    })
    .join('');
}

//fetch Metadata
async function fetchMetaData(mediaType, id) {
  try {
    let url;
    if (mediaType === "movie") {
      url = `${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US&append_to_response=videos,release_dates,credits,images&include_image_language=en`;
    } else if (mediaType === "tv") {
      url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US&append_to_response=content_ratings,credits,images&include_image_language=en`;
    } else if (mediaType === "person") {
      url = `${BASE_URL}/person/${id}?api_key=${API_KEY}&language=en-US`;
    }
    const response = await fetch(url);
    const data = await response.json();
    return { data, mediaType };
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

function openModal(event) {
  const gridItem = event.target.closest('.grid-item, .profile-item');
  const id = gridItem?.dataset.id; // Get the ID of the item
  console.log(id)
  const sectionId = gridItem?.closest('section')?.id; // Find the parent section's ID
  const mediaType =  gridItem?.dataset?.mediaType ?? gridItem?.closest('section')?.dataset?.type ;
  console.log(mediaType, id)
  if (gridItem && !mediaType || !id) {
    console.error("Media type or ID not found");
    return;
  }

  fetchMetaData(mediaType, id).then(({ mediaType, data }) => {
    displayModal(mediaType, data);
  });
}

// Display modal with fetched data
function displayModal(mediaType, data) {
  const modal = document.getElementById('info-modal');
  const modalContent = document.querySelector(".modal-content");
  const details = document.getElementById('modal-details');
  const id = data.id;
  console.log(id)
  const name = data.name || data.title || data.original_title;
  const cast = data.credits?.cast.map(cast => cast.name).slice(0, 5).join(", ");
  const rated = mediaType === "movie"
    ? data.release_dates?.results?.find((item) => item.iso_3166_1 === "US")?.release_dates[0].certification
    : data.content_ratings?.results?.find((item) => item.iso_3166_1 === "US")?.rating || "";
  const logo = data.images?.logos?.[0]?.file_path
    ? `<span>
          <div class="modal-info-logo">
            <img src="${IMAGE_URL}${data.images.logos[0].file_path}" alt="Logo">
          </div>
          <div class="modal-info">`
    : `<span>
          <div class="modal-info-backdrop" style="background-image : url(${IMAGE_ORG}${data.backdrop_path})"></div>
          <div class="modal-info">
            <h1>${name.toUpperCase()}</h1>`;
  document.documentElement.style.setProperty('--modal-backdrop', `url(${IMAGE_ORG}${data.backdrop_path})`);
  if (mediaType !== "person") {
    const date = convertDate(data.release_date || data.first_air_date || data.air_date);
    details.innerHTML = `
    <div class="modal-media">
      <div class="modal-cover">
        <img src="${IMAGE_URL}${data.poster_path}" alt="${name}"></img>
      </div>
      ${logo}
          <span class="ratings-genre">
            <i class="fa-solid fa-star"></i>
            <p data-title="${data.vote_count} votes">${truncate(data.vote_average, 1)}</p>
            <span class="modal-genre">
              ${data.genres.map(genre => `<a href="#">${genre.name}</a>`).slice(0, 5).join(" ")}
            </span>
          </span>
          <div class="synopsis"><p class="overview">${data.overview || 'No description available.'}</p></div>
          <p>Cast : ${cast}</p>
          <p class="tags">${extractYear(date)} • ${rated !== "" ? `${rated} • ` : ""} ${data.original_language.toUpperCase()} ${mediaType === "movie" ? `• ${runtime(data.runtime)}</p>` : "</p>"}
          </span>
      </div>
      </span>
    </div>`;
  } else
    if (mediaType === "person") {
      details.innerHTML = `${inBeta()}`;
    }

  const userData = getLogData('history')?.filter(item => item?.id === id)[0]?.data;

  if (mediaType === "movie") {
    document.querySelector(".modal-media")
      .insertAdjacentHTML('afterend', `
      <div class="modal-actions">
        <button class="watch-btn" 
        data-name="${name}" 
        data-id="${id}">
          Watch
        </button>
        <button tab-index="0" class="share">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    `);
    modalContent.style.height = "fit-content";
  } else
    if (mediaType === "tv") {
      let sno = userData?.sno;
      let eno = userData?.eno;
      tvContent(data, sno, eno, ref = "modal");
      if (!isMobile()) {
        modalContent.style.height = '32rem';
      }
      else {
        modalContent.style.height = '70%';
        document.getElementById("season-dropdown").insertAdjacentHTML('afterend', `
        <button class="share">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
        `);
      };
    };

  shareItem(mediaType, id, name);

  modal.classList.add('active');
  details.focus();

  ['click','keydown'].forEach(eventType => {
    document.removeEventListener(eventType, watchEventListeners)  
    document.addEventListener(eventType, watchEventListeners)
  });
  
  details.removeEventListener('scroll', () => { backdropAnim(details,modalContent)});
  details.addEventListener('scroll',() => { backdropAnim(details,modalContent)});

  cappedOverview();
}

async function tvContent(data, sno, eno, ref) {
  const seasons = data.seasons.reverse();
  sno === null ? sno = -1 : "";
  const containerClass = ref === "modal" ? "episode-wrap" : "episode-player";
  const tvInfo = `
    <div class="season-info">
      <div class="seasons-menu">
        <select tabindex="0" id="season-dropdown">
           ${seasons
      .map(season => `
                <option value="${season.season_number}" 
                ${season.season_number === Number(sno) ? "selected" : ""}>
                Season ${season.season_number}
                </option>
              `)
      .join("")}
        </select>
      </div>
    <div class="episode-container ${containerClass}" id="episode-container">
    </div>
    </div>
    `;
  //modal
  document.querySelector(".modal-media")?.insertAdjacentHTML('afterend', tvInfo);
  //player
  ref !== "modal" ? document.querySelector(".player-episodes").innerHTML = tvInfo : "";

  //episode info
  const episodeContainer = document.getElementById('episode-container');

  const displaySeasonInfo = async (event) => {
    const selectedSeason = event.target.value;
    try {
      const response = await fetch(`${BASE_URL}/tv/${data.id}/season/${selectedSeason}?api_key=${API_KEY}`);
      seasonData = await response.json();
      episodeContainer.innerHTML = seasonData.episodes
        .map(episode => `
          <div id="${episode.episode_number}" class="episode episode-width" data-name="${data.name}" data-id="${data.id}" data-season="${selectedSeason}" data-episode="${episode.episode_number}" data-epname="${episode.name}">
            <div class="episode-items">
              <img tabindex="0" src="${episode.still_path ? IMAGE_URL + episode.still_path : 'https://placehold.co/500x281?text=No+Image+Available'}" alt="Episode ${episode.episode_number}">
              <div class="episode-info">
                <h3>${episode.episode_number}. ${episode.name}</h3>
                <p>Rated: ${episode.vote_average.toFixed(1)}</p>
                <p>${convertDate(episode.air_date)}</p>
              </div>
              <div class="synopsis">
                <p class="overview">${episode.overview || "No overview available"}</p>
              </div>
            </div>
          </div>
        `)
        .join("");

    } catch (error) {
      console.error('Error fetching season details:', error);
    }
    if (ref != "modal") {
      document.getElementById('episode-container').classList.add('player-styling');
      document.querySelector('.now-playing > h4').innerHTML = `S${sno}:E${eno} ${seasonData.episodes.map(episode => episode.name)[eno - 1]}`;
      document.querySelectorAll('.episode').forEach(item => {
        if (item.dataset.episode === String(episode)) {
          item.classList.add('current');
        }
      });
    }
    whenInView('.player-styling, .modal', () => {
      scrollEpisodeIntoView(eno);
    });
  };

  const seasonDropdown = document.getElementById('season-dropdown');
  seasonDropdown.removeEventListener('change', displaySeasonInfo);
  seasonDropdown.addEventListener('change', displaySeasonInfo);
  seasonDropdown.dispatchEvent(new Event('change'));

}

function watchEventListeners(event) {
  console.log('i ran');
  if(event.type === 'click' || event.type === 'keydown' && event.key === 'Enter') {
    if (event.target.classList.contains("watch-btn")) {
      const id = event.target.dataset.id;
      const name = event.target.dataset.name;
      const mediaType = "movie";
  
      //loadWatchPage(mediaType, name, id);
      window.location.href = `/watch/${mediaType}/${id}/${name}`;
      event.stopPropagation();
    }
  
    if (event.target.closest(".episode img")) {
      const episodeElement = event.target.closest(".episode");
      const name = episodeElement.dataset.name;
      const id = episodeElement.dataset.id;
      const season = episodeElement.dataset.season;
      const episode = episodeElement.dataset.episode;
      const epname = episodeElement.dataset.epname;
      const mediaType = "tv";
      const title = `${mediaType === "movie" ? name : `S${season}:E${episode} ${name}`}`;
      const info = `<h2>${name}</h2>
                    <h4>S${season}:E${episode} ${epname}</h4>`;
      const tvData = { season, episode, epname };
  
      if (document.getElementById('episode-container').classList.contains('player-styling')) {
        currentSeason = season;
        currentEpisode = episode;
        loadSources(source = 1, mediaType, id, season, episode);
        document.querySelector("title").innerHTML = title;
        if (info) { document.querySelector(".now-playing").innerHTML = info };
        window.history.pushState({}, '', `/watch/${mediaType}/${id}/${name}${season && episode ? `/${season}/${episode}` : ''}`);
        scrollEpisodeIntoView(episode);
      }
      else {
        window.location.href = `/watch/${mediaType}/${id}/${name}${season && episode ? `/${season}/${episode}` : ''}`;
        //loadWatchPage(mediaType, name, id, tvData);
      }
      event.stopPropagation();
    }
  }
}


function scrollEpisodeIntoView(eno) {
  const episode = document.getElementById(eno);

  if (!episode) {
    return;
  }

  // Scroll vertically using scrollIntoView
  episode.scrollIntoView({ block: 'center', behavior: 'smooth' });

  // Scroll horizontally if needed
  const container = document.querySelector('.episode-container');
  if (!container) {
    console.error('.episode-container not found.');
    return;
  }

  // Responsive measurements based on screen size
  const episodeWidth = isMobile() ? 9.2 * 16 : 15 * 16; // Mobile: 8.6rem, PC: 15rem
  const gapWidth = isMobile() ? 0.6 * 16 : 0.8 * 16;   // Mobile: 0.6rem, PC: 0.8rem
  const totalEpisodeWidth = episodeWidth + gapWidth;

  // Calculate the index of the episode
  const allEpisodes = Array.from(container.querySelectorAll('.episode'));
  const episodeIndex = allEpisodes.indexOf(episode);

  if (episodeIndex === -1) {
    console.error('Episode element not found inside container.');
    return;
  }

  // Calculate the required scrollLeft position
  const targetScrollLeft = episodeIndex * totalEpisodeWidth;

  // Smooth scroll to the calculated position
  container.scrollTo({
    left: targetScrollLeft,
    behavior: 'smooth',
  });

  //
  // mask logic
  const scrollContainer = document.querySelector('.player-styling');

  scrollContainer?.addEventListener('scroll', () => {
    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    const scrollLeft = scrollContainer.scrollLeft;
    const buffer = 20;

    let maskGradient = scrollLeft <= buffer
      ? 'linear-gradient(to right, black, black 98%, transparent)'
      : scrollLeft >= maxScroll - buffer
        ? 'linear-gradient(to right, black, black 2%, black)'
        : 'linear-gradient(to right, black, black 98%, transparent)';

    scrollContainer.style.maskImage = maskGradient;
    scrollContainer.style.webkitMaskImage = maskGradient;
  });


}

async function cappedOverview() {
  const synopsis = document.querySelectorAll('.synopsis');
  synopsis.forEach(synopsis => {
    const text = synopsis.querySelector('.overview');

    // Check if the text content overflows
    const isOverflowing = text.scrollHeight - 10 > text.offsetHeight;
    if (isOverflowing) {
      text.style.maskImage = "linear-gradient(to bottom, black, black 70%, transparent 98%)";
    }

    const overview = (e) => {
      const container = e.target.closest('.synopsis')
      if ( container ) {
        container.classList.toggle('expanded');
        e.stopPropagation()
      }
    }
    document.removeEventListener('click', overview)
    document.addEventListener('click', overview);
  });
}

function shareItem(mediaType, id, name) {
  const shareData = {
    text: `${name}`,
    url: `https://pixelstream.vercel.app/watch/${mediaType}/${id}/${name}`,
  };

  const btn = document.querySelector(".share");

  btn?.addEventListener("click", async () => {
    try {
      await navigator.share(shareData);
    } catch (err) {
      console.log(`Error: ${err}`);
    }
  });
}


function cropToFit() {
  const iframeFullscreen = document.querySelector(".iframefullscreen");
  const iframeExit = document.querySelector(".iframe-exit");
  const iframeElement = document.querySelector(".iframe-container");


  iframeFullscreen.addEventListener('click', (event) => {
    if (!document.fullscreenElement) {
      if (iframeElement.requestFullscreen) {
        iframeElement.requestFullscreen();
      } else if (iframeElement.webkitRequestFullscreen) { // Safari
        iframeElement.webkitRequestFullscreen();
      }
      iframeExit.style.opacity = '1';
    }
    event.stopPropagation();
  });

  // Exit fullscreen for the iframe
  iframeExit.addEventListener('click', (event) => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { // Safari
      document.webkitExitFullscreen();
    }
    iframeExit.style.opacity = '0'; // Hide exit button
    event.stopPropagation();
  });

  // Handle fullscreen change events
  document.addEventListener('fullscreenchange', () => {
      console.log('fullscreen');
      if (!document.fullscreenElement) {
        iframeExit.classList.remove('hidden');
        console.log('exited fullscreen');
      }
      else {
        wait('iframeExit', 3).then(() => {
          iframeExit.classList.add('hidden');
          console.log('button hidden');
        });
      }
  });
}

function waitTimeout() {
  const waitInstances = new Map(); // Map to track each wait instance by unique ID

  const wait = (id, duration) => {
    console.log(`wait initiated for ID: ${id}`);
    return new Promise((resolve, reject) => {
      if (waitInstances.has(id)) {
        clearTimeout(waitInstances.get(id).timeoutId);
        waitInstances.delete(id);
      }

      const instance = {
        isCanceled: false,
        timeoutId: setTimeout(() => {
          if (instance.isCanceled) {
            reject(new Error(`Wait canceled for ID: ${id}`));
          } else {
            resolve(`Wait completed for ID: ${id}`);
          }
          waitInstances.delete(id);
        }, duration * 1000),
      };

      waitInstances.set(id, instance);
    });
  };

  const cancel = (id) => {
    if (waitInstances.has(id)) {
      const instance = waitInstances.get(id);
      clearTimeout(instance.timeoutId);
      instance.isCanceled = true;
      waitInstances.delete(id);
      console.log(`Wait canceled for ID: ${id}`);
    } else {
      console.log(`No active wait found for ID: ${id}`);
    }
  };

  return { wait, cancel };
}

const { wait, cancel } = waitTimeout();

function whenInView(selector, callback) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target); // Call your function here
        observer.unobserve(entry.target);
      }
    });
  });
  const element = document.querySelector(selector);
  if (element) {
    observer.observe(element);
  }
}

function footerHTML () {
  const footer = document.querySelector('footer')
  footer ? footer.innerHTML = `
    <ul>
            <li><a href="/">
                <i class="fa-solid fa-house"></i>
                <p>Home</p>
                </a>
            </li>
            <li><a href="/movie">
                    <i class="fa-solid fa-film"></i>
                    <p>Movies</p>
                </a></li>
            <li><a href="/tv">
                    <i class="fa-solid fa-display"></i>                    
                    <p>TV</p>
                </a>
            </li>
            <li><a href="/profile">
                    <i class="fa-solid fa-user"></i>                    
                    <p>You</p>
                </a>
            </li>
        </ul>
  ` : '';
}


// Helper function to get element's position
function isElementInView(element) {
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= window.innerHeight;
}

function backdropAnim(details,modalContent) {
  const scrollTop = details.scrollTop;
  const opacity = 0.8 - Math.min(scrollTop / 360, 0.8);
  modalContent.style.setProperty('--modal-backdrop-opacity', opacity);
}

let lastScrollY = window.scrollY;
let isScrollingDown = false;
let hideTimeout;

window.addEventListener('scroll', () => {

  const header = document.querySelector('header');
  const footer = document.querySelector('footer');
  const nav = document.querySelector("#header > nav > ul");
  const input = document.getElementById('search-input');

  let end = ((window.scrollY + 10 + window.innerHeight) >= (document.body.scrollHeight)) || window.scrollY <= 40;

  if (window.scrollY > lastScrollY && !end) {
    // Scrolling down
    if (!isScrollingDown) {
      isScrollingDown = true;
      input.style.height = "1.8rem";
      nav.style.padding = isMobile() ? "0.4rem 0.6rem" : "0.4rem 1.4rem";
      header.style.height = isMobile() ? "3rem" : "2.8rem";
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        header.classList.add('hidden');
        footer ? footer.style.bottom = '-4rem' : '';
      }, 300);
    }
  } else if ( (window.scrollY <= lastScrollY) || end) {
    isScrollingDown = false;
    clearTimeout(hideTimeout); // Cancel any pending hide
    
    input.style.height = "2rem";
    nav.style.padding = isMobile() ? "0.8rem 0.6rem" : "0.8rem 1.4rem";
    header.style.height = isMobile() ? "3.6rem" : "4rem";
    header.classList.remove('hidden');
    footer ? footer.style.bottom = '0rem' : '';
  }
  lastScrollY = window.scrollY;
});

function getConfirm({ title, message, success, decline, state = 1 } = {}) {
  
  let successIcon
  let declineIcon
  switch (state) {
    case 1 :
      successIcon = `<i class="fa-solid fa-circle-check"></i>`
      break;
  }
  
  const overlay = document.createElement('div');
  overlay.setAttribute('tabindex','0');
  overlay.classList.add('dialog-overlay');
  overlay.innerHTML = `
    <div class="dialog">
        <h2>${title || `Are you sure?`}</h2>
        <div class="message-box">
            <span class="icon">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </span>
            <span class="message">
                <p>${message || `This action can not be undone.<br>Do you wish to proceed?`}</p>
            </span>
        </div>
        <div class="dialog-buttons">
            <button tabindex="0" id="decline">Cancel</button>
            <button tabindex="0" id="accept"><i class="fa-solid fa-trash-can"></i>&nbsp;Delete</button>
        </div>
    </div>
  `;
  document.querySelector('main').appendChild(overlay);
  document.getElementById('decline').focus();
  return new Promise((resolve) => {
    const handleDialog = (e) => {
      const isOverlayClick = e.target.matches('.dialog-overlay');
      const isDecline = e.target.matches('#decline');
      const isAccept = e.target.matches('#accept');
      const isKeydown = e.type === 'keydown';
      const isEscapeKey = isKeydown && e.key === 'Escape';
      const isEnterKey = isKeydown && e.key === 'Enter';
      const isClick = e.type === 'click';
    
      const messageBox = overlay.querySelector('.message-box');
      const dialogButtons = overlay.querySelector('.dialog-buttons');
    
      // Ignore invalid clicks
      if (isClick && !isOverlayClick && !isDecline && !isAccept) return;

      if (isEscapeKey || (isClick && isOverlayClick)) {
        handleCancel(dialogButtons, messageBox);
        resolve(false);
      } else if ((isDecline || isAccept) && (isClick || isEnterKey)) {
        if (isDecline) {
          handleCancel(dialogButtons, messageBox);
          resolve(false);
        } else {
          handleAccept(dialogButtons, messageBox);
          resolve(true);
        }
      }

      if (isEscapeKey || isClick || isEnterKey) {
        setTimeout(() => document.querySelector('main').removeChild(overlay), 700);
        ['click', 'keydown'].forEach((type) =>
          overlay.removeEventListener(type, handleDialog)
        );
      }
    };
    
    // Helper function to handle the cancel action
    const handleCancel = (dialogButtons, messageBox) => {
      dialogButtons.style.display = 'none';
      overlay.querySelector('h2').innerText = decline.title;
      messageBox.classList.add('green');
      messageBox.querySelector('.icon').innerHTML = declineIcon || successIcon;
      messageBox.querySelector('p').innerText = decline.message;
    };
    
    // Helper function to handle the accept action
    const handleAccept = (dialogButtons, messageBox) => {
      dialogButtons.style.display = 'none';
      overlay.querySelector('h2').innerText = success.title;
      messageBox.querySelector('.icon').innerHTML = successIcon;
      messageBox.querySelector('p').innerText = success.message;
    };    
    
    ['click','keydown'].forEach(type => overlay.addEventListener(type, handleDialog));
  });
}


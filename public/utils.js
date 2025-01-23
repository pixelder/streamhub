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
  const episodeWidth = isMobile() ? 8.6 * 16 : 15 * 16; // Mobile: 8.6rem, PC: 15rem
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
  const container = document.querySelectorAll('.synopsis');
  container.forEach(container => {
    const text = container.querySelector('.overview');

    // Check if the text content overflows
    const isOverflowing = text.scrollHeight - 10 > text.offsetHeight;
    if (isOverflowing) {
      text.style.maskImage = "linear-gradient(to bottom, black, black 70%, transparent 98%)";
    }

    // Toggle expansion and collapse
    text.addEventListener('click', () => {
      if (container.classList.contains('expanded')) {
        console.log('hi');
        container.classList.remove('expanded');
      } else {
        console.log('hello');
        container.classList.add('expanded');
      }
    });
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
  document.querySelector('footer').innerHTML = `
    <ul>
            <li><a href="/">
                <i class="fa-solid fa-house"></i>
                <p>Home</p>
                </a>
            </li>
            <li><a onclick="loadExplorePage('movie')">
                    <i class="fa-solid fa-film"></i>
                    <p>Movies</p>
                </a></li>
            <li><a onclick="loadExplorePage('tv')">
                    <i class="fa-solid fa-display"></i>                    
                    <p>TV</p>
                </a>
            </li>
        </ul>
  `
}

footerHTML();


//header anim
let lastScrollY = window.scrollY;
let isScrollingDown = false;
let hideTimeout;

window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  const footer = document.querySelector('footer')
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
        footer.style.bottom = '-4rem';
      }, 300);
    }
  } else if ( (window.scrollY <= lastScrollY) || end) {
    // Scrolling up
    console.log('end');
    isScrollingDown = false;
    clearTimeout(hideTimeout); // Cancel any pending hide
    header.classList.remove('hidden'); // No delay to reappear
    footer.style.bottom = '0rem';
    hideTimeout = setTimeout(() => {
      input.style.height = "2rem";
      nav.style.padding = isMobile() ? "0.8rem 0.6rem" : "0.8rem 1.4rem";
      header.style.height = isMobile() ? "3.6rem" : "4rem";
  
    }, 150);
  }
  lastScrollY = window.scrollY;
});
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

function convertDate(dateString) {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  return formatter.format(new Date(dateString));
}

function runtime(min) {
	const hour =  Math.floor(min / 60.0);
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
    const isOverflowing = text.scrollHeight -10 > text.offsetHeight;
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


  iframeFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        if (iframeElement.requestFullscreen) {
            iframeElement.requestFullscreen();
        } else if (iframeElement.webkitRequestFullscreen) { // Safari
            iframeElement.webkitRequestFullscreen();
        } else if (iframeElement.msRequestFullscreen) { // Older Microsoft browsers
            iframeElement.msRequestFullscreen();
        }
        iframeExit.style.display = "block";
    }
  });

    // Exit fullscreen for the iframe
  iframeExit.addEventListener('click', () => {
      if (document.exitFullscreen) {
          document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { // Safari
          document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { // Older Microsoft browsers
          document.msExitFullscreen();
      }
      iframeExit.style.display = "none"; // Hide exit button
  });

  // Handle fullscreen change events
  document.addEventListener('fullscreenchange', () => {
      // Check if iframe is no longer in fullscreen
      if (!document.fullscreenElement) {
          iframeExit.style.display = "none";
          setTimeout(() => {
            iframeExit.classList.remove('hidden');
          }, 3000);
      }
      else {
        setTimeout(() => {
          iframeExit.classList.add('hidden');
        }, 3000);

        // Assuming same-origin iframe
        const iframe = document.querySelector('iframe');

        // Detect fullscreen changes on the iframe
        iframe.addEventListener('fullscreenchange', () => {
            console.log('Iframe fullscreen state changed');
        });

        // Add event listeners to the iframe's content (same-origin only)
        iframe.contentWindow.addEventListener('keydown', (event) => {
            console.log(`Key pressed in iframe: ${event.key}`);
        });

        iframe.contentDocument.addEventListener('mousemove', () => {
            console.log('Mouse moved inside iframe');
        });
      }
  });
}

function waitTimeout() {
  let timeoutId = null; // Persistent timeout ID across calls
  let isCanceled = false; // Tracks whether the wait was canceled
  
  const wait = (duration) => {
    return new Promise((resolve, reject) => {
    // Cancel any running timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    isCanceled = false; // Reset cancellation state
    timeoutId = setTimeout(() => {
      if (isCanceled) {
      reject(new Error("Wait canceled"));
      } else {
      resolve();
      }
      timeoutId = null; // Clear timeout ID after execution
    }, duration * 1000);
    });
  };
  
  const cancel = () => {
    if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
    isCanceled = true;
    console.log("Wait canceled");
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


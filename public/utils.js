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
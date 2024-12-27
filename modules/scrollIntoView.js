function scrollEpisodeIntoView(eno) {
    const episode = document.getElementById(eno);
  
    if (!episode) {
      //console.error(`Element with id "${eno}" not found.`);
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
    const episodeWidth = isMobile() ? 8.6 * 16 : 15 * 16; // Mobile: 9.6rem, PC: 15rem
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
  
    scrollContainer.addEventListener('scroll', () => {
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
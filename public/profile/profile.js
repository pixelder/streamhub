const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const IMAGE_ORG = 'https://image.tmdb.org/t/p/original'
const OPTIONS = 'include_adult=false&include_null_first_air_dates=false&language=en-US';

let isBrowsing = false;

function loadProfile() {
  //window.history.replaceState('','','/profile')
  loadUserContent('continue-watching', 'history')
  loadUserContent('bookmarks','bookmarks')
}

window.onload = function() {
  loadProfile()
  footerHTML()
}
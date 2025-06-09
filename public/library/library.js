const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_300 = 'https://image.tmdb.org/t/p/w300';
const IMAGE_342 = 'https://image.tmdb.org/t/p/w342';
const IMAGE_ORG = 'https://image.tmdb.org/t/p/original'
const OPTIONS = 'include_adult=false&include_null_first_air_dates=false&language=en-US';

let isBrowsing = false;

async function loadLibrary() {
  loadUserContent('bookmarks','bookmarks')
  loadUserContent('history', 'history')
  loadUserContent('continue-watching', 'watching')
  setUpExpandableSection()
}

window.onload = function() {
  loadLibrary()
  topNavBar()
  bottomNavBar()
  setActiveIcon('library')
  setUpScrollEvents()
  fixLog()
}
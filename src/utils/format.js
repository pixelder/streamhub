import { imageURL } from '../services/images.js';

export const titleOf = item => item?.title || item?.name || item?.original_title || item?.original_name || 'Not Available';
export const truncate = (n, p = 1) => Math.floor(Number(n || 0) * 10 ** p) / 10 ** p;
export const capString = (s = '', n = 40) => [...s].length > n ? [...s].slice(0, n - 3).join('') + '...' : s;
export const yearOf = date => date && !isNaN(new Date(date)) ? new Date(date).getFullYear() : null;
export const dateOf = date => date && !isNaN(new Date(date))
  ? new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(
    new Date(date)
  )
  : '';
export const runtime = (min = 0, long = false) => long
  ? `${Math.floor(min / 60) ? Math.floor(min / 60) + ' hour ' : ''}${Math.floor(min % 60)} minutes`
  : `${Math.floor(min / 60) ? Math.floor(min / 60) + 'h' : ''}${String(Math.floor(min % 60)).padStart(2, '0')}m`;
export const upcoming = date => Boolean(date && new Date(date) > new Date());
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const image = (path, size = 'w342', fallback = '/assets/images/no-image.png', kind = size === 'original' ? 'backdrop' : 'poster') => imageURL(path, kind, fallback);
export const watchUrl = (type, id, sno = 1, eno = 1) => `/watch/${type}/${id}${type === 'tv' ? `/${sno ?? 1}/${eno ?? 1}` : ''}`;

export function shuffleWithSeed(items, seed) {
  const arr = [...items];
  const random = () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function trailerKey(videos = [], season) {
  if (videos.length === 1)
    return videos[0].key;
  return [...videos].reverse().filter(
    v => v.site?.toLowerCase() === 'youtube' && v.iso_3166_1 === 'US' && v.iso_639_1 === 'en'
  ).sort(
    (a, b) => score(b) - score(a)
  )[0]?.key;
  function score(v) {
    const n = v.name?.toLowerCase() || '';
    return Number(v.official) + Number(v.type?.toLowerCase() === 'trailer') + (n.includes('trailer') ? 5 : 0) + (n.includes('teaser') ? 3 : 0) + Number(n.includes('official')) + (season && n.includes(`season ${season}`)
      ? 2 + Number(n.includes('official')) + (n.includes('trailer') ? 5 : 0) + (n.includes('teaser') ? 3 : 0) + Number(n.includes('announcement'))
      : 0);
  }
}

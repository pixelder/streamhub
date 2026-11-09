import { getSettings } from '../settings/preferences.js';
import { ICON_MAP } from './icons.js';

export const API_BASE = 'https://streamfree.top/api/v1';
export const LIVE_THRESHOLD = 600000;
export const normalize = value => String(value || '').toLowerCase().replace(/[-_ ]/g, '');
export const sportIcon = category => ICON_MAP[normalize(category)] || 'fa-trophy';

export async function fetchCached(key, path, minutes, { signal, force = false } = {}) {
  const useCache = getSettings().cacheEnabled;
  let cached;
  try {
    cached = useCache ? JSON.parse(localStorage.getItem(key)) : null;
  }
  catch {
    /* A corrupt cache can be refreshed. */
  }
  if (cached?.provider !== API_BASE) cached = null;
  if (!force && cached?.expiry > Date.now() && Array.isArray(cached.data))
    return cached.data;
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal });
    if (!response.ok)
      throw new Error(`Unable to load network feeds (${response.status}).`);
    const payload = await response.json();
    const data = path === '/categories' ? payload.categories : path === '/streams' ? payload.streams : payload.sources;
    if (!Array.isArray(data))
      throw new Error('The sports service returned an invalid response.');
    try {
      if (useCache) localStorage.setItem(key, JSON.stringify({ provider: API_BASE, data, expiry: Date.now() + minutes * 60000 }));
    }
    catch {
      /* Storage capacity must not prevent live broadcasts. */
    }
    return data;
  }
  catch (error) {
    if (signal?.aborted)
      throw error;
    if (!path.startsWith('/sources/') && cached?.expiry > Date.now() - 5 * 60000 && Array.isArray(cached?.data))
      return cached.data;
    throw error;
  }
}

export function partitionMatches(matches, category = 'all', query = '', now = Date.now()) {
  const live = [],
    upcoming = [];
  const term = query.toLowerCase().trim();
  for (const match of matches) {
    if (category !== 'all' && normalize(match.category) !== normalize(category))
      continue;
    if (term && ![match.title, match.league, match.category, match.teams?.home?.name, match.teams?.away?.name]
      .some(
        value => String(value || '').toLowerCase().includes(term)
      ))
      continue;
    if (!Number.isFinite(Number(match.date)))
      continue;
    (typeof match.live === 'boolean' ? (match.live ? live : upcoming) : (now >= Number(match.date) - LIVE_THRESHOLD ? live : upcoming)).push(match);
  }
  live.sort((a, b) => Number(!!b.popular) - Number(!!a.popular) || Number(a.date) - Number(b.date));
  upcoming.sort((a, b) => Number(a.date) - Number(b.date));
  return { live, upcoming };
}

export function dateHeader(timestamp, now = Date.now()) {
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime()))
    return 'DATE_UNKNOWN';
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target - today) / 86400000);
  return days === 0
    ? 'TODAY'
    : days === 1
      ? 'TOMORROW'
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export function streamTime(timestamp, live) {
  if (live)
    return 'LIVE';
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime()))
    return 'TIME_UNKNOWN';
  return date.toDateString() === new Date().toDateString()
    ? `TODAY ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
}

export const FALLBACK_POSTER = '/assets/images/no-image-hr.svg';

export function posterUrl(poster) {
  if (typeof poster !== 'string' || !poster.trim() || poster === 'null')
    return FALLBACK_POSTER;
  if (/^https?:\/\//.test(poster))
    return poster;
  return poster.startsWith('/') ? `https://streamfree.top${poster}` : FALLBACK_POSTER;
}

// Keep provider-specific fields at the boundary; the view uses the same match model.
export function normalizeMatch(stream) {
  return {
    id: stream.stream_key,
    title: stream.name,
    category: stream.category,
    league: stream.league,
    date: Number(stream.match_timestamp) * 1000,
    poster: stream.thumbnail_url,
    live: (stream.sources || []).some(source => source.live === true),
    sources: [{ source: 'StreamFree', id: stream.stream_key }]
  };
}

export async function sourceStreams(source, signal) {
  if (!source?.id) return [];
  const sources = await fetchCached(
    `sf_sources:${source.id}`, `/sources/${encodeURIComponent(source.id)}`, 0.5, { signal }
  );
  return sources
    .filter(item => item.live === true && /^https:\/\//.test(item.url))
    .map(item => ({ ...item, embedUrl: item.url }));
}

export function streamLabel(stream, index) {
  const language = stream.language || stream.lang || '';
  const description = stream.description || stream.channel || stream.name || stream.title || stream.streamName || '';
  return language && description
    ? `${language} - ${description}`
    : description || language || stream.quality || `Stream ${index + 1}`;
}

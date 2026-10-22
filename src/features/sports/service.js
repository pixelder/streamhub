import { getSettings } from '../settings/preferences.js';
import { ICON_MAP } from './icons.js';

export const API_BASE = 'https://streamed.st/api';
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
  if (!force && cached?.expiry > Date.now() && Array.isArray(cached.data))
    return cached.data;
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal });
    if (!response.ok)
      throw new Error(`Unable to load network feeds (${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data))
      throw new Error('The sports service returned an invalid response.');
    try {
      if (useCache) localStorage.setItem(key, JSON.stringify({ data, expiry: Date.now() + minutes * 60000 }));
    }
    catch {
      /* Storage capacity must not prevent live broadcasts. */
    }
    return data;
  }
  catch (error) {
    if (signal?.aborted)
      throw error;
    if (Array.isArray(cached?.data))
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
    if (term && ![match.title, match.category, match.teams?.home?.name, match.teams?.away?.name]
      .some(
        value => String(value || '').toLowerCase().includes(term)
      ))
      continue;
    if (!Number.isFinite(Number(match.date)))
      continue;
    (now >= Number(match.date) - LIVE_THRESHOLD ? live : upcoming).push(match);
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
  return poster.startsWith('/')
    ? `https://streamed.st${poster}.webp`
    : `${API_BASE}/images/proxy/${poster}.webp`;
}

export async function sourceStreams(source, signal) {
  if (!source?.source || !source.id)
    return [];
  const response = await fetch(
    `${API_BASE}/stream/${encodeURIComponent(source.source)}/${encodeURIComponent(source.id)}`,
    { signal }
  );
  if (!response.ok)
    throw new Error(`Source unavailable (${response.status}).`);
  const streams = await response.json();
  return Array.isArray(streams) ? streams : [];
}

export function streamLabel(stream, index) {
  const language = stream.language || stream.lang || '';
  const description = stream.description || stream.channel || stream.name || stream.title || stream.streamName || '';
  return language && description
    ? `${language} - ${description}`
    : description || language || `Stream ${index + 1}`;
}

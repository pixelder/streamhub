import { discoveryPolicy, filterCatalogResults, isBlocked, permitsCertification } from './catalogPolicy.js';
import { getSettings } from '../features/settings/preferences.js';

const BASE = '/api/tmdb';
const cache = new Map();
const pending = new Map();

export async function requestJSON(url, { signal, ttl = 60000, ...options } = {}) {
  const useCache = getSettings().cacheEnabled && options.cache !== 'no-store';
  const saved = useCache ? cache.get(url) : undefined;
  if (!options.method && saved?.expires > Date.now())
    return saved.data;
  // A caller with its own abort signal needs a separate request.
  if (!signal && !options.method && pending.has(url))
    return pending.get(url);
  const task = (async () => {
    const response = await fetch(url, { ...options, signal });
    if (!response.ok)
      throw new Error(`Request failed (${response.status})`);
    const data = await response.json();
    if (useCache && !options.method && ttl) {
      if (cache.size > 250)
        cache.delete(cache.keys().next().value);
      cache.set(url, { data, expires: Date.now() + ttl });
    }
    return data;
  })();
  if (!signal && !options.method)
    pending.set(url, task);
  try {
    return await task;
  }
  finally {
    // An older request must not remove a newer request for the same URL.
    if (pending.get(url) === task) pending.delete(url);
  }
}

export async function tmdb(path, params = {}, options) {
  const settings = getSettings();
  const direct = path.match(/^(movie|tv|person)\/(\d+)(?:\/|$)/);
  if (direct && isBlocked(direct[1], direct[2], settings)) throw new Error('This TMDB ID is blocked in Settings.');
  const discover = path.match(/^discover\/(movie|tv)$/);
  if (discover) params = discoveryPolicy(discover[1], params, settings);
  if (/^search\//.test(path)) params = { ...params, include_adult: !settings.excludeAdult };
  const query = new URLSearchParams({ language: getSettings().metadataLanguage });
  for (const [key, value] of Object.entries(params))
    if (value !== '' && value != null)
      query.set(key, String(value));
  const data = await requestJSON(`${BASE}/${path}?${query}`, options);
  const listing = path.match(/^(?:discover|trending|search)\/(movie|tv|person|all|multi)(?:\/|$)/);
  if (listing && Array.isArray(data.results)) {
    const detailQuery = new URLSearchParams({
      language: getSettings().metadataLanguage,
      append_to_response: listing[1] === 'movie' ? 'release_dates' : 'content_ratings'
    });
    // Fetch certification details directly so they do not re-enter catalog filtering.
    const results = await filterCatalogResults(
      data.results,
      listing[1],
      (type, id) => requestJSON(`${BASE}/${type}/${id}?${detailQuery}`, options),
      settings,
      options?.signal
    );
    return {
      ...data,
      results,
      filtered: results.length !== data.results.length
    };
  }
  return data;
}

export const search = (term, type, page = 1, options) => tmdb(`search/${type}`, { query: term, page }, options);

export async function metadata(type, id, full = true, options) {
  const settings = getSettings();
  const certifications = type === 'movie' ? 'release_dates' : 'content_ratings';
  const params = full
    ? {
      append_to_response: type === 'person'
        ? 'combined_credits,external_ids'
        : `${certifications},external_ids,videos,credits,images`,
      include_image_language: 'en'
    }
    : settings.hideMature && type !== 'person' ? { append_to_response: certifications } : {};
  const data = await tmdb(`${type}/${id}`, params, options);
  if (settings.excludeAdult && data.adult || type !== 'person' && !permitsCertification(data, type, settings)) throw new Error('This title is hidden by your content filters.');
  return data;
}

export const seasonData = (id, season, options) => tmdb(`tv/${id}/season/${season}`, { append_to_response: 'videos' }, options);

export async function nextEpisode(id, sno, eno) {
  const season = await seasonData(id, sno);
  const i = season.episodes?.findIndex(ep => ep.episode_number === Number(eno));
  if (i >= 0 && i + 1 < season.episodes.length)
    return season.episodes[i + 1];
  try {
    return (await seasonData(id, Number(sno) + 1)).episodes?.[0] || null;
  }
  catch {
    return null;
  }
}

export function clearRequestCache() {
  cache.clear();
}

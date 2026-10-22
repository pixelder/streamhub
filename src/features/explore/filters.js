import { getSettings } from '../settings/preferences.js';
import { voteThreshold } from '../../services/catalogPolicy.js';
import { CONFIG_PARAMS } from './presets.js';

export function resolvePreset(input) {
  const params = { ...input };
  let preset;
  if (params.type === 'studio')
    preset = CONFIG_PARAMS.find(p => p.type === 'studio').data.find(p => p.type === params.title);
  else
    preset = CONFIG_PARAMS.find(p => p.type === params.type);
  if (preset && !Array.isArray(preset.data))
    return {
      ...preset.data,
      studio: params.type === 'studio',
      hidden: preset.filters || {}
    };
  if (params.type === 'studio')
    return {
      ...params,
      type: /tv|television/i.test(params.title || '') ? 'tv' : 'movie',
      studio: true,
      minRating: 0,
      voteCount: 0,
      hidden: {
        genre: 'hidden',
        minRate: 'hidden',
        year: 'hidden'
      }
    };
  return {
    ...params,
    type: params.type === 'tv' ? 'tv' : 'movie',
    hidden: {}
  };
}

export function defaultFilters(params = {}) {
  const settings = getSettings();
  return {
    genres: params.genre ? String(params.genre).split(',').map(Number) : [],
    excluded: [],
    cast: [],
    companies: params.company ? [
      { id: Number(params.company), name: params.title || String(params.company) }
    ] : [],
    sort: params.sortBy || 'popularity',
    order: 'desc',
    year: params.year || '',
    rating: Math.max(Number(params.minRating ?? 0), settings.minRating),
    votes: Math.max(
      Number(params.voteCount ?? 0),
      voteThreshold(
        params.lang || (settings.filterLanguages.length === 1 ? settings.filterLanguages[0] : ''),
        settings
      )
    ),
    country: params.reg || '',
    language: params.lang || ''
  };
}

export function discoverParams(filters, page = 1) {
  return {
    with_genres: filters.genres.join(','),
    without_genres: filters.excluded.join(','),
    page,
    sort_by: `${filters.sort}.${filters.order}`,
    primary_release_year: filters.year,
    first_air_date_year: filters.year,
    with_cast: filters.cast.map(c => c.id).join(','),
    with_people: filters.cast.map(c => c.id).join(','),
    with_companies: filters.companies.map(c => c.id).join(','),
    with_origin_country: filters.country,
    with_original_language: filters.language,
    'vote_average.gte': filters.rating,
    'vote_count.gte': filters.votes,
    watch_region: 'US',
    include_adult: false,
    include_null_first_air_dates: false
  };
}

export function changeGenre(filters, id, exclude = false) {
  let genres = [...filters.genres],
    excluded = [...filters.excluded];
  if (exclude) {
    excluded = excluded.includes(id) ? excluded.filter(g => g !== id) : [...excluded, id];
    genres = genres.filter(g => g !== id);
  }
  else if (excluded.includes(id))
    excluded = excluded.filter(g => g !== id);
  else
    genres = genres.includes(id) ? genres.filter(g => g !== id) : [...genres, id];
  return {
    ...filters,
    genres,
    excluded
  };
}

import { getSettings } from '../features/settings/preferences.js';

export function isBlocked(type, id, settings = getSettings()) {
  return settings.blacklist.some(
    entry => Number(entry.id) === Number(id) && (entry.type === 'all' || entry.type === type)
  );
}

export function voteThreshold(language, settings = getSettings()) {
  return settings.lowVoteLanguages.includes(language)
    ? Math.min(settings.minVotes, settings.lowVoteCount)
    : settings.minVotes;
}

export function discoveryPolicy(type, params = {}, settings = getSettings()) {
  const language = params.with_original_language || (settings.filterLanguages.length === 1 ? settings.filterLanguages[0] : '');
  const country = params.with_origin_country || (settings.filterCountries.length === 1 ? settings.filterCountries[0] : '');
  // Multiple language filters are applied as OR after fetching. Do not send an
  // undocumented pipe-separated with_original_language value to TMDB.
  const threshold = language
    ? voteThreshold(language, settings)
    : settings.lowVoteLanguages.length
      ? Math.min(settings.minVotes, settings.lowVoteCount)
      : settings.minVotes;
  const genres = type === 'movie' ? settings.movieGenres : settings.tvGenres;
  const excluded = type === 'movie' ? settings.excludedMovieGenres : settings.excludedTVGenres;
  return {
    ...params,
    include_adult: !settings.excludeAdult,
    with_original_language: language,
    with_origin_country: country,
    with_genres: params.with_genres || genres.join('|'),
    without_genres: [
      ...new Set([...String(params.without_genres || '').split(',').filter(Boolean), ...excluded.map(String)])
    ].join(
      ','
    ),
    'vote_count.gte': Math.max(
      Number(params['vote_count.gte'] || 0) > settings.minVotes ? Number(params['vote_count.gte']) : 0,
      threshold
    ),
    'vote_average.gte': Math.max(Number(params['vote_average.gte'] || 0), settings.minRating),
  };
}

export function permitsBasic(item, type, settings = getSettings(), applyDiscovery = true) {
  if (isBlocked(type, item.id, settings) || settings.excludeAdult && item.adult) return false;
  if (!applyDiscovery || type === 'person') return true;
  if (item.vote_count != null && item.vote_count < voteThreshold(item.original_language, settings)) return false;
  if (item.vote_average != null && item.vote_average < settings.minRating) return false;
  if (settings.filterLanguages.length && !settings.filterLanguages.includes(item.original_language)) return false;
  const genres = item.genre_ids || item.genres?.map(genre => genre.id) || [];
  const included = type === 'movie' ? settings.movieGenres : settings.tvGenres;
  const excluded = type === 'movie' ? settings.excludedMovieGenres : settings.excludedTVGenres;
  return (!included.length || included.some(id => genres.includes(id))) && !excluded.some(id => genres.includes(id));
}

export function permitsCertification(data, type, settings = getSettings()) {
  if (!settings.hideMature) return true;
  const ratings = type === 'movie'
    ? (data.release_dates?.results || []).flatMap(
      country => (country.release_dates || []).map(
        release => ({ country: country.iso_3166_1, rating: release.certification })
      )
    )
    : (data.content_ratings?.results || []).map(entry => ({ country: entry.iso_3166_1, rating: entry.rating }));
  const usable = ratings.filter(
    entry => entry.rating && !['NR', 'UNRATED', 'NOT RATED', '0'].includes(entry.rating.toUpperCase().trim())
  );
  const mature = usable.some(
    ({ country, rating }) => {
      const value = rating.toUpperCase().replace(/\s/g, '');
      return country === 'US' && ['R', 'NC-17', 'TV-MA'].includes(value) || ['18', '18+', 'R18+', '19', '19+', '20', '21'].includes(value) || country === 'IN' && value === 'A';
    }
  );
  return !mature && (usable.length > 0 || !settings.hideUnrated);
}

export async function filterCatalogResults(items, fallbackType, loadDetails, settings = getSettings(), signal) {
  const accepted = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(4, items.length) },
      async () => {
        while (cursor < items.length) {
          const index = cursor++,
            item = items[index],
            type = item.media_type || fallbackType;
          signal?.throwIfAborted();
          if (!permitsBasic(item, type, settings)) continue;
          if (['movie', 'tv'].includes(type) && (settings.hideMature || settings.filterCountries.length)) {
            try {
              const data = await loadDetails(type, item.id);
              if (!permitsCertification(data, type, settings)) continue;
              const countries = data.origin_country || data.production_countries?.map(country => country.iso_3166_1) || [];
              if (settings.filterCountries.length && !settings.filterCountries.some(country => countries.includes(country))) continue;
            } catch (error) {
              if (signal?.aborted) throw error;
              if (settings.filterCountries.length || settings.hideUnrated) continue;
            }
          }
          accepted[index] = item;
        }
      }
    )
  );
  return accepted.filter(Boolean);
}

export function catalogPreferenceKey(settings) {
  return JSON.stringify(
    [
      settings.metadataLanguage,
      settings.excludeAdult,
      settings.hideMature,
      settings.hideUnrated,
      settings.minRating,
      settings.minVotes,
      settings.lowVoteLanguages,
      settings.lowVoteCount,
      settings.filterLanguages,
      settings.filterCountries,
      settings.movieGenres,
      settings.excludedMovieGenres,
      settings.tvGenres,
      settings.excludedTVGenres,
      settings.blacklist
    ]
  );
}

import { getSettings } from '../features/settings/preferences.js';

const fallback = {
  secure_base_url: 'https://image.tmdb.org/t/p/',
  poster_sizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
  backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
  still_sizes: ['w92', 'w185', 'w300', 'original'],
  profile_sizes: ['w45', 'w185', 'h632', 'original'],
  logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original']
};
let configuration = fallback,
  pending;
export const imageConfiguration = () => configuration;

export async function loadImageConfiguration(signal) {
  const { tmdb } = await import('./api.js');
  const fetchConfig = async () => {
    const data = await tmdb('configuration', {}, { signal, ttl: 86400000 });
    if (!data.images?.secure_base_url || !Object.keys(fallback).filter(key => key.endsWith('_sizes')).every(
      key => Array.isArray(data.images[key]) && data.images[key].length
    )) throw new Error('TMDB returned incomplete image configuration.');
    const base = new URL(data.images.secure_base_url);
    if (base.protocol !== 'https:') throw new Error('Image configuration requires HTTPS.');
    configuration = data.images;
    return configuration;
  };
  if (signal) return fetchConfig();
  if (!pending) pending = fetchConfig().catch(error => {
    pending = null;
    throw error;
  });
  return pending;
}

export function resolutionFor(kind, settings = getSettings(), config = configuration) {
  const sizes = config[`${kind}_sizes`] || fallback.poster_sizes;
  const requested = settings.imageResolutions?.[kind];
  if (requested !== 'auto' && sizes.includes(requested)) return requested;
  if (settings.imageQuality === 'high') return sizes.includes('original') ? 'original' : sizes.at(-1);
  const presets = {
    saver: {
      poster: 'w185',
      backdrop: 'w780',
      still: 'w185',
      profile: 'w185',
      logo: 'w185'
    },
    standard: {
      poster: 'w342',
      backdrop: 'w1280',
      still: 'w300',
      profile: 'w185',
      logo: 'w500'
    }
  };
  const preferred = (presets[settings.imageQuality] || presets.standard)[kind];
  return sizes.includes(preferred) ? preferred : sizes.find(size => size !== 'original') || sizes[0];
}

export function imageURL(path, kind = 'poster', fallbackURL = '/assets/images/no-image.png', settings = getSettings()) {
  return path ? `${configuration.secure_base_url}${resolutionFor(kind, settings)}${path}` : fallbackURL;
}

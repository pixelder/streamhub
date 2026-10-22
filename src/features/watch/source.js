import { isBlocked } from '../../services/catalogPolicy.js';
import { getSettings } from '../settings/preferences.js';
import { defaultAnimeFormat } from '../settings/preferences.js';
import { metadata, requestJSON } from '../../services/api.js';

export function episodeNumber(metadata, sno, eno) {
  return (metadata.seasons || []).filter(s => s.season_number > 0 && s.season_number < Number(sno)).reduce(
    (n, s) => n + s.episode_count,
    Number(eno)
  );
}

export function sourceUrl(source, type, id, season, episode, settings = {}, animeEpisode) {
  const path = `${type}/${id}${type === 'tv' ? `/${season}/${episode}` : ''}`;
  if (![100, 101].includes(Number(source)) && isBlocked(type, id)) throw new Error('This title is blocked in Settings.');
  switch (Number(source)) {
    case 900: {
      const template = getSettings().customSource;
      if (!template) throw new Error('Configure a valid custom player URL in Settings.');
      return template.replace(
        /\{(type|id|season|episode)\}/g,
        (_, key) => encodeURIComponent({
          type,
          id,
          season: season ?? 1,
          episode: episode ?? 1
        }[key])
      );
    }
    case 100: return `https://vidsrc.cc/v2/embed/anime/ani${id}/${animeEpisode}/${settings.format || defaultAnimeFormat(100)}`;
    case 101: return `https://vidsrc.icu/embed/anime/${id}/${animeEpisode}/${settings.format || defaultAnimeFormat(101)}`;
    case 1: return `https://vidlink.pro/${path}?poster=false`;
    case 2: return `https://vidsrc.cc/v${settings.version || 2}/embed/${path}`;
    case 3: return `https://vidsrc.icu/embed/${path}`;
    case 4: return `https://vidbinge.dev/embed/${path}`;
    case 5: return `https://player.videasy.net/${path}`;
    case 6: return `https://111movies.com/${path}`;
    case 7: return `https://primewire.tf/embed/${type}?tmdb=${id}${type === 'tv' ? `&season=${season}&episode=${episode}` : ''}`;
    case 8: return `https://vidfast.pro/${path}?poster=false&nextButton=false`;
    case 9: return `https://hin.autoembed.cc/${path}`;
    case 10: return `https://vidsrc.su/${path}`;
    case 11: return `https://vidcore.net/${path}?poster=false&sub=en`;
    default: throw new Error('Invalid source selected');
  }
}

export async function resolvePlayer({ source, type, id, season, episode, settings, signal }) {
  if (isBlocked(type, id)) throw new Error('This title is blocked in Settings.');
  const data = await metadata(type, id, false, { signal });
  if (Number(source) !== 100 && Number(source) !== 101)
    return sourceUrl(source, type, id, season, episode, settings);
  const response = await requestJSON(
    'https://graphql.anilist.co',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        {
          query: 'query ($title: String) { Media(search: $title, type: ANIME) { id idMal title { romaji english } } }',
          variables: { title: data.original_name || data.original_title || data.name || data.title }
        }
      ),
      signal
    }
  );
  if (!response.data?.Media?.id)
    throw new Error('Anime not found on AniList');
  return sourceUrl(
    source,
    type,
    response.data.Media.id,
    season,
    episode,
    settings,
    episodeNumber(data, season, episode)
  );
}

export function playbackProgress(message) {
  if (!message || typeof message !== 'object')
    return null;
  const event = message.event || message.data?.event || message.type;
  if (!['timeupdate', 'MEDIA_DATA'].includes(event))
    return null;
  const { currentTime, duration } = message.data || {};
  if (!Number.isFinite(Number(currentTime)) || !Number.isFinite(Number(duration)) || Number(duration) <= 0)
    return null;
  const value = Math.floor(10000 * Number(currentTime) / Number(duration)) / 100;
  return value >= 0 && value <= 100 ? value : null;
}

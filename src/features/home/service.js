import { tmdb } from '../../services/api.js';
import { shuffleWithSeed, upcoming } from '../../utils/format.js';

export async function carouselData(signal) {
  const [pages, movie, tv] = await Promise.all(
    [
      Promise.all([1, 2, 3].map(page => tmdb('trending/all/week', { page }, { signal }))),
      tmdb('genre/movie/list', {}, { signal }),
      tmdb('genre/tv/list', {}, { signal })
    ]
  );
  const maps = {
    movie: Object.fromEntries(movie.genres.map(g => [g.id, g.name])),
    tv: Object.fromEntries(tv.genres.map(g => [g.id, g.name]))
  };
  const items = shuffleWithSeed(
    pages.flatMap(p => p.results).filter(
      i => i.backdrop_path && !upcoming(i.release_date || i.first_air_date)
    ).slice(
      0,
      10
    ).sort(
      (a, b) => b.popularity - a.popularity
    ),
    Math.floor(Date.now() / 3600000)
  );
  return Promise.all(
    items.map(
      async (item) => {
        let logos = [];
        try {
          logos = (await tmdb(`${item.media_type}/${item.id}/images`, {}, { signal })).logos || [];
        }
        catch (e) {
          if (signal.aborted)
            throw e;
        }
        return {
          ...item,
          logo: (logos.find(l => l.iso_639_1 === 'en') || logos[0])?.file_path,
          genres: (item.genre_ids || []).map(id => ({ id, name: maps[item.media_type]?.[id] || 'Unknown' }))
        };
      }
    )
  );
}

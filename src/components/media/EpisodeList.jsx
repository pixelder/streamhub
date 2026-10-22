import { useEffect, useRef, useState } from 'preact/hooks';
import { useAsync } from '../../hooks/useAsync.js';
import { useStorage } from '../../hooks/useStorage.js';
import { useHorizontalScroll } from '../../hooks/useHorizontalScroll.js';
import { seasonData } from '../../services/api.js';
import { progressFor } from '../../stores/storage.js';
import { image, capString, dateOf, upcoming, truncate, watchUrl } from '../../utils/format.js';
import { navigate } from '../../app/navigation.js';
import Synopsis from '../common/Synopsis.jsx';
import Progress from './Progress.jsx';
import Loading from '../common/Loading.jsx';

export default function EpisodeList({ data, sno, eno, player = false, actions, onLoaded }) {
  const available = [...(data.seasons || [])].sort((a, b) => b.season_number - a.season_number);
  const [season, setSeason] = useState(sno ?? available.find(s => s.episode_count)?.season_number ?? 1);
  const ref = useRef();
  useStorage();
  useEffect(() => {
    if (sno != null)
      setSeason(sno);
  }, [sno, data.id]);
  const result = useAsync(signal => seasonData(data.id, season, { signal }), [data.id, season]);
  useEffect(
    () => {
      if (result.data && Number(result.data.season_number) === Number(season)) {
        try {
          localStorage.setItem('seasonData', JSON.stringify(result.data));
        }
        catch {
        }
        onLoaded?.(result.data, season);
      }
    },
    [result.data, season, eno]
  );
  useHorizontalScroll(ref, 3, [player, result.data]);
  useEffect(
    () => {
      if (player && result.data) {
        const current = ref.current?.querySelector('.episode.current');
        current?.scrollIntoView({ block: 'nearest', inline: 'center' });
      }
    },
    [eno, result.data]
  );
  return <>
    <div class="tv-actions">

      <div class="seasons-menu">

        <select
          id="season-dropdown"
          aria-label="Season"
          value={season}
          onChange={e => setSeason(Number(e.currentTarget.value))}
        >
          {available.map(
            s => <option key={s.season_number} value={s.season_number}>
              {s.season_number ? `Season ${s.season_number}` : 'Specials'}
            </option>
          )}
        </select>

      </div>
      {actions}

    </div>
    <div class="season-info">

      <div
        class={`episode-container ${player ? 'episode-player player-styling' : 'episode-wrap'}`}
        id="episode-container"
        ref={ref}
      >
        {result.loading
          ? <Loading />
          : result.error
            ? <Loading error={result.error} />
            : !result.data?.episodes?.length
              ? <div class="ep-error">

                <i class="fa-solid fa-circle-exclamation" />

                <p>No episodes available</p>

              </div>
              : result.data.episodes.map(
                (ep, i) => {
                  const future = upcoming(ep.air_date);
                  const open = () => navigate(watchUrl('tv', data.id, season, ep.episode_number));
                  return <div
                    key={ep.id || ep.episode_number}
                    class={`episode ${player ? '' : 'episode-width'} ${player && Number(sno) === Number(season) && Number(eno) === ep.episode_number ? 'current' : ''}`}
                    id={String(i + 1)}
                    data-name={data.name}
                    data-id={data.id}
                    data-media-type="tv"
                    data-season={season}
                    data-episode={ep.episode_number}
                    data-epname={ep.name}
                  >

                    <div class="episode-items">

                      <div
                        class="img-container"
                        tabIndex="0"
                        role="button"
                        aria-label={`Play episode ${ep.episode_number}`}
                        onClick={open}
                        onKeyDown={e => {
                          if (e.key === 'Enter')
                            open();
                        }}
                      >
                        {future && <p class="uc-text">Upcoming</p>}

                        <img
                          src={image(
                            ep.still_path || data.backdrop_path,
                            'w300',
                            '/assets/images/no-image-hr.svg',
                            ep.still_path ? 'still' : 'backdrop'
                          )}
                          loading="lazy"
                          alt={`Episode ${ep.episode_number}`}
                        />

                        <Progress value={progressFor('tv', data.id, season, ep.episode_number)} />

                      </div>

                      <div class="episode-info">

                        <h3>{ep.episode_number}. {capString(ep.name, 65)}</h3>

                        <p>{ep.vote_average && !future ? `Rated: ${truncate(ep.vote_average)}` : 'Not yet rated'}</p>

                        <p>{dateOf(ep.air_date)}</p>

                      </div>

                      <Synopsis>{ep.overview || 'No overview available'}</Synopsis>

                    </div>

                  </div>;
                }
              )}
      </div>

    </div>
  </>;
}

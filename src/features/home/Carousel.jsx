import { catalogPreferenceKey } from '../../services/catalogPolicy.js';
import { usePreferences } from '../../hooks/usePreferences.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useEffect, useState } from 'preact/hooks';
import { useAsync } from '../../hooks/useAsync.js';
import { carouselData } from './service.js';
import { titleOf, image, yearOf, watchUrl } from '../../utils/format.js';
import { openDetails } from '../../stores/ui.js';
import { navigate } from '../../app/navigation.js';
import Synopsis from '../../components/common/Synopsis.jsx';
import Bookmark from '../../components/media/Bookmark.jsx';
import Icon from '../../components/common/Icon.jsx';
import Loading from '../../components/common/Loading.jsx';

export default function Carousel() {
  const preferences = usePreferences();
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const rotate = preferences.carouselAuto && !preferences.reducedMotion && !reduced;
  const { data, loading, error } = useAsync(carouselData, [catalogPreferenceKey(preferences)]);
  const [index, set] = useState(0);
  useEffect(
    () => {
      if (!data?.length || !rotate)
        return;
      const timer = setTimeout(() => set((index + 1) % data.length), preferences.carouselInterval * 1000);
      return () => clearTimeout(timer);
    },
    [index, data, rotate, preferences.carouselInterval]
  );
  return <section id="hero-carousel">
    {loading
      ? <Loading />
      : error
        ? <Loading error={error} />
        : data?.length > 0 && <div class="carousel">

          <div class="slides">
            {data.map(
              (item, i) => <div
                key={item.id}
                class={`slide ${index === i ? 'active' : ''}`}
                data-index={i}
                aria-hidden={index !== i}
                inert={index !== i || undefined}
              >

                <img
                  class="slide-backdrop"
                  src={image(item.backdrop_path, 'original')}
                  alt=""
                  loading={i ? 'lazy' : 'eager'}
                />

                <div class="overlay" />

                <div class="content">
                  {item.logo
                    ? <div class="logo-container">

                      <img
                        class="logo"
                        src={image(item.logo, 'w500', undefined, 'logo')}
                        alt={titleOf(item)}
                      />

                    </div>
                    : <h1>{titleOf(item)}</h1>}

                  <div class="slide-tags"><p class="media-type">{item.media_type}</p> • <p class="year">{yearOf(item.release_date || item.first_air_date) || 'N/A'}</p> • <div class="slide-genre">
                    {item.genres.slice(0, 1).map(g => <p key={g.id}>{g.name.toUpperCase()}</p>)}
                  </div></div>

                  <Synopsis>{item.overview}</Synopsis>

                  <div
                    class="buttons"
                    data-type={item.media_type}
                    data-id={item.id}
                    data-name={titleOf(item)}
                  >

                    <button class="play" onClick={() => navigate(watchUrl(item.media_type, item.id))}><Icon name="play" />Watch</button>

                    <button class="detail" onClick={() => openDetails(item)}><Icon name="square-arrow-up-right" />Details</button>

                    <Bookmark type={item.media_type} id={item.id} />

                  </div>

                </div>

              </div>
            )}
          </div>

          <div class="controls">

            <button
              id="prev"
              aria-label="Previous slide"
              onClick={() => set((index - 1 + data.length) % data.length)}
            >

              <Icon name="angle-left" />

            </button>

            <div class="dots">
              {data.map(
                (item, i) => <span
                  key={item.id}
                  class={`dot ${index === i ? 'active' : ''}`}
                  data-index={i}
                  role="button"
                  tabIndex="0"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => set(i)}
                  onKeyDown={e => {
                    if (e.key === 'Enter')
                      set(i);
                  }}
                >

                  <div class="dot-fill" />

                </span>
              )}
            </div>

            <button
              id="next"
              aria-label="Next slide"
              onClick={() => set((index + 1) % data.length)}
            >

              <Icon name="angle-right" />

            </button>

          </div>

        </div>}
  </section>;
}

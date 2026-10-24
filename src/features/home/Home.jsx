import { getSettings } from '../settings/preferences.js';
import { usePreferences } from '../../hooks/usePreferences.js';
import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { normalizePath } from '../../app/routes.js';
import { usePage } from '../../hooks/usePage.js';
import { usePaged } from '../../hooks/usePaged.js';
import { tmdb } from '../../services/api.js';
import { catalogBatch } from '../../services/catalogBatch.js';
import { openDetails, closeDetails } from '../../stores/ui.js';
import MediaSection from '../../components/media/MediaSection.jsx';
import MediaCard from '../../components/media/MediaCard.jsx';
import Loading from '../../components/common/Loading.jsx';
import UserSection from '../library/UserSection.jsx';
import Carousel from './Carousel.jsx';

function Trending({ type, id, title }) {
  const data = usePaged(
    type,
    (page, signal) => catalogBatch(async upstreamPage => {
      const response = await tmdb(`trending/${type}/week`, { page: upstreamPage }, { signal });
      return { ...response, results: response.results.map(i => ({ ...i, media_type: type })) };
    }, page, { signal })
  );
  return <MediaSection
    id={id}
    title={title}
    {...data}
    onMore={data.more}
  />;
}

function Streaming() {
  const preferences = usePreferences();
  const [active, set] = useState(0),
    [type, setType] = useState('movie');
  const [visible, setVisible] = useState(false);
  useEffect(
    () => {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      }, { rootMargin: '200px' });
      observer.observe(document.getElementById('discover-streaming'));
      return () => observer.disconnect();
    },
    []
  );
  const streamingProviders = preferences.homeProviders;
  const provider = streamingProviders[active] || streamingProviders[0];
  const data = usePaged(
    `${provider?.id}-${type}-${preferences.watchRegion}`,
    async (page, signal) => {
      if (!provider) return {
        results: [],
        total_pages: 0,
        total_results: 0
      };
      const response = await tmdb(
        `discover/${type}`,
        {
          page,
          with_watch_providers: provider.id,
          watch_region: preferences.watchRegion,
          sort_by: 'popularity.desc',
          include_adult: false,
          include_null_first_air_dates: false
        },
        { signal }
      );
      return { ...response, results: response.results.map(i => ({ ...i, media_type: type })) };
    },
    { enabled: visible }
  );
  if (!provider) return <section id="discover-streaming">
    <h2>Streaming services</h2>
    <a href="/settings">Choose services in Settings</a>
  </section>;
  return <MediaSection
    id="discover-streaming"
    title="Discover what's streaming"
    onMore={data.more}
    loading={data.loading}
    error={data.error}
    hasMore={data.hasMore}
  >
    {({ gridRef, onScroll, expanded }) => <>
      <div class="tab-menu">
        {streamingProviders.map(
          (p, i) => <button
            key={p.id}
            class={`tab ${i === active ? 'active' : ''}`}
            data-provider={p.id}
            onClick={() => {
              if (active !== i) {
                set(i);
              }
            }}
          >
            {p.name}
          </button>
        )}
      </div>
      <div class="tab-items">

        <div class="media-switch">

          <input
            id="media-toggle"
            type="checkbox"
            class="switch-input"
            checked={type === 'tv'}
            onChange={e => {
              setType(e.currentTarget.checked ? 'tv' : 'movie');
            }}
          />

          <label for="media-toggle" class="media-label">

            <div class="media-tab movie">Movies</div>

            <div class="media-tab tv">TV Shows</div>

            <div class="media-indicator" />

          </label>

        </div>

        <div
          class={`grid-container vertical-card ${data.loading && !data.items.length ? 'loading' : ''}`}
          ref={gridRef}
          onScroll={onScroll}
          tabIndex="-1"
        >
          {(expanded ? data.items : data.items.slice(0, 20)).map(i => <MediaCard key={i.id} item={i} />)}
          {data.loading && !data.items.length && <Loading />}
          {data.error && <Loading error={data.error} />}
        </div>

      </div>
    </>}
  </MediaSection>;
}

function CustomSection({ section }) {
  const data = usePaged(
    JSON.stringify(section),
    async (page, signal) => {
      const response = await tmdb(
        `discover/${section.type}`,
        {
          page,
          sort_by: section.sort,
          with_original_language: section.language,
          with_origin_country: section.country,
          with_genres: section.genre,
          with_watch_providers: section.provider,
          watch_region: getSettings().watchRegion
        },
        { signal }
      );
      return { ...response, results: response.results.map(item => ({ ...item, media_type: section.type })) };
    }
  );
  return <MediaSection
    id={`custom-${section.id}`}
    title={section.title}
    {...data}
    onMore={data.more}
  />;
}

export default function Home() {
  usePage('Home | Pixelstream');
  const preferences = usePreferences();
  const { url, path: rawPath } = useLocation();
  const path = normalizePath(rawPath);
  useEffect(
    () => {
      if (['/movie', '/tv', '/person'].includes(path)) {
        const id = new URL(url, location.origin).searchParams.get('id');
        if (/^\d+$/.test(id || ''))
          openDetails({ id, mediaType: path.slice(1) });
      }
      return closeDetails;
    },
    [url]
  );
  return <>
    <Carousel />
    {preferences.showContinueWatching && <UserSection
      id="continue-watching"
      logType="watching"
      title="Continue Watching"
    />}
    {preferences.showTrendingMovies && <Trending
      type="movie"
      id="trending-movies"
      title="Trending Movies"
    />}
    {preferences.showTrendingTV && <Trending
      type="tv"
      id="trending-series"
      title="Trending Series"
    />}
    {preferences.showStreaming && <Streaming />}
    {preferences.homeSections.map(section => <CustomSection key={section.id} section={section} />)}
  </>;
}

import { voteThreshold } from '../../services/catalogPolicy.js';
import { getSettings } from '../settings/preferences.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { usePage } from '../../hooks/usePage.js';
import { usePaged } from '../../hooks/usePaged.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { useHorizontalScroll } from '../../hooks/useHorizontalScroll.js';
import { tmdb } from '../../services/api.js';
import { navigate } from '../../app/navigation.js';
import { tileGroups } from './tiles.js';
import { resolvePreset, defaultFilters, discoverParams, changeGenre } from './filters.js';
import MediaCard from '../../components/media/MediaCard.jsx';
import Icon from '../../components/common/Icon.jsx';
import SelectMenu from '../../components/common/SelectMenu.jsx';
import SearchPicker from '../../components/common/SearchPicker.jsx';

function Browse({ params }) {
  const [type, setType] = useState(params.type),
    [filters, setFilters] = useState(() => defaultFilters(params)),
    [menu, setMenu] = useState(false),
    [detached, setDetached] = useState(false);
  const sentinel = useRef(),
    menuRef = useRef(),
    chipsRef = useRef(),
    clickTimer = useRef();
  useFocusTrap(menuRef, menu, () => setMenu(false));
  useHorizontalScroll(chipsRef, 2, []);
  const { data: genres } = useAsync(signal => tmdb(`genre/${type}/list`, {}, { signal }), [type]);
  const data = usePaged(
    JSON.stringify([type, filters]),
    async (page, signal) => {
      const response = await tmdb(`discover/${type}`, discoverParams(filters, page), { signal });
      return { ...response, results: (response.results || []).map(i => ({ ...i, media_type: type })) };
    }
  );
  useEffect(
    () => {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting) && data.hasMore && !data.loading && !data.error)
          void data.more();
      }, { rootMargin: '180px' });
      observer.observe(sentinel.current);
      return () => observer.disconnect();
    },
    [data.items.length, data.loading, data.hasMore]
  );
  useEffect(
    () => {
      const scroll = () => setDetached(document.body.scrollTop > 260);
      document.body.addEventListener('scroll', scroll, { passive: true });
      return () => {
        document.body.removeEventListener('scroll', scroll);
        clearTimeout(clickTimer.current);
      };
    },
    []
  );
  useEffect(
    () => {
      const focus = e => {
        if (e.target.matches('.search-container input'))
          document.body.classList.add('keyboard');
      };
      const blur = () => document.body.classList.remove('keyboard');
      document.body.addEventListener('focus', focus, true);
      document.body.addEventListener('blur', blur, true);
      return () => {
        document.body.removeEventListener('focus', focus, true);
        document.body.removeEventListener('blur', blur, true);
        blur();
      };
    },
    []
  );
  const update = (key, value) => setFilters(
    old => ({
      ...old,
      [key]: value,
      ...(key === 'language' && [getSettings().minVotes, getSettings().lowVoteCount].includes(old.votes)
        ? { votes: voteThreshold(value) }
        : {})
    })
  );
  const hidden = params.hidden || {};
  const genreControl = <div class="form-group">

    <div class="flow-row" style={{ minHeight: 'unset' }}>

      <label>Genre</label>

      <div class="genre-counter">

        <p>{filters.genres.length} selected • {filters.excluded.length} excluded</p>

      </div>

    </div>

    <div
      class="genre-chips"
      id="genreChips"
      tabIndex="0"
      ref={chipsRef}
    >
      {(genres?.genres || []).map((g, i) => ({ ...g, order: i })).sort(
        (a, b) => {
          const rank = g => filters.genres.includes(g.id) ? 0 : filters.excluded.includes(g.id) ? 1 : 2;
          return rank(a) - rank(b) || (rank(a) < 2 ? a.name.localeCompare(b.name) : a.order - b.order);
        }
      ).map(
        g => <button
          class={`chip ${filters.genres.includes(g.id) ? 'selected' : ''} ${filters.excluded.includes(g.id) ? 'excluded' : ''}`}
          key={g.id}
          data-id={g.id}
          data-order={g.order}
          onClick={() => {
            clearTimeout(clickTimer.current);
            clickTimer.current = setTimeout(() => setFilters(f => changeGenre(f, g.id)), 300);
          }}
          onDblClick={() => {
            clearTimeout(clickTimer.current);
            setFilters(f => changeGenre(f, g.id, true));
          }}
        >
          {g.name}
        </button>
      )}
    </div>

  </div>;
  const sortControl = <div class="form-group">

    <label>Sort by</label>

    <div class="flow-row">

      <select
        id="sort"
        aria-label="Sort by"
        value={filters.sort}
        onChange={e => update('sort', e.currentTarget.value)}
      >

        <option value="popularity">Popular</option>

        <option value="vote_average">Rating</option>

        <option value={type === 'movie' ? 'primary_release_date' : 'first_air_date'}>Date</option>

        <option value={type === 'movie' ? 'title' : 'name'}>Name</option>

      </select>

      <label id="sort-order" class="selectable active">

        <input
          type="checkbox"
          aria-label="Sort ascending"
          checked={filters.order === 'asc'}
          onChange={e => update('order', e.currentTarget.checked ? 'asc' : 'desc')}
        />

        <span class="checkbox-button">

          <i class="fa-solid fa-sort-down active" />

          <i class="fa-solid fa-sort-up passive" />

        </span>

      </label>

    </div>

  </div>;
  const yearControl = <div class="form-group">

    <label for="year-picker">Year</label>

    <input
      type="number"
      id="year-picker"
      min="1888"
      max="2099"
      value={filters.year}
      placeholder="eg. 2024"
      onChange={e => update('year', e.currentTarget.value)}
    />

  </div>;
  const range = (name, label, max, step) => <div class="form-group">

    <label>{label}</label>

    <div class={name === 'rating' ? 'min-rating' : 'vote-count'}>

      <input
        id={name === 'rating' ? 'min-rating-number' : 'min-vote-number'}
        aria-label={label}
        type="number"
        value={filters[name]}
        min="0"
        max={name === 'rating' ? 10 : undefined}
        step={step}
        onInput={e => update(
          name,
          Math.max(0, Math.min(name === 'rating' ? 10 : Infinity, Number(e.currentTarget.value)))
        )}
      />

      <p>0</p>

      <input
        id={name === 'rating' ? 'min-rating-slider' : 'min-vote-slider'}
        aria-label={`${label} slider`}
        type="range"
        value={filters[name]}
        min="0"
        max={max}
        step={step}
        onInput={e => update(name, Number(e.currentTarget.value))}
      />

      <p>
        {max}
        {name === 'votes' ? '+' : ''}
      </p>

    </div>

  </div>;
  const ratingControl = range('rating', 'Minimum Rating', 10, .1);
  return <section id={`browse-${type}s`} data-type={type}>

    <div class="section-header">

      <h2>{params.title || `Explore ${type === 'tv' ? 'TV Series' : 'Movies'}`}</h2>

    </div>

    <div class="filters">
      {!hidden.genre && genreControl}
      {!hidden.sort && sortControl}
      {!hidden.year && yearControl}
      {!hidden.minRate && ratingControl}
      {params.studio && <div class="form-group">

        <label>Media Type</label>

        <div class="media-switch">

          <input
            type="checkbox"
            id="media-toggle"
            class="switch-input"
            checked={type === 'tv'}
            onChange={e => setType(e.currentTarget.checked ? 'tv' : 'movie')}
          />

          <label for="media-toggle" class="media-label">

            <div class="media-tab movie">Movies</div>

            <div class="media-tab tv">TV Shows</div>

            <div class="media-indicator" />

          </label>

        </div>

      </div>}

      <div class={`form-group button-container ${detached ? 'detach' : ''}`}>

        <button
          class="go-up"
          aria-label="Go to top"
          onClick={() => document.body.scrollTo({ top: 0 })}
        >

          <Icon name="angles-up" />

        </button>

        <button
          class="filter-button centered-control"
          aria-label="Filters"
          onClick={() => setMenu(!menu)}
        >

          <Icon name="filter" />

        </button>

      </div>

      <div
        class="filter-overlay"
        style={{ display: menu ? 'flex' : 'none' }}
        onClick={() => setMenu(false)}
      />

      <div
        class="filter-menu"
        ref={menuRef}
        style={{ display: menu ? 'flex' : 'none' }}
        {...(menu ? { active: '' } : {})}
      >

        <div class="flow-row">

          <h3>Filters</h3>

          <button
            class="close-btn centered-control"
            aria-label="Close filters"
            onClick={() => setMenu(false)}
          />

        </div>
        {hidden.genre && genreControl}
        {hidden.sort && sortControl}
        {hidden.year && yearControl}
        {hidden.minRate && ratingControl}

        <SearchPicker
          type="person"
          selected={filters.cast}
          onChange={v => update('cast', v)}
        />

        <SearchPicker
          type="company"
          selected={filters.companies}
          onChange={v => update('companies', v)}
        />

        <div class="flow-row">

          <SelectMenu
            type="country"
            value={filters.country}
            onChange={v => update('country', v)}
          />

          <SelectMenu
            type="language"
            value={filters.language}
            onChange={v => update('language', v)}
          />

        </div>
        {range('votes', 'Minimum vote count', 1000, 1)}

        <div class="form-group menu-buttons">

          <button class="apply" onClick={() => setMenu(false)}>Apply</button>

          <button class="reset-button" onClick={() => setFilters(defaultFilters())}>Reset</button>

        </div>

      </div>

    </div>

    <div class="grid-container vertical-card">
      {data.items.filter(i => !(type === 'movie' && i.id === 11845)).map(
        item => <MediaCard key={item.id} item={item} />
      )}
    </div>

    <div ref={sentinel} style={{ height: 1, width: '100%' }} />

    <div
      class={`result-message ${data.loading ? 'loading' : (!data.hasMore || data.error) ? 'empty' : ''}`}
    >

      <div class="text">
        {data.error
          ? data.error.message
          : data.loading ? 'Loading...' : `No ${data.items.length ? 'more ' : ''}results`}
      </div>

      <hr class="hr" />

      <div class="message">

        <p>Have you tried</p>

        <ul>

          <li>lowering the <strong>minimum vote count</strong> ?</li>

          <li>lowering the <strong>minimum rating value</strong> ?</li>

          <li>selecting the proper country or language ?</li>

        </ul>
        {data.error && <button onClick={data.more}>Retry</button>}

      </div>

    </div>

  </section>;
}

export default function Explore() {
  usePage('Explore - Pixelstream');
  const { url } = useLocation();
  const query = new URL(url, location.origin).searchParams;
  const params = Object.fromEntries(query);
  if (query.size)
    return <Browse key={query.toString()} params={resolvePreset(params)} />;
  return <section id="explore-content">
    {tileGroups.map(
      group => <div class="explore-section" key={group.title}>

        <div class="section-header">

          <h2>{group.title}</h2>

        </div>

        <div class="cards-container">
          {group.cards.map(
            card => <div
              class="explore-card"
              key={card.title}
              tabIndex="0"
              role="button"
              data-type={card.params.type}
              data-title={card.params.title}
              data-company={card.params.company}
              onClick={() => navigate(`/explore?${new URLSearchParams(card.params)}`)}
              onKeyDown={e => {
                if (e.key === 'Enter')
                  navigate(`/explore?${new URLSearchParams(card.params)}`);
              }}
            >

              <h3>{card.title}</h3>

              <img
                class="backdrop"
                src={card.image}
                alt=""
              />

            </div>
          )}
        </div>

      </div>
    )}
  </section>;
}

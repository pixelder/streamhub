import { usePreferences } from '../../hooks/usePreferences.js';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { usePage } from '../../hooks/usePage.js';
import { useSportsPlayer } from './SportsPlayer.jsx';
import {
  FALLBACK_POSTER,
  dateHeader,
  fetchCached,
  normalize,
  normalizeMatch,
  partitionMatches,
  posterUrl,
  sportIcon,
  streamTime
} from './service.js';

function SportIcon({ category, className = '' }) {
  return <i class={`fa-solid ${sportIcon(category)} ${className}`} aria-hidden="true" />;
}

function MatchCard({ match, live, onSelect }) {
  const card = useRef();
  const [visible, setVisible] = useState(false);
  useEffect(
    () => {
      if (!globalThis.IntersectionObserver) {
        setVisible(true);
        return;
      }
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      }, { rootMargin: '300px 0px' });
      observer.observe(card.current);
      return () => observer.disconnect();
    },
    []
  );
  const poster = posterUrl(match.poster);
  return <div
    ref={card}
    class={`stream-card ${live ? '' : 'upcoming-card'}`}
    style={{ minHeight: 240, contentVisibility: 'auto' }}
    role="button"
    tabIndex="0"
    aria-label={match.title}
    onClick={() => onSelect(match)}
    onKeyDown={e => {
      if (['Enter', ' '].includes(e.key)) {
        e.preventDefault();
        onSelect(match);
      }
    }}
  >
    {visible && <>
      <div class="thumbnail-box">
        <div class="badge-group">
          {match.popular && <span class="badge popular-badge">⚡ POPULAR</span>}
          {!live && <span class="badge upcoming-badge">UPCOMING</span>}
        </div>
        <img
            class="single-poster"
            src={poster}
            alt=""
            loading="lazy"
            style={{ scale: poster === FALLBACK_POSTER ? '0.6' : '' }}
            onError={e => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_POSTER;
              e.currentTarget.style.scale = '0.6';
            }}
          />
      </div>
      <div class="stream-details">
        <div class="stream-meta">
          <span class="stream-league"><SportIcon category={match.category} /> {(match.league || 'GENERAL').toUpperCase()}</span>
          <span class={`stream-time ${live ? 'live-time-accent' : ''}`}>{streamTime(match.date, live)}</span>
        </div>
        <div class="stream-title-wrapper">
          <div class="stream-title">{match.title || 'Untitled Transmission'}</div>
        </div>
        <div class="stream-status-row" />
      </div>
    </>}
  </div>;
}

function GroupHeader({ id, title, count, collapsed, toggle, date = false }) {
  return <div
    class={date ? 'date-group-header' : 'stream-group-header'}
    id={date ? undefined : `${id}-group-header`}
    role="button"
    tabIndex="0"
    aria-expanded={!collapsed}
    aria-controls={date ? id : `${id}-streams-display`}
    onClick={toggle}
    onKeyDown={e => {
      if (['Enter', ' '].includes(e.key)) {
        e.preventDefault();
        toggle();
      }
    }}
  >
    {date
      ? <div class="date-header-title"><span class="date-prefix">//</span> {title}</div>
      : <h2 class="streams-title" id={`${id}-title`}>{title} <span class="stream-count" id={`${id}-count`}>[{count}]</span></h2>}
    <button
      class={`cyber-toggle-btn ${date ? 'sub-toggle-btn' : ''}`}
      id={date ? undefined : `${id}-toggle-btn`}
      type="button"
      tabIndex="-1"
      aria-label={`Toggle ${title}`}
    >
      <span class="btn-symbol">{collapsed ? '[ + ]' : '[ − ]'}</span>
    </button>
  </div>;
}

export default function Sports() {
  const preferences = usePreferences();
  usePage('Sports | Pixelstream');
  const [categories, setCategories] = useState([]),
    [matches, setMatches] = useState([]),
    [category, setCategory] = useState('all');
  const [query, setQuery] = useState(''),
    [term, setTerm] = useState(''),
    [now, setNow] = useState(Date.now()),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(new Set());
  const { load } = useSportsPlayer();
  useEffect(
    () => {
      const controller = new AbortController();
      const refresh = async force => {
        try {
          const data = await fetchCached('sf_streams', '/streams', 5, { signal: controller.signal, force });
          if (!controller.signal.aborted) {
            setMatches(data.map(normalizeMatch));
            setError(null);
          }
        }
        catch (e) {
          if (!controller.signal.aborted) setError(e.message);
        }
        finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      };
      fetchCached('sf_categories', '/categories', 1440, { signal: controller.signal }).then(
        data => {
          if (!controller.signal.aborted) setCategories(data.map(id => ({ id, name: id === 'football' ? 'American football' : id })));
        }
      ).catch(
        e => {
          if (!controller.signal.aborted) setError(e.message);
        }
      );
      refresh(false);
      const clock = setInterval(() => setNow(Date.now()), 30_000),
        feeds = preferences.sportsRefresh
          ? setInterval(() => refresh(true), preferences.sportsRefresh * 60_000)
          : null;
      return () => {
        controller.abort();
        clearInterval(clock);
        clearInterval(feeds);
      };
    },
    [preferences.sportsRefresh]
  );
  useEffect(
    () => {
      const timer = setTimeout(() => setTerm(query), 250);
      return () => clearTimeout(timer);
    },
    [query]
  );
  const { live, upcoming } = useMemo(() => partitionMatches(matches, category, term, now), [matches, category, term, now]);
  const days = useMemo(
    () => {
      const groups = new Map();
      for (const match of upcoming) {
        const title = dateHeader(match.date, now);
        if (!groups.has(title)) groups.set(title, []);
        groups.get(title).push(match);
      }
      return [...groups];
    },
    [upcoming, now]
  );
  const toggle = id => setCollapsed(
    old => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }
  );
  return <>
    <div class="top-control">
      <div class="cyber-search-wrapper">
        <span class="search-prefix">&gt; SEARCH_NODES:</span>
        <input
          id="stream-search-input"
          aria-label="Search sports"
          placeholder="TYPE TEAM, LEAGUE OR SPORT..."
          autoComplete="off"
          spellCheck={false}
          value={query}
          onInput={e => setQuery(e.currentTarget.value)}
        />
      </div>
      <div class="categories-container" id="categories-bar">
        {[
          { id: 'all', name: 'All' },
          ...categories
        ].map(
          item => <button
            key={item.id}
            class={`category-btn ${category === item.id ? 'active' : ''}`}
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
          >{item.id !== 'all' && <SportIcon category={item.id} className="category-logo" />} <span>{item.name || item.id}</span></button>
        )}
      </div>
    </div>
    <div class="streams-section">
      <div
        class={`stream-group collapsible-group ${collapsed.has('live') ? 'collapsed' : ''}`}
        id="live-stream-group"
      >
        <GroupHeader
          id="live"
          title="LIVE_NOW"
          count={live.length}
          collapsed={collapsed.has('live')}
          toggle={() => toggle('live')}
        />
        <div class="streams-grid" id="live-streams-display">
          {live.length
            ? live.map(match => <MatchCard
              key={match.id}
              match={match}
              live
              onSelect={load}
            />)
            : <div class="no-streams">
              {loading ? 'Querying live systems...' : error || 'No live transmissions match parameters.'}
            </div>}
        </div>
      </div>
      <div
        class={`stream-group collapsible-group ${collapsed.has('upcoming') ? 'collapsed' : ''}`}
        id="upcoming-stream-group"
      >
        <GroupHeader
          id="upcoming"
          title="UPCOMING"
          count={upcoming.length}
          collapsed={collapsed.has('upcoming')}
          toggle={() => toggle('upcoming')}
        />
        <div class="upcoming-container" id="upcoming-streams-display">
          {days.length
            ? days.map(
              ([title, items]) => {
                const id = `date-group-${normalize(title)}`;
                return <div
                  key={id}
                  class={`date-group-section ${collapsed.has(id) ? 'collapsed' : ''}`}
                  id={id}
                >
                  <GroupHeader
                    id={id}
                    title={title}
                    collapsed={collapsed.has(id)}
                    toggle={() => toggle(id)}
                    date
                  />
                  <div class="streams-grid">
                    {items.map(match => <MatchCard
                      key={match.id}
                      match={match}
                      live={false}
                      onSelect={load}
                    />)}
                  </div>
                </div>;
              }
            )
            : <div class="no-streams">
              {loading ? 'Querying scheduled events...' : error || 'No upcoming transmissions match parameters.'}
            </div>}
        </div>
      </div>
    </div>
  </>;
}

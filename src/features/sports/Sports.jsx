import { usePreferences } from '../../hooks/usePreferences.js';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { usePage } from '../../hooks/usePage.js';
import Icon from '../../components/common/Icon.jsx';
import {
  API_BASE,
  FALLBACK_POSTER,
  dateHeader,
  fetchCached,
  normalize,
  partitionMatches,
  posterUrl,
  sourceStreams,
  sportIcon,
  streamLabel,
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
  const team = side => <div class="team-wrapper">
    <img
      class="team-badge-img"
      src={`${API_BASE}/images/badge/${match.teams[side].badge}.webp`}
      alt={match.teams[side].name || side}
      loading="lazy"
      onError={e => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/assets/icons/favicon.png';
      }}
    />
    <span class="team-name">{match.teams[side].name || side}</span>
  </div>;
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
        {match.teams?.home?.badge && match.teams?.away?.badge
          ? <div class="matchup-container">
            {team('home')}
            <div class="vs-divider">VS</div>
            {team('away')}
          </div>
          : <img
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
          />}
      </div>
      <div class="stream-details">
        <div class="stream-meta">
          <span class="stream-league"><SportIcon category={match.category} /> {(match.category || 'GENERAL').toUpperCase()}</span>
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

function LivePlayer({ selection, close, chooseSource, chooseStream }) {
  const { match, source, streams, url, loading, error } = selection;
  const wrapper = useRef(),
    drag = useRef();
  const [mini, setMini] = useState(false),
    [position, setPosition] = useState(null),
    [reload, setReload] = useState(0),
    [loaded, setLoaded] = useState(false);
  const scroll = () => document.body.scrollTo(
    {
      top: wrapper.current.offsetTop - (document.querySelector('#top-bar')?.offsetHeight || 0) - 16,
      behavior: 'smooth'
    }
  );
  useEffect(
    () => {
      setLoaded(false);
      setMini(false);
      setPosition(null);
      wrapper.current.style.width = '';
      const timer = setTimeout(scroll, 60);
      return () => clearTimeout(timer);
    },
    [url, match.id]
  );
  useEffect(
    () => {
      const layout = document.querySelector('#main-layout');
      layout?.classList.add('player-active');
      return () => layout?.classList.remove('player-active');
    },
    []
  );
  const startDrag = e => {
    if (!mini || e.target.closest('.control-buttons')) return;
    const rect = wrapper.current.getBoundingClientRect();
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      left: rect.left,
      top: rect.top
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setPosition({
      left: rect.left,
      top: rect.top,
      right: 'auto',
      bottom: 'auto'
    });
  };
  const move = e => {
    if (!drag.current) return;
    setPosition(
      {
        left: Math.max(
          10,
          Math.min(
            innerWidth - wrapper.current.offsetWidth - 10,
            drag.current.left + e.clientX - drag.current.x
          )
        ),
        top: Math.max(
          10,
          Math.min(
            innerHeight - wrapper.current.offsetHeight - 10,
            drag.current.top + e.clientY - drag.current.y
          )
        ),
        right: 'auto',
        bottom: 'auto'
      }
    );
  };
  return <div
    class={`video-player-wrapper active ${mini ? 'mini' : ''}`}
    id="player-wrapper"
    ref={wrapper}
    style={position}
  >
    <div
      class="player-controls"
      onPointerDown={startDrag}
      onPointerMove={move}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <span class="now-playing-badge" id="player-badge">TRANSMISSION</span>
      <div class="control-buttons">
        <button
          id="btn-reload"
          title="Reload Signal"
          onClick={() => {
            setLoaded(false);
            setReload(value => value + 1);
          }}
        >
          <Icon name="repeat" />
        </button>
        <button
          id="btn-minimize"
          class="minimize"
          title="Dock Mini HUD"
          onClick={() => {
            setMini(!mini);
            setPosition(null);
            wrapper.current.style.width = '';
            if (mini) requestAnimationFrame(scroll);
          }}
        >
          <Icon name="picture-in-picture" />
        </button>
        <button
          id="btn-close"
          title="Terminate Stream"
          onClick={close}
        ><Icon name="xmark" /></button>
      </div>
    </div>
    <div class="iframe-container">
      {url && <iframe
        key={`${url}-${reload}`}
        id="live-player"
        title={match.title || 'Live stream'}
        src={url}
        allow="fullscreen; picture-in-picture"
        allowFullScreen
        class={loaded ? 'loaded' : ''}
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
      />}
    </div>
    <div class="source-selector-bar" id="player-sources">
      <div class="selector-row sources-row">
        <span class="row-prefix prefix-cyan">SOURCES //</span>
        {match.sources.map(
          (item, index) => <button
            class={`source-btn ${index === source ? 'active' : ''}`}
            onClick={() => chooseSource(index)}
          >
            <span class="src-name">{(item.source || item.name || `SRC_${index + 1}`).toUpperCase()}</span>
            {index === source && streams.length > 0 && <span class="src-badge-count">{streams.length}</span>}
          </button>
        )}
      </div>
      {streams.length > 0
        ? <div class="selector-row links-row">
          <span class="row-prefix prefix-yellow">QUALITY / STREAM //</span>
          <div class="cyber-stream-grid">
            {streams.map(
              (stream, index) => <button
                class={`cyber-feed-btn ${stream.embedUrl === url ? 'active' : ''}`}
                onClick={() => chooseStream(stream.embedUrl)}
              >
                <span class="feed-index">#{index + 1}</span>
                {(stream.isHd || stream.hd || ['HD', '1080p', '720p'].includes(stream.quality)) && <span class="feed-badge-hd">HD</span>}
                <span class="feed-meta" title={streamLabel(stream, index)}>{streamLabel(stream, index)}</span>
                {stream.viewers != null && <span class="feed-viewers"><Icon name="eye" /> {stream.viewers}</span>}
              </button>
            )}
          </div>
        </div>
        : <div class="no-source-feeds-notice" role="status"><Icon name={loading ? 'spinner fa-spin' : 'circle-exclamation'} /> {loading
          ? 'Querying source feeds...'
          : error || 'No active stream feeds available for this source. Try selecting another source above.'}</div>}
    </div>
    <div class="player-info">
      <h2 id="player-title">{match.title}</h2>
      <p id="player-league">{(match.category || 'LIVE STREAM').toUpperCase()}</p>
    </div>
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
  const [collapsed, setCollapsed] = useState(new Set()),
    [selection, setSelection] = useState(null);
  const request = useRef();
  useEffect(
    () => {
      const controller = new AbortController();
      const refresh = async force => {
        try {
          const data = await fetchCached('sf_streams', '/matches/all', 5, { signal: controller.signal, force });
          if (!controller.signal.aborted) {
            setMatches(data);
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
      fetchCached('sf_categories', '/sports', 1440, { signal: controller.signal }).then(
        data => {
          if (!controller.signal.aborted) setCategories(data);
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
        request.current?.abort();
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
  const load = async (match, sourceIndex = null) => {
    if (!match.sources?.length) return;
    request.current?.abort();
    const controller = request.current = new AbortController();
    setSelection({
      match,
      source: sourceIndex ?? 0,
      streams: [],
      url: '',
      loading: true,
      error: null
    });
    let lastError;
    for (const index of sourceIndex == null ? match.sources.map((_, i) => i) : [sourceIndex]) {
      try {
        const streams = await sourceStreams(match.sources[index], controller.signal);
        if (controller.signal.aborted) return;
        if (streams.length) {
          setSelection({
            match,
            source: index,
            streams,
            url: streams[0].embedUrl,
            loading: false,
            error: null
          });
          return;
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        lastError = e.message;
      }
    }
    if (!controller.signal.aborted) setSelection(
      {
        match,
        source: sourceIndex ?? 0,
        streams: [],
        url: '',
        loading: false,
        error: lastError
      }
    );
  };
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
    {selection && <LivePlayer
      selection={selection}
      close={() => {
        request.current?.abort();
        setSelection(null);
      }}
      chooseSource={index => load(selection.match, index)}
      chooseStream={url => setSelection(old => ({ ...old, url }))}
    />}
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

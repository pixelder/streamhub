import { useEffect, useRef, useState } from 'preact/hooks';
import Icon from '../../components/common/Icon.jsx';
import { navigate } from '../../app/navigation.js';
import { streamLabel } from './service.js';

export default function LivePlayer({ selection, close, chooseSource, chooseStream, away }) {
  const { match, source, streams, url, loading, error } = selection;
  const wrapper = useRef(),
    drag = useRef();
  const [mini, setMini] = useState(false),
    [position, setPosition] = useState(null),
    [reload, setReload] = useState(0),
    [loaded, setLoaded] = useState(false);
  const minimized = away || mini;
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
      const timer = !away && setTimeout(scroll, 60);
      return () => clearTimeout(timer);
    },
    [url, match.id]
  );
  useEffect(
    () => {
      const layout = document.querySelector('#main-layout');
      if (!away) layout?.classList.add('player-active');
      return () => layout?.classList.remove('player-active');
    },
    [away]
  );
  useEffect(() => {
    setMini(false);
    setPosition(null);
    drag.current = null;
    wrapper.current.style.width = '';
    if (!away) {
      const timer = setTimeout(scroll, 60);
      return () => clearTimeout(timer);
    }
  }, [away]);
  const startDrag = e => {
    if (!minimized || e.target.closest('.control-buttons')) return;
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
    class={`sports-player video-player-wrapper active ${minimized ? 'mini' : ''}`}
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
          title={minimized ? "Restore sports player" : "Minimize sports player"}
          onClick={() => {
            if (away) { navigate('/sports'); return; }
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
                {(stream.isHd || stream.hd || ['HD', 'FHD', '4K', '1080p', '720p'].includes(stream.quality)) && <span class="feed-badge-hd">HD</span>}
                <span class="feed-meta" title={streamLabel(stream, index)}>{streamLabel(stream, index)}</span>
                {stream.viewers != null && <span class="feed-viewers"><Icon name="eye" /> {stream.viewers}</span>}
              </button>
            )}
          </div>
        </div>
        : <div class="no-source-feeds-notice" role="status"><Icon name={loading ? 'spinner fa-spin' : 'circle-exclamation'} /> {loading
          ? 'Querying source feeds...'
          : error || 'This event has no live sources yet, or has ended. Select the source again to check.'}</div>}
    </div>
    <div class="player-info">
      <h2 id="player-title">{match.title}</h2>
      <p id="player-league">{match.league || (match.category || 'LIVE STREAM').toUpperCase()}</p>
    </div>
  </div>;
}


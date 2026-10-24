import { usePreferences } from '../../hooks/usePreferences.js';
import { isBlocked } from '../../services/catalogPolicy.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { usePage } from '../../hooks/usePage.js';
import { useAsync } from '../../hooks/useAsync.js';
import { metadata, nextEpisode } from '../../services/api.js';
import { sourceFor, saveSource } from '../../stores/storage.js';
import { notify } from '../../stores/ui.js';
import { titleOf, image, watchUrl } from '../../utils/format.js';
import { resolvePlayer } from './source.js';
import { usePlaybackHistory } from './usePlaybackHistory.js';
import { useMiniPlayerDrag } from './useMiniPlayerDrag.js';
import { useMiniPlayerSize } from './useMiniPlayerSize.js';
import ProviderMenu from './ProviderMenu.jsx';
import EpisodeList from '../../components/media/EpisodeList.jsx';
import Icon from '../../components/common/Icon.jsx';
import Loading from '../../components/common/Loading.jsx';
import './watch.css';

export default function Watch({ id, mediaType = 'movie', season = null, episode = null, minimized = false, onMinimize, onRestore, onClose, onAdvance }) {
  const preferences = usePreferences();
  const mini = useMiniPlayerSize();
  const shell = useRef();
  const floating = useMiniPlayerDrag(shell, mini.width, minimized);
  const [theater, setTheater] = useState(false);
  useEffect(() => {
    if (!minimized) return;
    document.body.style.setProperty('--mini-player-height', `${floating.docked ? 64 : mini.width * 9 / 16 + 54}px`);
    return () => document.body.style.removeProperty('--mini-player-height');
  }, [minimized, mini.width, floating.docked]);
  usePage(minimized ? null : 'Pixelstream');
  const [retry, setRetry] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [source, setSource] = useState(() => sourceFor(id)),
    [settings, setSettings] = useState({});
  const [loaded, setLoaded] = useState(false),
    [episodeName, setEpisodeName] = useState('');
  const iframe = useRef(),
    container = useRef(),
    exit = useRef(),
    fullscreenTimer = useRef();
  const episodeRequest = useRef(0);
  const advance = useRef(onAdvance);
  advance.current = onAdvance;
  useEffect(() => {
    episodeRequest.current++;
    setAdvancing(false);
    setEpisodeName('');
    return () => { episodeRequest.current++; };
  }, [id, mediaType, season, episode]);
  useEffect(() => {
    setSource(sourceFor(id));
  }, [id]);
  const meta = useAsync(signal => metadata(mediaType, id, false, { signal }), [id, mediaType]);
  const player = useAsync(
    signal => resolvePlayer(
      {
        source,
        type: mediaType,
        id,
        season,
        episode,
        settings: settings[source] || {},
        signal
      }
    ),
    [
      source,
      id,
      mediaType,
      season,
      episode,
      JSON.stringify(settings[source]),
      JSON.stringify(preferences.blacklist),
      preferences.hideMature,
      preferences.hideUnrated,
      preferences.excludeAdult,
      preferences.customSource,
      retry
    ]
  );
  useEffect(() => {
    setLoaded(false);
  }, [player.data]);
  useEffect(
    () => {
      if (!meta.data || minimized)
        return;
      document.title = `${mediaType === 'tv' ? `S${season}:E${episode} ` : ''}${titleOf(meta.data)} - PixelStream`;
      try {
        localStorage.setItem('current-media-title', titleOf(meta.data));
      }
      catch {
        /* Playback works without storage. */
      }
      const tag = document.querySelector('meta[property="og:image"]'),
        previous = tag?.content;
      if (tag && meta.data.backdrop_path)
        tag.content = image(meta.data.backdrop_path, 'original');
      return () => {
        if (tag)
          tag.content = previous;
      };
    },
    [meta.data, season, episode, minimized]
  );
  usePlaybackHistory(
    {
      iframe,
      src: player.data,
      loaded,
      id,
      type: mediaType,
      season,
      episode,
      source,
      onAdvance
    }
  );
  useEffect(
    () => {
      const change = () => {
        clearTimeout(fullscreenTimer.current);
        if (document.fullscreenElement || document.webkitFullscreenElement)
          fullscreenTimer.current = setTimeout(() => exit.current?.classList.add('hidden'), 3000);
        else
          exit.current?.classList.remove('hidden');
      };
      document.addEventListener('fullscreenchange', change);
      document.addEventListener('webkitfullscreenchange', change);
      return () => {
        clearTimeout(fullscreenTimer.current);
        document.removeEventListener('fullscreenchange', change);
        document.removeEventListener('webkitfullscreenchange', change);
      };
    },
    []
  );
  const select = (provider, setting) => {
    setSource(Number(provider.ds));
    try {
      saveSource(id, Number(provider.ds));
    }
    catch (error) {
      notify(error.message);
    }
    if (setting)
      setSettings(old => ({ ...old, [provider.ds]: { ...old[provider.ds], ...setting } }));
  };
  const playNext = async () => {
    const request = ++episodeRequest.current;
    setAdvancing(true);
    try {
      const next = await nextEpisode(id, season, episode);
      if (request !== episodeRequest.current) return;
      if (next) advance.current(next);
      else notify('You have reached the latest available episode.');
    } catch (error) { if (request === episodeRequest.current) notify(error.message); }
    finally { if (request === episodeRequest.current) setAdvancing(false); }
  };
  const copyWatchLink = async () => {
    const url = new URL(watchUrl(mediaType, id, season, episode), location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      notify('Watch link copied.');
    } catch { notify('Could not copy the link. Open the full player and copy its address.'); }
  };
  if (isBlocked(mediaType, id)) return <div class={`watch-page ${minimized ? 'is-mini' : ''}`}>
    <p role="alert">This title is blocked in Settings.</p><button onClick={onClose}>Close player</button>
  </div>;
  return <div
    class={`watch-page ${minimized ? 'is-mini' : ''} ${theater && !minimized ? 'is-theater' : ''} ${mini.resizing ? 'is-resizing' : ''} ${floating.docked && minimized ? 'is-docked' : ''} ${floating.dragging ? 'is-dragging' : ''}`}
    ref={shell}
    style={minimized ? { '--mini-width': `${mini.width}px`, ...(floating.position && !floating.docked ? { left: `${floating.position.x}px`, top: `${floating.position.y}px`, right: 'auto', bottom: 'auto' } : {}) } : undefined}
    aria-label="Now playing"
  >
    {minimized && !floating.docked && <button
      class="mini-resize-handle"
      aria-label="Resize mini-player. Arrow keys adjust size; Enter resets size."
      title="Drag to resize · Double-click to reset"
      {...mini.handle}
      onPointerDown={event => { floating.cancelTransition(); mini.handle.onPointerDown(event); }}
    ></button>}
    <div class="mini-player-heading">
      <div class="mini-player-artwork" aria-hidden="true">{meta.data?.poster_path ? <img src={image(meta.data.poster_path)} alt="" /> : <Icon name="film" />}</div>
      <span class="mini-player-title" role="button" tabIndex={minimized ? 0 : -1}
        aria-label={floating.docked ? 'Drag up to undock player, or press Enter' : 'Drag to move player. Arrow keys move; Enter docks.'}
        title={floating.docked ? 'Drag up to show video' : 'Drag near the bottom to dock'}
        {...floating.handle}>{meta.data ? titleOf(meta.data) : 'Now playing'}{mediaType === 'tv' && <small>S{season} · E{episode}</small>}</span>
      <button onClick={floating.docked ? floating.undock : floating.dock} title={floating.docked ? 'Show floating video' : 'Dock player'} aria-label={floating.docked ? 'Show floating video' : 'Dock player'}><Icon name={floating.docked ? 'up-right-from-square' : 'window-minimize'} /></button>
      <button onClick={onRestore} title="Expand player" aria-label="Expand player"><Icon name="expand" /></button>
      {mediaType === 'tv' && <button aria-label="Next episode" disabled={advancing} onClick={playNext}><Icon name="forward-step" /></button>}
      <button aria-label="Close player and stop playback" onClick={onClose}><Icon name="xmark" /></button>
    </div>

    <div class="player-container" inert={minimized && floating.docked ? true : undefined} aria-hidden={minimized && floating.docked ? true : undefined}>
      <div class="player">

        <div class="loading" style={{ display: loaded ? 'none' : 'flex' }}>
          {player.error
            ? <div role="alert"><p>{player.error.message}</p><button onClick={() => setRetry(n => n + 1)}>Retry player</button></div>
            : <>
              <div
                class="loading-spinner"
                style={{ background: 'var(--font-color1)' }}
              />&nbsp;Loading player...
            </>}
        </div>

        <div class="iframe-container" ref={container}>

          <button
            ref={exit}
            class="iframe-exit"
            aria-label="Exit fullscreen"
            onClick={async () => {
              try {
                await (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
              } catch (error) {
                notify(error.message);
              }
            }}
          >
            <Icon name="compress" />
          </button>
          {player.data && !player.loading &&
            <iframe
              key={player.data}
              class={`iframe${source === 5 ? ' zoom' : ''}`}
              style={{ display: loaded ? 'initial' : 'none' }}
              ref={iframe}
              title={meta.data ? `${titleOf(meta.data)} player` : 'Media player'}
              data-id={id}
              data-media-type={mediaType}
              src={player.data}
              frameBorder="0"
              scrolling="no"
              allowFullScreen
              onLoad={() => setLoaded(true)}
            />
          }
        </div>

        <div class="player-toolbar">

          <ProviderMenu
            source={source}
            mediaType={mediaType}
            settings={settings}
            select={select}
          />

          <div class="watch-toolbar-actions">
            <button title="Reload player" aria-label="Reload player" onClick={() => { setLoaded(false); setRetry(n => n + 1); }}><Icon name="rotate-right" /></button>
            {mediaType === 'tv' && <button title="Next episode" aria-label="Next episode" disabled={advancing} onClick={playNext}><Icon name="forward-step" /></button>}
            <button title={theater ? 'Exit theater mode' : 'Theater mode'} aria-label="Theater mode" aria-pressed={theater} onClick={() => setTheater(value => !value)}><Icon name="desktop" /></button>
            <button title="Copy watch link" aria-label="Copy watch link" onClick={copyWatchLink}><Icon name="link" /></button>
            <button title="Minimize player and browse" aria-label="Minimize player and browse" onClick={onMinimize}><Icon name="chevron-down" /></button>
            <button
              class="iframefullscreen"
              title="Go fullscreen"
              aria-label="Go fullscreen"
              onClick={async () => {
                try {
                  const element = container.current;
                  await (element.requestFullscreen || element.webkitRequestFullscreen)?.call(element);
                  if (exit.current)
                    exit.current.style.opacity = '1';
                } catch (error) {
                  notify(error.message);
                }
              }}
            >
              <Icon name="up-right-and-down-left-from-center" />
            </button>
          </div>

        </div>

      </div>
    </div>

    <div class="now-playing">
      {meta.error
        ? <Loading error={meta.error} />
        : <>
          <h2>{meta.data ? titleOf(meta.data) : ''}</h2>
          {mediaType === 'tv' && <h4>S{season}:E{episode} {episodeName}</h4>}
        </>}
    </div>

    <div class="player-episodes">
      {mediaType === 'tv' && meta.data && <EpisodeList
        data={meta.data}
        sno={season}
        eno={episode}
        player
        onLoaded={data => {
          if (Number(data.season_number) === Number(season)) setEpisodeName(data.episodes?.find(item => item.episode_number === Number(episode))?.name || '');
        }}
      />}
    </div>

  </div>;
}

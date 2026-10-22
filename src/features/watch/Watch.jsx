import { usePreferences } from '../../hooks/usePreferences.js';
import { isBlocked } from '../../services/catalogPolicy.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { usePage } from '../../hooks/usePage.js';
import { useAsync } from '../../hooks/useAsync.js';
import { metadata } from '../../services/api.js';
import { sourceFor, saveSource } from '../../stores/storage.js';
import { notify } from '../../stores/ui.js';
import { titleOf, image } from '../../utils/format.js';
import { resolvePlayer } from './source.js';
import { usePlaybackHistory } from './usePlaybackHistory.js';
import ProviderMenu from './ProviderMenu.jsx';
import EpisodeList from '../../components/media/EpisodeList.jsx';
import Icon from '../../components/common/Icon.jsx';
import Loading from '../../components/common/Loading.jsx';

export default function Watch({ id, mediaType = 'movie', season = null, episode = null }) {
  const preferences = usePreferences();
  usePage('Pixelstream', ['/watch/styles.css', '/watch/media.css']);
  const [source, setSource] = useState(() => sourceFor(id)),
    [settings, setSettings] = useState({});
  const [loaded, setLoaded] = useState(false),
    [episodeName, setEpisodeName] = useState('');
  const iframe = useRef(),
    container = useRef(),
    exit = useRef(),
    fullscreenTimer = useRef();
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
      preferences.customSource
    ]
  );
  useEffect(() => {
    setLoaded(false);
  }, [player.data]);
  useEffect(
    () => {
      if (!meta.data)
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
    [meta.data, season, episode]
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
      source
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
  if (isBlocked(mediaType, id)) return <p role="alert">This title is blocked in Settings.</p>;
  return <div class="watch-page">

    <div class="player-container">
      <div class="player">

        <div class="loading" style={{ display: loaded ? 'none' : 'flex' }}>
          {player.error
            ? <p role="alert">{player.error.message}</p>
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
              title="Media player"
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

          <div class="media-download">
            <button class="download">Download</button>
            <div class="get-dwnload" />
          </div>

          <div class="go-fullscreen">
            <button
              class="iframefullscreen"
              title="Go fullscreen"
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

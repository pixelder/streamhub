import { getSettings } from '../settings/preferences.js';
import { navigate } from '../../app/navigation.js';
import { useEffect } from 'preact/hooks';
import { saveLog, removeLog, saveSource } from '../../stores/storage.js';
import { nextEpisode } from '../../services/api.js';
import { notify } from '../../stores/ui.js';
import { playbackProgress } from './source.js';

export function usePlaybackHistory({ iframe, src, loaded, id, type, season, episode, source }) {
  useEffect(
    () => {
      if (!loaded || !src)
        return;
      let active = true,
        complete = false,
        advancing = false,
        last = 0;
      // All progress updates from this playback session share one history index.
      const index = Date.now();
      const writeProgress = progress => {
        if (!active || !getSettings().recordHistory)
          return;
        saveSource(id, source);
        saveLog('history', {
          id,
          mediaType: type,
          sno: season,
          eno: episode,
          progress,
          index
        });
        if (progress === 100) {
          removeLog('watching', type, id, season, episode);
          if (type === 'tv')
            nextEpisode(id, season, episode).then(
              next => {
                if (active && next && getSettings().recordHistory)
                  saveLog('watching', {
                    id,
                    mediaType: type,
                    sno: next.season_number,
                    eno: next.episode_number
                  });
              }
            ).catch(
              e => notify(e.message)
            );
        }
        else
          saveLog('watching', {
            id,
            mediaType: type,
            sno: season,
            eno: episode,
            progress,
            index
          });
      };
      // Some embedded players never report progress; still record that they were opened.
      const fallback = setTimeout(() => writeProgress(null), 120000);
      const message = e => {
        // Accept progress only from the currently embedded player.
        if (e.source !== iframe.current?.contentWindow || e.origin !== new URL(src).origin)
          return;
        let data = e.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          }
          catch {
            return;
          }
        }
        const progress = playbackProgress(data);
        if (progress === null)
          return;
        clearTimeout(fallback);
        // Autoplay waits until the end, even though history marks a title watched earlier.
        if (progress >= 99.5 && type === 'tv' && !advancing && getSettings().autoplay) {
          advancing = true;
          nextEpisode(id, season, episode).then(
            next => {
              if (active && next && getSettings().autoplay)
                navigate(`/watch/tv/${id}/${next.season_number}/${next.episode_number}`);
            }
          ).catch(
            error => notify(error.message)
          );
        }
        if (progress > 85) {
          if (!complete) {
            complete = true;
            writeProgress(100);
          }
          return;
        }
        if (progress > 5 && !complete && Date.now() - last >= 10000) {
          last = Date.now();
          writeProgress(progress);
        }
      };
      window.addEventListener('message', message);
      return () => {
        // Ignore pending episode lookups after navigation or a source switch.
        active = false;
        clearTimeout(fallback);
        window.removeEventListener('message', message);
      };
    },
    [src, loaded, id, type, season, episode, source]
  );
}

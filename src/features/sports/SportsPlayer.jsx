import { createContext } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import LivePlayer from './LivePlayer.jsx';
import { sourceStreams } from './service.js';

const SportsPlayerContext = createContext(null);
export const useSportsPlayer = () => useContext(SportsPlayerContext);

// Owned by the shell, so route changes never replace the playing iframe.
export function SportsPlayerProvider({ children }) {
  const [selection, setSelection] = useState(null);
  const request = useRef();
  useEffect(() => () => request.current?.abort(), []);
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

  const close = () => {
    request.current?.abort();
    setSelection(null);
  };
  return <SportsPlayerContext.Provider value={{ selection, setSelection, load, close }}>
    {children}
  </SportsPlayerContext.Provider>;
}

export function SportsPlayerHost({ route }) {
  const { selection, setSelection, load, close } = useSportsPlayer();
  if (!selection) return null;
  return <LivePlayer
    selection={selection}
    away={route.name !== 'sports'}
    close={close}
    chooseSource={index => load(selection.match, index)}
    chooseStream={url => setSelection(old => old && ({ ...old, url }))}
  />;
}

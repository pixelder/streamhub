import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { navigate } from '../../app/navigation.js';
import { watchUrl } from '../../utils/format.js';
import Loading from '../../components/common/Loading.jsx';

let watchModule;

// This host lives outside the route subtree. Minimizing only changes CSS and
// the current route: the same Watch component and iframe remain mounted.
export default function WatchHost({ route }) {
  const { url } = useLocation();
  const watching = route.name === 'watch';
  const [active, setActive] = useState(() => watching ? route.props : null);
  const [module, setModule] = useState(() => watchModule || null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const returnTo = useRef('/');
  const current = watching ? route.props : active;
  const path = current && watchUrl(current.mediaType, current.id, current.season, current.episode);
  useLayoutEffect(() => {
    if (watching) setActive(route.props);
    else returnTo.current = url;
  }, [watching, path, url]);
  useEffect(() => {
    if (!current || module) return;
    let live = true;
    setError(null);
    import('./Watch.jsx').then(loaded => {
      watchModule = loaded;
      if (live) setModule(loaded);
    }).catch(failure => { if (live) setError(failure); });
    return () => { live = false; };
  }, [!!current, module, attempt]);
  useEffect(() => {
    document.body.classList.toggle('has-mini-player', !!current && !watching);
    return () => document.body.classList.remove('has-mini-player');
  }, [!!current, watching]);
  const stop = () => { setActive(null); if (watching) navigate(returnTo.current); };
  if (!current) return null;
  if (error || !module) return <div class={`route-loading ${watching ? '' : 'player-pending-mini'}`}>
    {error ? <><p role="alert">Could not load the player.</p><button onClick={() => setAttempt(n => n + 1)}>Try again</button></> : <Loading />}
    <button onClick={stop}>Close player</button>
  </div>;
  const Player = module.default;
  return <Player
    key={`${current.mediaType}-${current.id}`}
    {...current}
    minimized={!watching}
    onMinimize={() => navigate(returnTo.current)}
    onRestore={() => navigate(path)}
    onClose={stop}
    onAdvance={next => {
      const nextTitle = { ...current, season: next.season_number, episode: next.episode_number };
      if (watching) navigate(watchUrl(current.mediaType, current.id, nextTitle.season, nextTitle.episode));
      else setActive(nextTitle);
    }}
  />;
}

import { navigate } from './navigation.js';
import { activeProfileId } from '../stores/profileStorage.js';
import { useStorage } from '../hooks/useStorage.js';
import { useEffect, useRef } from 'preact/hooks';
import { loadImageConfiguration } from '../services/images.js';
import { usePreferences } from '../hooks/usePreferences.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { applyAppearance } from '../features/settings/preferences.js';
import { Component } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';
import { LocationProvider, useLocation } from 'preact-iso';
import Navigation from '../components/navigation/Navigation.jsx';
import Overlays from '../components/common/Overlays.jsx';
import { closeDetails, finishConfirmation } from '../stores/ui.js';
import { matchRoute } from './routes.js';
import Routes from './router.jsx';
import WatchHost from '../features/watch/WatchHost.jsx';
import { useScrollRestoration } from '../hooks/useScrollRestoration.js';

class AppErrorBoundary extends Component {
  state = { error: null };
  componentDidCatch(error) {
    this.setState({ error });
    console.error('Application error:', error);
  }
  render({ children }, { error }) {
    if (!error)
      return children;
    return <div class="filler" role="alert">

      <div class="message">

        <h4>Unable to display this page.</h4>

        <p>{error.message}</p>

        <button onClick={() => location.reload()}>Reload</button>

        <a href="/" onClick={event => event.stopPropagation()}>Home</a>

      </div>

    </div>;
  }
}

function Shell() {
  const profileId = useStorage(() => {
    try { return activeProfileId(); } catch { return 'unavailable'; }
  });
  const previousProfile = useRef(profileId);
  const profileChanged = previousProfile.current !== profileId;
  useLayoutEffect(() => {
    if (profileChanged) {
      previousProfile.current = profileId;
      navigate('/profile', true);
    }
  }, [profileId]);
  const preferences = usePreferences();
  useEffect(
    () => {
      loadImageConfiguration().catch(
        error => console.warn('Using fallback image configuration:', error.message)
      );
    },
    []
  );
  useEffect(
    () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(preferences.font)}:wght@400&display=swap`;
      document.head.append(link);
      return () => link.remove();
    },
    [preferences.font]
  );
  const dark = useMediaQuery('(prefers-color-scheme: dark)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  useLayoutEffect(() => applyAppearance(preferences, { dark, reduced }), [preferences, dark, reduced]);
  const { path, url, wasPush } = useLocation(),
    route = matchRoute(path);
  const [loading, setLoading] = useState(false);
  const ready = useScrollRestoration(url, path, wasPush);
  useLayoutEffect(
    () => {
      closeDetails();
      finishConfirmation(false);
      document.body.classList.remove('keyboard');
      document.querySelectorAll('#top-bar,#bottom-bar').forEach(el => el.classList.remove('hidden'));
    },
    [path, profileId]
  );
  return <>
    <Navigation />
    <main
      id={route.name === 'sports' ? 'main-layout' : 'main-content'}
      class={route.name === 'sports' ? 'main-container' : route.name === 'not-found' ? 'error-page' : undefined}
      aria-busy={loading}
    >
      <AppErrorBoundary><WatchHost key={profileId} route={profileChanged ? { name: 'profile' } : route} /></AppErrorBoundary>
      <AppErrorBoundary key={`${route.name}-${profileId}`}>

        <Routes onLoading={setLoading} onReady={ready} />

      </AppErrorBoundary>


      <Overlays />


    </main>
    <Navigation bottom />
    {['home', 'explore', 'library', 'profile'].includes(route.name) && <footer />}
  </>;
}

export default function App() {
  // Let the browser own API/asset links, including downloads from this origin.
  const scope = /^(?!\/(?:api|fetch|ws|socket\.io|assets|css|build)(?:\/|$))/;
  return <LocationProvider scope={scope}>

    <Shell />

  </LocationProvider>;
}

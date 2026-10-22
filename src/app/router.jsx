import { lazy, Route, Router, useLocation } from 'preact-iso';
import { matchRoute } from './routes.js';

const pages = {
  home: lazy(() => import('../features/home/Home.jsx')),
  explore: lazy(() => import('../features/explore/Explore.jsx')),
  search: lazy(() => import('../features/search/Search.jsx')),
  library: lazy(() => import('../features/library/Library.jsx')),
  settings: lazy(() => import('../features/settings/Settings.jsx')),
  sports: lazy(() => import('../features/sports/Sports.jsx')),
  watch: lazy(() => import('../features/watch/Watch.jsx')),
  tools: lazy(() => import('../features/tools/Tools.jsx')),
  'not-found': lazy(() => import('./NotFound.jsx')),
};

function MatchedRoute() {
  const { path } = useLocation();
  const route = matchRoute(path),
    Page = pages[route.name];
  return <Page
    key={route.name === 'watch' ? `watch-${route.props.mediaType}-${route.props.id}` : route.name}
    {...route.props}
  />;
}

export default function Routes({ onLoading, onReady }) {
  return <Router
    onLoadStart={() => onLoading(true)}
    onLoadEnd={() => {
      onLoading(false);
      onReady();
    }}
    onRouteChange={onReady}
  >

    <Route default component={MatchedRoute} />

  </Router>;
}

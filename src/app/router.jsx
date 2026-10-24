import { lazy, Route, Router, useLocation } from 'preact-iso';
import { matchRoute } from './routes.js';
import RouteStyles from './RouteStyles.jsx';

const pages = {
  home: lazy(() => import('../features/home/Home.jsx')),
  explore: lazy(() => import('../features/explore/Explore.jsx')),
  search: lazy(() => import('../features/search/Search.jsx')),
  library: lazy(() => import('../features/library/Library.jsx')),
  profile: lazy(() => import('../features/profile/Profile.jsx')),
  settings: lazy(() => import('../features/settings/Settings.jsx')),
  sports: lazy(() => import('../features/sports/Sports.jsx')),
  tools: lazy(() => import('../features/tools/Tools.jsx')),
  'not-found': lazy(() => import('./NotFound.jsx')),
};

function MatchedRoute() {
  const { path } = useLocation();
  const route = matchRoute(path),
    Page = pages[route.name];
  if (route.name === 'watch') return null;
  return <RouteStyles key={route.name} page={route.name}><Page
    {...route.props}
  /></RouteStyles>;
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

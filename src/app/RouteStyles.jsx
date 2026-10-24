import { useLayoutEffect, useState } from 'preact/hooks';
import Loading from '../components/common/Loading.jsx';

import { pageStyles, preparePageStyles } from './pageStyles.js';

// Keep legacy page styles local to their route. Mount its contents only after
// the CSS is ready, and remove the links when navigating to another page.
export default function RouteStyles({ page, children }) {
  const urls = pageStyles[page] || [];
  const [state, setState] = useState({ ready: urls.length === 0, error: null });
  const [attempt, setAttempt] = useState(0);
  useLayoutEffect(() => {
    let active = true;
    setState({ ready: urls.length === 0, error: null });
    const styles = preparePageStyles(page);
    styles.ready.then(
      () => { if (active) setState({ ready: true, error: null }); },
      error => { if (active) setState({ ready: false, error }); }
    );
    return () => {
      active = false;
      styles.dispose();
    };
  }, [page, attempt]);
  if (state.error) return <div class="route-loading" role="alert">
    <p>{state.error.message}</p><button onClick={() => setAttempt(value => value + 1)}>Try again</button>
  </div>;
  return state.ready ? children : <div class="route-loading" role="status" aria-label="Loading page styles"><Loading /></div>;
}

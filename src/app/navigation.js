export function navigate(url, replace = false) {
  const target = new URL(url, window.location.href);
  if (target.origin !== window.location.origin) {
    window.location.assign(target.href);
    return;
  }
  if (target.href === window.location.href)
    return;
  window.history[replace ? 'replaceState' : 'pushState'](
    {},
    '',
    target.pathname + target.search + target.hash
  );
  window.dispatchEvent(new PopStateEvent('popstate'));
}

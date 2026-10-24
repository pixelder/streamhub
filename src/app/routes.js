// This registry is shared by Express and the client. Assets and server endpoints
// are never treated as frontend routes.
const pages = new Set(['explore', 'search', 'library', 'profile', 'settings', 'sports', 'tools']);

export function normalizePath(pathname) {
  return pathname.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
}

export function matchRoute(pathname) {
  const path = normalizePath(pathname);
  if (['/', '/movie', '/tv', '/person'].includes(path))
    return { name: 'home', path };
  if (pages.has(path.slice(1)))
    return { name: path.slice(1), path };
  let match = path.match(/^\/watch\/movie\/(\d+)$/);
  if (match)
    return {
      name: 'watch',
      path,
      props: { mediaType: 'movie', id: match[1] }
    };
  match = path.match(/^\/watch\/tv\/(\d+)\/(\d+)\/(\d+)$/);
  if (match)
    return {
      name: 'watch',
      path,
      props: {
        mediaType: 'tv',
        id: match[1],
        season: match[2],
        episode: match[3]
      }
    };
  return { name: 'not-found', path };
}

export function isServerPath(pathname) {
  return /^\/(?:api|fetch|ws|socket\.io)(?:\/|$)/i.test(pathname)
    || /\.[^/]+$/.test(pathname) && matchRoute(pathname).name === 'not-found'
    || /^\/(?:assets|css|build|@vite|@id|@fs|src|node_modules)(?:\/|$)/.test(pathname);
}

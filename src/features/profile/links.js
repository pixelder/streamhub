export const profileViews = ['library', 'tracking', 'collections'];

export function profileView(search, hash = '') {
  if (new URLSearchParams(hash.replace(/^#/, '')).has('collection')) return 'collections';
  const view = new URLSearchParams(search).get('view');
  return profileViews.includes(view) ? view : 'library';
}

// Preserve old bookmarks and shared snapshots when moving Library into Profile.
export function libraryProfileUrl(search = '', hash = '') {
  const params = new URLSearchParams(search);
  params.set('view', profileView(search, hash));
  return `/profile?${params}${hash}`;
}

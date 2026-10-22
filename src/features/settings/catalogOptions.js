export const initialProviders = [
  { id: 8, name: 'Netflix' },
  { id: 2100, name: 'Amazon Prime Video' },
  { id: 350, name: 'Apple TV+' },
  { id: 1899, name: 'HBO Max' },
  { id: 582, name: 'Paramount+' }
];
export const imageKinds = ['poster', 'backdrop', 'profile', 'logo']; // still
export const fonts = ['Figtree', 'Onest', 'Outfit', 'Raleway', 'Urbanist'];

export function normalizeList(value, kind) {
  if (!Array.isArray(value)) return [];
  if (kind === 'codes') return [...new Set(value.filter(x => typeof x === 'string' && /^[a-zA-Z]{2,3}$/.test(x)))];
  if (kind === 'genres') return [...new Set(value.map(Number).filter(x => Number.isInteger(x) && x > 0))];
  if (kind === 'blacklist') return [
    ...new Map(value.filter(
      x => x && ['movie', 'tv', 'person', 'all'].includes(x.type) && /^\d+$/.test(String(x.id)) && Number(x.id) > 0
    ).map(
      x => [
        `${x.type}:${x.id}`,
        { type: x.type, id: Number(x.id) }
      ]
    )).values()
  ];
  if (kind === 'providers') return [
    ...new Map(value.filter(x => x && Number.isInteger(Number(x.id)) && Number(x.id) > 0).map(
      x => [
        Number(x.id),
        { id: Number(x.id), name: String(x.name || x.id).slice(0, 80) }
      ]
    )).values()
  ];
  if (kind === 'sections') return value.slice(0, 20).filter(x => x && ['movie', 'tv'].includes(x.type)).map(
    (x, i) => ({
      id: String(x.id || i).replace(/[^a-z0-9-]/gi, '').slice(0, 50) || String(i),
      title: String(x.title || 'Collection').slice(0, 80),
      type: x.type,
      sort: ['popularity.desc', 'vote_average.desc', 'primary_release_date.desc', 'first_air_date.desc'].includes(
        x.sort
      )
        ? x.sort
        : 'popularity.desc',
      language: /^[a-z]{2,3}$/.test(x.language) ? x.language : '',
      country: /^[A-Z]{2}$/.test(x.country) ? x.country : '',
      provider: Number(x.provider) > 0 ? String(Number(x.provider)) : '',
      genre: Number(x.genre) > 0 ? String(Number(x.genre)) : ''
    })
  );
  return [];
}

export function validSourceTemplate(value) {
  if (typeof value !== 'string' || !value.trim() || (value.match(/\{[^}]*\}/g) || []).some(
    token => !['{id}', '{type}', '{season}', '{episode}'].includes(token)
  )) return '';
  try {
    const url = new URL(value.replace(/\{(?:type|id|season|episode)\}/g, '1'));
    return url.protocol === 'https:' && !url.username && !url.password && value.includes('{id}')
      ? value.trim()
      : '';
  }
  catch {
    return '';
  }
}

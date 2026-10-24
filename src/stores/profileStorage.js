export const PROFILE_REGISTRY = 'streamhub_profiles_v1';
export const PROFILE_KEYS = ['history', 'watching', 'bookmarks', 'DEF_SRC', 'app_settings', 'title_journal', 'custom_lists'];

export function profileRegistry() {
  const raw = localStorage.getItem(PROFILE_REGISTRY);
  if (raw === null) return { active: 'default', ids: ['default'] };
  const value = JSON.parse(raw);
  if (!value || !Array.isArray(value.ids) || !value.ids.length
    || value.ids.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(id))
    || new Set(value.ids).size !== value.ids.length || !value.ids.includes(value.active)) {
    throw new Error('Saved profiles could not be read. Do not clear browser data; restore a backup.');
  }
  return value;
}

export const activeProfileId = () => profileRegistry().active;
export const profileKeyFor = (key, id) => id === 'default' ? key : `streamhub_profile:${id}:${key}`;
export function storageKey(key) {
  return PROFILE_KEYS.includes(key) || /^\d+$/.test(key) ? profileKeyFor(key, activeProfileId()) : key;
}

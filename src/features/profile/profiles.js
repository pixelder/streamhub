import { profileRegistry, PROFILE_REGISTRY, PROFILE_KEYS, profileKeyFor } from '../../stores/profileStorage.js';
import { normalizeSettings } from '../settings/preferences.js';
import { notifyStorage } from '../../stores/storage.js';

export function listProfiles() {
  const registry = profileRegistry();
  return registry.ids.map(id => {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(profileKeyFor('app_settings', id))); } catch { saved = null; }
    return { id, active: id === registry.active, ...normalizeSettings(saved).profile };
  });
}

export function createProfile(profile) {
  const registry = profileRegistry();
  const name = profile.name?.trim();
  if (!name) throw new Error('Enter a name for this profile.');
  const id = crypto.randomUUID();
  const key = profileKeyFor('app_settings', id);
  const identity = normalizeSettings({ profile: { ...profile, name } }).profile;
  localStorage.setItem(key, JSON.stringify({ profile: identity }));
  try {
    localStorage.setItem(PROFILE_REGISTRY, JSON.stringify({ active: id, ids: [...registry.ids, id] }));
  } catch (error) { localStorage.removeItem(key); throw error; }
  notifyStorage();
  return id;
}

export function switchProfile(id) {
  const registry = profileRegistry();
  if (!registry.ids.includes(id)) throw new Error('This profile no longer exists.');
  localStorage.setItem(PROFILE_REGISTRY, JSON.stringify({ ...registry, active: id }));
  notifyStorage();
}

export function deleteProfile(id) {
  const registry = profileRegistry();
  if (!registry.ids.includes(id)) throw new Error('This profile no longer exists.');
  if (registry.ids.length === 1) throw new Error('Keep at least one profile. Add another before deleting this one.');
  const keys = PROFILE_KEYS.map(key => profileKeyFor(key, id));
  // Include old numeric provider choices for the original profile only.
  if (id === 'default') for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (/^\d+$/.test(key)) keys.push(key);
  }
  const before = new Map([...keys, PROFILE_REGISTRY].map(key => [key, localStorage.getItem(key)]));
  const ids = registry.ids.filter(value => value !== id);
  try {
    localStorage.setItem(PROFILE_REGISTRY, JSON.stringify({ active: registry.active === id ? ids[0] : registry.active, ids }));
    keys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    for (const [key, value] of before) value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value);
    throw error;
  }
  notifyStorage();
}

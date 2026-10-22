import { normalizeList, validSourceTemplate, imageKinds } from './catalogOptions.js';
import { read, write } from '../../stores/storage.js';
import { defaultSettings, settingEntries } from './schema.js';

export function normalizeSettings(saved) {
  const values = defaultSettings();
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return values;
  for (const [key, setting] of settingEntries) {
    const value = saved[key];
    if (setting.type === 'boolean' && typeof value === 'boolean') values[key] = value;
    if (setting.type === 'number' && value !== '' && value != null && Number.isFinite(Number(value))) values[key] = Math.max(
      setting.min,
      Math.min(
        setting.max,
        Number((Math.round(Number(value) / (setting.step || 1)) * (setting.step || 1)).toFixed(3))
      )
    );
    if (setting.type === 'select') {
      const options = setting.options.map(option => typeof option === 'object' ? option.value : option);
      const match = options.find(option => String(option) === String(value));
      if (match !== undefined) values[key] = match;
    }
    const listKind = {
      languages: 'codes',
      countries: 'codes',
      movieGenres: 'genres',
      tvGenres: 'genres',
      blacklist: 'blacklist',
      providers: 'providers',
      sections: 'sections'
    }[setting.type];
    if (listKind && Array.isArray(value)) values[key] = normalizeList(value, listKind);
    if (setting.type === 'sourceTemplate') values[key] = validSourceTemplate(value);
    if (setting.type === 'imageConfig' && value && typeof value === 'object') values[key] = Object.fromEntries(
      imageKinds.map(
        kind => [kind, /^(auto|original|w\d+|h\d+)$/.test(value[kind]) ? value[kind] : 'auto']
      )
    );
    if (setting.type === 'profile' && value && typeof value === 'object') {
      values.profile = {
        name: typeof value.name === 'string' ? value.name.slice(0, 60) : 'Guest',
        avatar: typeof value.avatar === 'string' && /^data:image\/(?:png|jpeg|webp|gif);base64,/.test(value.avatar)
          ? value.avatar
          : null,
      };
    }
  }
  return values;
}

let cachedRaw,
  cachedSettings;

export function getSettings() {
  let raw = null;
  try {
    raw = localStorage.getItem('app_settings');
  } catch { /* Storage is optional. */ }
  if (!cachedSettings || raw !== cachedRaw) {
    let saved;
    try {
      saved = JSON.parse(raw);
    } catch {
      saved = null;
    }
    cachedSettings = normalizeSettings(saved);
    cachedRaw = raw;
  }
  return cachedSettings;
}

export function defaultAnimeFormat(source) {
  const audio = getSettings().animeAudio;
  return Number(source) === 100 ? (audio === 'dub' ? 'dub' : 'sub') : (audio === 'sub' ? '0' : '1');
}

export function saveSetting(key, value) {
  const previous = read('app_settings', {});
  const stored = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
  const normalized = normalizeSettings({ ...stored, [key]: value });
  if (!(key in normalized)) throw new Error('Unknown preference');
  write('app_settings', { ...stored, [key]: normalized[key] });
}

export function resetSettings() {
  const previous = read('app_settings', {});
  write(
    'app_settings',
    {
      ...(previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {}),
      ...defaultSettings()
    }
  );
}

export function applyAppearance(settings, { dark = true, reduced = false } = {}, root = document.documentElement) {
  root.dataset.theme = settings.theme === 'system' ? (dark ? 'dark' : 'light') : settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.textSize = settings.textSize;
  root.dataset.navLabels = String(settings.navLabels);
  root.style.setProperty('--font-style1', `"${settings.font}", sans-serif`);
  root.style.setProperty('--site-font-weight', '400');
  root.dataset.showRatings = String(settings.showRatings);
  root.dataset.reduceTransparency = String(settings.reduceTransparency);
  root.dataset.hideSpoilers = String(settings.hideSpoilers);
  root.dataset.reducedMotion = String(settings.reducedMotion || reduced);
  root.dataset.carouselAuto = String(settings.carouselAuto && !settings.reducedMotion && !reduced);
  root.style.setProperty('--carousel-duration', `${settings.carouselInterval}s`);
}

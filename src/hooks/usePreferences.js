import { useMemo } from 'preact/hooks';
import { useStorage } from './useStorage.js';
import { read } from '../stores/storage.js';
import { normalizeSettings } from '../features/settings/preferences.js';

export function usePreferences() {
  const serialized = useStorage(() => JSON.stringify(read('app_settings', {})));
  return useMemo(() => normalizeSettings(JSON.parse(serialized)), [serialized]);
}

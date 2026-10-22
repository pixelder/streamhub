import { getSettings, applyAppearance } from './features/settings/preferences.js';
import { render } from 'preact';
import App from './app/App.jsx';
import { migrateStorage } from './stores/storage.js';
import { notify } from './stores/ui.js';

try {
  migrateStorage();
}
catch (error) {
  console.error('Could not migrate browser storage:', error);
  notify('Browser storage is unavailable. Existing saved data has not been cleared.');
}
applyAppearance(
  getSettings(),
  {
    dark: matchMedia('(prefers-color-scheme: dark)').matches,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches
  }
);
render(<App />, document.getElementById('app'));

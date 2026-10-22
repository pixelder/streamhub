import { OptionEditor, ImageEditor, BlocklistEditor, SourceEditor, SectionsEditor } from './SettingEditors.jsx';
import { useEffect, useRef, useState } from 'preact/hooks';
import { usePage } from '../../hooks/usePage.js';
import { usePreferences } from '../../hooks/usePreferences.js';
import { useStorage } from '../../hooks/useStorage.js';
import { SETTINGS_SCHEMA } from './schema.js';
import { getSettings, saveSetting, resetSettings } from './preferences.js';
import { storageSummary, clearActivity, forgetSources, clearCaches, checkConnections } from './actions.js';
import { downloadBackup, restoreBackup, eraseData } from '../library/actions.js';
import { confirmAction, notify } from '../../stores/ui.js';
import Icon from '../../components/common/Icon.jsx';
import './settings.css';

const sections = [
  'general',
  'appearance',
  'performance',
  'home',
  'browsing',
  'filters',
  'playback',
  'privacy',
  'network',
  'data'
];
const sectionDescriptions = {
  general: 'Set the name and profile photo shown on this device.',
  appearance: 'Choose the colors, text and navigation details that make Streamhub comfortable to use.',
  performance: 'Tune artwork quality for your connection. Each image type can use its own resolution.',
  home: 'Choose which collections appear on Home and how the featured titles behave.',
  browsing: 'Set the language for catalog details and the region used for streaming availability.',
  filters: 'Shape discovery results with rating, content, genre and title filters.',
  playback: 'Set defaults for supported players and choose how Streamhub remembers sources.',
  privacy: 'Control viewing activity and other choices saved in this browser.',
  network: 'Manage catalog refresh behavior and check whether connected services are reachable.',
  data: 'Back up your library or manage the information saved on this device.',
};
const panelGroups = {
  general: [['Your profile', ['profile']]],
  appearance: [
    ['Color & type', ['theme', 'accent', 'font', 'textSize']],
    [
      'Navigation & accessibility',
      ['navIcons', 'navLabels', 'showRatings', 'reduceTransparency', 'reducedMotion']
    ]
  ],
  performance: [['Artwork quality', ['imageQuality', 'imageResolutions']]],
  home: [
    ['Featured & recent', ['carouselAuto', 'carouselInterval', 'showContinueWatching']],
    [
      'Your collections',
      ['showTrendingMovies', 'showTrendingTV', 'showStreaming', 'homeProviders', 'homeSections']
    ]
  ],
  filters: [
    ['Content maturity', ['excludeAdult', 'hideMature', 'hideUnrated']],
    ['Ratings & votes', ['minRating', 'minVotes', 'lowVoteLanguages', 'lowVoteCount']],
    ['Languages & countries', ['filterLanguages', 'filterCountries']],
    ['Genres', ['movieGenres', 'excludedMovieGenres', 'tvGenres', 'excludedTVGenres']],
    ['Blocked titles & people', ['blacklist']]
  ],
  playback: [
    ['Player defaults', ['defaultSource', 'autoplay', 'rememberSource', 'animeAudio']],
    ['Custom source', ['customSource']]
  ],
  privacy: [
    ['Viewing activity', ['recordHistory']],
    ['Clear saved activity', ['clearHistory', 'resetSources']]
  ],
  network: [
    ['Data & refresh', ['cacheEnabled', 'sportsRefresh', 'clearCache']],
    ['Extraction defaults', ['extractorServer', 'movieSize', 'episodeSize']]
  ],
  data: [['Backups', ['exportData', 'importData']], ['Remove local data', ['clearData']]],
};

function panelsFor(section) {
  const definitions = panelGroups[section.key] || [[section.label, section.entries.map(([key]) => key)]];
  return definitions.map(
    ([title, keys]) => ({ title, entries: section.entries.filter(([key]) => keys.includes(key)) })
  ).filter(
    panel => panel.entries.length
  );
}

const accentColors = {
  original: '#ef4444',
  blue: '#3b82f6',
  violet: '#a78bfa',
  green: '#22a876',
  orange: '#f97316'
};
const label = option => typeof option === 'object' ? option.label : option[0].toUpperCase() + option.slice(1);

export default function Settings() {
  usePage('Settings | Pixelstream');
  const values = usePreferences();
  useStorage();
  const [group, setGroup] = useState('general'),
    [query, setQuery] = useState(''),
    [merge, setMerge] = useState(true);
  const [status, setStatus] = useState('All changes save automatically'),
    [error, setError] = useState(false);
  const [checking, setChecking] = useState(false),
    [connections, setConnections] = useState([]);
  const file = useRef(),
    avatar = useRef(),
    connection = useRef();
  useEffect(() => () => {
    connection.current?.abort();
    connection.current = null;
  }, []);
  const summary = storageSummary();
  const save = (key, value) => {
    try {
      saveSetting(key, value);
      if (key === 'imageQuality') saveSetting(
        'imageResolutions',
        {
          poster: 'auto',
          backdrop: 'auto',
          still: 'auto',
          profile: 'auto',
          logo: 'auto'
        }
      );
      setStatus('Preferences saved on this device');
      setError(false);
    }
    catch (error) {
      setStatus('Could not save. Check available browser storage.');
      setError(true);
      notify(error.message);
    }
  };
  const reset = async () => {
    if (!await confirmAction(
      {
        title: 'Restore default preferences?',
        message: 'Your profile and preferences will reset. Your library, bookmarks and viewing history will be kept.',
        accept: 'Restore defaults'
      }
    )) return;
    try {
      resetSettings();
      setStatus('Default preferences restored');
      setError(false);
    }
    catch (error) {
      notify(error.message);
    }
  };
  const action = async key => {
    try {
      if (key === 'exportData') return downloadBackup(false);
      if (key === 'importData') return file.current.click();
      if (key === 'clearData') return await eraseData();
      const actions = {
        clearHistory: [
          'Clear viewing activity?',
          'History and Continue Watching will be removed. Bookmarks stay.',
          clearActivity
        ],
        resetSources: [
          'Forget saved sources?',
          'All per-title source choices will be removed. Your default source stays.',
          forgetSources
        ],
        clearCache: [
          'Clear cached data?',
          'Catalog and sports data will be fetched again as needed. Your collection stays.',
          clearCaches
        ],
      };
      const [title, message, run] = actions[key];
      if (await confirmAction({
        title,
        message,
        accept: 'Continue'
      })) {
        run();
        notify('Done. Your changes have been applied.');
      }
    } catch (error) {
      notify(`Unable to complete this action: ${error.message}`);
    }
  };
  const diagnostics = async () => {
    connection.current?.abort();
    const controller = new AbortController();
    connection.current = controller;
    setChecking(true);
    setConnections([]);
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const results = await checkConnections(controller.signal);
      if (connection.current === controller) setConnections(results);
    } finally {
      clearTimeout(timer);
      if (connection.current === controller) setChecking(false);
    }
  };
  const uploadAvatar = event => {
    const selected = event.currentTarget.files[0];
    event.currentTarget.value = '';
    if (!selected) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(selected.type) || selected.size > 512 * 1024) return notify('Choose a PNG, JPEG, WebP or GIF image smaller than 512 KB.');
    const reader = new FileReader();
    reader.onerror = () => notify('Could not read that image.');
    reader.onload = () => save('profile', { ...getSettings().profile, avatar: reader.result });
    reader.readAsDataURL(selected);
  };
  const term = query.trim().toLowerCase();
  const groups = sections.filter(key => term || key === group).map(
    key => ({
      key,
      ...SETTINGS_SCHEMA[key],
      entries: Object.entries(SETTINGS_SCHEMA[key].settings).filter(
        ([, setting]) => !term || `${SETTINGS_SCHEMA[key].label} ${setting.label} ${setting.description}`.toLowerCase().includes(term)
      )
    })
  ).filter(
    section => section.entries.length
  );
  const renderControl = (key, setting) => {
    const controlId = `preference-${key}`;
    const accessibility = {
      id: controlId,
      'aria-labelledby': `${controlId}-label`,
      'aria-describedby': `${controlId}-description`
    };
    if (['languages', 'countries', 'movieGenres', 'tvGenres', 'providers'].includes(setting.type)) return <OptionEditor
      setting={setting}
      value={values[key]}
      save={value => save(key, value)}
      region={values.watchRegion}
    />;
    if (setting.type === 'imageConfig') return <ImageEditor values={values} save={value => save(key, value)} />;
    if (setting.type === 'blacklist') return <BlocklistEditor value={values[key]} save={value => save(key, value)} />;
    if (setting.type === 'sourceTemplate') return <SourceEditor value={values[key]} save={value => save(key, value)} />;
    if (setting.type === 'sections') return <SectionsEditor
      value={values[key]}
      save={value => save(key, value)}
      providers={values.homeProviders}
    />;
    if (setting.type === 'profile') return <div class="studio-profile-edit">
      <div class="studio-avatar">
        {values.profile.avatar
          ? <img src={values.profile.avatar} alt="" />
          : <span>{(values.profile.name || 'G').slice(0, 1).toUpperCase()}</span>}
      </div>
      <div>
        <label for={controlId}>Display name</label>
        <input
          {...accessibility}
          maxLength={60}
          value={values.profile.name}
          placeholder="Your name"
          onInput={event => save('profile', { ...values.profile, name: event.currentTarget.value })}
        />
        <small>PNG, JPG, WebP or GIF · Up to 512 KB</small>
        <div class="studio-button-row">
          <button onClick={() => avatar.current.click()}><Icon name="image" /> Change photo</button>
          {values.profile.avatar && <button onClick={() => save('profile', { ...values.profile, avatar: null })}>Remove</button>}
        </div>
      </div>
    </div>;
    if (key === 'theme') return <div
      class="studio-themes"
      role="group"
      aria-labelledby={`${controlId}-label`}
    >
      {setting.options.map(
        value => <button
          key={value}
          class={`studio-theme ${value}`}
          aria-pressed={values.theme === value}
          onClick={() => save(key, value)}
        >
          <span class="studio-theme-preview">
            <span />
            <span />
            <span />
          </span>
          <span><Icon name={value === 'dark' ? 'moon' : value === 'light' ? 'sun' : 'desktop'} /> {label(value)} {values.theme === value && <Icon name="circle-check" />}</span>
        </button>
      )}
    </div>;
    if (key === 'accent') return <div
      class="studio-swatches"
      role="group"
      aria-labelledby={`${controlId}-label`}
    >
      {setting.options.map(
        value => <button
          key={value}
          style={{ '--swatch': accentColors[value] }}
          aria-label={`${label(value)} accent`}
          title={label(value)}
          aria-pressed={values.accent === value}
          onClick={() => save(key, value)}
        >
          {values.accent === value && <Icon name="check" />}
        </button>
      )}
    </div>;
    if (setting.type === 'boolean') return <label class="studio-switch-hit">
      <input
        {...accessibility}
        class="studio-switch"
        type="checkbox"
        role="switch"
        checked={values[key]}
        onChange={event => save(key, event.currentTarget.checked)}
      />
    </label>;
    if (setting.type === 'number') return <div class="studio-stepper">
      <button
        aria-label={`Decrease ${setting.label}`}
        disabled={values[key] <= setting.min}
        onClick={() => save(key, values[key] - (setting.step || 1))}
      >−</button>
      <input
        {...accessibility}
        type="number"
        min={setting.min}
        max={setting.max}
        step={setting.step || 1}
        value={values[key]}
        onChange={event => {
          save(key, event.currentTarget.value);
          event.currentTarget.value = String(getSettings()[key]);
        }}
      />
      <button
        aria-label={`Increase ${setting.label}`}
        disabled={values[key] >= setting.max}
        onClick={() => save(key, values[key] + (setting.step || 1))}
      >+</button>
    </div>;
    if (setting.type === 'select') return <select
      {...accessibility}
      value={values[key]}
      onChange={event => save(key, event.currentTarget.value)}
    >
      {setting.options.map(
        option => {
          const value = typeof option === 'object' ? option.value : option;
          return <option key={value} value={value}>{label(option)}</option>;
        }
      )}
    </select>;
    return <button class={setting.danger ? 'studio-danger' : ''} onClick={() => action(key)}><i class={setting.button.icon} aria-hidden="true" /> {setting.button.label}</button>;
  };
  const chooseGroup = key => {
    setGroup(key);
    setQuery('');
  };
  const renderSetting = ([key, setting]) => {
    const wide = ['profile', 'theme'].includes(key) || !['select', 'number', 'boolean', 'action'].includes(setting.type);
    return <div
      class={`studio-setting ${wide ? 'studio-setting-wide' : ''} setting-type-${setting.type}`}
      key={key}
    >
      <div class="studio-setting-copy">
        <label
          id={`preference-${key}-label`}
          for={setting.type === 'action' || ['theme', 'accent'].includes(key) ? undefined : `preference-${key}`}
        >
          {setting.label}
        </label>
        <p id={`preference-${key}-description`}>{setting.description}</p>
        {key === 'importData' && <label class="studio-merge"><input
          type="checkbox"
          checked={merge}
          onChange={event => setMerge(event.currentTarget.checked)}
        /> Merge with existing data</label>}
      </div>
      <div class="studio-control">{renderControl(key, setting)}</div>
    </div>;
  };
  return <div id="settings-page" class="settings-studio">
    <header class="settings-heading">
      <div>
        <h1>Settings</h1>
        <p>Personalize your viewing experience.</p>
      </div>
      <label class="studio-search">
        <Icon name="magnifying-glass" />
        <input
          type="search"
          aria-label="Search all settings"
          value={query}
          placeholder="Search settings"
          onInput={event => setQuery(event.currentTarget.value)}
        />
      </label>
    </header>
    <div class="studio-body">
      <aside class="studio-sidebar">
        <nav aria-label="Settings categories">
          {[['Your experience', sections.slice(0, 7)], ['Device & data', sections.slice(7)]].map(
            ([title, keys]) => <div class="studio-nav-group" key={title}>
              <p class="studio-nav-title">{title}</p>
              {keys.map(
                key => <button
                  key={key}
                  aria-current={!term && group === key ? 'page' : undefined}
                  onClick={() => chooseGroup(key)}
                >
                  <i class={SETTINGS_SCHEMA[key].icon} aria-hidden="true" />
                  <span>{SETTINGS_SCHEMA[key].label}</span>
                  <Icon name="chevron-right" />
                </button>
              )}
            </div>
          )}
        </nav>
        <button class="studio-reset" onClick={reset}><Icon name="rotate-left" /> Reset preferences</button>
      </aside>
      <div class="studio-mobile-category">
        <label for="settings-category">Category</label>
        <select
          id="settings-category"
          value={term ? '' : group}
          onChange={event => chooseGroup(event.currentTarget.value)}
        >
          {term && <option value="" disabled>Search results</option>}
          {sections.map(key => <option value={key} key={key}>{SETTINGS_SCHEMA[key].label}</option>)}
        </select>
      </div>
      <div class="studio-content">
        <div class={`studio-save-status ${error ? 'error' : ''}`} role="status"><Icon name={error ? 'circle-exclamation' : 'circle-check'} /> {status}</div>
        {term && <div class="studio-results-heading">
          <h2>Search results</h2>
          <button onClick={() => setQuery('')}>Clear search</button>
        </div>}
        {groups.length
          ? groups.map(
            section => <section
              class="studio-section"
              key={section.key}
              aria-labelledby={`category-${section.key}`}
            >
              <header class="studio-section-heading">
                <h2 id={`category-${section.key}`}>{section.label}</h2>
                <p>{sectionDescriptions[section.key]}</p>
              </header>
              {panelsFor(section).map(
                panel => <div class="studio-panel" key={panel.title}>
                  <h3 class="studio-panel-title">{panel.title}</h3>
                  <div class="studio-card">{panel.entries.map(renderSetting)}</div>
                </div>
              )}
            </section>
          )
          : <div class="studio-empty">
            <Icon name="magnifying-glass" />
            <h2>No settings found</h2>
            <p>Try a different word, such as “language” or “history”.</p>
            <button onClick={() => setQuery('')}>Clear search</button>
          </div>}
        {group === 'data' && !term && <div class="studio-stats">
          {[
            [summary.bookmarks, 'Saved titles', 'bookmark'],
            [summary.history, 'History entries', 'clock-rotate-left'],
            [`${(summary.bytes / 1024).toFixed(0)} KB`, 'Local storage', 'database']
          ].map(
            ([value, title, icon]) => <div key={title}>
              <Icon name={icon} />
              <strong>{value}</strong>
              <span>{title}</span>
            </div>
          )}
        </div>}
        {group === 'network' && !term && <section class="studio-callout">
          <div>
            <h3>Connection check</h3>
            <p>Check access to the catalog and sports services. Individual streams and the extractor are not included.</p>
          </div>
          <button disabled={checking} onClick={diagnostics}>
            {checking ? 'Checking…' : 'Check connections'}
          </button>
          <ul aria-live="polite">
            {connections.map(
              result => <li key={result.name}>
                <Icon name={result.ok ? 'circle-check' : 'circle-exclamation'} />
                <strong>{result.name}</strong>
                <span>{result.ok ? 'Reachable' : 'Unavailable'} · {result.message}</span>
              </li>
            )}
          </ul>
        </section>}
        {group === 'playback' && !term && <section class="studio-callout">
          <Icon name="circle-info" />
          <div>
            <h3>Looking for subtitles or video quality?</h3>
            <p>Change resolution, subtitles, volume, playback speed and casting inside the player. Available controls depend on your source.</p>
          </div>
        </section>}
        <button class="studio-mobile-reset" onClick={reset}><Icon name="rotate-left" /> Reset preferences</button>
      </div>
    </div>
    <input
      type="file"
      hidden
      ref={file}
      accept=".json,application/json"
      onChange={event => {
        const selected = event.currentTarget.files[0];
        event.currentTarget.value = '';
        if (selected) void restoreBackup(selected, merge);
      }}
    />
    <input
      type="file"
      hidden
      ref={avatar}
      accept="image/png,image/jpeg,image/webp,image/gif"
      onChange={uploadAvatar}
    />
  </div>;
}

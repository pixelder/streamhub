import { initialProviders, fonts, imageKinds } from './catalogOptions.js';
import { providers } from '../watch/providers.js';

export const SETTINGS_SCHEMA = {
  general: {
    label: 'General',
    icon: 'fa-solid fa-user',
    settings: {
      profile: {
        label: 'Profile',
        description: 'Your name and avatar on this device.',
        type: 'profile',
        default: { name: 'Guest', avatar: null }
      },
    }
  },
  appearance: {
    label: 'Appearance',
    icon: 'fa-solid fa-palette',
    settings: {
      theme: {
        label: 'Theme',
        description: 'Apply a dark, light or device-matched color scheme.',
        type: 'select',
        options: ['dark', 'light', 'system'],
        default: 'dark'
      },
      accent: {
        label: 'Accent color',
        description: 'Highlight active controls and playback progress.',
        type: 'select',
        options: ['original', 'blue', 'violet', 'green', 'orange'],
        default: 'original'
      },
      textSize: {
        label: 'Text size',
        description: 'Scale the site’s text to suit your display.',
        type: 'select',
        options: ['normal', 'large', 'larger'],
        default: 'normal'
      },
      reducedMotion: {
        label: 'Reduced motion',
        description: 'Limit animations and automatic carousel movement. Device accessibility preferences are also respected.',
        type: 'boolean',
        default: false
      },
    }
  },
  home: {
    label: 'Home screen',
    icon: 'fa-solid fa-house',
    settings: {
      carouselAuto: {
        label: 'Rotate featured titles',
        description: 'Automatically move through the home carousel.',
        type: 'boolean',
        default: true
      },
      carouselInterval: {
        label: 'Slide duration',
        description: 'Seconds between featured titles (5–30).',
        type: 'number',
        min: 5,
        max: 30,
        default: 10
      },
      showContinueWatching: {
        label: 'Show Continue Watching',
        description: 'Display your progress on Home. Your library and history are kept when hidden.',
        type: 'boolean',
        default: true
      },
    }
  },
  playback: {
    label: 'Playback',
    icon: 'fa-solid fa-play',
    settings: {
      autoplay: {
        label: 'Open next episode automatically',
        description: 'Open the next episode at completion when the embedded player reports progress. Playback inside the embed depends on the provider.',
        type: 'boolean',
        default: true
      },
      defaultSource: {
        label: 'Default source',
        description: 'Used for titles without a saved source. Existing per-title choices take priority.',
        type: 'select',
        options: providers.filter(p => !p.hiddenOn).map(p => ({ value: Number(p.ds), label: p.name })),
        default: 1
      },
    }
  },
  data: {
    label: 'Data management',
    icon: 'fa-solid fa-database',
    settings: {
      exportData: {
        label: 'Export backup',
        description: 'Download your library, history and preferences as JSON.',
        type: 'action',
        button: { label: 'Export', icon: 'fa-solid fa-file-export' }
      },
      importData: {
        label: 'Import backup',
        description: 'Restore a backup, or merge it with existing data.',
        type: 'action',
        button: { label: 'Import', icon: 'fa-solid fa-file-import' }
      },
      clearData: {
        label: 'Clear library and preferences',
        description: 'Remove this site’s saved library, history and preferences after confirmation.',
        type: 'action',
        button: { label: 'Clear data', icon: 'fa-solid fa-trash' },
        danger: true
      },
    }
  },
};
// Every preference below is consumed by a feature or the global appearance layer.
Object.assign(
  SETTINGS_SCHEMA.appearance.settings,
  {
    showRatings: {
      label: 'Show ratings',
      description: 'Display rating badges on media cards.',
      type: 'boolean',
      default: true
    },
    reduceTransparency: {
      label: 'Solid navigation',
      description: 'Use solid navigation surfaces without background blur.',
      type: 'boolean',
      default: false
    },
    navIcons: {
      label: 'Desktop navigation icons',
      description: 'Show small icons beside the desktop navigation labels.',
      type: 'boolean',
      default: false
    },
    navLabels: {
      label: 'Mobile navigation labels',
      description: 'Show or hide the text labels below mobile navigation icons. Desktop links keep their labels.',
      type: 'boolean',
      default: true
    },
  }
);
Object.assign(
  SETTINGS_SCHEMA.home.settings,
  {
    showTrendingMovies: {
      label: 'Trending movies',
      description: 'Show the trending movie collection on Home.',
      type: 'boolean',
      default: true
    },
    showTrendingTV: {
      label: 'Trending series',
      description: 'Show the trending series collection on Home.',
      type: 'boolean',
      default: true
    },
    showStreaming: {
      label: 'Streaming collections',
      description: 'Show provider collections on Home.',
      type: 'boolean',
      default: true
    },
  }
);
SETTINGS_SCHEMA.browsing = {
  label: 'Browsing & language',
  icon: 'fa-solid fa-compass',
  settings: {
    metadataLanguage: {
      label: 'Title & description language',
      description: 'Request localized titles, descriptions and episode metadata. The interface stays in English; missing translations depend on the catalog.',
      type: 'select',
      options: [
        { value: 'en-US', label: 'English' },
        { value: 'hi-IN', label: 'Hindi' },
        { value: 'ta-IN', label: 'Tamil' },
        { value: 'te-IN', label: 'Telugu' },
        { value: 'ja-JP', label: 'Japanese' },
        { value: 'ko-KR', label: 'Korean' },
        { value: 'es-ES', label: 'Spanish' },
        { value: 'fr-FR', label: 'French' },
        { value: 'de-DE', label: 'German' }
      ],
      default: 'en-US'
    },
    watchRegion: {
      label: 'Streaming availability region',
      description: 'Region used for Home provider collections. This does not change embedded player availability.',
      type: 'select',
      options: [
        { value: 'US', label: 'United States' },
        { value: 'IN', label: 'India' },
        { value: 'GB', label: 'United Kingdom' },
        { value: 'CA', label: 'Canada' },
        { value: 'AU', label: 'Australia' },
        { value: 'DE', label: 'Germany' },
        { value: 'FR', label: 'France' },
        { value: 'JP', label: 'Japan' }
      ],
      default: 'US'
    },
    imageQuality: {
      label: 'Artwork quality',
      description: 'Data saver requests smaller catalog images. Streaming video quality is controlled inside each player.',
      type: 'select',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'saver', label: 'Data saver' }
      ],
      default: 'standard'
    },
    hideSpoilers: {
      label: 'Hide episode spoilers',
      description: 'Hide episode summaries and blur episode artwork. Episode numbers and titles remain visible.',
      type: 'boolean',
      default: false
    },
  }
};
Object.assign(
  SETTINGS_SCHEMA.playback.settings,
  {
    rememberSource: {
      label: 'Remember sources per title',
      description: 'Save and reuse the source you choose for each title. Turning this off keeps existing choices but uses your default.',
      type: 'boolean',
      default: true
    },
    animeAudio: {
      label: 'Anime audio preference',
      description: 'Start Anime and Anime2 sources with subtitled or dubbed audio when available.',
      type: 'select',
      options: [
        { value: 'provider', label: 'Provider default' },
        { value: 'sub', label: 'Subtitled' },
        { value: 'dub', label: 'Dubbed' }
      ],
      default: 'provider'
    },
  }
);
SETTINGS_SCHEMA.privacy = {
  label: 'History & privacy',
  icon: 'fa-solid fa-shield-halved',
  settings: {
    recordHistory: {
      label: 'Save viewing activity',
      description: 'Save new playback history and Continue Watching progress on this device. Existing history stays when disabled. This does not prevent provider tracking.',
      type: 'boolean',
      default: true
    },
    clearHistory: {
      label: 'Clear viewing activity',
      description: 'Remove history and Continue Watching while keeping bookmarks and preferences.',
      type: 'action',
      button: { label: 'Clear history', icon: 'fa-solid fa-clock-rotate-left' },
      danger: true
    },
    resetSources: {
      label: 'Forget saved sources',
      description: 'Remove all per-title source choices, including legacy choices. Your default source stays.',
      type: 'action',
      button: { label: 'Forget sources', icon: 'fa-solid fa-server' },
      danger: true
    },
  }
};
SETTINGS_SCHEMA.network = {
  label: 'Network & tools',
  icon: 'fa-solid fa-sliders',
  settings: {
    cacheEnabled: {
      label: 'Cache catalog & sports data',
      description: 'Reuse recent catalog responses and sports feeds. Turn off to fetch fresh data; images still use the browser cache.',
      type: 'boolean',
      default: true
    },
    sportsRefresh: {
      label: 'Sports feed refresh',
      description: 'Refresh live match listings automatically. This does not reload the selected player.',
      type: 'select',
      options: [
        { value: 0, label: 'On page open only' },
        { value: 1, label: 'Every minute' },
        { value: 5, label: 'Every 5 minutes' },
        { value: 15, label: 'Every 15 minutes' }
      ],
      default: 5
    },
    extractorServer: {
      label: 'Default extraction server',
      description: 'Preselect the server for new Tools requests. Requires the configured external extractor.',
      type: 'select',
      options: ['alpha', 'bravo'],
      default: 'alpha'
    },
    movieSize: {
      label: 'Movie size limit',
      description: 'Default maximum movie file size in GB for Tools requests (1–50).',
      type: 'number',
      min: 1,
      max: 50,
      default: 12
    },
    episodeSize: {
      label: 'Episode size limit',
      description: 'Default maximum episode file size in GB for Tools requests (1–20).',
      type: 'number',
      min: 1,
      max: 20,
      default: 4
    },
    clearCache: {
      label: 'Clear cached data',
      description: 'Clear this app’s catalog and sports caches. Library, preferences and browser image cache are kept.',
      type: 'action',
      button: { label: 'Clear cache', icon: 'fa-solid fa-broom' }
    },
  }
};
SETTINGS_SCHEMA.performance = {
  label: 'Images & data',
  icon: 'fa-solid fa-gauge-high',
  settings: {
    imageQuality: {
      label: 'Image preset',
      description: 'Choose a preset, then adjust individual image types below.',
      type: 'select',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'saver', label: 'Data saver' },
        { value: 'high', label: 'High resolution' }
      ],
      default: 'standard'
    },
    imageResolutions: {
      label: 'Image resolutions',
      description: 'Sizes are loaded from TMDB configuration. Previews use the selected resolution.',
      type: 'imageConfig',
      default: Object.fromEntries(imageKinds.map(kind => [kind, 'auto']))
    },
  }
};
delete SETTINGS_SCHEMA.browsing.settings.imageQuality;
Object.assign(
  SETTINGS_SCHEMA.appearance.settings,
  {
    font: {
      label: 'Font',
      description: 'Site font at weight 400. Loaded from Google Fonts.',
      type: 'select',
      options: fonts,
      default: 'Figtree'
    },
  }
);
Object.assign(
  SETTINGS_SCHEMA.home.settings,
  {
    homeProviders: {
      label: 'Streaming services',
      description: 'Choose the services shown in Home collections. Availability depends on the selected region.',
      type: 'providers',
      default: initialProviders
    },
    homeSections: {
      label: 'Custom sections',
      description: 'Create and reorder movie or TV collections. Global filters also apply.',
      type: 'sections',
      default: []
    },
  }
);
SETTINGS_SCHEMA.filters = {
  label: 'Content filters',
  icon: 'fa-solid fa-filter',
  settings: {
    excludeAdult: {
      label: 'Exclude adult-flagged titles',
      description: 'Uses TMDB’s adult flag. This flag does not cover all R-rated or 18+ titles.',
      type: 'boolean',
      default: true
    },
    hideMature: {
      label: 'Exclude R / 18+ titles',
      description: 'Checks US R, NC-17 and TV-MA plus explicit 18+ ratings. Adds rating lookups; unrated titles follow the option below.',
      type: 'boolean',
      default: false
    },
    hideUnrated: {
      label: 'Exclude unrated titles',
      description: 'When maturity filtering is enabled, hide titles without a usable certification or whose certification cannot be loaded.',
      type: 'boolean',
      default: false
    },
    minRating: {
      label: 'Minimum rating',
      description: 'Applies to catalog lists and discovery. Saved library records are retained.',
      type: 'number',
      min: 0,
      max: 10,
      step: 0.1,
      default: 5
    },
    minVotes: {
      label: 'Minimum vote count',
      description: 'Default: 200. Applies to discovery, trending and search results.',
      type: 'number',
      min: 0,
      max: 100000,
      default: 200
    },
    lowVoteLanguages: {
      label: 'Languages with a lower vote threshold',
      description: 'Choose languages for smaller catalogs. No language is classified automatically.',
      type: 'languages',
      default: []
    },
    lowVoteCount: {
      label: 'Lower vote threshold',
      description: 'Used only for the languages selected above.',
      type: 'number',
      min: 0,
      max: 100000,
      default: 20
    },
    filterLanguages: {
      label: 'Original languages',
      description: 'Include any selected language. An empty selection removes this filter.',
      type: 'languages',
      default: []
    },
    filterCountries: {
      label: 'Origin countries',
      description: 'Include any selected country. An empty selection removes this filter.',
      type: 'countries',
      default: []
    },
    movieGenres: {
      label: 'Movie genres — include',
      description: 'Include any selected genre.',
      type: 'movieGenres',
      default: []
    },
    excludedMovieGenres: {
      label: 'Movie genres — exclude',
      description: 'Excluded genres take priority.',
      type: 'movieGenres',
      default: []
    },
    tvGenres: {
      label: 'TV genres — include',
      description: 'Include any selected genre.',
      type: 'tvGenres',
      default: []
    },
    excludedTVGenres: {
      label: 'TV genres — exclude',
      description: 'Excluded genres take priority.',
      type: 'tvGenres',
      default: []
    },
    blacklist: {
      label: 'Blocked TMDB IDs',
      description: 'Hide matching titles or people and block direct details/playback. Existing saved records are kept.',
      type: 'blacklist',
      default: [
        { type: 'movie', id: 11845 }
      ]
    },
  }
};
SETTINGS_SCHEMA.playback.settings.customSource = {
  label: 'Custom player URL',
  description: 'HTTPS embed template. Supported placeholders: {type}, {id}, {season}, {episode}. Choose Custom in the player menu after saving.',
  type: 'sourceTemplate',
  default: ''
};
export const settingEntries = Object.values(SETTINGS_SCHEMA).flatMap(group => Object.entries(group.settings));
export const defaultSettings = () => Object.fromEntries(
  settingEntries.filter(([, setting]) => setting.type !== 'action').map(
    ([key, setting]) => [key, structuredClone(setting.default)]
  )
);

const SETTINGS_SCHEMA = {
  general: {
    label: "General",
    icon: "fa-solid fa-gear",
    settings: {
      profile: {
        label: "Profile",
        description: "Manage your profile identity",
        type: "profile",
        default: {
          name: "Guest",
          avatar: null
        },
        icon: "fa-solid fa-circle-user"
      }
    }
  },
  appearance: {
    label: "Appearance",
    icon: "fa-solid fa-palette",
    settings: {
      theme: {
        label: "Theme",
        description: "Choose light or dark mode",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
        icon: "fa-solid fa-circle-half-stroke"
      }
    }
  },

  playback: {
    label: "Playback",
    icon: "fa-solid fa-play",
    settings: {
      autoplay: {
        label: "Autoplay",
        description: "Automatically play next content",
        type: "boolean",
        default: true,
        icon: "fa-solid fa-forward"
      },

      defaultSource: {
        label: "Default Source",
        description: "Preferred streaming source",
        type: "number",
        default: 1,
        min: 1,
        max: 10,
        icon: "fa-solid fa-server"
      }
    }
  },

  data: {
    label: "Data Management",
    icon: "fa-solid fa-database",
    settings: {
      exportData: {
        label: "Export Backup",
        description: "Download all your data as a JSON file",
        type: "action",
        button: {
          label: "",
          icon: "fa-solid fa-file-export",
          id: 'export'
        },
      },

      importData: {
        label: "Import Backup",
        description: "Restore or merge a backup file",
        type: "action",
        button: {
          label: "",
          icon: "fa-solid fa-file-import",
          id: 'import'
        },
      },

      clearData: {
        label: "Clear All Data",
        description: "Erase all stored data permanently",
        type: "action",
        button: {
          label: "",
          icon: "fa-solid fa-trash",
          id: 'clear-all'
        },
        danger: true
      }
    }
  }
};
const SETTINGS_KEY = 'app_settings';

const Settings = (() => {
  let cache = null;

  function load() {
  if (cache) return { ...cache };

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    cache = applyDefaults(parsed);
  } catch {
    cache = applyDefaults({});
  }

  return { ...cache };
}

  function getFlatSchema() {
  const flat = {};

  Object.values(SETTINGS_SCHEMA).forEach(group => {
    Object.entries(group.settings).forEach(([key, config]) => {
      flat[key] = config;
    });
  });

  return flat;
}

  function applyDefaults(data) {
  const result = {};
  const flatSchema = getFlatSchema();

  for (const key in flatSchema) {
    const schema = flatSchema[key];

    result[key] =
      data[key] !== undefined
        ? data[key]
        : schema.default;
  }

  return result;
}

  function save() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(cache));
  }

  return {
    get(key) {
      const data = load();
      return data[key];
    },

    set(key, value) {
  const flatSchema = getFlatSchema();
  const schema = flatSchema[key];

  if (!schema) {
    console.warn(`Unknown setting: ${key}`);
    return;
  }

  if (
    (schema.type === 'number' && typeof value !== 'number') ||
    (schema.type === 'boolean' && typeof value !== 'boolean') ||
    ((schema.type === 'select' || schema.type === 'string') && typeof value !== 'string') ||
    (schema.type === 'profile' && typeof value !== 'object')
  ) {
    console.warn(`Invalid type for ${key}`, value);
    return;
  }

  const data = load();
  data[key] = value;

  cache = data; // 🔥 IMPORTANT (sync cache)
  save();

  console.log(`Saved setting: ${key} =`, value); // debug
},

    getAll() {
      return load();
    },

    reset() {
      cache = applyDefaults({});
      save();
    }
  };
})();

function generateSettingsMenu(onSelect) {
  const menu = document.getElementById('settings-menu');
  menu.innerHTML = '';

  Object.entries(SETTINGS_SCHEMA).forEach(([key, group], i) => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    if (i === 0) item.classList.add('active');

    item.innerHTML = `
      <i class="${group.icon}"></i>
      <span>${group.label}</span>
    `;

    item.onclick = () => {
      document.querySelectorAll('.menu-item')
        .forEach(el => el.classList.remove('active'));

      item.classList.add('active');
      onSelect(key);
    };

    menu.appendChild(item);
  });
}

function generateSettingsUI(containerId) {
  const container = document.getElementById(containerId);
  const settings = Settings.getAll();
  const searchInput = document.getElementById('settings-search');

  let currentGroup = Object.keys(SETTINGS_SCHEMA)[0];

  function render(groupKey, filter = '') {
    container.innerHTML = '';

    const group = SETTINGS_SCHEMA[groupKey];

    // const groupTitle = document.createElement('h2');
    // groupTitle.innerHTML = `<i class="${group.icon}"></i> ${group.label}`;
    // container.appendChild(groupTitle);

    Object.entries(group.settings).forEach(([key, config]) => {
      const searchText =
        `${config.label || ''} ${config.description || ''}`.toLowerCase();

      if (!searchText.includes(filter.toLowerCase())) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'setting-item';

      // 🔹 LEFT SIDE (label + optional extra UI)
      const left = document.createElement('div');

      const label = document.createElement('div');
      label.className = 'setting-label';
      label.innerHTML = `
        ${config.icon ? `<i class="${config.icon}"></i>` : ''}
        <div>
          <div class="title">${config.label}</div>
          <div class="desc">${config.description}</div>
        </div>
      `;

      left.appendChild(label);

      // 🔥 RESTORE merge checkbox UI (important)
      if (key === 'importData') {
        const mergeWrap = document.createElement('label');
        mergeWrap.className = 'merge-option';

        mergeWrap.innerHTML = `
          <input type="checkbox" id="merge-option" checked>
          Merge with existing data
        `;

        left.appendChild(mergeWrap);
      }

      // 🔹 RIGHT SIDE (input/button)
      let input;

      switch (config.type) {
        case 'boolean':
          input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = settings[key];
          break;

        case 'select':
          input = document.createElement('select');
          config.options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === settings[key]) option.selected = true;
            input.appendChild(option);
          });
          break;

        case 'number':
          input = document.createElement('input');
          input.type = 'number';
          input.value = settings[key];
          if (config.min !== undefined) input.min = config.min;
          if (config.max !== undefined) input.max = config.max;
          break;

        case 'action':
          input = document.createElement('button');

          // 🔥 RESTORE original button behavior + styles
          input.className = config.danger ? 'danger-btn' : 'action-btn';
          input.id = `${config.button.id}-${key}`;

          input.innerHTML = `
            <i class="${config.button.icon}"></i>
            ${config.button.label ?? ''}
          `;

          input.onclick = async () => {
            switch (key) {

              case 'exportData':
                DataManager.export();
                break;

              case 'importData':
                const checkbox = wrapper.querySelector('#merge-option');
                const mergeEnabled = checkbox?.checked ?? true;
                handleImportUI(mergeEnabled);
                break;

              case 'clearData':
                const confirmed = await getConfirm({
                  message: "This will erase all your data.",
                  success: {
                    title: 'Removed!',
                    message: 'All data erased successfully.'
                  },
                  decline: {
                    title: 'Canceled!',
                    message: 'Data not erased.'
                  }
                });

                if (!confirmed) return;

                await DataManager.clear();
                location.reload();
                break;
            }
          };
          break;

        case 'profile':
          input = document.createElement('div');
          input.className = 'profile-setting';

          const profile = settings[key] || config.default;

          input.innerHTML = `
            <div class="profile-row">
              <img 
                src="${profile.avatar || 'https://via.placeholder.com/40'}" 
                class="avatar"
              />
              <input 
                type="text" 
                class="profile-name"
                value="${profile.name}"
                placeholder="Enter name"
              />
              <button class="avatar-upload">
                <i class="fa-solid fa-image"></i>
              </button>
            </div>
          `;

          const nameInput = input.querySelector('.profile-name');
          const uploadBtn = input.querySelector('.avatar-upload');
          const avatarImg = input.querySelector('.avatar');

          // 🔥 Name update
          nameInput.addEventListener('input', () => {
            Settings.set(key, {
              ...profile,
              name: nameInput.value
            });
          });

          // 🔥 Avatar upload
          uploadBtn.onclick = () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';

            fileInput.onchange = () => {
              const file = fileInput.files[0];
              if (!file) return;

              const reader = new FileReader();
              reader.onload = () => {
                const newProfile = {
                  ...profile,
                  avatar: reader.result
                };

                avatarImg.src = reader.result;
                Settings.set(key, newProfile);
              };

              reader.readAsDataURL(file);
            };

            fileInput.click();
          };

          break;

        default:
          input = document.createElement('input');
          input.type = 'text';
          input.value = settings[key];
      }

      // 🔥 Keep settings saving logic intact
      if (config.type !== 'action') {
        input.addEventListener('change', () => {
          let value;

          if (config.type === 'boolean') value = input.checked;
          else if (config.type === 'number') value = Number(input.value);
          else value = input.value;

          Settings.set(key, value);
        });
      }

      wrapper.appendChild(left);
      wrapper.appendChild(input);

      container.appendChild(wrapper);
    });
  }

  // 🔥 Connect menu + content
  generateSettingsMenu((groupKey) => {
    currentGroup = groupKey;
    render(groupKey, searchInput.value);
  });

  searchInput.oninput = (e) => {
    render(currentGroup, e.target.value);
  };

  render(currentGroup);
}

document.getElementById('reset-settings').onclick = () => {
  Settings.reset();
  generateSettingsUI('settings-panel');
};

const DataManager = {
  export() {
    const data = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!allowedKeys.has(key)) continue;

      try {
        data[key] = JSON.parse(localStorage.getItem(key));
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const a = document.createElement('a');

    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('') +
    '-' +
    [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('');

    const filename = `PixelStream-backup-${timestamp}.json`;

    const url = URL.createObjectURL(blob);

    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  },

  async import(file, mergeEnabled) {
    const text = await file.text();
    const data = JSON.parse(text);

    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid backup file');
    }

    if (!mergeEnabled) {
      localStorage.clear();
    }

    Object.entries(data).forEach(([key, value]) => {
      if (!allowedKeys.has(key)) return;

      let finalValue = value;

      if (mergeEnabled) {
        const existing = localStorage.getItem(key);

        if (existing) {
          try {
            const parsedExisting = JSON.parse(existing);

            if (Array.isArray(parsedExisting) && Array.isArray(value)) {
              switch (key) {
                case 'watching':
                  finalValue = mergeByKey(parsedExisting, value,
                    item => `${item?.id}-${item?.mediaType}-${item?.data?.sno}-${item?.data?.eno}`);
                  break;

                case 'bookmarks':
                  finalValue = mergeByKey(parsedExisting, value,
                    item => `${item.id}-${item.mediaType}`);
                  break;

                case 'DEF_SRC':
                  finalValue = mergeByKey(parsedExisting, value,
                    item => item.id);
                  break;

                case 'history':
                  finalValue = mergeByKey(parsedExisting, value,
                    item => item?.index ?? Math.random());
                  break;
              }
            }
          } catch {}
        }
      }

      localStorage.setItem(
        key,
        typeof finalValue === 'string'
          ? finalValue
          : JSON.stringify(finalValue)
      );
    });
  },

  async clear() {
    localStorage.clear();
  }
};

function handleImportUI(mergeEnabled = true) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';

  fileInput.onchange = async (e) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid backup file');
      }

    const confirmed = await getConfirm({
      title: "Import this backup!",
      message: mergeEnabled
        ? "This will merge backup data with your existing data."
        : "This will remove your existing data and replace it with the backup file.",
      success: {
        title: "Backup Restored!",
        message: `Successfully ${mergeEnabled ? 'merged' : 'restored'} backup from ${file.name}.`
      },
      decline: {
        title: "Cancelled!",
        message: "Backup not applied."
      },
      acpt_btn: {
        text: "Import",
        icon: `<i class="fa-solid fa-download"></i>&nbsp;`
      },
      exitInterval: 2000
    });

    if (!confirmed) return;

    await DataManager.import(file, mergeEnabled);
    location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  fileInput.click();
}
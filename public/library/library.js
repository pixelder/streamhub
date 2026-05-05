const API_KEY = "213d830aae3a2f7b67e37f157405a42e";
const BASE_URL = 'https://api.tmdb.org/3';
const IMAGE_300 = 'https://image.tmdb.org/t/p/w300';
const IMAGE_342 = 'https://image.tmdb.org/t/p/w342';
const IMAGE_500 = 'https://image.tmdb.org/t/p/w500';
const IMAGE_ORG = 'https://image.tmdb.org/t/p/original'
const OPTIONS = 'include_adult=false&include_null_first_air_dates=false&language=en-US';

let isBrowsing = false;

async function loadLibrary() {
  loadUserContent('bookmarks','bookmarks')
  loadUserContent('history', 'history')
  loadUserContent('continue-watching', 'watching')
  setUpExpandableSection()
}

window.onload = function() {
  fixLog()
  loadLibrary()
  topNavBar()
  bottomNavBar()
  setActiveIcon('library')
  setUpScrollEvents()
  setUpLibraryControl()
}

function exportBackup() {
  const data = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);

    try {
      data[key] = JSON.parse(value);
    } catch {
      data[key] = value;
    }
  }

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

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function mergeByKey(existing = [], incoming = [], getKey) {
  const map = new Map();

  [...existing, ...incoming].forEach(item => {
    map.set(getKey(item), item);
  });

  return [...map.values()];
}

function importBackup() {
  const fileInput = document.getElementById('import-file');
  const mergeEnabled = document.getElementById('merge-option').checked;

  fileInput.click();

  fileInput.onchange = null;
  fileInput.onchange = async (event) => {
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
                    finalValue = mergeByKey(
                      parsedExisting,
                      value,
                      item =>
                        `${item?.id ?? ''}-${item?.mediaType ?? ''}-${item?.data?.sno ?? ''}-${item?.data?.eno ?? ''}`
                    );
                    break;

                  case 'bookmarks':
                    finalValue = mergeByKey(
                      parsedExisting,
                      value,
                      item => `${item.id}-${item.mediaType}`
                    );
                    break;

                  case 'DEF_SRC':
                    finalValue = mergeByKey(
                      parsedExisting,
                      value,
                      item => item.id
                    );
                    break;

                  case 'history':
                    finalValue = mergeByKey(
                      parsedExisting,
                      value,
                      item => item?.index ?? Math.random()
                    );
                    break;

                  default:
                    finalValue = [...parsedExisting, ...value];
                }
              }
            } catch (e) {
              console.error(e);
            }
          }
        }

        localStorage.setItem(
          key,
          typeof finalValue === 'string'
            ? finalValue
            : JSON.stringify(finalValue)
        );
      });

      console.log('Backup imported successfully!');
      setTimeout(() => {
        location.reload();
      }, 1000);

    } catch (error) {
      console.error('Failed to import backup file.', error);
    }

    fileInput.value = '';
  };
}

function setUpLibraryControl() {
  const panel = document.querySelector('.control-modal');
  const panel_btn = document.getElementById('control-menu-button');
  const exp = document.getElementById('export');
  const imp = document.getElementById('import');
  const clear_btn = document.getElementById('clear-all')
  
  panel_btn.onclick = () => {
    panel.classList.toggle('show')
    panel.toggleAttribute('active')
    console.log('showing panel')
  }

  exp.onclick = exportBackup

  imp.onclick = importBackup

  clear_btn.onclick = async () => {
    const confirmed = await getConfirm({
      message: "This will erase all your data.",
      success: {title : 'Removed!', message : 'All data erased successfully.'},
      decline: {title : 'Canceled!', message : 'Data not erased. '},
      exitInterval: 2000
    })

    if (!confirmed) return

    localStorage.clear()
    setTimeout(() => {
      location.reload();
    }, 1000);
  }

  document.body.onclick = (e) => {
    
    if (e.target.closest('.control-modal') || e.target.closest('#control-menu-button')) return
    console.log(e.target.classList.contains('.control-modal'))
    panel.classList.remove('show')
    panel.removeAttribute('active')
  }
}
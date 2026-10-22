import { saveLog, removeLog, exportData, importData, validateBackup, clearData } from '../../stores/storage.js';
import { nextEpisode } from '../../services/api.js';
import { confirmAction, notify } from '../../stores/ui.js';

export async function markRecord(record, watched, logType) {
  const { id, mediaType, data = {} } = record;
  const { sno, eno } = data;
  if (watched) {
    saveLog('history', {
      id,
      mediaType,
      sno,
      eno,
      progress: 100
    });
    removeLog('watching', mediaType, id, sno, eno);
    if (logType === 'watching' && mediaType === 'tv') {
      try {
        const next = await nextEpisode(id, sno, eno);
        if (next)
          saveLog('watching', {
            id,
            mediaType,
            sno: next.season_number,
            eno: next.episode_number
          });
      }
      catch (e) {
        notify(e.message);
      }
    }
  }
  else {
    removeLog('history', mediaType, id, sno, eno);
    if (logType === 'watching')
      saveLog('watching', {
        id,
        mediaType,
        sno,
        eno,
        progress: 0
      });
  }
}

export function downloadBackup(all = true) {
  const now = new Date(),
    pad = n => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(exportData(all), null, 2)], { type: 'application/json' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `PixelStream-backup-${timestamp}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function restoreBackup(file, merge) {
  try {
    const data = validateBackup(JSON.parse(await file.text()));
    if (await confirmAction(
      {
        title: 'Import this backup!',
        message: merge
          ? 'This will merge backup data with your existing data.'
          : 'This will replace your saved library and settings with the backup file.',
        accept: 'Import'
      }
    )) {
      importData(data, merge);
      notify('Backup restored successfully.');
    }
  }
  catch (e) {
    notify(`Failed to import backup: ${e.message}`);
  }
}

export async function eraseData() {
  if (await confirmAction({ message: 'This will erase your saved library and preferences.' })) {
    clearData();
    notify('Data erased successfully.');
  }
}

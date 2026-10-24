import { useRef, useState } from 'preact/hooks';
import { downloadBackup, restoreBackup, eraseData } from '../library/actions.js';
import { notify } from '../../stores/ui.js';
import Icon from '../../components/common/Icon.jsx';

export default function BackupControls() {
  const [merge, setMerge] = useState(true);
  const file = useRef();
  return <details class="profile-backups">
    <summary><Icon name="database" /><span>Manage saved data<small>Back up, restore or remove this profile’s data</small></span><Icon name="chevron-down" /></summary>
    <div class="profile-backup-content">
      <p class="profile-note">A backup includes only the current profile: its name, photo, watchlist, viewing history, ratings, collections and preferences.</p>
      <div class="profile-backup-actions">
        <button class="profile-button" onClick={() => { try { downloadBackup(); } catch (error) { notify(error.message); } }}><Icon name="file-export" />Export backup</button>
        <button class="profile-button" onClick={() => file.current.click()}><Icon name="file-import" />Import backup</button>
      </div>
      <label class="profile-merge"><input type="checkbox" checked={merge} onChange={event => setMerge(event.currentTarget.checked)} />Merge imports with existing data</label>
      <button class="profile-text-button profile-danger" onClick={eraseData}><Icon name="trash-can" />Erase saved data</button>
      <input type="file" hidden ref={file} accept=".json,application/json" onChange={event => {
        const selected = event.currentTarget.files[0];
        event.currentTarget.value = '';
        if (selected) void restoreBackup(selected, merge);
      }} />
    </div>
  </details>;
}

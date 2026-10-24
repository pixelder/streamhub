import { useState } from 'preact/hooks';
import { useStorage } from '../../hooks/useStorage.js';
import { confirmAction, notify } from '../../stores/ui.js';
import { createProfile, deleteProfile, listProfiles, switchProfile } from './profiles.js';
import ProfileEditor from './ProfileEditor.jsx';
import Icon from '../../components/common/Icon.jsx';

export default function ProfileSwitcher() {
  useStorage();
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  let profiles;
  try { profiles = listProfiles(); }
  catch { return <p role="alert" class="profile-data-error">Profiles could not be read. Check browser storage access before adding or switching profiles.</p>; }
  const remove = async profile => {
    if (!await confirmAction({
      title: `Delete ${profile.name}?`,
      message: 'This permanently removes this profile’s watchlist, history, ratings, collections and preferences from this browser. Export a backup first if you want to keep them.',
      accept: 'Delete profile'
    })) return;
    try { deleteProfile(profile.id); notify('Profile deleted.'); }
    catch (error) { notify(error.message); }
  };
  return <div class="profile-switcher">
    <div class="profile-switcher-heading"><h2>{profiles.length > 1 ? 'Switch profile' : 'Make room for everyone'}</h2>{profiles.length > 1 && <button class="profile-manage-button" aria-pressed={managing} onClick={() => setManaging(value => !value)}>{managing ? 'Done' : 'Manage'}</button>}</div>
    {profiles.length === 1 && <p class="profile-note">Give everyone their own watchlist and history.</p>}
    <div class="profile-picker" aria-label="Choose a profile">
      {profiles.length > 1 && profiles.map(profile => <div class={`profile-choice ${profile.active ? 'is-active' : ''}`} key={profile.id}>
        <button class="profile-choice-select" aria-pressed={profile.active} onClick={() => {
          if (profile.active) return;
          try { switchProfile(profile.id); notify(`Switched to ${profile.name}.`); }
          catch (error) { notify(error.message); }
        }}>
          <span class="profile-choice-avatar">{profile.avatar ? <img src={profile.avatar} alt="" /> : profile.name.slice(0, 1).toUpperCase()}</span>
          <span class="profile-choice-name">{profile.name}</span>
          {profile.active && <Icon name="check" />}
        </button>
        {managing && <button class="profile-choice-delete" disabled={profiles.length < 2} title={profiles.length < 2 ? 'Keep at least one profile' : `Delete ${profile.name}`} aria-label={`Delete ${profile.name}`} onClick={() => remove(profile)}><Icon name="trash-can" /></button>}
      </div>)}
      <button class="profile-add-choice" onClick={() => setCreating(true)}><Icon name="plus" />Add profile</button>
    </div>
    {managing && <p class="profile-note profile-switch-note">Deleting a profile removes its saved data. Switching stops playback.</p>}
    {creating && <ProfileEditor creating profile={{ name: '', avatar: null }} onSave={createProfile} close={() => setCreating(false)} />}
  </div>;
}

import { useEffect, useRef, useState } from 'preact/hooks';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { saveSetting } from '../settings/preferences.js';
import { notify } from '../../stores/ui.js';
import Icon from '../../components/common/Icon.jsx';

export default function ProfileEditor({ profile, close, onSave, creating = false }) {
  const [draft, setDraft] = useState(() => ({ ...profile }));
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const dialog = useRef(), file = useRef(), reader = useRef();
  useFocusTrap(dialog, true, close);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
  useEffect(() => () => {
    if (reader.current) {
      reader.current.onload = reader.current.onerror = null;
      reader.current.abort();
    }
  }, []);
  const choosePhoto = event => {
    const photo = event.currentTarget.files[0];
    event.currentTarget.value = '';
    if (!photo) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(photo.type) || photo.size > 512 * 1024) {
      setError('Choose a PNG, JPG, WebP or GIF image up to 512 KB.');
      return;
    }
    reader.current?.abort();
    const task = new FileReader();
    reader.current = task;
    setReading(true);
    setError('');
    task.onload = () => { setDraft(current => ({ ...current, avatar: task.result })); setReading(false); };
    task.onerror = () => { setError('Could not read this photo. Try another image.'); setReading(false); };
    task.readAsDataURL(photo);
  };
  return <div class="profile-editor-backdrop" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <form class="profile-editor" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="profile-editor-title" onSubmit={event => {
      event.preventDefault();
      try {
        if (creating && !draft.name.trim()) throw new Error('Enter a name for this profile.');
        const identity = { ...draft, name: draft.name.trim() || 'Guest' };
        if (onSave) onSave(identity); else saveSetting('profile', identity);
        notify(creating ? 'Profile created.' : 'Profile updated.');
        close();
      } catch (failure) { setError(failure.message); }
    }}>
      <div class="profile-editor-heading"><h2 id="profile-editor-title">{creating ? 'Add profile' : 'Edit profile'}</h2><button type="button" class="profile-icon-button" aria-label="Close profile editor" onClick={close}><Icon name="xmark" /></button></div>
      <div class="profile-photo-editor">
        <div class="profile-avatar">{draft.avatar ? <img src={draft.avatar} alt="Profile preview" /> : <span>{(draft.name || 'G').slice(0, 1).toUpperCase()}</span>}</div>
        <div><button type="button" class="profile-button" disabled={reading} onClick={() => file.current.click()}>{reading ? 'Reading photo…' : 'Change photo'}</button>
          {draft.avatar && <button type="button" class="profile-text-button" disabled={reading} onClick={() => setDraft(current => ({ ...current, avatar: null }))}>Remove photo</button>}
        </div>
      </div>
      <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={choosePhoto} />
      <label class="profile-name-field">Display name<input maxLength="60" value={draft.name} autoComplete="nickname" onInput={event => setDraft(current => ({ ...current, name: event.currentTarget.value }))} /></label>
      <p class="profile-note">Your name and photo are saved on this device. Photos can be up to 512 KB.</p>
      {error && <p role="alert">{error}</p>}
      <div class="profile-editor-actions"><button type="button" class="profile-button" onClick={close}>Cancel</button><button type="submit" class="profile-button profile-primary" disabled={reading}>{creating ? 'Create profile' : 'Save profile'}</button></div>
    </form>
  </div>;
}

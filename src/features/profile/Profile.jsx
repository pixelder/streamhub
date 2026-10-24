import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { usePage } from '../../hooks/usePage.js';
import { usePreferences } from '../../hooks/usePreferences.js';
import { useStorage } from '../../hooks/useStorage.js';
import { logs } from '../../stores/storage.js';
import { navigate } from '../../app/navigation.js';
import { personalSnapshot } from '../personal/store.js';
import PersonalLibrary from '../personal/PersonalLibrary.jsx';
import ProfileSwitcher from './ProfileSwitcher.jsx';
import ProfileEditor from './ProfileEditor.jsx';
import LibraryPanel from './LibraryPanel.jsx';
import BackupControls from './BackupControls.jsx';
import { profileView } from './links.js';
import Icon from '../../components/common/Icon.jsx';
import './profile.css';

export default function Profile() {
  usePage('Profile | Pixelstream');
  useStorage();
  const { profile } = usePreferences();
  const { url } = useLocation();
  const [editing, setEditing] = useState(false);
  // Hash-only shared links can change without a router path change.
  const [, refreshHash] = useState(0);
  useEffect(() => {
    const update = () => refreshHash(value => value + 1);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const { journal, lists, error } = personalSnapshot();
  const current = new URL(url, location.origin);
  const view = profileView(current.search, location.hash);
  const saved = logs('bookmarks').length;
  const stats = [
    [saved, 'Saved titles', '/profile?view=library#bookmarks'],
    [journal.filter(item => item.status === 'watched').length, 'Finished', '/profile?view=tracking'],
    [journal.filter(item => item.rating > 0).length, 'Rated', '/profile?view=tracking'],
    [lists.length, 'Collections', '/profile?view=collections']
  ];
  return <div id="profile-page">
    <header class="profile-header">
      <div class="profile-header-top"><p class="profile-eyebrow">Profile</p><a href="/settings" class="profile-icon-button" aria-label="Open settings" title="Settings"><Icon name="gear" /></a></div>
      <div class="profile-header-main">
      <div class="profile-identity">
        <div class="profile-avatar">{profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{(profile.name || 'G').slice(0, 1).toUpperCase()}</span>}</div>
        <div class="profile-intro"><h1>{profile.name || 'Guest'}</h1><p class="profile-note">Your movies, shows and collections.</p><button class="profile-edit-button" onClick={() => setEditing(true)}><Icon name="pen" />Edit profile</button></div>
      </div>
      <ProfileSwitcher />
      </div>
      <div class="profile-stats" aria-label="Your activity">{stats.map(([count, label, href]) => <a key={label} href={href}><strong>{count}</strong><span>{label}</span></a>)}</div>
    </header>
    <nav class="profile-tabs" aria-label="Profile sections">
      {[['library', 'Library'], ['tracking', 'Tracking'], ['collections', 'Collections']].map(([key, label]) => <a key={key} href={`/profile?view=${key}`} aria-current={view === key ? 'page' : undefined}>{label}</a>)}
    </nav>
    {error && <p class="profile-data-error" role="alert">{error}</p>}
    <div class="profile-content">
      {view === 'library' ? <LibraryPanel /> : <>
        <div class="profile-content-heading"><h2>{view === 'tracking' ? 'Your tracking' : 'Your collections'}</h2><p class="profile-note">{view === 'tracking' ? 'Ratings, watch status and private notes, all in one place.' : 'Create a list for a mood, a movie night, or a friend.'}</p></div>
        <PersonalLibrary embedded view={view} onViewChange={next => navigate(`/profile?view=${next}`)} />
      </>}
    </div>
    <BackupControls />
    <p class="profile-local-note"><Icon name="laptop" />Saved in this browser. Export a backup to keep a copy.</p>
    {editing && <ProfileEditor profile={profile} close={() => setEditing(false)} />}
  </div>;
}

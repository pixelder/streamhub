import UserSection from '../library/UserSection.jsx';

export default function LibraryPanel() {
  return <div class="profile-library">
    <UserSection id="continue-watching" logType="watching" title="Continue Watching" />
    <UserSection id="bookmarks" logType="bookmarks" title="Watchlist" />
    <UserSection id="history" logType="history" title="History" />
  </div>;
}

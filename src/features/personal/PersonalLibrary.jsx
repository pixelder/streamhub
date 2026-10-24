import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useStorage } from '../../hooks/useStorage.js';
import { confirmAction, notify, openDetails } from '../../stores/ui.js';
import { image } from '../../utils/format.js';
import { STATUSES, titleKey, encodeList, decodeList } from './model.js';
import { personalSnapshot, createList, updateList, deleteList, removeEntry } from './store.js';
import TitleJournal from './TitleJournal.jsx';
import './personal.css';

function sharedFromLocation() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (!params.has('collection')) return null;
  try { return { list: decodeList(params.get('collection')) }; }
  catch (error) { return { error: error.message }; }
}

function TitleLink({ item }) {
  return <button type="button" class="personal-title-link" onClick={() => openDetails(item)}>
    <img src={image(item.poster)} alt="" loading="lazy" />
    <span>{item.title}<small>{item.mediaType === 'tv' ? 'TV show' : 'Movie'}</small></span>
  </button>;
}

export default function PersonalLibrary({ view, onViewChange, embedded = false }) {
  useStorage();
  const { url } = useLocation();
  const { journal, lists, error } = personalSnapshot();
  const [localTab, setLocalTab] = useState('tracking');
  const tab = view || localTab;
  const setTab = onViewChange || setLocalTab;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const [rename, setRename] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [shared, setShared] = useState(sharedFromLocation);
  const [message, setMessage] = useState('');
  const current = lists.find(list => list.id === selected) || lists[0];
  useEffect(() => setShared(sharedFromLocation()), [url]);
  useEffect(() => { setRename(current?.name || ''); setShareUrl(''); }, [current?.id, current?.name, JSON.stringify(current?.items)]);
  useEffect(() => {
    const update = () => setShared(sharedFromLocation());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const run = action => {
    try { action(); setMessage(''); } catch (failure) { setMessage(failure.message); }
  };
  const ratings = journal.filter(item => item.rating > 0);
  const visible = journal.filter(item => (status === 'all' || status === item.status)
    && item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) =>
    sort === 'rating' ? b.rating - a.rating : sort === 'title' ? a.title.localeCompare(b.title) : b.updatedAt - a.updatedAt);
  const reorder = (index, direction) => run(() => {
    const items = [...current.items];
    [items[index], items[index + direction]] = [items[index + direction], items[index]];
    updateList(current.id, { items });
  });
  const share = async () => {
    try {
      const url = `${location.origin}/profile?view=collections#collection=${encodeList(current)}`;
      setShareUrl(url);
      if (navigator.share) {
        try { await navigator.share({ title: current.name, url }); return; }
        catch (failure) { if (failure.name === 'AbortError') return; }
      }
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(url); notify('Collection link copied.'); return; } catch { /* The visible link remains selectable. */ }
      }
      setMessage('Select and copy the collection link below.');
    } catch (failure) { setMessage(failure.message); }
  };
  return <div class="personal-library">
    {!embedded && <><header><h1>Your library</h1><p class="personal-hint">Keep your own ratings, track what you finish, and build collections to share.</p></header>
    <div class="personal-stats" aria-label="Your tracking summary">
      <div><strong>{journal.length}</strong><span>Tracked titles</span></div>
      <div><strong>{journal.filter(item => item.status === 'watched').length}</strong><span>Marked watched</span></div>
      <div><strong>{ratings.length ? (ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length).toFixed(1) : '—'}</strong><span>Your average rating</span></div>
      <div><strong>{lists.length}</strong><span>Collections</span></div>
    </div>
    <p class="personal-hint">Tracking is stored in this browser and included in your backups.</p></>}
    {shared && <div class="personal-shared">
      <h2>{shared.error ? 'Collection unavailable' : `Shared collection: ${shared.list.name}`}</h2>
      {shared.error ? <p role="alert">{shared.error}</p> : <>
        <p>This is a snapshot from a shared link. Saving it creates your own copy; it does not follow future edits.</p>
        <ol>{shared.list.items.map(item => <li key={titleKey(item)}><TitleLink item={item} /></li>)}</ol>
        {!shared.list.items.length && <p>This collection is empty.</p>}
        <button class="personal-primary" onClick={() => run(() => {
          const id = createList(shared.list.name, shared.list.items);
          setSelected(id); setTab('collections'); setShared(null);
          history.replaceState(history.state, '', location.pathname + location.search);
          notify('Collection saved to your library.');
        })}>Save a copy</button>
      </>}
      <button onClick={() => {
        setShared(null);
        history.replaceState(history.state, '', location.pathname + location.search);
      }}>Dismiss</button>
    </div>}
    {error ? <p role="alert">{error}</p> : <>
      {!embedded && <nav class="personal-tabs" aria-label="Personal library views">
        <button aria-pressed={tab === 'tracking'} onClick={() => setTab('tracking')}>Tracking & ratings</button>
        <button aria-pressed={tab === 'collections'} onClick={() => setTab('collections')}>Collections</button>
      </nav>}
      {tab === 'tracking' ? <div>
        <div class="personal-filters">
          <label>Find a tracked title<input type="search" value={query} onInput={e => setQuery(e.currentTarget.value)} placeholder="Movie or TV show" /></label>
          <label>Status<select value={status} onChange={e => setStatus(e.currentTarget.value)}><option value="all">All statuses</option>
            {Object.entries(STATUSES).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select></label>
          <label>Sort<select value={sort} onChange={e => setSort(e.currentTarget.value)}><option value="recent">Recently updated</option><option value="rating">Your highest rated</option><option value="title">Title</option></select></label>
        </div>
        {!visible.length && <p class="personal-empty">{journal.length ? 'No tracked titles match these filters.' : 'Open a title’s options menu and choose “Rate & track” to add a rating, status or private note.'}</p>}
        <div class="personal-records">{visible.map(item => <article key={titleKey(item)} class="personal-record">
          <TitleLink item={item} />
          {item.watchedOn && <p class="personal-hint">Watched on {item.watchedOn}</p>}
          <TitleJournal data={item} type={item.mediaType} />
          <button class="personal-remove" onClick={async () => {
            if (await confirmAction({ title: 'Remove tracking entry?', message: `Remove your status, rating and note for ${item.title}? Playback history and collections are kept.`, accept: 'Remove' })) run(() => removeEntry(item));
          }}>Remove tracking</button>
        </article>)}</div>
      </div> : <div>
        <form class="personal-create" onSubmit={e => { e.preventDefault(); run(() => { setSelected(createList(name)); setName(''); }); }}>
          <label>New collection<input required maxLength="80" value={name} onInput={e => setName(e.currentTarget.value)} placeholder="Friday movie night" /></label>
          <button type="submit" class="personal-primary">Create collection</button>
        </form>
        {current ? <>
          <label class="personal-collection-picker">Your collections<select value={current.id} onChange={e => setSelected(e.currentTarget.value)}>
            {lists.map(list => <option key={list.id} value={list.id}>{list.name} ({list.items.length})</option>)}
          </select></label>
          <form class="personal-create" onSubmit={e => { e.preventDefault(); run(() => updateList(current.id, { name: rename.trim() })); }}>
            <label>Collection name<input required maxLength="80" value={rename} onInput={e => setRename(e.currentTarget.value)} /></label>
            <button type="submit">Rename</button><button type="button" onClick={share}>Share collection</button>
            <button type="button" class="personal-remove" onClick={async () => {
              if (await confirmAction({ title: 'Delete collection?', message: `Delete “${current.name}”? Your tracking entries and playback history are kept.`, accept: 'Delete' })) run(() => deleteList(current.id));
            }}>Delete</button>
          </form>
          {shareUrl && <label class="personal-share-link">Shareable snapshot — anyone with this link can view these titles<input readOnly value={shareUrl} onFocus={e => e.currentTarget.select()} /></label>}
          {!current.items.length && <p class="personal-empty">Add titles from “Rate & track” in a movie or show’s options menu.</p>}
          <ol class="personal-list">{current.items.map((item, index) => <li key={titleKey(item)}>
            <TitleLink item={item} />
            <div class="personal-row-actions">
              <button disabled={index === 0} aria-label={`Move ${item.title} up`} onClick={() => reorder(index, -1)}>↑</button>
              <button disabled={index === current.items.length - 1} aria-label={`Move ${item.title} down`} onClick={() => reorder(index, 1)}>↓</button>
              <button aria-label={`Remove ${item.title} from collection`} onClick={() => run(() => updateList(current.id, { items: current.items.filter(old => titleKey(old) !== titleKey(item)) }))}>Remove</button>
            </div>
          </li>)}</ol>
        </> : <p class="personal-empty">Make a collection for a mood, a friend, or your next movie night.</p>}
      </div>}
      {message && <p role="status">{message}</p>}
    </>}
  </div>;
}

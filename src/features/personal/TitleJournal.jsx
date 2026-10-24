import { useEffect, useState } from 'preact/hooks';
import { useStorage } from '../../hooks/useStorage.js';
import { notify } from '../../stores/ui.js';
import { STATUSES, titleKey, titleRecord } from './model.js';
import { personalSnapshot, saveEntry, addToList } from './store.js';
import './personal.css';

const emptyEntry = { status: 'planned', rating: 0, note: '', watchedOn: '' };

export default function TitleJournal({ data, type, expanded = false }) {
  useStorage();
  const title = titleRecord(data, type);
  const snapshot = personalSnapshot();
  const saved = snapshot.journal.find(item => titleKey(item) === titleKey(title));
  const [draft, setDraft] = useState(() => saved || emptyEntry);
  const [listId, setListId] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    setDraft(saved || emptyEntry);
    setMessage('');
  }, [type, title.id, saved?.updatedAt]);
  const update = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  const save = event => {
    event.preventDefault();
    try {
      saveEntry(title, { status: draft.status, rating: Number(draft.rating), note: draft.note, watchedOn: draft.watchedOn });
      notify('Your tracking entry is saved.');
    } catch (error) { setMessage(error.message); }
  };
  const Container = expanded ? 'div' : 'details';
  return <Container class="personal-title">
    {!expanded && <summary>Your tracking {saved ? `· ${STATUSES[saved.status]}${saved.rating ? ` · ${saved.rating}/10` : ''}` : '· Rate or save a note'}</summary>}
    <p class="personal-hint">Saved on this device. Notes and ratings stay private when you share a collection.</p>
    {snapshot.error ? <p role="alert">{snapshot.error}</p> : <>
      <form onSubmit={save} class="personal-editor">
        <label>Status<select value={draft.status} onChange={e => update('status', e.currentTarget.value)}>
          {Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Your rating<select value={draft.rating} onChange={e => update('rating', Number(e.currentTarget.value))}>
          <option value="0">Not rated</option>
          {Array.from({ length: 20 }, (_, index) => (index + 1) / 2).map(value => <option key={value} value={value}>{value} / 10</option>)}
        </select></label>
        <label>Date watched<input type="date" value={draft.watchedOn} onInput={e => update('watchedOn', e.currentTarget.value)} /></label>
        <label class="personal-wide">Private note<textarea rows="3" maxLength="2000" value={draft.note}
          placeholder="What stood out? Would you watch it again?" onInput={e => update('note', e.currentTarget.value)} /></label>
        <button class="personal-primary" type="submit">Save tracking</button>
      </form>
      <form class="personal-list-add" onSubmit={e => {
        e.preventDefault();
        try {
          const added = addToList(listId, title);
          setMessage(added ? 'Added to your collection.' : 'This title is already in that collection.');
        } catch (error) { setMessage(error.message); }
      }}>
        <label>Collection<select required value={listId} onChange={e => setListId(e.currentTarget.value)}>
          <option value="">Choose a collection</option>
          {snapshot.lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
        </select></label>
        <button type="submit" disabled={!snapshot.lists.some(list => list.id === listId)}>Add title</button>
      </form>
      {!snapshot.lists.length && <p class="personal-hint">Create a collection in Profile → Collections, then add movies and shows here.</p>}
      {message && <p role="status">{message}</p>}
    </>}
  </Container>;
}

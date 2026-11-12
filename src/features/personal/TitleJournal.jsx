import { useEffect, useRef, useState } from 'preact/hooks';
import { useStorage } from '../../hooks/useStorage.js';
import { notify } from '../../stores/ui.js';
import { STATUSES, titleKey, titleRecord } from './model.js';
import { personalSnapshot, saveEntry, addToList, createList } from './store.js';
import './personal.css';

const emptyEntry = { status: 'planned', rating: 0, note: '', watchedOn: '' };

export default function TitleJournal({ data, type, expanded = false }) {
  useStorage();
  const title = titleRecord(data, type);
  const snapshot = personalSnapshot();
  const saved = snapshot.journal.find(item => titleKey(item) === titleKey(title));
  const [draft, setDraft] = useState(() => saved || emptyEntry);
  const [message, setMessage] = useState(null);
  const showMessage = (text, error = false) => setMessage({ text, error });
  useEffect(() => {
    if (!message || message.error) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    setDraft(saved || emptyEntry);
    setMessage(null);
  }, [type, title.id, saved?.updatedAt]);
  const update = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  const save = event => {
    event.preventDefault();
    try {
      saveEntry(title, { status: draft.status, rating: Number(draft.rating), note: draft.note, watchedOn: draft.watchedOn });
      setMessage(null);
      notify('Your tracking entry is saved.');
    } catch (error) { showMessage(error.message, true); }
  };
  const Container = expanded ? 'div' : 'details';
  return <Container class="personal-title">
    {!expanded && <summary>Your tracking {saved ? `· ${STATUSES[saved.status]}${saved.rating ? ` · ${saved.rating}/10` : ''}` : '· Rate or save a note'}</summary>}
    <p class="personal-hint">Saved on this device. Notes and ratings stay private when you share a collection.</p>
    {snapshot.error ? <p role="alert">{snapshot.error}</p> : <>
      <form onSubmit={save} class="personal-editor">
        <fieldset class="journal-status personal-wide">
          <legend>Watching status</legend>
          <div class="journal-status-options">
            {Object.entries(STATUSES).map(([value, label]) => <button key={value} type="button"
              aria-pressed={draft.status === value} onClick={() => update('status', value)}>
              {draft.status === value && <span aria-hidden="true">✓ </span>}{label}
            </button>)}
          </div>
        </fieldset>
        <div class="journal-details">
        <label class="journal-rating">
          <span class="journal-rating-heading">Your rating <strong>{Number(draft.rating) ? `${draft.rating}` : 'Not rated'}</strong></span>
          <input type="range" min="0" max="10" step="0.5" value={draft.rating} style={{ '--rating-fill': `${Number(draft.rating) * 10}%` }}
            aria-valuetext={Number(draft.rating) ? `${draft.rating} out of 10` : 'Not rated'}
            onInput={e => update('rating', Number(e.currentTarget.value))} />
        </label>
        <label>Date watched<input type="date" value={draft.watchedOn} onInput={e => update('watchedOn', e.currentTarget.value)} /></label>
        </div>
        <label class="journal-note"><span class="journal-rating-heading">Private note <small>{draft.note.length} / 2000</small></span><textarea rows="3" maxLength="2000" value={draft.note}
          placeholder="What stood out? Would you watch it again?" onInput={e => update('note', e.currentTarget.value)} /></label>
        <div class="journal-save personal-wide"><span>Only visible to you</span><button class="personal-primary" type="submit">Save tracking</button></div>
      </form>
      <div class="personal-list-add"><CollectionPicker title={title} lists={snapshot.lists} onMessage={showMessage} /></div>
      {message && <div class={`journal-notice ${message.error ? 'is-error' : ''}`}>
        <span aria-hidden="true">{message.error ? '!' : '✓'}</span>
        <p role={message.error ? 'alert' : 'status'}>{message.text}</p>
        <button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button>
      </div>}
    </>}
  </Container>;
}


function CollectionPicker({ title, lists, onMessage }) {
  const panel = useRef();
  const createButton = useRef();
  const nameInput = useRef();
  const [selectedId, setSelectedId] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const selected = lists.find(list => list.id === selectedId);
  useEffect(() => {
    if (creating) nameInput.current?.focus();
  }, [creating]);
  useEffect(() => {
    const dismiss = event => {
      if (!panel.current?.contains(event.target)) panel.current?.removeAttribute('open');
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const closePicker = () => {
    panel.current.open = false;
    panel.current.querySelector('summary').focus();
  };
  const add = () => {
    try {
      const added = addToList(selectedId, title);
      onMessage(added ? 'Added to your collection.' : 'Already in this collection.');
    } catch (error) { onMessage(error.message, true); }
  };
  const closeCreate = () => {
    setCreating(false);
    createButton.current?.focus();
  };
  return <div class="journal-collection">
    <span>Collection</span>
    <div class="journal-collection-row">
      <details ref={panel} class="journal-picker" onKeyDown={event => {
        if (event.key === 'Escape' && panel.current.open) {
          event.stopPropagation();
          closePicker();
        }
      }}>
        <summary>{selected?.name || 'Choose a collection'}</summary>
        <div class="journal-picker-panel journal-picker-options">
          {lists.map(list => <button type="button" key={list.id}
            aria-pressed={list.id === selectedId} onClick={() => { setSelectedId(list.id); closePicker(); }}>
            <span>{list.name}</span><small>{list.id === selectedId ? '✓ Selected' : `${list.items.length} titles`}</small>
          </button>)}
          {!lists.length && <p>No collections yet. Use Create collection to get started.</p>}
        </div>
      </details>
      <button type="button" disabled={!selected} onClick={add}>Add title</button>
      <button ref={createButton} type="button" aria-expanded={creating}
        onClick={() => setCreating(value => !value)}>Create collection</button>
    </div>
    {creating && <form class="journal-picker-create" onSubmit={event => {
      event.preventDefault();
      try {
        const id = createList(name.trim());
        setSelectedId(id);
        setName('');
        closeCreate();
        onMessage('Collection created. Select Add title to include this title.');
      } catch (error) { onMessage(error.message, true); }
    }} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); closeCreate(); }
    }}>
      <label>Collection name<input ref={nameInput} required value={name} maxLength="100"
        placeholder="Enter a name" onInput={event => setName(event.currentTarget.value)} /></label>
      <div class="journal-create-actions">
        <button type="button" onClick={closeCreate}>Cancel</button>
        <button type="submit" disabled={!name.trim()}>Create</button>
      </div>
    </form>}
  </div>;
}

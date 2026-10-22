import { isBlocked } from '../../services/catalogPolicy.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useIncrementalItems } from '../../hooks/useIncrementalItems.js';
import { useStorage } from '../../hooks/useStorage.js';
import { useAsync } from '../../hooks/useAsync.js';
import { logs, write, removeLog } from '../../stores/storage.js';
import { openDetails, confirmAction, notify } from '../../stores/ui.js';
import { metadata, seasonData } from '../../services/api.js';
import { image, titleOf, capString, watchUrl, plural } from '../../utils/format.js';
import { navigate } from '../../app/navigation.js';
import { markRecord } from './actions.js';
import MediaSection from '../../components/media/MediaSection.jsx';
import MediaCard, { Rating } from '../../components/media/MediaCard.jsx';
import Progress from '../../components/media/Progress.jsx';
import Icon from '../../components/common/Icon.jsx';

const recordKey = (r, i) => `${r.mediaType}-${r.id}-${r.index ?? i}-${r.data?.sno || ''}-${r.data?.eno || ''}`;

function LogCard({ record, logType, editing, selected, onSelect, onHold }) {
  const ref = useRef(),
    timer = useRef(),
    held = useRef(false);
  const [visible, setVisible] = useState(false),
    [menu, setMenu] = useState(false);
  useEffect(
    () => {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      }, { rootMargin: '300px' });
      observer.observe(ref.current);
      return () => {
        observer.disconnect();
        clearTimeout(timer.current);
      };
    },
    []
  );
  const { data, error } = useAsync(
    async (signal) => {
      if (!visible)
        return null;
      const [media, season] = await Promise.all(
        [
          metadata(record.mediaType, record.id, false, { signal }),
          record.mediaType === 'tv' && logType !== 'bookmarks' && record.data?.sno != null
            ? seasonData(record.id, record.data.sno, { signal })
            : null
        ]
      );
      return { media, ep: season?.episodes?.find(e => e.episode_number === Number(record.data?.eno)) };
    },
    [visible, record.id, record.mediaType, record.data?.sno, record.data?.eno]
  );
  if (error)
    return <div
      ref={ref}
      class="grid-item"
      role="alert"
    >{error.message}</div>;
  if (!data)
    return <div ref={ref} class="grid-item placeholder" />;
  if (logType === 'bookmarks')
    return <MediaCard item={{ ...data.media, media_type: record.mediaType }} vertical={false} />;
  const { id, mediaType, index, progress = 0 } = record,
    { sno, eno } = record.data || {},
    name = titleOf(data.media);
  const activate = e => {
    if (e.shiftKey) {
      openDetails({
        id,
        mediaType,
        sno,
        eno
      });
      return;
    }
    if (held.current) {
      held.current = false;
      return;
    }
    if (editing) {
      onSelect();
      return;
    }
    navigate(watchUrl(mediaType, id, sno, eno));
  };
  const remove = async () => {
    if (await confirmAction()) {
      removeLog(logType, mediaType, id, sno, eno, index);
      notify('Item removed successfully.');
    }
  };
  return <div
    ref={ref}
    class="grid-item"
    data-id={id}
    data-media-type={mediaType}
    data-index={index}
    data-sno={sno}
    data-eno={eno}
    tabIndex="0"
    role="button"
    onClick={activate}
    onKeyDown={e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        activate(e);
      }
    }}
    onPointerDown={e => {
      if (e.target.closest('.grid-actions'))
        return;
      held.current = false;
      timer.current = setTimeout(
        () => {
          held.current = true;
          onHold();
          navigator.vibrate?.(50);
        },
        500
      );
    }}
    onPointerMove={() => clearTimeout(timer.current)}
    onPointerUp={() => clearTimeout(timer.current)}
    onPointerCancel={() => clearTimeout(timer.current)}
    onPointerLeave={() => clearTimeout(timer.current)}
  >

    <div class="item-container" draggable={!editing}>

      <label class={`selectable ${editing ? 'active' : ''}`} onClick={e => e.stopPropagation()}>

        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
        />

        <span class="checkbox-button">

          <i class="fa-regular fa-square active" />

          <i class="fa-solid fa-square-check passive" />

        </span>

      </label>

      <div
        class="grid-actions"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >

        <div class={`grid-options ${menu ? 'open' : ''}`}>

          <div class="flow-row">

            <h4>Actions</h4>

            <div
              tabIndex="0"
              role="button"
              class="options-buttons"
              aria-label="Actions"
              onClick={() => setMenu(!menu)}
              onKeyDown={e => {
                if (e.key === 'Enter')
                  setMenu(!menu);
              }}
            >

              <i class="options-icon fa-solid fa-ellipsis-vertical" />

              <i class="options-x-icon fa-solid fa-xmark" />

            </div>

          </div>

          <hr />

          <div class="options-menu">

            <div
              class="flow-row mark-item"
              onClick={() => {
                void markRecord(record, Number(progress) < 99, logType);
                setMenu(false);
              }}
            >

              <button aria-label={Number(progress) < 99 ? 'Mark As Watched' : 'Mark Unwatched'}>

                <Icon name={Number(progress) < 99 ? 'eye' : 'eye-slash'} />

              </button>

              <p>{Number(progress) < 99 ? 'Mark As Watched' : 'Mark Unwatched'}</p>

            </div>

            <div
              class="flow-row view-details"
              onClick={() => openDetails({
                id,
                mediaType,
                sno,
                eno
              })}
            >

              <button aria-label="Details">

                <Icon name="square-arrow-up-right" />

              </button>

              <p>Details</p>

            </div>

            <div class="flow-row remove" onClick={remove}>

              <button aria-label="Remove">

                <Icon name="trash-can" />

              </button>

              <p>Remove</p>

            </div>

          </div>

        </div>

      </div>

      <img
        src={image(
          data.ep?.still_path || data.media.backdrop_path,
          'w500',
          '/assets/images/no-image-hr.svg',
          data.ep?.still_path ? 'still' : 'backdrop'
        )}
        loading="lazy"
        alt=""
      />

      <div class="grid-item-info">

        <span class="history-item-info">

          <h3>{capString(name)}</h3>
          {mediaType === 'tv' && <p>S{sno}:E{eno} {data.ep?.name || ''}</p>}

          <Rating value={data.ep?.vote_average ?? data.media.vote_average} />

        </span>

        <Progress value={Number(progress)} />

      </div>

    </div>

  </div>;
}

export default function UserSection({ id, logType, title }) {
  useStorage();
  const allRecords = logs(logType).slice().sort((a, b) => Number(b.index) - Number(a.index));
  const records = allRecords.filter(record => !isBlocked(record.mediaType, record.id));
  const [editing, setEditing] = useState(false),
    [selected, setSelected] = useState(new Set());
  const { limit, sentinel } = useIncrementalItems(records.length);
  const keys = records.map(record => recordKey(record, allRecords.indexOf(record)));
  const toggle = k => setSelected(
    old => {
      const next = new Set(old);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    }
  );
  const deleteSelected = async () => {
    if (!selected.size)
      return;
    if (await confirmAction({ title: `Delete ${plural(selected.size, 'item')}?` })) {
      write(logType, allRecords.filter((record, index) => !selected.has(recordKey(record, index))));
      setSelected(new Set());
      setEditing(false);
    }
  };
  useEffect(
    () => {
      if (!editing)
        return;
      const key = e => {
        if (e.key === 'Delete' && document.activeElement?.closest(`#${id}`)) {
          e.preventDefault();
          void deleteSelected();
        }
      };
      document.addEventListener('keydown', key);
      return () => document.removeEventListener('keydown', key);
    },
    [editing, selected]
  );
  if (logType === 'watching' && !records.length)
    return null;
  const selectActions = logType !== 'bookmarks' && <div class="select-action">

    <label
      class={`select-all selectable ${editing ? 'active' : ''}`}
      tabIndex={editing ? 0 : -1}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          setSelected(selected.size === keys.length ? new Set() : new Set(keys));
        }
      }}
    >

      <input
        type="checkbox"
        aria-label="Select all"
        checked={!!keys.length && selected.size === keys.length}
        onChange={e => setSelected(e.currentTarget.checked ? new Set(keys) : new Set())}
      />

      <span class="checkbox-button">

        <i class="fa-regular fa-square active" />

        <i class="fa-solid fa-square-check passive" />

      </span>

    </label>

    <div class="v-separator" />

    <div class="selection-count">

      <p>{selected.size} / {records.length}</p>

    </div>

  </div>;
  const headerActions = logType !== 'bookmarks' && <>
    <button
      class={`delete-button ${editing ? 'active' : ''}`}
      aria-label="Delete selected"
      onClick={deleteSelected}
    >

      <Icon name="trash-can" />

    </button>
    <button
      class="edit-button"
      aria-label="Edit list"
      onClick={() => {
        setEditing(!editing);
        setSelected(new Set());
      }}
    >

      <i class={`fa-solid fa-pen-to-square ${!editing ? 'active' : ''}`} />

      <i class={`fa-solid fa-xmark ${editing ? 'active' : ''}`} />

    </button>
  </>;
  return <MediaSection
    id={id}
    title={title}
    user
    logType={logType}
    vertical={false}
    headerActions={headerActions}
    selectActions={selectActions}
    empty={!records.length ? (logType === 'history' ? 'No History' : 'No Saves Yet') : null}
    gridChildren={records.length
      ? <>
        {records.slice(0, limit).map(
          (record, i) => <LogCard
            key={keys[i]}
            record={record}
            logType={logType}
            editing={editing}
            selected={selected.has(keys[i])}
            onSelect={() => toggle(keys[i])}
            onHold={() => {
              setEditing(!editing);
              setSelected(editing ? new Set() : new Set([keys[i]]));
            }}
          />
        )}
        {limit < records.length && <div
          class="load-sentinel"
          ref={sentinel}
          style={{ minWidth: 1, minHeight: 1 }}
        />}
      </>
      : null}
  />;
}

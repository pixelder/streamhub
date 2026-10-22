import { getSettings } from '../settings/preferences.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { usePage } from '../../hooks/usePage.js';
import { search } from '../../services/api.js';
import { notify } from '../../stores/ui.js';
import { image, titleOf, yearOf } from '../../utils/format.js';
import Icon from '../../components/common/Icon.jsx';
import { buildPayload, createExtractor, upsertFile } from './service.js';

const defaults = () => ({
  mediaType: 'movie',
  server: getSettings().extractorServer,
  name: '',
  maxsize: String(getSettings().movieSize),
  season: '1',
  episode: '',
  year: ''
});

function NumberControl({ id, label, value, update, step = 1, placeholder = '0', hidden, className = '' }) {
  const change = delta => update(id, String(Number(Math.max(0, (parseFloat(value) || 0) + delta).toFixed(2))));
  return <div
    id={id === 'year' ? 'year-input' : undefined}
    class={`form-group ${className} ${hidden ? 'hidden' : ''}`}
  >
    <label for={id}>{label}</label>
    <div class="number-control">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => change(-step)}
      >−</button>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => change(step)}
      >+</button>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        min="0"
        inputMode={step === 1 ? 'numeric' : 'decimal'}
        onInput={e => update(id, e.currentTarget.value)}
      />
    </div>
  </div>;
}

function FileActions({ file, resolve, busy, resolving }) {
  const { url, link, drive_link, file_name, page, directory, option } = file;
  const external = (href, title, icon, extra = {}) => <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    {...extra}
  >
    <button title={title}>
      <Icon name={icon} />
    </button>
  </a>;
  if (resolving || (!url && !drive_link && option !== 'select'))
    return <i class="fa fa-spinner fa-spin btn" aria-label="Processing file" />;
  if (option === 'select')
    return <>
      {page && external(page, 'Open source website', 'globe')}
      {link && <button
        disabled={busy}
        title="Fetch this link"
        onClick={() => resolve(file)}
      >
        <Icon name="screwdriver-wrench" />
      </button>}
    </>;
  return <>
    {directory && external(directory, 'Open directory', 'globe')}
    {url && <>
      <button
        title="Open in external player"
        onClick={() => {
          location.href = `intent://${url.replace('https://', '')}#Intent;scheme=https;type=video/*;end;`;
        }}
      >
        <Icon name="arrow-up-right-from-square" />
      </button>
      <button
        class="copy"
        title="Copy link"
        onClick={() => navigator.clipboard.writeText(url).then(() => notify('Copied link to clipboard!')).catch(
          e => notify(e.message)
        )}
      >
        <Icon name="clone" />
      </button>
      {external(url, 'Download', 'download', { download: file_name, target: '_self' })}
    </>}
    {drive_link && external(drive_link, 'Open Drive Page', 'server')}
  </>;
}

function Status({ value }) {
  if (!value)
    return null;
  const { type = 'log', icon, string } = value;
  const symbol = icon === 'connected'
    ? <div class="pulse-container">
      <div class="pulse-dot" />
      <div class="pulse-dot pulse" />
    </div>
    : icon === 'spinner' || icon === 'retry'
      ? <i class={`fa fa-${icon === 'retry' ? 'sync' : 'spinner'} fa-spin`} />
      : icon || (type === 'error'
        ? <Icon name="circle-exclamation" />
        : type === 'warn' ? <Icon name="triangle-exclamation" /> : null);
  return <div class={`message ${type}`} role="status">
    {symbol && <div class="icon">{symbol}</div>}
    <span>{string}</span>
  </div>;
}

export default function Tools() {
  usePage(
    'Tools - Pixelstream',
    [
      'https://cdn.jsdelivr.net/npm/@fontsource-variable/jetbrains-mono@5.2.8/index.min.css',
      '/tools/styles.css'
    ]
  );
  const [form, setForm] = useState(defaults),
    [suggestions, setSuggestions] = useState([]),
    [suggest, setSuggest] = useState(false),
    [active, setActive] = useState(-1);
  const [status, setStatus] = useState(null),
    [rows, setRows] = useState([]),
    [raw, setRaw] = useState({ raw: [], file: [] }),
    [outputError, setOutputError] = useState(''),
    [busy, setBusy] = useState(false),
    [resolving, setResolving] = useState(null);
  const client = useRef(),
    controller = useRef(),
    payload = useRef(),
    field = useRef(),
    statusTimer = useRef(),
    mounted = useRef(true);
  const showStatus = value => {
    if (!mounted.current)
      return;
    clearTimeout(statusTimer.current);
    setStatus(value);
    if (value?.expire)
      statusTimer.current = setTimeout(() => setStatus(null), value.time || 5000);
  };
  useEffect(
    () => {
      mounted.current = true;
      client.current = createExtractor(showStatus);
      client.current.connect();
      const outside = e => {
        if (!field.current?.contains(e.target))
          setSuggest(false);
      };
      document.addEventListener('click', outside);
      return () => {
        mounted.current = false;
        controller.current?.abort();
        client.current.dispose();
        clearTimeout(statusTimer.current);
        document.removeEventListener('click', outside);
      };
    },
    []
  );
  useEffect(
    () => {
      const abort = new AbortController();
      if (!suggest || form.name.length < 2) {
        setSuggestions([]);
        return;
      }
      const timer = setTimeout(
        () => search(form.name, form.mediaType, 1, { signal: abort.signal }).then(
          data => {
            if (!abort.signal.aborted) {
              setSuggestions(data.results.sort((a, b) => b.popularity - a.popularity));
              setActive(-1);
            }
          }
        ).catch(
          e => {
            if (!abort.signal.aborted)
              showStatus({
                type: 'warn',
                string: `Suggestions unavailable: ${e.message}`,
                expire: true
              });
          }
        ),
        1000
      );
      return () => {
        abort.abort();
        clearTimeout(timer);
      };
    },
    [form.name, form.mediaType, suggest]
  );
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const select = item => {
    setForm(old => ({
      ...old,
      name: titleOf(item),
      year: yearOf(item.release_date) || ''
    }));
    setSuggest(false);
  };
  const run = async (nextPayload, rowId = null) => {
    controller.current?.abort();
    const abort = controller.current = new AbortController();
    setBusy(true);
    setResolving(rowId);
    setOutputError('');
    showStatus({ icon: 'spinner', string: 'Fetching data...' });
    let count = 0;
    try {
      await client.current.fetch(
        nextPayload,
        response => {
          if (abort.signal.aborted || !mounted.current)
            return;
          if (response.status === 'file') {
            setRaw(old => ({ ...old, file: [...old.file, response] }));
            if (response.result) {
              count++;
              setRows(old => upsertFile(old, response.result));
            }
          }
          else if (response.status === 'raw') {
            setRaw(old => ({ ...old, raw: [...old.raw, response] }));
            if (!Array.isArray(response.results))
              throw new Error('The extractor returned an invalid file list.');
            if (response.option)
              count += response.results.length;
            setRows(old => response.results.reduce((all, file) => upsertFile(all, file, response.option), old));
          }
          else if (response.status === 'error')
            throw new Error(response.message || 'The extractor reported an error.');
          showStatus({ string: `📦 Processing files... (${count} received)` });
        },
        abort.signal
      );
      if (!abort.signal.aborted)
        showStatus(
          count
            ? {
              type: 'success',
              icon: '🎉',
              string: `Received ${count} file${count === 1 ? '' : 's'}.`
            }
            : {
              type: 'warn',
              string: 'No valid results received.',
              expire: true
            }
        );
    }
    catch (error) {
      const message = error.name === 'AbortError' ? 'The operation was aborted!' : error.message;
      if (mounted.current) {
        showStatus({
          type: 'error',
          string: message,
          expire: true
        });
        setOutputError(message);
      }
    }
    finally {
      if (mounted.current) {
        setBusy(false);
        setResolving(null);
      }
    }
  };
  const submit = e => {
    e.preventDefault();
    try {
      payload.current = buildPayload(form);
    }
    catch (error) {
      showStatus({
        type: 'warn',
        string: error.message,
        expire: true
      });
      return;
    }
    setRows([]);
    setRaw({ raw: [], file: [] });
    setSuggest(false);
    run(payload.current);
  };
  const reset = () => {
    if (busy) {
      controller.current?.abort();
      return;
    }
    setForm(
      old => ({
        ...old,
        name: '',
        season: '',
        episode: '',
        year: '',
        maxsize: String(old.mediaType === 'movie' ? getSettings().movieSize : getSettings().episodeSize)
      })
    );
    setRows([]);
    setRaw({ raw: [], file: [] });
    setOutputError('');
    setSuggest(false);
    showStatus(null);
    client.current.connect();
  };
  return <section class="Download-links">
    <div class="form-container">
      <h1>EXTRACTOR</h1>
      <form id="form" onSubmit={submit}>

        <div class="form-group">
          <label for="mediaType">Media Type</label>
          <select
            id="mediaType"
            value={form.mediaType}
            onChange={e => {
              const mediaType = e.currentTarget.value;
              setForm(
                old => ({
                  ...old,
                  mediaType,
                  maxsize: String(mediaType === 'movie' ? getSettings().movieSize : getSettings().episodeSize)
                })
              );
              setSuggest(false);
            }}
          >
            <option value="movie">Movie</option>
            <option value="tv">TV</option>
          </select>
        </div>

        <div class="form-group">
          <label for="server-key">Server</label>
          <select
            id="server-key"
            title={'Alpha (recommended) - Fast results. Good for downloading.\nBravo - Slow results. Good for streaming with vlc, mpv or other video player.'}
            value={form.server}
            onChange={e => update('server', e.currentTarget.value)}
          >
            <option value="alpha">Alpha</option>
            <option value="bravo">Bravo</option>
          </select>
        </div>

        <div class="form-group">
          <label for="name">Name</label>
          <div id="search-field" ref={field}>
            <input
              id="name"
              placeholder="e.g., Silo or Dune"
              value={form.name}
              autoComplete="off"
              onInput={e => {
                update('name', e.currentTarget.value);
                setSuggest(true);
              }}
              onKeyDown={e => {
                if (!suggestions.length || !suggest)
                  return;
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive(
                    index => (index + (e.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length
                  );
                }
                else if (e.key === 'Enter' && active >= 0) {
                  e.preventDefault();
                  select(suggestions[active]);
                }
                else if (e.key === 'Escape')
                  setSuggest(false);
              }}
            />
            <button
              class="x-icon"
              type="button"
              aria-label="Clear name"
              onClick={() => {
                update('name', '');
                setSuggest(false);
              }}
            >
              <Icon name="xmark" />
            </button>
            {suggest && suggestions.length > 0 && <div class="suggestion-container">
              {suggestions.map(
                (item, index) => <button
                  key={item.id}
                  type="button"
                  class={`result ${index === active ? 'active' : ''}`}
                  onClick={() => select(item)}
                >
                  <div class="img-container">
                    <img
                      src={item.poster_path ? image(item.poster_path, 'w300') : '/assets/images/no-image-transparent-dark.svg'}
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <p>{titleOf(item)}</p>
                </button>
              )}
            </div>}
          </div>
        </div>

        <NumberControl
          id="maxsize"
          label="Size Limit (GB)"
          value={form.maxsize}
          update={update}
          step={0.1}
          placeholder="No Limit"
        />

        <NumberControl
          id="season"
          label="Season (required)"
          value={form.season}
          update={update}
          className="tv-input"
          hidden={form.mediaType === 'movie'}
        />

        <NumberControl
          id="episode"
          label="Episode (optional)"
          value={form.episode}
          update={update}
          className="tv-input"
          hidden={form.mediaType === 'movie'}
        />

        <NumberControl
          id="year"
          label="Release Year"
          value={form.year}
          update={update}
          placeholder="eg. 2025"
          hidden={form.mediaType !== 'movie'}
        />

        <div class="form-actions">
          <button
            id="scrape"
            disabled={busy}
            class={busy ? 'loading' : ''}
          >
            {busy ? <><i class="fa fa-spinner fa-spin" /> Loading...</> : 'Generate'}
          </button>
          <button
            id="reset"
            type="button"
            class={busy ? 'cancel' : ''}
            onClick={reset}
          >
            {busy ? 'Cancel' : 'Reset'}
          </button>
        </div>

      </form>
    </div>
    <div class="results-container">
      <h3>Links</h3>
      <div id="status-info">
        <Status value={status} />
      </div>
      <div id="results" class="results-table">
        {(busy || rows.length > 0) && <table>
          <tbody>
            {rows.map(
              file => <tr
                key={file.id}
                id={file.id}
                class="result-row"
                data-index={file.index}
                data-size={file.size}
                data-quality={file.quality}
              >
                <td class="file-cell">
                  <div class="file-name">{file.file_name}</div>
                  <div class="file-flags">
                    <p class="file-size">Size: {file.size}</p>
                    <div> | </div>
                    <p>Quality: {file.quality || 'Unknown'}</p>
                  </div>
                </td>
                <td class="action-cell">
                  <FileActions
                    file={file}
                    busy={busy}
                    resolving={resolving === file.id}
                    resolve={row => run({ ...payload.current, resolve: { id: row.id, link: row.link } }, row.id)}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>}
      </div>
    </div>
    <details class="raw-output">
      <summary>Raw Response</summary>
      <pre id="output">
        {outputError || (raw.raw.length || raw.file.length ? JSON.stringify(raw, null, 2) : '')}
      </pre>
    </details>
  </section>;
}

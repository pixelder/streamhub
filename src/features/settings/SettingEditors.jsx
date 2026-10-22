import { useEffect, useState } from 'preact/hooks';
import { useAsync } from '../../hooks/useAsync.js';
import { tmdb, metadata } from '../../services/api.js';
import { loadImageConfiguration, imageURL, resolutionFor } from '../../services/images.js';
import { imageKinds, validSourceTemplate } from './catalogOptions.js';

export function OptionEditor({ setting, value, save, region }) {
  const [query, setQuery] = useState('');
  const result = useAsync(
    async signal => {
      if (setting.type === 'languages') return (await tmdb('configuration/languages', {}, { signal })).map(
        x => ({ id: x.iso_639_1, name: `${x.english_name || x.name} (${x.iso_639_1})` })
      );
      if (setting.type === 'countries') return (await tmdb('configuration/countries', {}, { signal })).map(
        x => ({ id: x.iso_3166_1, name: x.english_name || x.native_name })
      );
      if (setting.type === 'providers') {
        const responses = await Promise.all(
          ['movie', 'tv'].map(type => tmdb(`watch/providers/${type}`, { watch_region: region }, { signal }))
        );
        return [
          ...new Map(responses.flatMap(x => x.results || []).map(
            x => [
              x.provider_id,
              { id: x.provider_id, name: x.provider_name }
            ]
          )).values()
        ];
      }
      return (await tmdb(`genre/${setting.type === 'movieGenres' ? 'movie' : 'tv'}/list`, {}, { signal })).genres.map(
        x => ({ id: x.id, name: x.name })
      );
    },
    [setting.type, region]
  );
  const options = (result.data || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const ids = value.map(x => typeof x === 'object' ? x.id : x);
  return <div class="setting-option-editor">
    <div class="setting-chips">
      {value.map(
        item => {
          const id = typeof item === 'object' ? item.id : item;
          return <button
            key={id}
            onClick={() => save(value.filter(x => (typeof x === 'object' ? x.id : x) !== id))}
            aria-label={`Remove ${typeof item === 'object' ? item.name : options.find(x => x.id === id)?.name || id}`}
          >{typeof item === 'object' ? item.name : options.find(x => x.id === id)?.name || id} <span aria-hidden="true">×</span></button>;
        }
      )}
    </div>
    <input
      aria-label={`Search ${setting.label}`}
      placeholder="Filter options"
      value={query}
      onInput={event => setQuery(event.currentTarget.value)}
    />
    <select
      aria-label={`Add to ${setting.label}`}
      value=""
      disabled={result.loading || !!result.error}
      onChange={event => {
        const option = options.find(x => String(x.id) === event.currentTarget.value);
        if (option) save([...value, setting.type === 'providers' ? option : option.id]);
        event.currentTarget.value = '';
      }}
    >
      <option value="">{result.loading ? 'Loading…' : 'Add…'}</option>
      {options.filter(x => !ids.includes(x.id) && x.name.toLowerCase().includes(query.toLowerCase())).map(
        x => <option value={x.id} key={x.id}>{x.name}</option>
      )}
    </select>
    {result.error && <p role="alert">Could not load options: {result.error.message}. Saved selections remain available.</p>}
  </div>;
}

export function ImageEditor({ values, save }) {
  const result = useAsync(
    async signal => {
      const config = await loadImageConfiguration(signal);
      const samples = await Promise.allSettled(
        [
          tmdb('discover/movie', { page: 1 }, { signal }).then(
            page => page.results[0] ? metadata('movie', page.results[0].id, true, { signal }) : {}
          ),
          tmdb('discover/tv', { page: 1 }, { signal }).then(
            page => page.results[0] ? tmdb(`tv/${page.results[0].id}/season/1`, {}, { signal }) : {}
          ),
        ]
      );
      const movie = samples[0].status === 'fulfilled' ? samples[0].value : {};
      const season = samples[1].status === 'fulfilled' ? samples[1].value : {};
      return {
        config,
        paths: {
          poster: movie.poster_path,
          backdrop: movie.backdrop_path,
          profile: movie.credits?.cast?.find(x => x.profile_path)?.profile_path,
          logo: movie.images?.logos?.[0]?.file_path,
          still: season.episodes?.find(x => x.still_path)?.still_path
        }
      };
    },
    []
  );
  if (result.loading) return <p>Loading TMDB image configuration…</p>;
  if (result.error) return <p role="alert">Image configuration unavailable: {result.error.message}. Reopen this section to retry.</p>;
  return <div class="image-settings-grid">
    {imageKinds.map(
      kind => <div class="image-setting" key={kind}>
        <label for={`resolution-${kind}`}>{kind[0].toUpperCase() + kind.slice(1)}</label>
        <select
          id={`resolution-${kind}`}
          value={result.data.config[`${kind}_sizes`].includes(values.imageResolutions[kind])
            ? values.imageResolutions[kind]
            : 'auto'}
          onChange={event => save({ ...values.imageResolutions, [kind]: event.currentTarget.value })}
        >
          <option value="auto">Preset ({resolutionFor(kind, { ...values, imageResolutions: {} }, result.data.config)})</option>
          {result.data.config[`${kind}_sizes`].map(
            size => <option key={size} value={size}>
              {size === 'original' ? 'Original' : `${size.slice(1)} px ${size[0] === 'h' ? 'height' : 'width'}`}
            </option>
          )}
        </select>
        <div class={`image-preview ${kind}`}>
          {result.data.paths[kind]
            ? <img
              key={imageURL(result.data.paths[kind], kind, undefined, values)}
              src={imageURL(result.data.paths[kind], kind, undefined, values)}
              alt={`${kind} resolution preview`}
            />
            : <span>Preview unavailable</span>}
        </div>
        <small>{resolutionFor(kind, values, result.data.config)} · Preview updates immediately</small>
      </div>
    )}
  </div>;
}

export function BlocklistEditor({ value, save }) {
  const [type, setType] = useState('movie'),
    [id, setId] = useState('');
  return <div class="setting-option-editor">
    <div class="setting-chips">
      {value.map(
        entry => <button
          key={`${entry.type}-${entry.id}`}
          onClick={() => save(value.filter(x => x !== entry))}
          aria-label={`Unblock ${entry.type} ${entry.id}`}
        >{entry.type}:{entry.id} ×</button>
      )}
    </div>
    <div class="setting-inline">
      <select
        aria-label="Blocked ID type"
        value={type}
        onChange={e => setType(e.currentTarget.value)}
      >
        {['movie', 'tv', 'person', 'all'].map(value => <option key={value}>{value}</option>)}
      </select>
      <input
        aria-label="TMDB ID"
        inputMode="numeric"
        placeholder="TMDB ID"
        value={id}
        onInput={e => setId(e.currentTarget.value)}
      />
      <button
        disabled={!/^\d+$/.test(id) || Number(id) < 1}
        onClick={() => {
          save([
            ...value,
            { type, id: Number(id) }
          ]);
          setId('');
        }}
      >Block</button>
    </div>
  </div>;
}

export function SourceEditor({ value, save }) {
  const [draft, setDraft] = useState(value),
    [error, setError] = useState('');
  useEffect(() => setDraft(value), [value]);
  return <div class="setting-option-editor">
    <input
      aria-label="Custom player URL template"
      type="text"
      placeholder="https://player.example/{type}/{id}"
      value={draft}
      onInput={e => setDraft(e.currentTarget.value)}
    />
    <button
      onClick={() => {
        if (draft.trim() && !validSourceTemplate(draft)) return setError('Use an HTTPS URL containing {id}, without a username or password.');
        save(draft);
        setError('');
      }}
    >Save URL</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}

export function SectionsEditor({ value, save, providers }) {
  const catalogs = useAsync(
    async signal => {
      const [languages, countries, movie, tv] = await Promise.all(
        [
          tmdb('configuration/languages', {}, { signal }),
          tmdb('configuration/countries', {}, { signal }),
          tmdb('genre/movie/list', {}, { signal }),
          tmdb('genre/tv/list', {}, { signal })
        ]
      );
      return {
        languages,
        countries,
        movie: movie.genres,
        tv: tv.genres
      };
    },
    []
  );
  const update = (index, key, next) => save(
    value.map(
      (section, i) => i === index ? {
        ...section,
        [key]: next,
        ...(key === 'type' ? { genre: '', sort: 'popularity.desc' } : {})
      } : section
    )
  );
  const move = (index, delta) => {
    const next = [...value];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    save(next);
  };
  return <div class="custom-sections-editor">
    {value.map(
      (section, index) => <div class="custom-section-editor" key={section.id}>
        <div class="setting-inline">
          <input
            aria-label="Section title"
            maxLength={80}
            value={section.title}
            onInput={e => update(index, 'title', e.currentTarget.value)}
          />
          <button
            aria-label="Move section up"
            disabled={!index}
            onClick={() => move(index, -1)}
          >↑</button>
          <button
            aria-label="Move section down"
            disabled={index === value.length - 1}
            onClick={() => move(index, 1)}
          >↓</button>
          <button
            aria-label={`Remove ${section.title}`}
            onClick={() => save(value.filter((_, i) => i !== index))}
          >×</button>
        </div>
        <div class="section-filters">
          <label>Type<select value={section.type} onChange={e => update(index, 'type', e.currentTarget.value)}>
            <option value="movie">Movies</option>
            <option value="tv">TV</option>
          </select></label>
          <label>Sort<select value={section.sort} onChange={e => update(index, 'sort', e.currentTarget.value)}>
            <option value="popularity.desc">Popular</option>
            <option value="vote_average.desc">Highest rated</option>
            <option value={section.type === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc'}>Newest</option>
          </select></label>
          <label>Language<select
            value={section.language}
            onChange={e => update(index, 'language', e.currentTarget.value)}
          >
            <option value="">Global filters</option>
            {(catalogs.data?.languages || []).map(
              x => <option key={x.iso_639_1} value={x.iso_639_1}>{x.english_name || x.name}</option>
            )}
          </select></label>
          <label>Country<select
            value={section.country}
            onChange={e => update(index, 'country', e.currentTarget.value)}
          >
            <option value="">Global filters</option>
            {(catalogs.data?.countries || []).map(
              x => <option key={x.iso_3166_1} value={x.iso_3166_1}>{x.english_name}</option>
            )}
          </select></label>
          <label>Genre<select value={section.genre} onChange={e => update(index, 'genre', e.currentTarget.value)}>
            <option value="">Global filters</option>
            {(catalogs.data?.[section.type] || []).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select></label>
          <label>Provider<select
            value={section.provider}
            onChange={e => update(index, 'provider', e.currentTarget.value)}
          >
            <option value="">Any provider</option>
            {providers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select></label>
        </div>
      </div>
    )}
    <button
      disabled={value.length >= 20}
      onClick={() => save(
        [
          ...value,
          {
            id: crypto.randomUUID(),
            title: 'New collection',
            type: 'movie',
            sort: 'popularity.desc',
            language: '',
            country: '',
            provider: '',
            genre: ''
          }
        ]
      )}
    >Add section</button>
    {catalogs.error && <p role="alert">Filter choices could not load: {catalogs.error.message}</p>}
  </div>;
}

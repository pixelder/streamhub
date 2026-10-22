import { useEffect, useRef, useState } from 'preact/hooks';
import { search } from '../../services/api.js';
import { image } from '../../utils/format.js';
import Icon from './Icon.jsx';

export default function SearchPicker({ type, selected, onChange }) {
  const [term, setTerm] = useState(''),
    [results, setResults] = useState([]),
    [open, setOpen] = useState(false),
    [error, setError] = useState('');
  const ref = useRef();
  useEffect(
    () => {
      if (term.length < 3) {
        setResults([]);
        return;
      }
      const controller = new AbortController();
      const timer = setTimeout(
        () => search(term, type, 1, { signal: controller.signal }).then(
          d => {
            setResults((d.results || []).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)));
            setOpen(true);
            setError('');
          }
        ).catch(
          e => {
            if (!controller.signal.aborted)
              setError(e.message);
          }
        ),
        300
      );
      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    },
    [term, type]
  );
  useEffect(
    () => {
      const outside = e => {
        if (!ref.current?.contains(e.target))
          setOpen(false);
      };
      document.addEventListener('click', outside);
      return () => document.removeEventListener('click', outside);
    },
    []
  );
  const name = type === 'person' ? 'cast' : 'company';
  return <div class="form-group">

    <div class="flow-row" style={{ minHeight: 'unset' }}>

      <label for={`${name}-input`}>{type === 'person' ? 'Cast' : 'Production Company'}</label>
      {type === 'person' && <div class="caution">

        <Icon name="triangle-exclamation" />

        <p>For Movies Only</p>

      </div>}

    </div>

    <div
      class="search-container"
      id={`search-with-${name}`}
      type={type}
      ref={ref}
      {...(open ? { expanded: '' } : {})}
    >

      <div class="search-box">

        <form
          class="flow-row"
          onSubmit={e => e.preventDefault()}
          onReset={() => {
            setTerm('');
            setResults([]);
            onChange([]);
          }}
        >

          <input
            id={`${name}-input`}
            type="search"
            value={term}
            placeholder={type === 'person' ? 'eg. Tom Cruise' : 'eg. Studio Ghibli'}
            onInput={e => setTerm(e.currentTarget.value)}
            onFocus={() => setOpen(true)}
          />

          <button
            type="reset"
            class="x-icon"
            aria-label="Clear"
          >

            <Icon name="xmark" />

          </button>

        </form>

        <div class="select-container">
          {selected.map(
            item => <div
              class="select-item"
              key={item.id}
              tabIndex="0"
              role="button"
              onClick={() => onChange(selected.filter(s => s.id !== item.id))}
              onKeyDown={e => {
                if (e.key === 'Enter')
                  onChange(selected.filter(s => s.id !== item.id));
              }}
            >
              {item.name}
            </div>
          )}
        </div>

        <div class="result-container">

          <div class="results" tabIndex="-1">
            {error && <p role="alert">{error}</p>}
            {results.filter(item => !selected.some(s => s.id === item.id)).map(
              item => <div
                class="result"
                key={item.id}
                tabIndex="0"
                role="button"
                onClick={() => onChange([
                  ...selected,
                  { id: item.id, name: item.name }
                ])}
                onKeyDown={e => {
                  if (e.key === 'Enter')
                    onChange([
                      ...selected,
                      { id: item.id, name: item.name }
                    ]);
                }}
              >

                <div class="img-container">

                  <img
                    src={image(
                      item.profile_path || item.logo_path,
                      'w92',
                      '/assets/images/no-image-transparent-dark.svg',
                      item.profile_path ? 'profile' : 'logo'
                    )}
                    loading="lazy"
                    alt=""
                  />

                </div>

                <p>{item.name}</p>

              </div>
            )}
          </div>

        </div>

      </div>

    </div>

  </div>;
}

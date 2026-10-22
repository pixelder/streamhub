import { useEffect, useRef, useState } from 'preact/hooks';
import { useAsync } from '../../hooks/useAsync.js';
import { tmdb } from '../../services/api.js';
import Icon from './Icon.jsx';

export default function SelectMenu({ type, value, onChange }) {
  const { data, error } = useAsync(
    signal => tmdb(`configuration/${type === 'country' ? 'countries' : 'languages'}`, {}, { signal }),
    [type]
  );
  const [term, setTerm] = useState(''),
    [open, setOpen] = useState(false),
    [hover, setHover] = useState(-1);
  const ref = useRef();
  const code = i => i.iso_639_1 || i.iso_3166_1;
  useEffect(
    () => {
      if (data)
        setTerm(data.find(d => code(d) === value)?.english_name || value || '');
    },
    [data, value]
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
  const items = [...(data || [])].sort((a, b) => a.english_name.localeCompare(b.english_name)).filter(
    i => i.english_name.toLowerCase().includes(term.toLowerCase())
  );
  const select = i => {
    onChange(code(i));
    setTerm(i.english_name);
    setOpen(false);
    setHover(-1);
  };
  const keys = e => {
    if (e.key === 'Escape' || e.key === 'Tab')
      setOpen(false);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const index = Math.max(0, Math.min(items.length - 1, hover + (e.key === 'ArrowDown' ? 1 : -1)));
      setHover(index);
      ref.current.querySelectorAll('.list-item')[index]?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (items[hover])
        select(items[hover]);
    }
  };
  return <div
    class="form-group selectMenu-container"
    id={type === 'country' ? 'countrySelect' : 'langSelect'}
    ref={ref}
  >

    <label for={`${type}-input`}>{type[0].toUpperCase() + type.slice(1)}</label>

    <div class="search-box input-wrapper">

      <form
        class="flow-row"
        onSubmit={e => e.preventDefault()}
        onReset={() => {
          onChange('');
          setTerm('');
          setOpen(false);
        }}
      >

        <input
          class="select-input"
          id={`${type}-input`}
          value={term}
          placeholder={`Select ${type}...`}
          onFocus={() => setOpen(true)}
          onInput={e => {
            setTerm(e.currentTarget.value);
            setHover(-1);
            setOpen(true);
          }}
          onKeyDown={keys}
        />

        <button
          type="reset"
          class="clear-btn x-icon"
          aria-label={`Clear ${type}`}
        >

          <Icon name="xmark" />

        </button>

      </form>

    </div>

    <div class="selectMenu">

      <div class={`select-list ${open ? 'open' : ''}`}>
        {error && <p role="alert">{error.message}</p>}
        {items.map(
          (item, i) => <div
            class={`list-item ${value === code(item) ? 'active' : ''} ${i === hover ? 'hover' : ''}`}
            key={code(item)}
            onMouseEnter={() => setHover(i)}
            onClick={() => select(item)}
          >

            <p>{item.english_name}</p>

            <p class="abbr">{code(item)}</p>

          </div>
        )}
      </div>

    </div>

  </div>;
}

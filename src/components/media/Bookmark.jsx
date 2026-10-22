import { useStorage } from '../../hooks/useStorage.js';
import { exists, toggleBookmark } from '../../stores/storage.js';
import Icon from '../common/Icon.jsx';

export default function Bookmark({ id, type, card = false }) {
  const checked = useStorage(() => exists('bookmarks', type, id));
  const toggle = e => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(type, id);
  };
  if (card)
    return <div class="grid-actions bookmarks">

      <div class={`grid-options ${checked ? 'open' : ''}`}>

        <div
          role="button"
          aria-label={checked ? 'Remove bookmark' : 'Bookmark'}
          aria-pressed={checked}
          tabIndex="0"
          class="options-buttons"
          onClick={toggle}
          onKeyDown={e => {
            if (['Enter', ' '].includes(e.key))
              toggle(e);
          }}
        >

          <Icon
            regular
            name="bookmark"
            class="options-icon fa-regular fa-bookmark"
          />

          <Icon name="bookmark" class="options-x-icon fa-solid fa-bookmark" />

        </div>

      </div>

    </div>;
  return <label
    tabIndex="0"
    class="selectable active bookmark"
    title="bookmark"
    onClick={toggle}
    onKeyDown={e => {
      if (e.key === 'Enter')
        toggle(e);
    }}
  >

    <input
      type="checkbox"
      checked={checked}
      readOnly
      aria-label="Bookmark"
    />

    <span class="checkbox-button">

      <i class="options-icon fa-regular fa-bookmark active" />

      <i class="options-x-icon fa-solid fa-bookmark passive" />

    </span>

  </label>;
}

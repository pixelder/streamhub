import { usePreferences } from '../../hooks/usePreferences.js';
import { defaultAnimeFormat } from '../settings/preferences.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { providers } from './providers.js';
import Icon from '../../components/common/Icon.jsx';

export default function ProviderMenu({ source, mediaType, settings, select }) {
  const preferences = usePreferences();
  const availableProviders = preferences.customSource ? [
    ...providers,
    { ds: '900', name: 'Custom' }
  ] : providers;
  const [show, setShow] = useState(false),
    [pinned, setPinned] = useState(false);
  const ref = useRef(),
    timer = useRef(),
    closed = useRef(false);
  useEffect(
    () => {
      const outside = event => {
        if (!ref.current?.contains(event.target)) {
          setShow(false);
          setPinned(false);
        }
      };
      document.addEventListener('click', outside);
      return () => {
        clearTimeout(timer.current);
        document.removeEventListener('click', outside);
      };
    },
    []
  );
  return <div
    class="provider-menu"
    ref={ref}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); setShow(false); setPinned(false); ref.current?.querySelector('button')?.focus(); }
    }}
    onMouseEnter={() => {
      clearTimeout(timer.current);
      if (!closed.current)
        setShow(true);
    }}
    onMouseLeave={() => {
      closed.current = false;
      if (!pinned)
        timer.current = setTimeout(() => setShow(false), 250);
    }}
  >

    <button
      class="provider-change"
      aria-label="Change provider"
      aria-expanded={show}
      aria-controls="watch-providers"
      style={{ backgroundColor: pinned ? 'var(--color1)' : '' }}
      onClick={() => {
        setShow(!pinned);
        setPinned(!pinned);
        closed.current = pinned;
      }}
    >
      <Icon name="server" />
    </button>

    <div id="watch-providers" class={`providers ${show ? 'show' : ''}`} inert={show ? undefined : ''}>

      <div class="pv-header">
        <div class="flow-row">
          <h4>Providers</h4>

          <button
            class="close-btn centered-control"
            aria-label="Close providers"
            onClick={() => {
              setShow(false);
              setPinned(false);
              closed.current = true;
            }}
          >
            <Icon name="xmark" />
          </button>

        </div>
        <hr />
      </div>

      <div class="provider-list">
        {availableProviders.map(
          provider => <div
            key={provider.ds}
            class={`provider ${Number(provider.ds) === source ? 'selected' : ''}`}
            role="button"
            aria-pressed={Number(provider.ds) === source}
            tabIndex="0"
            data-source={provider.ds}
            style={{ display: provider.hidden || provider.hiddenOn === mediaType ? 'none' : '' }}
            onClick={() => select(provider)}
            onKeyDown={event => {
              if (['Enter', ' '].includes(event.key) && event.target === event.currentTarget) {
                event.preventDefault();
                select(provider);
              }
            }}
          >

            <p class="provider-name">{provider.name}</p>
            {provider.settings?.map(
              setting => {
                const value = settings[provider.ds]?.[setting.type] ?? (setting.type === 'format'
                  ? defaultAnimeFormat(provider.ds)
                  : setting.switches.find(item => item.active).value);
                const toggle = () => select(provider, { [setting.type]: setting.switches.find(item => item.value !== value).value });
                return <span
                  key={setting.type}
                  class="provider-settings"
                  data-source={provider.ds}
                >

                  <p class={`type ${setting.type}`}>{setting.switches.find(item => item.value === value)?.label}</p>

                  <div class="switch-buttons">
                    {setting.switches.map(
                      item => <button
                        key={item.value}
                        class={`switch ${value === item.value ? 'active' : ''}`}
                        aria-label={`${provider.name} ${item.label}`}
                        onClick={event => {
                          event.stopPropagation();
                          toggle();
                        }}
                      />
                    )}
                  </div>

                </span>;
              }
            )}

          </div>
        )}
      </div>

    </div>

  </div>;
}

import { usePreferences } from '../../hooks/usePreferences.js';
import { useEffect, useState, useRef } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { normalizePath } from '../../app/routes.js';
import { navigate } from '../../app/navigation.js';
import Icon from '../common/Icon.jsx';

export default function Navigation({ bottom = false }) {
  const preferences = usePreferences();
  const { path: rawPath, url } = useLocation();
  const path = normalizePath(rawPath);
  const [query, setQuery] = useState('');
  const ref = useRef();
  useEffect(
    () => {
      setQuery(path === '/search' ? new URL(url, location.origin).searchParams.get('q') || '' : '');
    },
    [url]
  );
  useEffect(
    () => {
      let last = document.body.scrollTop,
        timer;
      const el = ref.current;
      const scroll = () => {
        const y = document.body.scrollTop;
        document.querySelectorAll('.slide-backdrop').forEach(
          n => n.style.opacity = 1 - Math.min(y / 350, 1)
        );
        if (document.querySelector('.expandable.expanded'))
          return;
        const end = y + document.body.clientHeight + 16 >= document.body.scrollHeight;
        if (!bottom) {
          el.classList.toggle('detach', y > 56);
        }
        else {
          clearTimeout(timer);
          el.classList.toggle('detach', !end);
          if (end)
            el.classList.remove('hidden');
          else {
            const down = y > last;
            timer = setTimeout(() => el.classList.toggle('hidden', down), 150);
          }
        }
        last = y;
      };
      document.body.addEventListener('scroll', scroll, { passive: true });
      return () => {
        clearTimeout(timer);
        document.body.removeEventListener('scroll', scroll);
      };
    },
    [bottom]
  );
  const submit = e => {
    e.preventDefault();
    if (query.trim())
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };
  if (bottom)
    return <nav
      id="bottom-bar"
      class="detach"
      ref={ref}
      aria-label="Mobile navigation"
    >

      <ul>
        {[
          ['Home', '/', 'home', 'house'],
          ['Explore', '/explore', 'explore', 'compass'],
          ['Sports', '/sports', 'sports', 'basketball'],
          ['Tools', '/tools', 'tools', 'toolbox'],
          ['Library', '/library', 'library', 'folder-tree'],
          ['Settings', '/settings', 'settings', 'gear']
        ].map(
          ([label, href, id, icon]) => <li key={id}>

            <a
              href={href}
              aria-label={label}
              title={label}
              id={id}
              class={path === href || path === href + '/' ? 'active' : ''}
            >

              <Icon name={icon} />

              <p>{label}</p>

            </a>

          </li>
        )}
      </ul>

    </nav>;
  return <nav
    id="top-bar"
    ref={ref}
    aria-label="Main navigation"
  >

    <ul class="flex-row">

      <li class="home">

        <a href="/" aria-label="Pixelstream home" />

      </li>

      <li class="nav-path">

        <a
          href="/explore"
          aria-label="Explore"
          title="Explore"
        >
          {preferences.navIcons && <Icon name="compass" />}
          <span class="nav-label">Explore</span>
          <Icon name="angle-down" />
        </a>

        <div class="nav-sub-path">
          {[['Movies', 'movie'], ['TV Shows', 'tv'], ['Anime', 'anime']].map(
            ([name, type]) => <div key={type}>

              <a href={`/explore?type=${type}`}>{name}</a>

            </div>
          )}
        </div>

      </li>

      <li>

        <a
          href="/#discover-streaming"
          aria-label="What's Streaming"
          title="What's Streaming"
        >
          {preferences.navIcons && <Icon name="tv" />}
          <span class="nav-label">What's Streaming</span>
        </a>

      </li>

      <li>

        <a
          href="/sports"
          aria-label="Sports"
          title="Sports"
        >
          {preferences.navIcons && <Icon name="basketball" />}
          <span class="nav-label">Sports</span>
        </a>

      </li>

      <li>

        <a
          href="/tools"
          aria-label="Tools"
          title="Tools"
        >
          {preferences.navIcons && <Icon name="toolbox" />}
          <span class="nav-label">Tools</span>
        </a>

      </li>

      <li>

        <a
          href="/library"
          aria-label="Library"
          title="Library"
        >
          {preferences.navIcons && <Icon name="folder-tree" />}
          <span class="nav-label">Library</span>
        </a>

      </li>

      <li>
        <a
          href="/settings"
          aria-label="Settings"
          class="settings-link"
          aria-current={path === '/settings' ? 'page' : undefined}
          title={`Settings — ${preferences.profile.name || 'Guest'}`}
        >
          {preferences.navIcons && (preferences.profile.avatar ? <img src={preferences.profile.avatar} alt="" /> : <Icon name="gear" />)}
          <span class="nav-label">Settings</span>
        </a>
      </li>
      <form
        class="search-bar"
        onSubmit={submit}
        onReset={() => {
          setQuery('');
          if (path === '/search')
            navigate('/search?q=', true);
        }}
      >

        <input
          type="search"
          id="search-input"
          value={query}
          aria-label="Search for movies, tv shows or a person"
          placeholder="Search for movies, tv shows or a person"
          onInput={e => {
            const q = e.currentTarget.value;
            setQuery(q);
            if (path === '/search')
              navigate(`/search?q=${encodeURIComponent(q)}`, true);
          }}
        />

        <button
          type="reset"
          class="x-icon"
          aria-label="Clear search"
        >

          <Icon name="xmark" />

        </button>

        <button class="search-icon" aria-label="Search">

          <Icon name="magnifying-glass" />

        </button>

      </form>

    </ul>

  </nav>;
}

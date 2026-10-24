import { isBlocked, permitsBasic } from '../../services/catalogPolicy.js';
import { usePreferences } from '../../hooks/usePreferences.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useUI } from '../../hooks/useUI.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useStorage } from '../../hooks/useStorage.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { closeDetails, openDetails, modalBack, modalForward, notify } from '../../stores/ui.js';
import { progressFor } from '../../stores/storage.js';
import { metadata } from '../../services/api.js';
import {

  titleOf,
  image,
  yearOf,
  dateOf,
  runtime,
  truncate,
  upcoming,
  trailerKey,
  watchUrl,
  plural
} from '../../utils/format.js';
import { navigate } from '../../app/navigation.js';
import Bookmark from './Bookmark.jsx';
import EpisodeList from './EpisodeList.jsx';
import Synopsis from '../common/Synopsis.jsx';
import Loading from '../common/Loading.jsx';
import TitleJournal from '../../features/personal/TitleJournal.jsx';
import Icon from '../common/Icon.jsx';

function External({ href, icon, name }) {
  return <a
    class="external"
    title={`visit ${name} page`}
    href={href}
    target="_blank"
    rel="noopener noreferrer"
  >

    <img src={`/assets/icons/${icon}`} alt={name} />

  </a>;
}

function Credits({ data }) {
  const acting = data.known_for_department === 'Acting';
  const crew = [...(data.combined_credits?.crew || [])].sort(
    (a, b) => Number(b.department === data.known_for_department) - Number(a.department === data.known_for_department)
  );
  const groups = [...new Set(crew.map(c => c.department))].map(dep => [dep, crew.filter(c => c.department === dep)]);
  const cast = ['Cast', data.combined_credits?.cast || []];
  acting ? groups.unshift(cast) : groups.push(cast);
  return <div class="person-credits">

    <h2>Credits</h2>

    <div class="credit-container" style={{ all: 'inherit' }}>
      {groups.map(
        ([name, items], i) => <CreditGroup
          key={name}
          name={name}
          items={items.filter(c => !c.adult)}
          initial={i === 0}
          profile={data.profile_path}
        />
      )}
    </div>

  </div>;
}

function CreditGroup({ name, items, initial, profile }) {
  const [expanded, set] = useState(initial);
  items = items.filter(item => permitsBasic(item, item.media_type || item.mediaType || 'movie'));
  if (!items.length)
    return null;
  return <div class={`credit-section ${expanded ? 'expanded' : ''}`}>

    <div
      class="section-header"
      style={{ paddingTop: 0 }}
      role="button"
      tabIndex="0"
      onClick={() => set(!expanded)}
      onKeyDown={e => {
        if (e.key === 'Enter')
          set(!expanded);
      }}
    >

      <p class="credit-type">{name}</p>

      <div class="expand-arrow">

        <Icon name="chevron-left" />

      </div>

    </div>

    <div class={`grid-container ${name.replaceAll(' ', '-')}`}>
      {items.map(
        (item, i) => <div
          class="grid-item"
          key={`${item.credit_id || item.id}-${i}`}
          tabIndex="0"
          role="button"
          onClick={() => openDetails(item, true)}
          onKeyDown={e => {
            if (e.key === 'Enter')
              openDetails(item, true);
          }}
        >

          <img
            loading="lazy"
            src={image(item.poster_path || profile, 'w300', undefined, item.poster_path ? 'poster' : 'profile')}
            alt=""
          />

          <div class="credit-item-info">

            <p class="credit-name">{item.job || item.character || 'N/A'}</p>

            <p class="credit-media-title">
              {titleOf(item)}
              {yearOf(item.release_date || item.first_air_date)
                ? ` (${yearOf(item.release_date || item.first_air_date)})`
                : ''}
            </p>

            <p>{item.media_type === 'tv' ? 'TV' : 'Movie'}</p>

          </div>

        </div>
      )}
    </div>

  </div>;
}

function PersonDetails({ data, nav }) {
  const mobile = useMediaQuery('(max-width: 767px)');
  const ex = data.external_ids || {};
  return <>
    <div
      class="modal-media"
      style={mobile ? {} : { flexWrap: 'wrap', flexDirection: 'unset' }}
    >
      {nav}
      {data.profile_path && <div class="modal-cover portrait" style={{ display: 'flex' }}>

        <img
          style={{ opacity: 1 }}
          src={image(data.profile_path, 'w300', undefined, 'profile')}
          alt=""
        />

      </div>}

      <div id="person-details">

        <h2 class="name">{data.name} {data.birthday && <em>({yearOf(data.birthday)} - {yearOf(data.deathday) || ''})</em>}</h2>

        <div class="info">

          <p class="department">Known For: {data.known_for_department}</p>

          <p class="gender">Gender : {['Not specified', 'Female', 'Male', 'Other'][data.gender]}</p>

          <Synopsis className="biography">{data.biography}</Synopsis>

        </div>

        <div class="item-actions">

          <External
            href={`https://tmdb.org/person/${data.id}`}
            icon="tmdb_short.svg"
            name="tmdb"
          />
          {data.imdb_id && <External
            href={`https://www.imdb.com/name/${data.imdb_id}`}
            icon="imdb_short.png"
            name="imdb"
          />}
          {[
            ['wikidata_id', 'https://www.wikidata.org/wiki/', 'Wikidata-logo.svg'],
            ['instagram_id', 'https://instagram.com/', 'Instagram_Glyph_Gradient.svg'],
            ['twitter_id', 'https://x.com/', 'twitter.svg'],
            ['youtube_id', 'https://www.youtube.com/', 'yt_full.png']
          ].map(
            ([key, base, icon]) => ex[key] && <External
              key={key}
              href={base + ex[key]}
              icon={icon}
              name={key.replace('_id', '')}
            />
          )}

        </div>

      </div>

    </div>
    <Credits data={data} />
  </>;
}

function MediaDetails({ data, type, nav, initial }) {
  useStorage();
  const [trailer, setTrailer] = useState(''),
    [menu, setMenu] = useState(false),
    [tracking, setTracking] = useState(false),
    [fullDate, setFullDate] = useState(false),
    [season, setSeason] = useState(null);
  const trailerRef = useRef();
  const menuRef = useRef(), optionsButton = useRef(), trackingBack = useRef();
  const wasTracking = useRef(false);
  useEffect(() => {
    if (tracking) trackingBack.current?.focus();
    else if (wasTracking.current) optionsButton.current?.focus();
    wasTracking.current = tracking;
  }, [tracking]);
  useEffect(() => {
    if (!menu) return;
    const outside = event => {
      if (!menuRef.current?.contains(event.target) && !optionsButton.current?.contains(event.target)) setMenu(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menu]);
  const name = titleOf(data),
    logo = data.images?.logos?.[0]?.file_path,
    date = data.release_date || data.first_air_date;
  const imdb = data.imdb_id || data.external_ids?.imdb_id;
  const progress = type === 'movie' ? progressFor(type, data.id) : 0;
  const tvDate = [...(data.seasons || [])].filter(s => s.air_date).sort(
    (a, b) => new Date(b.air_date) - new Date(a.air_date)
  )[0]?.air_date;
  const releaseDate = type === 'movie' ? date : upcoming(tvDate) ? tvDate : data.next_episode_to_air?.air_date;
  const future = upcoming(releaseDate);
  const rated = type === 'movie'
    ? (data.release_dates?.results || []).find(r => r.iso_3166_1 === 'US')?.release_dates?.find(
      r => r.certification
    )?.certification
    : (data.content_ratings?.results || []).find(r => r.iso_3166_1 === 'US')?.rating;
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text));
      notify('Copied to clipboard!');
      setMenu(false);
    }
    catch (e) {
      notify(e.message);
    }
  };
  const share = async () => {
    const url = `${location.origin}/${type}?id=${data.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ text: name, url });
        setMenu(false);
        return;
      }
    }
    catch (error) { if (error.name === 'AbortError') return; }
    await copy(url);
  };
  const actions = <>
    <button
      class="play-trailer centered-control"
      title="play trailer"
      onClick={() => {
        if (trailer) {
          setTrailer('');
          return;
        }
        const key = trailerKey(
          [...(data.videos?.results || []), ...(season?.videos?.results || [])],
          season?.season_number
        );
        key ? setTrailer(key) : notify('No trailer available');
      }}
    >

      <Icon name={trailer ? 'xmark' : 'video'} />
      {trailer ? 'Close' : 'Trailer'}

    </button>
    <div class="item-actions">

      <External
        href={`https://tmdb.org/${type}/${data.id}`}
        icon="tmdb_short.svg"
        name="tmdb"
      />
      {imdb && <External
        href={`https://www.imdb.com/title/${imdb}`}
        icon="imdb_short.png"
        name="imdb"
      />}

      <Bookmark id={data.id} type={type} />

      <button
        ref={optionsButton}
        class={`item-options ${menu ? 'active' : ''}`}
        title="options"
        aria-label="Title options"
        aria-expanded={menu}
        aria-controls="title-options"
        onClick={() => setMenu(!menu)}
      >

        <Icon name="ellipsis-vertical" />

      </button>

      <div ref={menuRef} id="title-options" class={`item-menu ${menu ? 'active' : ''}`} onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); setMenu(false); optionsButton.current?.focus(); }
      }}>

        <button class="item" onClick={() => { setMenu(false); setTracking(true); }}><Icon name="star" />Rate &amp; track</button>

        <button class="item share" onClick={share}><Icon name="paper-plane" />Share</button>

        <button class="item copy-name" onClick={() => copy(name)}><Icon name="text-width" />Copy Name</button>

        <button class="item copy-id" onClick={() => copy(data.id)}><Icon name="hashtag" />Copy id</button>

        {imdb && <a
          class="item"
          href={`https://www.imdb.com/title/${imdb}/parentalguide/`}
          target="_blank"
          rel="noopener noreferrer"
        ><Icon name="book" />Parental Guide</a>}

        <a
          class="item"
          href={`https://search.brave.com/ask?q=${encodeURIComponent(`${name} (${yearOf(date)}) digital release date`)}`}
          target="_blank"
          rel="noopener noreferrer"
        ><Icon name="square-up-right" />Check Digital Release</a>

      </div>

    </div>
  </>;
  if (tracking) return <div class="title-tracking-pane" onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); setTracking(false); }
  }}>
    <button ref={trackingBack} class="tracking-back" onClick={() => setTracking(false)}><Icon name="arrow-left" /> Title details</button>
    <h2>Rate &amp; track</h2>
    <p>{name}</p>
    <TitleJournal data={data} type={type} expanded />
  </div>;
  return <>
    <div class="trailer-container" ref={trailerRef}>
      {trailer && <>
        <div class="fs-button">

          <label class="selectable active">

            <input
              type="checkbox"
              aria-label="Fullscreen trailer"
              onChange={() => {
                if (document.fullscreenElement)
                  document.exitFullscreen();
                else
                  trailerRef.current.requestFullscreen?.().catch(e => notify(e.message));
              }}
            />

            <span class="checkbox-button">

              <i class="fa-solid fa-expand active" />

              <i class="fa-solid fa-compress passive" />

            </span>

          </label>

        </div>
        <iframe
          id="ytplayer"
          title={`${name} trailer`}
          class={`${type}-trailer`}
          src={`https://www.youtube.com/embed/${trailer}?autoplay=1&controls=0&rel=0&color=white&iv_load_policy=3`}
          frameBorder="0"
          scrolling="no"
        />
      </>}
    </div>
    <div class="modal-media">
      {nav}

      <span class="flex-col">

        <div class="modal-info-logo flex-row">
          {logo && <img src={image(logo, 'w500', undefined, 'logo')} alt="Logo" />}
        </div>

        <div class="modal-info flex-col">
          {!logo && <h1>{name.toUpperCase()}</h1>}

          <span class="ratings-genre">

            <p data-title={`${data.vote_count} votes`}>
              {data.vote_average
                ? <>
                  <Icon name="star" />
                  {truncate(data.vote_average)}
                </>
                : <img
                  class="nostar"
                  src="/assets/icons/nostar.svg"
                  alt="Not rated"
                />}
            </p>

            <span class="modal-genre">
              {data.genres?.slice(0, 5).map(
                g => <a key={g.id} href={`/explore?type=${type}&genre=${g.id}`}>{g.name.toUpperCase()}</a>
              )}
            </span>

          </span>

          <Synopsis>{data.overview}</Synopsis>

          <p class="cast">
            {data.credits?.cast?.length
              ? <>Cast : {data.credits.cast.filter(person => !isBlocked('person', person.id)).slice(0, 6).map(
                (c, i) => <span key={c.id}>
                  {i > 0 ? ', ' : ''}

                  <a
                    href={`/person?id=${c.id}`}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDetails({ id: c.id, mediaType: 'person' }, true);
                    }}
                  >
                    {c.name}
                  </a>

                </span>
              )}</>
              : <em>No cast information available</em>}
          </p>
          {data.production_companies?.length > 0 && <p class="company">
            {data.production_companies.slice(0, 2).map(
              (c, i) => <span key={c.id}>
                {i > 0 ? ' • ' : ''}

                <a href={`/explore?type=studio&company=${c.id}&title=${encodeURIComponent(c.name)}`}>{c.name}</a>

              </span>
            )}
          </p>}

          <div class="tags">
            {date && <p class="year" onClick={() => setFullDate(!fullDate)}>
              {fullDate ? date.split('-').reverse().join('-') : yearOf(date)}
            </p>}
            {[
              rated,
              data.original_language?.toUpperCase(),
              type === 'movie'
                ? data.runtime && runtime(data.runtime)
                : data.number_of_seasons && plural(data.number_of_seasons, 'season')
            ].filter(
              Boolean
            ).map(
              (tag, i) => <span key={i}> • {tag}</span>
            )}
          </div>

        </div>

      </span>
      {future && <div class="releasing-on">

        <p>{type === 'movie' ? 'Releasing' : data.next_episode_to_air ? 'Next Episode' : 'New season'} on {dateOf(releaseDate)}.</p>

      </div>}

    </div>
    {progress > 0 && (progress === 100
      ? <p class="watched-check"><Icon name="check" />Watched</p>
      : <p class="remaining-time">{runtime(data.runtime - Math.floor(data.runtime * progress / 100), true)} remaining</p>)}
    {type === 'movie'
      ? <div class="modal-actions">
        {!future && <button
          class={`watch-btn centered-control ${progress === 100 ? 'watched' : ''}`}
          onClick={() => navigate(watchUrl(type, data.id))}
        >

          <Icon name="play" />
          {progress === 100 ? 'Rewatch' : progress ? 'Resume' : 'Watch'}
          {progress > 0 && progress < 100 && <div class="progress-indicator" style={{ '--progress': progress }} />}

        </button>}
        {actions}
      </div>
      : <EpisodeList
        data={data}
        sno={initial.sno}
        eno={initial.eno}
        actions={actions}
        onLoaded={setSeason}
      />}
  </>;
}

function ModalContent({ item, back, forward, close }) {
  const preferences = usePreferences();
  const { data, loading, error } = useAsync(
    signal => metadata(item.mediaType, item.id, true, { signal }),
    [
      item.id,
      item.mediaType,
      JSON.stringify(preferences.blacklist),
      preferences.hideMature,
      preferences.excludeAdult
    ]
  );
  const ref = useRef(),
    backdrop = useRef();
  useFocusTrap(ref, true, close);
  const nav = (back.length || forward.length) > 0
    ? <div class="nav-btn-container" style={{ width: '100%', flex: '1 0 auto' }}>

      <button
        id="prev-btn"
        disabled={!back.length}
        style={{ opacity: back.length ? 1 : .4 }}
        onClick={modalBack}
      >

        <Icon name="angle-left" />

        <p>Back</p>

      </button>

      <button
        id="fwd-btn"
        disabled={!forward.length}
        style={{ opacity: forward.length ? 1 : .4 }}
        onClick={modalForward}
      >

        <p>Previous</p>

        <Icon name="angle-right" />

      </button>

    </div>
    : null;
  return <div
    id="modal-parent"
    style={{
      height: item.mediaType === 'movie' ? 'fit-content' : innerWidth <= 768 ? '70%' : '35rem'
    }}
  >

    <div
      id="modal-backdrop"
      ref={backdrop}
      style={{
        backgroundImage: data?.backdrop_path ? `url(${image(data.backdrop_path, 'original')})` : ''
      }}
    />

    <div class="modal-content">

      <div
        id="modal-details"
        ref={ref}
        tabIndex="0"
        data-id={item.id}
        data-media-type={item.mediaType}
        onScroll={e => {
          if (backdrop.current)
            backdrop.current.style.opacity = 1 - Math.min(e.currentTarget.scrollTop / 300, 1);
        }}
      >
        {loading
          ? <Loading />
          : error
            ? <Loading error={error} />
            : item.mediaType === 'person'
              ? <PersonDetails data={data} nav={nav} />
              : <MediaDetails
                key={`${item.mediaType}-${item.id}`}
                data={data}
                type={item.mediaType}
                nav={nav}
                initial={item}
              />}
      </div>

    </div>

  </div>;
}

export default function DetailsModal() {
  const { modal, back, forward } = useUI();
  const close = () => {
    closeDetails();
    if (/^\/(movie|tv|person)$/.test(location.pathname))
      navigate('/', true);
  };
  useEffect(
    () => {
      if (!modal)
        return;
      const bars = [...document.querySelectorAll('#top-bar.detach,#bottom-bar.detach')];
      bars.forEach(b => b.classList.add('hidden'));
      return () => {
        bars.forEach(b => b.classList.remove('hidden'));
      };
    },
    [!!modal]
  );
  return <>
    <div class="modal-overlay" />
    <div
      id="info-modal"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label="Media details"
      {...(modal ? { active: '' } : {})}
      onClick={e => {
        if (e.target === e.currentTarget)
          close();
      }}
    >
      {modal && <ModalContent
        item={modal}
        back={back}
        forward={forward}
        close={close}
      />}
    </div>
  </>;
}

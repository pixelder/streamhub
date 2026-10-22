import { isBlocked } from '../../services/catalogPolicy.js';
import { image, titleOf, truncate, yearOf, capString, upcoming } from '../../utils/format.js';
import { openDetails } from '../../stores/ui.js';
import { progressFor } from '../../stores/storage.js';
import { useStorage } from '../../hooks/useStorage.js';
import Bookmark from './Bookmark.jsx';
import Progress from './Progress.jsx';

export function Rating({ value, disabled = false }) {
  return <span class="grid-rating">

    <p class="rating">
      {value && !disabled
        ? <>
          <i class="fa-solid fa-star" />
          {truncate(value)}
        </>
        : <img
          class="nostar"
          src="/assets/icons/nostar.svg"
          alt="Not rated"
        />}
    </p>

  </span>;
}

export default function MediaCard({ item, vertical = true, nested = false }) {
  const type = item.media_type || 'movie';
  const progress = useStorage(() => progressFor(type, item.id));
  const open = () => openDetails({ id: item.id, mediaType: type }, nested);
  const future = upcoming(item.release_date || item.first_air_date);
  if (isBlocked(type, item.id)) return null;
  if (type === 'person')
    return <div
      class="profile-item"
      data-id={item.id}
      data-media-type="person"
      tabIndex="0"
      role="button"
      onClick={open}
      onKeyDown={e => {
        if (e.key === 'Enter')
          open();
      }}
    >

      <span>

        <img
          src={image(item.profile_path, 'w300', undefined, 'profile')}
          alt=""
          loading="lazy"
        />

      </span>

      <div class="profile-item-info">

        <p class="name">{capString(titleOf(item), 30)}</p>

        <p>

          <em>{item.known_for_department}</em>

        </p>

      </div>

    </div>;
  return <div
    class="grid-item"
    data-id={item.id}
    data-media-type={type}
    tabIndex="0"
    draggable
    role="button"
    onClick={open}
    onKeyDown={e => {
      if (e.key === 'Enter')
        open();
    }}
  >

    <div class="img-container">

      <Bookmark
        card
        id={item.id}
        type={type}
      />

      <img
        src={image(item.poster_path)}
        alt={titleOf(item)}
        loading="lazy"
      />

      <Progress value={progress} ring={vertical} />
      {future && <div class="upcoming">

        <div class="text" />

      </div>}

    </div>

    <div class="grid-item-info">

      <p>{capString(titleOf(item))}</p>

      <Rating value={item.vote_average} disabled={future} />

      <p>{yearOf(item.release_date || item.first_air_date) || 'N/A'}</p>

    </div>

  </div>;
}

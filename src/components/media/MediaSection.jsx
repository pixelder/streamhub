import { useEffect, useRef, useState } from 'preact/hooks';
import { useHorizontalScroll } from '../../hooks/useHorizontalScroll.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import MediaCard from './MediaCard.jsx';
import Loading from '../common/Loading.jsx';
import Icon from '../common/Icon.jsx';

export default function MediaSection({ id, title, items = [], loading, error, onMore, hasMore = true, filtered = false, children, gridChildren, headerActions, selectActions, user = false, logType, vertical = true, collapsible = false, profiles = false, empty }) {
  const [expanded, setExpanded] = useState(false),
    [visible, setVisible] = useState(true);
  const ref = useRef(),
    grid = useRef(),
    position = useRef(0),
    busy = useRef(false);
  useHorizontalScroll(grid, 5, [expanded]);
  useFocusTrap(ref, expanded, () => setExpanded(false));
  useEffect(
    () => {
      if (!expanded)
        return;
      position.current = document.body.scrollTop;
      const bars = [...document.querySelectorAll('#top-bar,#bottom-bar')];
      bars.forEach(n => n.classList.add('hidden'));
      ref.current.scrollIntoView({ block: 'start' });
      return () => {
        bars.forEach(n => n.classList.remove('hidden'));
        document.body.scrollTo({ top: position.current, behavior: 'instant' });
      };
    },
    [expanded]
  );
  const more = async () => {
    const el = grid.current;
    if (!el || !expanded || !onMore || !hasMore || loading || error || busy.current || el.scrollTop + el.clientHeight < el.scrollHeight - 140)
      return;
    busy.current = true;
    try {
      await onMore();
    }
    finally {
      busy.current = false;
    }
  };
  useEffect(
    () => {
      if (!expanded || loading || error || !hasMore) return;
      const frame = requestAnimationFrame(() => void more());
      return () => cancelAnimationFrame(frame);
    },
    [expanded, loading, items.length, hasMore, error]
  );
  return <section
    ref={ref}
    id={id}
    data-type={logType}
    style={error ? { display: 'flex' } : undefined}
    class={`${user ? 'user-content ' : ''}${user && logType !== 'bookmarks' ? 'hr-grid-view ' : ''}expandable ${expanded ? 'expanded ' : ''}${visible ? 'in-view' : ''}`}
  >

    <div class="section-header">
      {collapsible ? <h3>{title}</h3> : <h2>{title}</h2>}
      {selectActions}

      <div class="actions">
        {headerActions}
        {collapsible && <div
          class="expand-arrow"
          role="button"
          tabIndex="0"
          aria-label="Collapse section"
          onClick={() => setVisible(!visible)}
          onKeyDown={e => {
            if (e.key === 'Enter')
              setVisible(!visible);
          }}
        >

          <Icon name="chevron-down" />

        </div>}

        <div
          class="maximize"
          role="button"
          tabIndex="0"
          aria-label={`Expand ${title}`}
          onClick={() => {
            setVisible(true);
            setExpanded(true);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setVisible(true);
              setExpanded(true);
            }
          }}
        >

          <Icon name="angle-right" />

        </div>

        <div
          class="close-window"
          role="button"
          tabIndex="0"
          aria-label="Close expanded section"
          onClick={() => setExpanded(false)}
          onKeyDown={e => {
            if (e.key === 'Enter')
              setExpanded(false);
          }}
        >

          <Icon name="xmark" />

        </div>

      </div>

    </div>
    {children
      ? children({
        gridRef: grid,
        onScroll: more,
        expanded
      })
      : <div
        class={`grid-container ${vertical ? 'vertical-card ' : ''}${profiles ? 'profiles ' : ''}${loading && !items.length && !gridChildren ? 'loading ' : ''}${empty ? 'empty' : ''}`}
        ref={grid}
        onScroll={more}
        tabIndex="-1"
      >{gridChildren || (expanded ? items : items.slice(0, 20)).map(
        i => <MediaCard
          key={`${i.media_type}-${i.id}`}
          item={i}
          vertical={vertical}
        />
      )}{loading && !items.length && !gridChildren && <Loading />}{error && <Loading error={error} />} {empty && <div class="empty">

        <div class="icon">

          <Icon name={logType === 'history' ? 'clock-rotate-left' : 'book-bookmark'} />

        </div>

        <div class="message">

          <h4>{empty}</h4>

        </div>

      </div>}</div>}
    {error && onMore && <div class="catalog-filter-note"><button disabled={loading} onClick={onMore}>Retry loading titles</button></div>}
    {filtered && !loading && !error && items.length < 20 && <div class="catalog-filter-note">
      <span>{items.length ? 'Some titles are hidden by your content filters.' : 'No titles on these pages match your content filters.'}</span>
      <a href="/settings?category=filters">Review filters</a>
      {hasMore && onMore && <button onClick={onMore}>Load more titles</button>}
    </div>}
  </section>;
}

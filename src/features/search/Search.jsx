import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { usePage } from '../../hooks/usePage.js';
import { usePaged } from '../../hooks/usePaged.js';
import { search } from '../../services/api.js';
import MediaSection from '../../components/media/MediaSection.jsx';

function Results({ type, term, onCount }) {
  const started = useRef(Date.now());
  useEffect(() => {
    started.current = Date.now();
  }, [term]);
  const data = usePaged(
    `${type}-${term}`,
    async (page, signal) => {
      if (!term.trim())
        return {
          results: [],
          total_results: 0,
          total_pages: 0
        };
      const result = await search(term, type, page, { signal });
      return {
        ...result,
        results: result.results.map(i => ({ ...i, media_type: type })).sort(
          (a, b) => (b.popularity || 0) - (a.popularity || 0)
        )
      };
    }
  );
  useEffect(
    () => {
      if (!data.loading && !data.error) onCount(type, data.total, Date.now() - started.current);
    },
    [data.total, data.loading]
  );
  return <MediaSection
    id={`${type}-results`}
    title={type === 'tv' ? 'TV Shows' : type === 'person' ? 'People' : 'Movies'}
    collapsible
    profiles={type === 'person'}
    logType={type}
    items={data.items}
    loading={data.loading}
    error={data.error}
    hasMore={data.hasMore}
    onMore={data.more}
  />;
}

export default function Search() {
  const { url } = useLocation();
  const query = new URL(url, location.origin).searchParams.get('q') || '';
  const [term, setTerm] = useState(query),
    [counts, setCounts] = useState({}),
    [time, setTime] = useState(0);
  usePage(`${query} - Pixelstream`, ['/search/styles.css']);
  useEffect(
    () => {
      if (query === term) return;
      const timer = setTimeout(() => {
        setTerm(query);
        setCounts({});
      }, 300);
      return () => clearTimeout(timer);
    },
    [query]
  );
  const onCount = (type, count, ms) => {
    setCounts(old => ({ ...old, [type]: count }));
    setTime(ms / 1000);
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return <div id="search-results">

    <div class="search-title">
      {!term.trim()
        ? <p>

          <em>&gt;&gt; type something to search &lt;&lt;</em>

        </p>
        : Object.keys(counts).length === 3 && !total
          ? <p>No results for <b>"{term}"</b></p>
          : <>
            <p>Showing results for <b>

              <em>'{term}'</em>

            </b></p>
            <p class="count">About {total.toLocaleString('en-IN')} catalog matches before local filters · {time.toFixed(1)}s</p>
          </>}
    </div>

    <div class="results-container">
      {['movie', 'tv', 'person'].map(
        type => <Results
          key={type}
          type={type}
          term={term}
          onCount={onCount}
        />
      )}
    </div>

  </div>;
}

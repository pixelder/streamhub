import { useEffect, useRef, useState } from 'preact/hooks';

export function useIncrementalItems(count, batch = 10) {
  const [limit, setLimit] = useState(batch),
    sentinel = useRef();
  useEffect(
    () => {
      if (limit >= count || !sentinel.current)
        return;
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting))
          setLimit(value => Math.min(count, value + batch));
      }, { rootMargin: '200px' });
      observer.observe(sentinel.current);
      return () => observer.disconnect();
    },
    [limit, count, batch]
  );
  return { limit, sentinel };
}

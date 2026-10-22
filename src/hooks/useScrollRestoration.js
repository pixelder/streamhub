import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

// The original application scrolls document.body, rather than window.
export function useScrollRestoration(url, path, wasPush) {
  const positions = useRef(new Map()),
    current = useRef(url),
    previousPath = useRef(null);
  const target = useRef(null),
    hash = useRef(''),
    frame = useRef();
  const ready = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(
      () => {
        if (hash.current) {
          const element = document.getElementById(hash.current);
          if (element) {
            element.scrollIntoView();
            hash.current = '';
          }
        } else if (target.current != null) {
          document.body.scrollTop = target.current;
          if (Math.abs(document.body.scrollTop - target.current) < 2) target.current = null;
        }
      }
    );
  };
  const apply = useRef(ready);
  apply.current = ready;
  useEffect(
    () => {
      const previous = history.scrollRestoration;
      history.scrollRestoration = 'manual';
      const save = () => {
        if (target.current == null) positions.current.set(current.current, document.body.scrollTop);
      };
      const pop = event => {
        target.current = event.isTrusted ? positions.current.get(location.pathname + location.search) || 0 : null;
      };
      const cancel = () => {
        target.current = null;
        hash.current = '';
      };
      const resize = new ResizeObserver(() => apply.current());
      resize.observe(document.querySelector('main'));
      document.body.addEventListener('scroll', save, { passive: true });
      window.addEventListener('popstate', pop);
      window.addEventListener('wheel', cancel, { passive: true });
      window.addEventListener('pointerdown', cancel, { passive: true });
      return () => {
        history.scrollRestoration = previous;
        resize.disconnect();
        cancelAnimationFrame(frame.current);
        document.body.removeEventListener('scroll', save);
        window.removeEventListener('popstate', pop);
        window.removeEventListener('wheel', cancel);
        window.removeEventListener('pointerdown', cancel);
      };
    },
    []
  );
  useLayoutEffect(
    () => {
      current.current = url;
      if (wasPush) target.current = null;
      try {
        hash.current = decodeURIComponent(location.hash.slice(1));
      } catch {
        hash.current = '';
      }
      if (previousPath.current !== path) {
        document.body.scrollTop = target.current ?? 0;
        previousPath.current = path;
      }
      ready();
    },
    [url]
  );
  return ready;
}

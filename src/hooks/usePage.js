import { useLayoutEffect } from 'preact/hooks';

export function usePage(title, styles = [], { sports = false } = {}) {
  useLayoutEffect(() => {
    document.title = title;
  }, [title]);
  useLayoutEffect(
    () => {
      const elements = styles.map(
        href => {
          const el = document.createElement('link');
          el.rel = 'stylesheet';
          el.href = href;
          if (sports)
            document.head.insertBefore(el, document.querySelector('[data-base-style]'));
          else
            document.head.append(el);
          return el;
        }
      );
      return () => elements.forEach(el => el.remove());
    },
    styles
  );
}

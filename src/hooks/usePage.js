import { useLayoutEffect } from 'preact/hooks';

export function usePage(title) {
  useLayoutEffect(() => {
    if (title) document.title = title;
  }, [title]);
}

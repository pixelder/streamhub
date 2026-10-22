import { useEffect, useState } from 'preact/hooks';

export function useAsync(load, dependencies) {
  const [state, set] = useState({
    data: null,
    loading: true,
    error: null
  });
  useEffect(
    () => {
      const controller = new AbortController();
      set({
        data: null,
        loading: true,
        error: null
      });
      Promise.resolve().then(() => load(controller.signal)).then(
        data => {
          if (!controller.signal.aborted)
            set({
              data,
              loading: false,
              error: null
            });
        }
      ).catch(
        error => {
          if (!controller.signal.aborted)
            set({
              data: null,
              loading: false,
              error
            });
        }
      );
      return () => controller.abort();
    },
    dependencies
  );
  return state;
}

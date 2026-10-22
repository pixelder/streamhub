import { usePreferences } from './usePreferences.js';
import { catalogPreferenceKey } from '../services/catalogPolicy.js';
import { useEffect, useRef, useState } from 'preact/hooks';

export function usePaged(key, fetchPage, { enabled = true } = {}) {
  const policyKey = catalogPreferenceKey(usePreferences());
  const [state, set] = useState({
    items: [],
    loading: true,
    error: null,
    hasMore: true,
    total: 0
  });
  const loader = useRef(fetchPage);
  loader.current = fetchPage;
  const run = useRef({
    page: 0,
    busy: false,
    controller: null,
    generation: 0
  });
  async function more() {
    if (!enabled) return;
    const r = run.current;
    if (r.busy)
      return;
    r.busy = true;
    const generation = r.generation;
    r.controller = new AbortController();
    set(s => ({
      ...s,
      loading: true,
      error: null
    }));
    try {
      const data = await loader.current(r.page + 1, r.controller.signal);
      // Filters may have changed while this page was loading.
      if (run.current.generation !== generation)
        return;
      r.page++;
      set(
        s => ({
          ...s,
          // Keep the list order while merging titles repeated across pages.
          items: [
            ...new Map([...s.items, ...(data.results || [])].map(i => [`${i.media_type}-${i.id}`, i])).values()
          ],
          total: data.total_results || 0,
          loading: false,
          error: null,
          hasMore: data.total_pages != null ? r.page < data.total_pages : (data.results || []).length >= 20
        })
      );
    }
    catch (error) {
      if (run.current.generation === generation && !r.controller.signal.aborted)
        set(s => ({
          ...s,
          loading: false,
          error
        }));
    }
    finally {
      r.busy = false;
    }
  }
  useEffect(
    () => {
      run.current.controller?.abort();
      run.current = {
        page: 0,
        busy: false,
        generation: run.current.generation + 1
      };
      set({
        items: [],
        loading: true,
        error: null,
        hasMore: true,
        total: 0
      });
      if (enabled) void more();
      return () => {
        run.current.controller?.abort();
        run.current.generation++;
      };
    },
    [key, enabled, policyKey]
  );
  return { ...state, more };
}

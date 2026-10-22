import { useEffect, useRef, useState } from 'preact/hooks';
import { subscribe, getRevision } from '../stores/storage.js';

export function useStorage(select = getRevision) {
  const selector = useRef(select);
  selector.current = select;
  const [value, setValue] = useState(select);
  useEffect(
    () => {
      const update = () => setValue(
        previous => {
          const next = selector.current();
          return Object.is(previous, next) ? previous : next;
        }
      );
      update();
      return subscribe(update);
    },
    []
  );
  return value;
}

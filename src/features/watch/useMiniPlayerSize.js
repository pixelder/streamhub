import { useEffect, useRef, useState } from 'preact/hooks';
import { clampMiniPlayerWidth, miniPlayerBounds, resizedMiniPlayerWidth } from './miniPlayerSize.js';

const storageKey = 'mini-player-width';
const clamp = width => clampMiniPlayerWidth(width, window.innerWidth, window.innerHeight);

export function useMiniPlayerSize() {
  const [width, setWidth] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      return clamp(saved === null ? undefined : Number(saved));
    } catch { return clamp(); }
  });
  const [resizing, setResizing] = useState(false);
  const drag = useRef(null);
  const change = value => setWidth(clamp(value));
  useEffect(() => {
    const resize = () => setWidth(current => clamp(current));
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, String(width)); } catch { /* Resizing still works without storage. */ }
  }, [width]);
  const finish = event => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return {
    width,
    resizing,
    handle: {
      onPointerDown: event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, width, pointerId: event.pointerId };
        setResizing(true);
      },
      onPointerMove: event => {
        const start = drag.current;
        if (!start || start.pointerId !== event.pointerId) return;
        change(resizedMiniPlayerWidth(start.width, event.clientX - start.x, event.clientY - start.y));
      },
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: () => { drag.current = null; setResizing(false); },
      onDoubleClick: () => change(),
      onKeyDown: event => {
        const bounds = miniPlayerBounds(window.innerWidth, window.innerHeight);
        const keys = { ArrowLeft: width + 20, ArrowUp: width + 20, ArrowRight: width - 20, ArrowDown: width - 20, Home: bounds.min, End: bounds.max, Enter: bounds.default };
        if (!(event.key in keys)) return;
        event.preventDefault();
        change(keys[event.key]);
      }
    }
  };
}

import { useEffect, useRef, useState } from 'preact/hooks';
import { useDockTransition } from './useDockTransition.js';
import { clampPlayerPosition, shouldDockPlayer } from './miniPlayerPosition.js';

export function useMiniPlayerDrag(root, width, minimized) {
  const [position, setPosition] = useState(null);
  const [docked, setDocked] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pointer = useRef(null);
  const transition = useDockTransition(root, docked, minimized);
  const dock = () => { transition.capture(); setDocked(true); };
  // Use the actual bottom bar height, even when its auto-hide animation is active.
  const bottomInset = () => window.innerWidth <= 767
    ? Math.max(64, document.getElementById('bottom-bar')?.offsetHeight || 0) : 0;
  const bounds = point => clampPlayerPosition(point, width, width * 9 / 16 + 50,
    window.innerWidth, window.innerHeight, bottomInset());
  useEffect(() => {
    const update = () => setPosition(current => current && bounds(current));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [width]);
  useEffect(() => {
    if (!minimized) { setDocked(false); pointer.current = null; setDragging(false); }
  }, [minimized]);
  const undock = () => {
    transition.capture();
    setDocked(false);
    setPosition(bounds({ x: window.innerWidth - width - 12, y: window.innerHeight - bottomInset() - width * 9 / 16 - 100 }));
  };
  const finish = event => {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    pointer.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return {
    docked, dragging, position, dock, undock, cancelTransition: transition.cancel,
    handle: {
      onPointerDown: event => {
        if (!minimized || event.button !== 0) return;
        transition.cancel();
        const rect = root.current.getBoundingClientRect();
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, height: rect.height, docked };
        setDragging(true);
      },
      onPointerMove: event => {
        const start = pointer.current;
        if (!start || start.id !== event.pointerId) return;
        if (start.docked) {
          // A separate upward threshold prevents flicker at the docking boundary.
          if (event.clientY - start.y >= -36) return;
          transition.capture();
          const next = bounds({ x: event.clientX - width / 2, y: event.clientY - 24 });
          setDocked(false);
          setPosition(next);
          Object.assign(start, {
            docked: false, x: event.clientX, y: event.clientY,
            left: next.x, top: next.y, height: width * 9 / 16 + 50
          });
          return;
        }
        const top = start.top + event.clientY - start.y;
        if (shouldDockPlayer(top, start.height, window.innerHeight, bottomInset(), event.clientY - start.y)) {
          dock();
          // Keep pointer capture on the title through the layout change so the
          // same gesture can pull the bar back out without a release/re-grab.
          start.docked = true;
          start.y = event.clientY;
          start.x = event.clientX;
          return;
        }
        // Further pointer movement takes priority over an undocking animation.
        transition.cancel();
        setPosition(bounds({ x: start.left + event.clientX - start.x, y: top }));
      },
      onPointerUp: event => finish(event),
      onPointerCancel: event => finish(event),
      onLostPointerCapture: () => { pointer.current = null; setDragging(false); },
      onKeyDown: event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (docked) undock(); else dock();
        } else if (!docked && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          const rect = root.current.getBoundingClientRect();
          setPosition(bounds({ x: rect.left + (event.key === 'ArrowLeft' ? -20 : event.key === 'ArrowRight' ? 20 : 0), y: rect.top + (event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0) }));
        }
      }
    }
  };
}

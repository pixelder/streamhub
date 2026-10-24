import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

// Capture before changing layout; animate between measured rectangles so auto
// widths, mobile safe areas and dragged positions all converge on the CSS layout.
export function useDockTransition(root, docked, minimized) {
  const pending = useRef(null);
  const animation = useRef(null);
  const cancel = () => {
    animation.current?.cancel();
    animation.current = null;
  };
  const capture = () => {
    pending.current = root.current?.getBoundingClientRect();
    cancel();
  };
  useLayoutEffect(() => {
    const before = pending.current;
    pending.current = null;
    cancel();
    const element = root.current;
    if (!before || !element || !minimized || !element.animate
      || matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.reducedMotion === 'true') return;
    const after = element.getBoundingClientRect();
    const frame = rect => ({
      left: `${rect.left}px`, top: `${rect.top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`,
      right: 'auto', bottom: 'auto', margin: '0', maxWidth: 'none',
      boxSizing: 'border-box', overflow: 'hidden'
    });
    animation.current = element.animate([frame(before), frame(after)], {
      duration: 280,
      easing: 'cubic-bezier(.22, 1, .36, 1)'
    });
  }, [docked, minimized]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const stopIfReduced = () => {
      if (media.matches || document.documentElement.dataset.reducedMotion === 'true') cancel();
    };
    const observer = new MutationObserver(stopIfReduced);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduced-motion'] });
    media.addEventListener('change', stopIfReduced);
    window.addEventListener('resize', cancel);
    return () => {
      cancel();
      observer.disconnect();
      media.removeEventListener('change', stopIfReduced);
      window.removeEventListener('resize', cancel);
    };
  }, []);
  return { capture, cancel };
}

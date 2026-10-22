import { useEffect, useRef } from 'preact/hooks';

export function useFocusTrap(ref, active, onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(
    () => {
      if (!active || !ref.current)
        return;
      const previous = document.activeElement,
        el = ref.current;
      if (!el.hasAttribute('tabindex'))
        el.tabIndex = -1;
      (el.querySelector('button:not([disabled]),input,[tabindex="0"]') || el).focus(
        { preventScroll: true }
      );
      const key = event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close.current?.();
        }
        if (event.key !== 'Tab')
          return;
        const items = [
          ...el.querySelectorAll(
            'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]'
          )
        ].filter(
          node => node.offsetParent !== null
        );
        if (!items.length) {
          event.preventDefault();
          el.focus();
          return;
        }
        const index = items.indexOf(document.activeElement);
        if (index === -1 || (!event.shiftKey && index === items.length - 1) || (event.shiftKey && index === 0)) {
          event.preventDefault();
          items[event.shiftKey ? items.length - 1 : 0].focus();
        }
      };
      el.addEventListener('keydown', key);
      return () => {
        el.removeEventListener('keydown', key);
        if (previous?.isConnected)
          previous.focus({ preventScroll: true });
      };
    },
    [active]
  );
}

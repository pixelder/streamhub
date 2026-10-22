import { useEffect } from 'preact/hooks';

export function useHorizontalScroll(ref, factor = 5, deps = []) {
  useEffect(
    () => {
      const el = ref.current;
      if (!el)
        return;
      let hover = false,
        timer;
      const mask = () => {
        const max = el.scrollWidth - el.clientWidth;
        const dir = el.scrollLeft > 0 && el.scrollLeft >= max - 16 ? 'left' : 'right';
        el.style.maskImage = `linear-gradient(to ${dir}, black 95%, #000000c4 97%, transparent)`;
      };
      const enter = () => {
        timer = setTimeout(() => hover = true, 400);
      };
      const leave = () => {
        clearTimeout(timer);
        hover = false;
      };
      const wheel = e => {
        if (hover && el.scrollWidth > el.clientWidth) {
          e.preventDefault();
          el.scrollLeft += e.deltaY * factor;
        }
      };
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
      el.addEventListener('wheel', wheel, { passive: false });
      el.addEventListener('scroll', mask);
      mask();
      return () => {
        clearTimeout(timer);
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
        el.removeEventListener('wheel', wheel);
        el.removeEventListener('scroll', mask);
      };
    },
    deps
  );
}

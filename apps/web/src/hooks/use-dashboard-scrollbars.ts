import { useEffect } from 'react';

const idleDelay = 800;

export function useDashboardScrollbars(): void {
  useEffect(() => {
    const root = document.documentElement;
    const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    const listenerOptions = { capture: true, passive: true } as const;
    root.classList.add('dashboard-scrollbars');

    const reveal = (event: Event) => {
      const region = event.target instanceof HTMLElement ? event.target : root;
      region.classList.add('is-scrolling');
      const existing = timers.get(region);
      if (existing) clearTimeout(existing);
      timers.set(
        region,
        setTimeout(() => {
          region.classList.remove('is-scrolling');
          timers.delete(region);
        }, idleDelay),
      );
    };

    document.addEventListener('scroll', reveal, listenerOptions);
    return () => {
      document.removeEventListener('scroll', reveal, listenerOptions);
      for (const [region, timer] of timers) {
        clearTimeout(timer);
        region.classList.remove('is-scrolling');
      }
      root.classList.remove('dashboard-scrollbars', 'is-scrolling');
    };
  }, []);
}

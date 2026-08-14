import { useCallback, useLayoutEffect, useRef, type UIEventHandler } from 'react';

const storagePrefix = 'attendity:scroll:';

export function usePersistentScrollRegion<T extends HTMLElement>(
  key: string,
): {
  readonly onScroll: UIEventHandler<T>;
  readonly ref: React.RefObject<T | null>;
} {
  const ref = useRef<T>(null);
  const storageKey = `${storagePrefix}${key}`;

  useLayoutEffect(() => {
    const region = ref.current;
    if (!region) return undefined;
    const storedPosition = Number(sessionStorage.getItem(storageKey));
    if (Number.isFinite(storedPosition) && storedPosition > 0) region.scrollTop = storedPosition;
    return () => sessionStorage.setItem(storageKey, String(region.scrollTop));
  }, [storageKey]);

  const onScroll = useCallback<UIEventHandler<T>>(
    (event) => sessionStorage.setItem(storageKey, String(event.currentTarget.scrollTop)),
    [storageKey],
  );

  return { onScroll, ref };
}

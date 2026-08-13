import { THEME_STORAGE_KEY } from '@qr/shared';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
interface ThemeContextValue {
  readonly preference: ThemePreference;
  readonly setPreference: (preference: ThemePreference) => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : preference === 'system'
      ? 'light'
      : preference;
}
function readPreference(): ThemePreference {
  if (
    typeof window === 'undefined' ||
    typeof localStorage === 'undefined' ||
    typeof localStorage.getItem !== 'function'
  ) {
    return 'system';
  }
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch {
    return 'system';
  }
}
export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () =>
      document.documentElement.classList.toggle('dark', resolveTheme(preference) === 'dark');
    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [preference]);
  const value = useMemo(
    () => ({
      preference,
      setPreference: (next: ThemePreference) => {
        localStorage.setItem(THEME_STORAGE_KEY, next);
        setPreference(next);
      },
    }),
    [preference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider.');
  return context;
}

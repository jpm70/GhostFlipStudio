import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'ghostflip_theme';

function readStoredTheme(): ThemeMode | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): ThemeMode {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** Aplica el tema al <html> (clases `dark`/`light` y `color-scheme`). */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

/** Tema actual + alternador. Si el usuario no ha elegido, sigue el del sistema. */
export function useTheme(): { theme: ThemeMode; toggleTheme: () => void } {
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme() ?? systemTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (readStoredTheme()) return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (!readStoredTheme()) setTheme(media.matches ? 'light' : 'dark');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // sin almacenamiento: el cambio vale solo para esta sesión
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}

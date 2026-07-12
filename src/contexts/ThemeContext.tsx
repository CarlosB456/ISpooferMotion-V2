import { ThemeProvider as UIThemeProvider, useThemeAccent } from '@codycon/ism-library';
import type React from 'react';
import { useEffect } from 'react';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <UIThemeProvider>
      <ThemeSync />
      {children}
    </UIThemeProvider>
  );
};

const ThemeSync = () => {
  const { themeMode } = useThemeAccent();

  /**
   * Syncs the Tailwind CSS dark mode class with the active theme state.
   *
   * We apply `dark` or `light` directly to the `documentElement` so tailwind variants
   * instantly trigger without needing a full React re-render of the entire DOM tree.
   */
  useEffect(() => {
    if (themeMode === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else if (themeMode === 'dark') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  }, [themeMode]);

  return null;
};

export { useThemeAccent };

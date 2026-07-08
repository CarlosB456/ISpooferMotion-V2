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

  // syncs the tailwind dark mode class to our current theme state so styles apply correctly
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

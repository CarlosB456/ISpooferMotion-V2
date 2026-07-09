import './index.css';
import './utils/debugLogger';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';
import { ErrorBoundary } from './components/core/ErrorBoundary';
import { ConfigProvider } from './contexts/ConfigContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { StudioConnectionProvider } from './contexts/StudioConnectionContext';
import { ThemeProvider } from './contexts/ThemeContext';

const savedTheme = localStorage.getItem('theme') || 'dark';
// Force theme early to prevent light mode flash on load.
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// Prevents native tooltips from overlapping custom UI tooltips.
function TitleAttributeGuard({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const clearTitles = (root: ParentNode) => {
      root.querySelectorAll?.('[title]').forEach((el) => el.removeAttribute('title'));
    };
    clearTitles(document);
    // Observer removes titles from dynamically added elements.
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          mutation.target.removeAttribute('title');
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            node.removeAttribute('title');
            clearTitles(node);
          }
        });
      });
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['title'],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  return children;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <ConfigProvider>
        <StudioConnectionProvider>
          <ThemeProvider>
            <TitleAttributeGuard>
              <main className="text-text-primary bg-bg-base min-h-screen h-full font-sans transition-colors duration-300">
                <ErrorBoundary>
                  <App />
                </ErrorBoundary>
              </main>
            </TitleAttributeGuard>
          </ThemeProvider>
        </StudioConnectionProvider>
      </ConfigProvider>
    </LanguageProvider>
  </React.StrictMode>,
);

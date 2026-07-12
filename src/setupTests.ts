import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

/**
 * Global Vitest test environment configuration.
 *
 * Mocks out browser-native APIs (like matchMedia) and Tauri-specific
 * native IPC calls so our React components can be unit tested headlessly.
 */
// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Framer Motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  const motion = new Proxy(
    {},
    {
      get: (_, key) => {
        // Return a functional component for each HTML element (e.g. motion.div)
        return React.forwardRef((props, ref) => {
          const {
            initial,
            animate,
            exit,
            transition,
            variants,
            whileHover,
            whileTap,
            whileDrag,
            whileFocus,
            whileInView,
            layout,
            layoutId,
            ...rest
          } = props as any;
          return React.createElement(key as string, { ...rest, ref });
        });
      },
    },
  );
  return {
    ...actual,
    motion,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, {}, children),
  };
});

const { listeners } = vi.hoisted(() => ({
  listeners: {} as Record<string, Function[]>,
}));

// Mock Tauri invoke globally
vi.mock('@tauri-apps/api/core', () => {
  return {
    invoke: vi.fn((cmd, _args) => {
      if (cmd === 'get_config') return Promise.resolve({});
      if (cmd === 'is_update_available') return Promise.resolve(false);
      return Promise.resolve(null);
    }),
    __listeners: listeners, // For tests to trigger events
  };
});

vi.mock('@tauri-apps/api/event', () => {
  return {
    listen: vi.fn((event, handler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
      return Promise.resolve(() => {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      });
    }),
    emit: vi.fn((event, payload) => {
      if (listeners[event]) {
        listeners[event].forEach((handler) => handler({ event, payload }));
      }
      return Promise.resolve();
    }),
  };
});

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    close: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    toggleMaximize: vi.fn(),
  }),
}));

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

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

// Mock Tauri invoke globally
vi.mock('@tauri-apps/api/core', () => {
  const listeners: Record<string, Function[]> = {};

  return {
    invoke: vi.fn((cmd, _args) => {
      if (cmd === 'get_config') return Promise.resolve({});
      if (cmd === 'is_update_available') return Promise.resolve(false);
      return Promise.resolve(null);
    }),
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
    __listeners: listeners, // For tests to trigger events
  };
});

vi.mock('@tauri-apps/api/event', async () => {
  const core = (await import('@tauri-apps/api/core')) as any;
  return {
    listen: core.listen,
    emit: core.emit,
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

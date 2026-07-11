import { render, screen } from '@testing-library/react';
import SettingsView from './SettingsView';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as LanguageContext from '../../contexts/LanguageContext';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(),
}));

// Mock child components to isolate tests
vi.mock('./settings/DebugSection', () => ({
  default: () => <div data-testid="debug-section">Debug Section</div>,
}));

vi.mock('./settings/GeneralSection', () => ({
  default: () => <div data-testid="general-section">General Section</div>,
}));

// Mock ResizeObserver for Lenis
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('SettingsView', () => {
  const mockT = vi.fn((key) => key);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LanguageContext.useLanguage).mockReturnValue({ t: mockT } as any);
  });

  it('renders settings sections correctly', () => {
    render(<SettingsView />);

    expect(screen.getByText('settings.general')).toBeInTheDocument();
    expect(screen.getByText('settings.debugDisplay')).toBeInTheDocument();

    expect(screen.getByTestId('general-section')).toBeInTheDocument();
    expect(screen.getByTestId('debug-section')).toBeInTheDocument();
  });
});

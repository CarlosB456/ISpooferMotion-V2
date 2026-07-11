import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Titlebar from './Titlebar';
import { IsmProvider } from '@codycon/ism-library';

// Mock contexts and stores
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('../../contexts/ConfigContext', () => ({
  useConfig: () => ({
    config: { general: { hideToTrayOnClose: false }, debug: { debugMode: false } },
    updateConfig: vi.fn(),
  }),
}));

vi.mock('../../stores/spooferStore', () => ({
  useSpooferStore: vi.fn((selector) => {
    const store = {
      showAdvanced: false,
      setShowAdvanced: vi.fn(),
    };
    return selector(store);
  }),
}));

// Mock Tauri utils
vi.mock('../../utils/tauriRuntime', () => ({
  isTauriRuntime: () => true,
}));

describe('Titlebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders app title and version', async () => {
    render(
      <IsmProvider>
        <Titlebar />
      </IsmProvider>,
    );

    // Title is present
    expect(screen.getByText('ISpooferMotion')).toBeInTheDocument();

    // Default version before async loaded
    expect(screen.getByText('v?')).toBeInTheDocument();

    // Wait for async version load mock (would need await findByText in real scenario, but get_app_version returns empty in our setupTests)
  });
});

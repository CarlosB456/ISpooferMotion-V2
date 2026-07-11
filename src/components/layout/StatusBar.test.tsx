import { render, screen } from '@testing-library/react';
import StatusBar from './StatusBar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as StudioConnectionContext from '../../contexts/StudioConnectionContext';
import * as LanguageContext from '../../contexts/LanguageContext';

vi.mock('../../contexts/StudioConnectionContext', () => ({
  useStudioConnectionState: vi.fn(),
}));

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(),
}));

describe('StatusBar', () => {
  const mockT = vi.fn((key) => {
    const map: Record<string, string> = {
      'misc.syncedToStudio': 'Synced to Studio',
      'misc.notSyncedToStudio': 'Not synced to Studio',
    };
    return map[key] || key;
  });

  beforeEach(() => {
    vi.mocked(LanguageContext.useLanguage).mockReturnValue({ t: mockT } as any);
  });

  it('renders synced state correctly', () => {
    vi.mocked(StudioConnectionContext.useStudioConnectionState).mockReturnValue({
      studioConnected: true,
    } as any);

    render(<StatusBar />);

    expect(screen.getByText('Synced to Studio')).toBeInTheDocument();
  });

  it('renders not synced state correctly', () => {
    vi.mocked(StudioConnectionContext.useStudioConnectionState).mockReturnValue({
      studioConnected: false,
    } as any);

    render(<StatusBar />);

    expect(screen.getByText('Not synced to Studio')).toBeInTheDocument();
  });
});

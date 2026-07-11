import { render, screen, fireEvent } from '@testing-library/react';
import { JsonViewer } from './JsonViewer';
import { vi, describe, it, expect } from 'vitest';
import * as LanguageContext from '../../contexts/LanguageContext';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(),
}));

describe('JsonViewer', () => {
  const mockT = vi.fn((key) => key);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LanguageContext.useLanguage).mockReturnValue({ t: mockT } as any);
  });

  it('renders primitive values correctly', () => {
    const data = {
      str: 'hello',
      num: 42,
      boolTrue: true,
      boolFalse: false,
      nullVal: null,
      undefVal: undefined,
    };

    render(<JsonViewer data={data} />);

    expect(screen.getByText('"hello"')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('false')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
    expect(screen.getByText('undefined')).toBeInTheDocument();
  });

  it('renders arrays correctly', () => {
    render(<JsonViewer data={[1, 2, 3]} />);

    // Since level 0 is expanded by default (level < 2), it should show the brackets and values
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders empty objects and arrays', () => {
    const { rerender } = render(<JsonViewer data={{}} name="emptyObj" />);
    expect(screen.getByText('{}')).toBeInTheDocument();
    
    rerender(<JsonViewer data={[]} name="emptyArr" />);
    expect(screen.getByText('[]')).toBeInTheDocument();
  });

  it('can collapse and expand', async () => {
    const data = { nested: { value: 123 } };
    
    // Level 0 is expanded by default. nested is level 1, also expanded by default.
    render(<JsonViewer data={data} />);
    
    expect(screen.getByText('123')).toBeInTheDocument();

    // Click on the nested key to collapse it
    const toggle = screen.getByText('nested:').closest('.cursor-pointer');
    fireEvent.click(toggle!);

    // Should now say "1 keys" and "123" is hidden (framer-motion handles unmount, but react-testing-library might see it with opacity 0 or it might unmount)
    // Wait for the exit animation or just check for "1 keys"
    expect(screen.getByText('1 keys')).toBeInTheDocument();
    
    // Expand again
    fireEvent.click(toggle!);
    expect(screen.queryByText('1 keys')).not.toBeInTheDocument();
  });

  it('copies data to clipboard', async () => {
    const data = { foo: 'bar' };
    
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    render(<JsonViewer data={data} />);

    const copyBtn = screen.getByTitle('misc.copyJson');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
  });
});

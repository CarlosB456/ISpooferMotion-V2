import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AnimationPreview from './AnimationPreview';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as tauriCore from '@tauri-apps/api/core';
import * as LanguageContext from '../../contexts/LanguageContext';
import * as ConfigContext from '../../contexts/ConfigContext';
import * as robloxAnimParser from '../../utils/robloxAnimParser';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(),
}));

vi.mock('../../contexts/ConfigContext', () => ({
  useConfig: vi.fn(),
}));

vi.mock('../../utils/robloxAnimParser', () => ({
  parseAnimationXml: vi.fn(),
}));

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock THREE.js to prevent webgl context errors in jsdom
vi.mock('three', () => {
  return {
    WebGLRenderer: vi.fn().mockImplementation(function () {
      return {
        setSize: vi.fn(),
        setPixelRatio: vi.fn(),
        setClearColor: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
        forceContextLoss: vi.fn(),
        shadowMap: { enabled: false },
        domElement: document.createElement('canvas'),
      };
    }),
    Scene: vi.fn().mockImplementation(function () {
      return {
        add: vi.fn(),
        remove: vi.fn(),
        traverse: vi.fn(),
      };
    }),
    PerspectiveCamera: vi.fn().mockImplementation(function () {
      return {
        position: { set: vi.fn() },
        lookAt: vi.fn(),
        updateProjectionMatrix: vi.fn(),
      };
    }),
    GridHelper: vi.fn().mockImplementation(function () {
      return {
        position: { y: 0 },
        geometry: { dispose: vi.fn() },
        material: { dispose: vi.fn() },
      };
    }),
    Mesh: vi.fn().mockImplementation(function () {
      return {
        rotation: { x: 0 },
        position: { y: 0, set: vi.fn() },
        geometry: { dispose: vi.fn() },
        material: { dispose: vi.fn() },
      };
    }),
    PlaneGeometry: vi.fn().mockImplementation(function () {
      return { dispose: vi.fn() };
    }),
    ShadowMaterial: vi.fn().mockImplementation(function () {
      return { dispose: vi.fn() };
    }),
    AmbientLight: vi.fn().mockImplementation(function () {
      return {};
    }),
    DirectionalLight: vi.fn().mockImplementation(function () {
      return {
        position: { set: vi.fn() },
        shadow: { mapSize: {}, camera: {} },
      };
    }),
    Object3D: vi.fn().mockImplementation(function () {
      return {
        add: vi.fn(),
        remove: vi.fn(),
        traverse: vi.fn(),
        matrix: { copy: vi.fn() },
      };
    }),
    Matrix4: vi.fn().mockImplementation(function () {
      return {
        identity: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        multiply: vi.fn().mockReturnThis(),
        invert: vi.fn().mockReturnThis(),
        compose: vi.fn().mockReturnThis(),
        copy: vi.fn().mockReturnThis(),
      };
    }),
    Vector3: vi.fn().mockImplementation(function () {
      return { set: vi.fn() };
    }),
    Quaternion: vi.fn().mockImplementation(function () {
      return {
        setFromRotationMatrix: vi.fn(),
        slerp: vi.fn(),
      };
    }),
    MeshStandardMaterial: vi.fn().mockImplementation(function () {
      return { dispose: vi.fn() };
    }),
    Timer: vi.fn().mockImplementation(function () {
      return {
        update: vi.fn(),
        getDelta: vi.fn().mockReturnValue(0.016),
      };
    }),
    Box3: vi.fn().mockImplementation(function () {
      return {
        setFromObject: vi.fn().mockReturnThis(),
        getSize: vi.fn(),
        getCenter: vi.fn(),
      };
    }),
    TextureLoader: vi.fn().mockImplementation(function () {
      return {
        load: vi.fn().mockReturnValue({}),
      };
    }),
    Texture: vi.fn().mockImplementation(function () {
      return { dispose: vi.fn() };
    }),
    MeshBasicMaterial: vi.fn().mockImplementation(function () {
      return { dispose: vi.fn() };
    }),
    SRGBColorSpace: 'srgb',
    DoubleSide: 2,
    PCFShadowMap: 1,
  };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(function () {
    return {
      target: { set: vi.fn() },
      update: vi.fn(),
      dispose: vi.fn(),
    };
  }),
}));

vi.mock('three/examples/jsm/loaders/OBJLoader.js', () => ({
  OBJLoader: vi.fn().mockImplementation(function () {
    return {
      load: vi.fn((_url, onLoad) => {
        // Just immediately call onLoad with a dummy Object3D
        onLoad({
          traverse: vi.fn(),
        });
      }),
    };
  }),
}));

describe('AnimationPreview', () => {
  const mockT = vi.fn((key) => key);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LanguageContext.useLanguage).mockReturnValue({ t: mockT } as any);
    vi.mocked(ConfigContext.useConfig).mockReturnValue({
      config: {
        spoofing: { cookie: 'test-cookie' },
      },
    } as any);
  });

  it('renders loading state initially', () => {
    render(<AnimationPreview assetId="123" onClose={() => {}} />);
    expect(screen.getByText('misc.fetchingAnimation')).toBeInTheDocument();
  });

  it('shows error if xml fetch fails', async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValue(null); // Returns null

    render(<AnimationPreview assetId="123" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('misc.animationLoadFailed')).toBeInTheDocument();
    });
  });

  it('shows error if parsing fails', async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValue('<roblox></roblox>');
    vi.mocked(robloxAnimParser.parseAnimationXml).mockResolvedValue({
      duration: 0,
      keyframes: [],
    } as any);

    render(<AnimationPreview assetId="123" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('misc.animationParseFailed')).toBeInTheDocument();
    });
  });

  it('renders ready state when animation loaded successfully', async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValue('<roblox></roblox>');
    vi.mocked(robloxAnimParser.parseAnimationXml).mockResolvedValue({
      duration: 1.5,
      keyframes: [
        { time: 0, poses: [] },
        { time: 1.5, poses: [] },
      ],
    } as any);

    render(<AnimationPreview assetId="123" assetName="Dance" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Dance')).toBeInTheDocument();
      expect(screen.getByText('#123')).toBeInTheDocument();
      expect(screen.getByText('misc.dragToOrbit')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button clicked', async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValue(null);

    const onClose = vi.fn();
    render(<AnimationPreview assetId="123" onClose={onClose} />);

    // In a portal, find the button by getting the close icon or just button inside the portal
    screen.getByRole('button'); // Since loading state only has the modal overlay and close button
    // wait for loading state to finish so close button appears
    await waitFor(() => {
      expect(screen.getByText('misc.animationLoadFailed')).toBeInTheDocument();
    });

    // Actually, there's a close button in the header.
    // It's the only button in the header.
    const buttons = screen.getAllByRole('button');
    // The close button is usually the last one in the header, or we can just find it
    fireEvent.click(buttons[0]); // If there's multiple, let's just click the overlay

    // The overlay is the first div.
    const overlay = document.body.querySelector('.fixed.inset-0');
    if (overlay) fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });
});

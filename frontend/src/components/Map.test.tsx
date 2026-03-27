import { describe, it, expect, vi } from "vitest";import { render } from '@testing-library/react';
import "@testing-library/jest-dom";

import Map from './Map';
import { AuthContext } from '../context/AuthContext';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// We need to mock 'leaflet' to avoid doing actual DOM measurements and canvas renders
vi.mock('leaflet', () => {
    return {
        map: () => ({
            setView: vi.fn().mockReturnThis(),
            remove: vi.fn()
        }),
        tileLayer: () => ({
            addTo: vi.fn()
        }),
        marker: () => ({
            addTo: vi.fn().mockReturnThis(),
            bindPopup: vi.fn().mockReturnThis()
        }),
        Icon: {
            Default: {
                prototype: {
                    _getIconUrl: vi.fn()
                },
                mergeOptions: vi.fn()
            }
        }
    };
});

describe('Map Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <AuthContext.Provider value={{ token: 'mock-token', user: null, login: vi.fn(), logout: vi.fn(), isAuthenticated: true }}>
        <Map />
      </AuthContext.Provider>
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('lottie-react', () => ({
  default: () => null,
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

HTMLCanvasElement.prototype.getContext = () =>
  ({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: () => undefined,
    clearRect: () => undefined,
    strokeRect: () => undefined,
    beginPath: () => undefined,
    closePath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    arc: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    scale: () => undefined,
    rotate: () => undefined,
    measureText: () => ({ width: 0 }),
    setTransform: () => undefined,
    transform: () => undefined,
    createLinearGradient: () => ({ addColorStop: () => undefined }),
  }) as unknown as CanvasRenderingContext2D;

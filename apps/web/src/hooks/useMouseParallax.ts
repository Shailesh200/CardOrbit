import { useEffect, useRef, type RefObject } from 'react';

type ParallaxOptions = {
  strength?: number;
};

/** Subtle mouse-driven tilt for premium hero visuals. */
export function useMouseParallax<T extends HTMLElement>(
  options: ParallaxOptions = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { strength = 14 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const node = el;

    function onMove(event: PointerEvent) {
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      targetX = ((event.clientX - cx) / rect.width) * strength;
      targetY = ((event.clientY - cy) / rect.height) * strength;
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function onLeave() {
      targetX = 0;
      targetY = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function tick() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      node.style.setProperty('--parallax-x', `${currentX.toFixed(2)}deg`);
      node.style.setProperty('--parallax-y', `${-currentY.toFixed(2)}deg`);
      const settling = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;
      frame = settling ? requestAnimationFrame(tick) : 0;
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    node.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [strength]);

  return ref;
}

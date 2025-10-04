import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

export function IsoDragRotate({
  enabled,
  onStep,
  onSetIndex,
}: {
  enabled: boolean;
  onStep?: (deltaSteps: number) => void;
  onSetIndex?: (index: number) => void;
}) {
  const { gl } = useThree();
  const pressedRef = useRef(false);
  const activeRef = useRef(false);
  const startAngleRef = useRef(0);
  const lastEmittedStepsRef = useRef(0);
  const lastSectorRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  useEffect(() => {
    const el = gl.domElement;
    if (!el) return;

    const stepAngle = Math.PI / 4; // 45° per iso step

    const getAngleFromCenter = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Screen Y grows downward; invert to get math Y-up for CCW positive angles
      const dx = clientX - cx;
      const dy = cy - clientY;
      return Math.atan2(dy, dx); // -PI..PI
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // left button only
      if (!enabled) return; // don't even arm if not allowed
      pressedRef.current = true;
      activeRef.current = false; // activate on first valid move
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      startAngleRef.current = getAngleFromCenter(e.clientX, e.clientY);
      lastEmittedStepsRef.current = 0;
      lastSectorRef.current = null;
      // do not capture yet; only once active
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pressedRef.current) return;
      // If we were active and now disabled (e.g., transform started), abort
      if (activeRef.current && !enabled) {
        activeRef.current = false;
        pressedRef.current = false;
        lastEmittedStepsRef.current = 0;
        lastSectorRef.current = null;
        el.releasePointerCapture?.(e.pointerId);
        return;
      }
      // Only activate rotation if allowed and movement exceeds small threshold
      if (!activeRef.current) {
        if (!enabled) return;
        const dx0 = e.clientX - startXRef.current;
        const dy0 = e.clientY - startYRef.current;
        if (dx0 * dx0 + dy0 * dy0 < 36) return; // 6px slop
        activeRef.current = true;
        el.setPointerCapture?.(e.pointerId);
      }
      const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
      // Smallest signed angle difference
      let delta = currentAngle - startAngleRef.current;
      // Wrap to (-PI, PI]
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta <= -Math.PI) delta += 2 * Math.PI;

      // Prefer relative stepping when available
      if (onStep) {
        const stepsNow = Math.round(delta / stepAngle);
        const prevSteps = lastEmittedStepsRef.current;
        const diff = stepsNow - prevSteps;
        if (diff !== 0) {
          onStep(diff);
          lastEmittedStepsRef.current = stepsNow;
        }
      } else {
        // Fallback: absolute sector mapping to k*45° around screen center
        let sector = Math.round(currentAngle / stepAngle);
        sector = ((sector % 8) + 8) % 8; // normalize to 0..7
        if (lastSectorRef.current !== sector) {
          onSetIndex?.(sector);
          lastSectorRef.current = sector;
        }
      }
      if (activeRef.current) e.preventDefault();
    };

    const endDrag = (e: PointerEvent) => {
      if (!pressedRef.current && !activeRef.current) return;
      pressedRef.current = false;
      const wasActive = activeRef.current;
      activeRef.current = false;
      lastEmittedStepsRef.current = 0;
      lastSectorRef.current = null;
      if (wasActive) {
        el.releasePointerCapture?.(e.pointerId);
        e.preventDefault();
      }
    };

    el.addEventListener('pointerdown', onPointerDown, { passive: false });
    el.addEventListener('pointermove', onPointerMove, { passive: false });
    el.addEventListener('pointerup', endDrag, { passive: false });
    el.addEventListener('pointercancel', endDrag, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onPointerDown as EventListener);
      el.removeEventListener('pointermove', onPointerMove as EventListener);
      el.removeEventListener('pointerup', endDrag as EventListener);
      el.removeEventListener('pointercancel', endDrag as EventListener);
    };
  }, [gl, enabled, onStep, onSetIndex]);

  return null;
}

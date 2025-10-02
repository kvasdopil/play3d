import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { OrbitControls as ThreeOrbitControls } from 'three-stdlib';

export function CursorWheelZoom({
  controlsRef,
  enabled,
}: {
  controlsRef: React.RefObject<ThreeOrbitControls | null>;
  enabled: boolean;
}) {
  const { gl, camera } = useThree();

  const raycasterRef = useRef(new Raycaster());
  const ndcRef = useRef(new Vector2());
  const tmpV1 = useRef(new Vector3());
  const tmpV2 = useRef(new Vector3());
  const pointRef = useRef(new Vector3());

  useEffect(() => {
    const el = gl.domElement;
    if (!el) return;

    const onWheel: EventListener = (evt) => {
      if (!enabled) return;
      if (!controlsRef?.current) return;

      const e = evt as WheelEvent;

      // Prevent page scrolling while zooming in canvas
      e.preventDefault();

      const controls = controlsRef.current;
      const minDist =
        typeof controls.minDistance === 'number' ? controls.minDistance : 0;
      const maxDist =
        typeof controls.maxDistance === 'number'
          ? controls.maxDistance
          : Infinity;

      // Compute NDC from pointer
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ndcRef.current.set(x, y);

      // Build a plane through the current target, perpendicular to camera view direction
      const target = controls.target.clone();
      const camDir = camera.getWorldDirection(tmpV1.current).clone();
      const viewPlane = new Plane().setFromNormalAndCoplanarPoint(
        camDir,
        target
      );

      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(ndcRef.current, camera);
      const hitPoint = raycaster.ray.intersectPlane(
        viewPlane,
        pointRef.current
      );

      // Fallback to ground plane (y=0) if no intersection (edge cases)
      if (!hitPoint) {
        const ground = new Plane(new Vector3(0, 1, 0), 0);
        const altHit = raycaster.ray.intersectPlane(ground, pointRef.current);
        if (!altHit) return;
      }

      // Zoom factor: <1 zoom in, >1 zoom out
      const factor = Math.pow(0.95, -e.deltaY / 53);

      const camPos = camera.position.clone();
      const point = pointRef.current.clone();

      // Move camera and target toward/away from the point under cursor
      const newCam = point
        .clone()
        .add(camPos.sub(point).multiplyScalar(factor));
      const newTarget = point
        .clone()
        .add(target.sub(point).multiplyScalar(factor));

      // Enforce OrbitControls distance limits
      const dir = tmpV2.current.copy(newCam).sub(newTarget);
      const dist = dir.length();
      if (dist < 1e-6) return; // avoid degenerate state
      dir.normalize();
      let clampedDist = dist;
      if (dist < minDist) clampedDist = minDist;
      if (dist > maxDist) clampedDist = maxDist;
      if (clampedDist !== dist) {
        newCam.copy(newTarget).add(dir.multiplyScalar(clampedDist));
      }

      camera.position.copy(newCam);
      controls.target.copy(newTarget);
      controls.update();
    };

    // Non-passive to allow preventDefault
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [gl, camera, controlsRef, enabled]);

  return null;
}

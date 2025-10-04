import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as ThreeOrbitControls } from 'three-stdlib';
import { Vector3 } from 'three';

export function SyncCameraOnModeChange({
  mode,
  controlsRef,
  lastPoseRef,
  lastPerspectivePosRef,
  isoIndex,
}: {
  mode: 'perspective' | 'isometric';
  controlsRef: React.RefObject<ThreeOrbitControls | null>;
  lastPoseRef: React.MutableRefObject<{
    position: Vector3;
    target: Vector3;
  } | null>;
  lastPerspectivePosRef: React.MutableRefObject<Vector3>;
  isoIndex: number;
}) {
  const { camera } = useThree();

  // Store last live pose every frame
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    lastPoseRef.current = {
      position: camera.position.clone(),
      target: controls.target.clone(),
    };
  });

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // When entering perspective, remember a reasonable position to re-use
    if (mode === 'perspective') {
      if (lastPoseRef.current) {
        lastPerspectivePosRef.current.copy(lastPoseRef.current.position);
      }
    }
  }, [mode, controlsRef, lastPoseRef, lastPerspectivePosRef]);

  // Animate camera position on isoIndex change or mode change
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // If we just mounted a new camera, ensure we start the animation from the last known pose
    if (lastPoseRef.current) {
      camera.position.copy(lastPoseRef.current.position);
      controls.target.copy(lastPoseRef.current.target);
      controls.update();
    }

    let start = 0;
    const duration = 350; // ms
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const from =
      lastPoseRef.current?.position.clone() ?? camera.position.clone();

    // 8 views on constant-elevation circle (see CameraRig)
    const isoOffsets = Array.from({ length: 8 }, (_, k) => {
      const theta = (k * Math.PI) / 4;
      return new Vector3(
        Math.SQRT2 * Math.cos(theta),
        1,
        Math.SQRT2 * Math.sin(theta)
      ).multiplyScalar(5);
    });

    // Always orbit around the current target in isometric mode to keep
    // the camera orientation fixed (pitch ~35.264°, yaw = k*45°)
    const baseTarget = controls.target.clone();

    const to =
      mode === 'isometric'
        ? baseTarget.clone().add(isoOffsets[isoIndex % 8])
        : lastPerspectivePosRef.current.clone();

    let raf = 0;
    const step = (ts: number) => {
      if (start === 0) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const k = easeOutCubic(t);
      camera.position.lerpVectors(from, to, k);
      controls.update();
      if (t < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mode, isoIndex, controlsRef, camera, lastPerspectivePosRef]);

  return null;
}

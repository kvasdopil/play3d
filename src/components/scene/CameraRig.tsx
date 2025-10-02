import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { Vector3 } from 'three';

export function CameraRig({
  mode,
  isoIndex,
  lastPoseRef,
  lastPerspectivePosRef,
}: {
  mode: 'perspective' | 'isometric';
  isoIndex: number;
  lastPoseRef: React.MutableRefObject<{
    position: Vector3;
    target: Vector3;
  } | null>;
  lastPerspectivePosRef: React.MutableRefObject<Vector3>;
}) {
  const { size } = useThree();
  // Classic isometric uses an orthographic projection with camera rotated
  // 35.264° down and 45° around Y.
  const isoDistance = 5;
  const isoPositions = useMemo(() => {
    const d = isoDistance;
    // 8 views on a circle around Y with constant isometric elevation (~35.264°)
    // Base vector for angle θ: (√2 cosθ, 1, √2 sinθ), length √3. Multiply by d.
    const positions: Vector3[] = [];
    for (let k = 0; k < 8; k++) {
      const theta = (k * Math.PI) / 4; // 0..7 * 45°
      positions.push(
        new Vector3(
          Math.SQRT2 * Math.cos(theta),
          1,
          Math.SQRT2 * Math.sin(theta)
        ).multiplyScalar(d)
      );
    }
    return positions;
  }, []);

  // Update makeDefault cameras when mode changes
  if (mode === 'isometric') {
    const index = isoIndex % 8;
    const initial = lastPoseRef.current?.position ?? isoPositions[index];
    const theta = (index * Math.PI) / 4;
    return (
      <OrthographicCamera
        makeDefault
        left={-size.width / 200}
        right={size.width / 200}
        top={size.height / 200}
        bottom={-size.height / 200}
        near={-1000}
        far={1000}
        position={[initial.x, initial.y, initial.z]}
        rotation={[Math.atan(Math.sqrt(2)), theta, 0]}
      />
    );
  }
  const perspInit =
    lastPoseRef.current?.position ?? lastPerspectivePosRef.current;
  return (
    <PerspectiveCamera
      makeDefault
      position={[perspInit.x, perspInit.y, perspInit.z]}
      fov={50}
    />
  );
}

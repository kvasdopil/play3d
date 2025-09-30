import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

export function RotatingCube() {
  const meshRef = useRef<Mesh>(null);

  // Rotate the cube on each frame
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.7;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.1, 0]}>
      {/* Box geometry: 20cm x 20cm x 20cm */}
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      {/* Material with color */}
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  );
}

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, BoxGeometry, Vector3 } from 'three';
import type { Object3D, LineSegments, Mesh } from 'three';

export function SelectionBounds({
  object,
  threshold = 0.15,
  snapActive,
}: {
  object: Object3D;
  threshold?: number;
  snapActive?: boolean;
}) {
  const groupRef = useRef<Object3D | null>(null);
  const lineRef = useRef<LineSegments | null>(null);
  const bottomPlaneRef = useRef<Mesh | null>(null);
  const box = useRef(new Box3());
  const center = useRef(new Vector3());
  const size = useRef(new Vector3(1, 1, 1));

  // Create a unit cube geometry once; we'll scale it to match the AABB
  const unitBoxGeom = useMemo(() => new BoxGeometry(1, 1, 1), []);

  useFrame(() => {
    // Update AABB from the current world transform of the object
    box.current.setFromObject(object);
    box.current.getCenter(center.current);
    box.current.getSize(size.current);

    if (groupRef.current) {
      groupRef.current.position.copy(center.current);
    }
    if (lineRef.current) {
      lineRef.current.scale.set(size.current.x, size.current.y, size.current.z);
    }
    if (bottomPlaneRef.current) {
      bottomPlaneRef.current.scale.set(size.current.x, size.current.z, 1);
      bottomPlaneRef.current.visible = snapActive
        ? true
        : Math.abs(box.current.min.y) <= threshold;
      bottomPlaneRef.current.position.set(0, -size.current.y / 2, 0);
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments
        ref={lineRef as unknown as React.RefObject<LineSegments>}
        renderOrder={9999}
      >
        <edgesGeometry args={[unitBoxGeom]} />
        <lineBasicMaterial
          color={0xff8800}
          depthTest={true}
          depthWrite={false}
        />
      </lineSegments>
      {/* Bottom face highlight (transparent orange) */}
      <mesh
        ref={bottomPlaneRef as unknown as React.RefObject<Mesh>}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={9998}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={0xff8800}
          transparent
          opacity={0.2}
          depthTest={true}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

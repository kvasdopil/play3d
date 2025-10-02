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
        return [
            new Vector3(1, 1, 1).multiplyScalar(d), // +X +Y +Z
            new Vector3(-1, 1, 1).multiplyScalar(d), // -X +Y +Z
            new Vector3(-1, 1, -1).multiplyScalar(d), // -X +Y -Z
            new Vector3(1, 1, -1).multiplyScalar(d), // +X +Y -Z
        ];
    }, []);

    // Update makeDefault cameras when mode changes
    if (mode === 'isometric') {
        const initial = lastPoseRef.current?.position ?? isoPositions[isoIndex % 4];
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
                rotation={[Math.atan(Math.sqrt(2)), Math.PI / 4, 0]}
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



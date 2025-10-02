import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as ThreeOrbitControls } from 'three-stdlib';

export function PersistCamera({
    controlsRef,
}: {
    controlsRef: React.RefObject<ThreeOrbitControls | null>;
}) {
    const { camera } = useThree();

    // Restore on mount
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem('camera-state');
            if (!raw) return;
            const parsed = JSON.parse(raw) as {
                position: [number, number, number];
                target: [number, number, number];
            } | null;
            if (!parsed) return;
            const { position, target } = parsed;
            if (
                Array.isArray(position) &&
                position.length === 3 &&
                Array.isArray(target) &&
                target.length === 3
            ) {
                camera.position.set(position[0], position[1], position[2]);
                const controls = controlsRef.current;
                if (controls) {
                    controls.target.set(target[0], target[1], target[2]);
                    controls.update();
                }
            }
        } catch (err) {
            console.error('Failed to restore camera state:', err);
        }
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save whenever camera or target changes (sampled each frame)
    useFrame(() => {
        const controls = controlsRef.current;
        if (!controls) return;
        try {
            const state = {
                position: [camera.position.x, camera.position.y, camera.position.z] as [
                    number,
                    number,
                    number,
                ],
                target: [controls.target.x, controls.target.y, controls.target.z] as [
                    number,
                    number,
                    number,
                ],
            };
            window.localStorage.setItem('camera-state', JSON.stringify(state));
        } catch {
            // ignore write errors
        }
    });

    return null;
}



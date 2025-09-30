import { useEffect, useState, memo } from 'react';
import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';
import type { Transform } from '../services/types';

interface Model3DProps {
    modelUrl: string;
    transform?: Transform;
}

export const Model3D = memo(function Model3D({ modelUrl, transform }: Model3DProps) {
    const [localUrl, setLocalUrl] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        let blobUrl: string | null = null;

        // Fetch the model and create a local blob URL
        const loadModel = async () => {
            try {
                const response = await fetch(modelUrl);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                blobUrl = url;

                // Only update state if component is still mounted
                if (isMounted) {
                    setLocalUrl(url);
                } else {
                    // If unmounted during fetch, revoke immediately
                    URL.revokeObjectURL(url);
                }
            } catch (error) {
                console.error('❌ Failed to load model:', error);
            }
        };

        loadModel();

        // Cleanup function to revoke the blob URL
        return () => {
            isMounted = false;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [modelUrl]);

    if (!localUrl) {
        return null;
    }

    return <LoadedModel url={localUrl} transform={transform} />;
}, (prevProps, nextProps) => {
    // Only re-render if modelUrl changes
    return prevProps.modelUrl === nextProps.modelUrl;
});

const LoadedModel = memo(function LoadedModel({ url, transform }: { url: string; transform?: Transform }) {
    const gltf = useGLTF(url) as GLTF;

    const defaultTransform: Transform = {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: 1,
    };

    const t = transform || defaultTransform;

    return (
        <primitive
            object={gltf.scene}
            position={t.position}
            rotation={t.rotation}
            scale={t.scale}
        />
    );
}, (prevProps, nextProps) => {
    // Only re-render if url changes (transform is static for now)
    return prevProps.url === nextProps.url;
});

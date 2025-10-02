import { useEffect, useState, memo } from 'react';
import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';
import type { Transform } from '../services/types';
import {
  Box3,
  Vector3,
  MeshBasicMaterial,
  Color,
  Mesh,
  BufferGeometry,
  Material,
  Group,
  WebGLRenderer,
  Scene as ThreeScene,
  Camera,
} from 'three';

interface Model3DProps {
  modelUrl: string;
  transform?: Transform;
  renderMode?: 'textured' | 'solid';
  colorHex?: string; // used in solid mode
}

export const Model3D = memo(
  function Model3D({
    modelUrl,
    transform,
    renderMode = 'textured',
    colorHex,
  }: Model3DProps) {
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

    return (
      <LoadedModel
        url={localUrl}
        transform={transform}
        renderMode={renderMode}
        colorHex={colorHex}
      />
    );
  },
  (prevProps, nextProps) => {
    // Re-render if modelUrl or renderMode/color changes
    return (
      prevProps.modelUrl === nextProps.modelUrl &&
      prevProps.renderMode === nextProps.renderMode &&
      prevProps.colorHex === nextProps.colorHex
    );
  }
);

const LoadedModel = memo(
  function LoadedModel({
    url,
    transform,
    renderMode = 'textured',
    colorHex,
  }: {
    url: string;
    transform?: Transform;
    renderMode?: 'textured' | 'solid';
    colorHex?: string;
  }) {
    const gltf = useGLTF(url) as GLTF;

    // Compute and store model-space bounding box once after load
    useEffect(() => {
      if (!gltf?.scene) return;
      const box = new Box3().setFromObject(gltf.scene);
      const center = new Vector3();
      const size = new Vector3();
      box.getCenter(center);
      box.getSize(size);
      // Store for potential future use (e.g., focus, selection helpers)
      gltf.scene.userData.__bbox = {
        center: [center.x, center.y, center.z] as [number, number, number],
        size: [size.x, size.y, size.z] as [number, number, number],
      };
    }, [gltf]);

    const defaultTransform: Transform = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    };

    const t = transform || defaultTransform;

    // Toggle material sets based on renderMode
    useEffect(() => {
      if (!gltf?.scene) return;
      const scene = gltf.scene;

      // Prepare a single solid material per model instance (unlit, fast)
      const solidMaterial: MeshBasicMaterial =
        scene.userData.__solidMaterialGlobal ||
        new MeshBasicMaterial({
          color: new Color(colorHex ?? '#cccccc'),
          toneMapped: false,
        });
      solidMaterial.color.set(colorHex ?? '#cccccc');
      // Ensure no textures/maps
      solidMaterial.map = null;
      solidMaterial.alphaMap = null;
      solidMaterial.aoMap = null;
      solidMaterial.envMap = null;
      solidMaterial.lightMap = null;
      solidMaterial.needsUpdate = true;
      scene.userData.__solidMaterialGlobal = solidMaterial;

      if (renderMode === 'solid') {
        scene.traverse((node) => {
          const n = node as Mesh;
          if (!n || (n as unknown as { isMesh?: boolean }).isMesh !== true)
            return;
          // Save original once
          if (!n.userData.__originalMaterial) {
            (n.userData as Record<string, unknown>).__originalMaterial =
              n.material;
          }
          // Assign shared solid material per model
          n.material = solidMaterial;

          // Setup lightweight wireframe overlay pass using onAfterRender
          if (!(n.userData as Record<string, unknown>).__wireframeApplied) {
            const wf: MeshBasicMaterial =
              (scene.userData.__sharedWireframeMaterial ||=
                new MeshBasicMaterial({
                  color: new Color('#000000'),
                  wireframe: true,
                  depthTest: true,
                  depthWrite: false,
                  polygonOffset: true,
                  polygonOffsetFactor: -1,
                  polygonOffsetUnits: -1,
                }));
            (n.userData as Record<string, unknown>).__originalOnAfterRender =
              n.onAfterRender;
            n.onAfterRender = (
              renderer: WebGLRenderer,
              sceneArg: ThreeScene,
              camera: Camera,
              geometry: BufferGeometry,
              material: Material,
              group: Group
            ) => {
              const baseMat = n.material;
              // draw overlay AFTER the normal draw so it appears on top
              n.material = wf;
              renderer.renderBufferDirect(
                camera,
                sceneArg,
                n.geometry,
                wf,
                n,
                null
              );
              n.material = baseMat;
              const original = (n.userData as Record<string, unknown>)
                .__originalOnAfterRender as
                | ((
                    renderer: WebGLRenderer,
                    scene: ThreeScene,
                    camera: Camera,
                    geometry: BufferGeometry,
                    material: Material,
                    group: Group
                  ) => void)
                | undefined;
              if (original) {
                original(renderer, sceneArg, camera, geometry, material, group);
              }
            };
            (n.userData as Record<string, unknown>).__wireframeApplied = true;
          }
        });
      } else {
        // Restore original materials and remove edges
        scene.traverse((node) => {
          const n = node as Mesh;
          if (!n || (n as unknown as { isMesh?: boolean }).isMesh !== true)
            return;
          const originalMat = (n.userData as Record<string, unknown>)
            .__originalMaterial as MeshBasicMaterial | undefined;
          if (originalMat) {
            n.material = originalMat;
          }
          if ((n.userData as Record<string, unknown>).__wireframeApplied) {
            const original = (n.userData as Record<string, unknown>)
              .__originalOnAfterRender as
              | ((
                  renderer: WebGLRenderer,
                  scene: ThreeScene,
                  camera: Camera,
                  geometry: BufferGeometry,
                  material: Material,
                  group: Group
                ) => void)
              | undefined;
            n.onAfterRender = (
              renderer: WebGLRenderer,
              sceneArg: ThreeScene,
              camera: Camera,
              geometry: BufferGeometry,
              material: Material,
              group: Group
            ) => {
              if (original) {
                original(renderer, sceneArg, camera, geometry, material, group);
              }
            };
            (n.userData as Record<string, unknown>).__wireframeApplied = false;
            (n.userData as Record<string, unknown>).__originalOnAfterRender =
              undefined;
          }
        });
      }
    }, [gltf, renderMode, colorHex]);

    return (
      <primitive
        object={gltf.scene}
        position={t.position}
        rotation={t.rotation}
        scale={t.scale}
      />
    );
  },
  (prevProps, nextProps) => {
    // Re-render if url or renderMode/color changes (transform is static for now)
    return (
      prevProps.url === nextProps.url &&
      prevProps.renderMode === nextProps.renderMode &&
      prevProps.colorHex === nextProps.colorHex
    );
  }
);

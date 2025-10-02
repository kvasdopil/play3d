import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import type { Object3D } from 'three';
import type {
  OrbitControls as ThreeOrbitControls,
  TransformControls as ThreeTransformControls,
} from 'three-stdlib';
import { Box3, Vector3 } from 'three';
import { IoSettingsSharp, IoTrashSharp, IoTimeOutline } from 'react-icons/io5';
import { IoAdd } from 'react-icons/io5';
import { RotatingCube } from './RotatingCube';
import { SettingsModal } from './components/SettingsModal';
import { PromptInput } from './components/PromptInput';
import { PromptModal } from './components/PromptModal';
import { HistoryModal } from './components/HistoryModal';
import { Model3D } from './components/Model3D';
import { generateImage } from './services/gemini';
import { generate3DModel } from './services/synexa';
import { generate3DModelWithTripo } from './services/tripo';
import type { SceneObject } from './services/types';
import {
  saveGeneratedImage,
  getGeneratedImage,
  generateImageId,
  save3DModel,
  get3DModel,
  generate3DModelId,
  getSceneObjects,
  saveSceneObjects,
  addHistoryRecord,
} from './services/storage';
import { FaRotate } from 'react-icons/fa6';
import { PiResizeBold } from 'react-icons/pi';
import { FaArrowsAlt } from 'react-icons/fa';
import { usePersistedState } from './hooks/usePersistedState';
import {
  EffectComposer,
  N8AO,
  HueSaturation,
  BrightnessContrast,
} from '@react-three/postprocessing';
import { CameraRig } from './components/scene/CameraRig';
import { SyncCameraOnModeChange } from './components/scene/SyncCameraOnModeChange';
import { PersistCamera } from './components/scene/PersistCamera';
import { CursorWheelZoom } from './components/scene/CursorWheelZoom';
import { SelectionBounds } from './components/scene/SelectionBounds';
import { IsoDragRotate } from './components/scene/IsoDragRotate';

// (removed CanvasLogger debug component)

export function Scene() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPromptInputOpen, setIsPromptInputOpen] = useState(false);
  const [promptValue, setPromptValue] = useState('');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [generatedImageData, setGeneratedImageData] = useState<
    string | undefined
  >();
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | undefined>();
  const [modelUrl, setModelUrl] = useState<string | undefined>();
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [error3D, setError3D] = useState<string | undefined>();
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([]);
  const [isSceneLoaded, setIsSceneLoaded] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isTransformHovered, setIsTransformHovered] = useState(false);
  type TransformMode = 'translate' | 'rotate' | 'scale';
  type RenderMode = 'textured' | 'solid';
  const [transformMode, setTransformMode] =
    useState<TransformMode>('translate');
  const snapThreshold = 0.15; // meters
  const [renderMode, setRenderMode] = usePersistedState<RenderMode>(
    'render-mode',
    'textured'
  );
  type CameraMode = 'perspective' | 'isometric';
  const [cameraMode, setCameraMode] = usePersistedState<CameraMode>(
    'camera-mode',
    'perspective'
  );
  const [isoIndex, setIsoIndex] = usePersistedState<number>(
    'iso-view-index',
    0
  );
  const [isSnapActive, setIsSnapActive] = useState(false);
  const lastPoseRef = useRef<{ position: Vector3; target: Vector3 } | null>(
    null
  );
  const lastPerspectivePosRef = useRef<Vector3>(new Vector3(1, 1, 1));

  // Orbit controls ref to allow custom cursor-centered zoom
  const orbitControlsRef = useRef<ThreeOrbitControls | null>(null);

  // Map of scene object id -> 3D group reference
  const objectRefs = useRef<Record<string, Object3D | null>>({});
  const transformControlsRef = useRef<ThreeTransformControls | null>(null);
  const dragStartSnapshotRef = useRef<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  } | null>(null);
  const skipCommitRef = useRef<boolean>(false);
  const [controlsReset, setControlsReset] = useState(0);
  // Group move support
  const carriedIdsRef = useRef<Set<string>>(new Set());
  const groupStartPositionsRef = useRef<
    Record<string, [number, number, number]>
  >({});
  const rootStartPosRef = useRef<Vector3 | null>(null);

  // Track what changed between renders
  const prevStateRef = useRef({
    isSettingsOpen,
    isPromptInputOpen,
    promptValue,
    isPromptModalOpen,
    submittedPrompt,
    generatedImageData,
    isGeneratingImage,
    imageError,
    modelUrl,
    isGenerating3D,
    error3D,
    sceneObjects,
    isSceneLoaded,
  });

  useEffect(() => {
    prevStateRef.current = {
      isSettingsOpen,
      isPromptInputOpen,
      promptValue,
      isPromptModalOpen,
      submittedPrompt,
      generatedImageData,
      isGeneratingImage,
      imageError,
      modelUrl,
      isGenerating3D,
      error3D,
      sceneObjects,
      isSceneLoaded,
    };
  });

  // Compute selected object for this render
  const selectedObject: Object3D | null = selectedId
    ? (objectRefs.current[selectedId] ?? null)
    : null;

  // Load persisted scene objects on mount
  useEffect(() => {
    const loadScene = async () => {
      const objects = await getSceneObjects();

      // Only update state if content actually changed (compare by length and IDs)
      setSceneObjects((prev) => {
        if (prev.length !== objects.length) {
          return objects;
        }
        // Check if IDs match
        const idsMatch = prev.every((obj, i) => obj.id === objects[i]?.id);
        if (!idsMatch) {
          return objects;
        }
        return prev; // Return same reference to prevent re-render
      });

      setIsSceneLoaded(true);
    };
    loadScene();
  }, []);

  // Save scene objects whenever they change (but only after initial load)
  useEffect(() => {
    if (isSceneLoaded) {
      saveSceneObjects(sceneObjects);
    }
  }, [sceneObjects, isSceneLoaded]);

  // (removed debug log on sceneObjects change)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if settings/prompt modal is open or if typing in an input
      if (
        isSettingsOpen ||
        isPromptModalOpen ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Isometric view rotation with arrow keys
      if (
        cameraMode === 'isometric' &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        e.preventDefault();
        setIsoIndex((prev) => {
          const next = e.key === 'ArrowLeft' ? (prev + 1) % 8 : (prev + 7) % 8;
          return next;
        });
        return;
      }

      // Delete selected object with Delete key
      if (e.key === 'Delete') {
        if (selectedId) {
          e.preventDefault();
          setSceneObjects((prev) => prev.filter((o) => o.id !== selectedId));
          setSelectedId(null);
        }
        return;
      }

      // Check for printable characters (letters, numbers, etc.)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); // Prevent the key from being typed in the input
        setIsPromptInputOpen(true);
        setPromptValue(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, isPromptModalOpen, selectedId, cameraMode, setIsoIndex]);

  // Track hover over transform gizmo to avoid selecting through it
  useEffect(() => {
    const controls = transformControlsRef.current;
    if (!controls) return;
    const onHoverOn = () => setIsTransformHovered(true);
    const onHoverOff = () => setIsTransformHovered(false);
    const onMouseDown = () => setIsTransformHovered(true);
    const onMouseUp = () => setIsTransformHovered(false);
    type GenericDispatcher = {
      addEventListener: (
        type: string,
        listener: (...args: unknown[]) => void
      ) => void;
      removeEventListener: (
        type: string,
        listener: (...args: unknown[]) => void
      ) => void;
    };
    const dispatcher = controls as unknown as GenericDispatcher;
    dispatcher.addEventListener('hoveron', onHoverOn);
    dispatcher.addEventListener('hoveroff', onHoverOff);
    dispatcher.addEventListener('mouseDown', onMouseDown);
    dispatcher.addEventListener('mouseUp', onMouseUp);
    return () => {
      try {
        dispatcher.removeEventListener('hoveron', onHoverOn);
        dispatcher.removeEventListener('hoveroff', onHoverOff);
        dispatcher.removeEventListener('mouseDown', onMouseDown);
        dispatcher.removeEventListener('mouseUp', onMouseUp);
      } catch {
        // intentionally ignore cleanup errors
      }
    };
  }, [selectedId]);

  // Reset drag/hover/orbit state when selection changes or controls unmount
  useEffect(() => {
    setIsTransformHovered(false);
    setIsTransforming(false);
    setOrbitEnabled(true);
    dragStartSnapshotRef.current = null;
    skipCommitRef.current = false;
    setIsSnapActive(false);
    return () => {
      setIsTransformHovered(false);
      setIsTransforming(false);
      setOrbitEnabled(true);
      dragStartSnapshotRef.current = null;
      skipCommitRef.current = false;
      setIsSnapActive(false);
    };
  }, [selectedId]);

  // ESC to cancel current transform and restore snapshot
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTransforming) {
        e.preventDefault();
        const id = selectedId;
        const o = id ? (objectRefs.current[id] ?? null) : null;
        const snap = dragStartSnapshotRef.current;
        if (o && snap) {
          o.position.set(snap.position[0], snap.position[1], snap.position[2]);
          o.rotation.set(snap.rotation[0], snap.rotation[1], snap.rotation[2]);
          o.scale.set(snap.scale, snap.scale, snap.scale);
        }
        // Restore carried group positions if any (translate mode only)
        if (transformMode === 'translate' && carriedIdsRef.current.size > 0) {
          for (const cid of carriedIdsRef.current) {
            if (cid === id) continue;
            const co = objectRefs.current[cid] ?? null;
            const start = groupStartPositionsRef.current[cid];
            if (co && start) {
              co.position.set(start[0], start[1], start[2]);
            }
          }
        }
        carriedIdsRef.current.clear();
        groupStartPositionsRef.current = {};
        rootStartPosRef.current = null;
        setIsTransforming(false);
        setOrbitEnabled(true);
        setIsTransformHovered(false);
        setIsSnapActive(false);
        skipCommitRef.current = true; // prevent commit on mouse up
        setControlsReset((v) => v + 1); // force re-mount of controls
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTransforming, selectedId]);

  const handlePromptSubmit = async () => {
    if (promptValue.trim()) {
      const prompt = promptValue.trim();
      setSubmittedPrompt(prompt);
      setIsPromptInputOpen(false);
      setIsPromptModalOpen(true);
      setPromptValue('');
      setGeneratedImageData(undefined);
      setImageError(undefined);
      setIsGeneratingImage(true);

      try {
        // Get API key from localStorage
        const apiKey = localStorage.getItem('gemini-api-key');
        if (!apiKey) {
          throw new Error('Please set your Gemini API key in settings');
        }

        // Create enhanced prompt for better 3D generation
        const enhancedPrompt = `Create an image for me: ${prompt}. White background, no shadow, top-corner view. No other objects in the image.`;

        // Check if image already exists in IndexedDB
        const imageId = generateImageId(prompt);
        const cachedImage = await getGeneratedImage(imageId);

        if (cachedImage) {
          setGeneratedImageData(cachedImage.data);
          // Save image-only history record immediately
          try {
            const dataUrl = cachedImage.data.startsWith('data:')
              ? cachedImage.data
              : `data:image/png;base64,${cachedImage.data}`;
            await addHistoryRecord({
              id: `${imageId}-image-${Date.now()}`,
              imageUrl: dataUrl,
              prompt,
              time: Date.now(),
            });
          } catch (e) {
            console.warn('Failed to write image history record', e);
          }
        } else {
          // Generate new image with enhanced prompt
          const generatedImage = await generateImage(
            enhancedPrompt,
            JSON.parse(apiKey)
          );

          // Save to IndexedDB with original prompt
          await saveGeneratedImage(imageId, {
            ...generatedImage,
            prompt, // Store original prompt, not enhanced one
          });

          // Display image
          setGeneratedImageData(generatedImage.data);

          // Save image-only history record immediately
          try {
            const dataUrl = generatedImage.data.startsWith('data:')
              ? generatedImage.data
              : `data:image/png;base64,${generatedImage.data}`;
            await addHistoryRecord({
              id: `${imageId}-image-${Date.now()}`,
              imageUrl: dataUrl,
              prompt,
              time: Date.now(),
            });
          } catch (e) {
            console.warn('Failed to write image history record', e);
          }
        }
      } catch (error) {
        console.error('Error generating image:', error);
        setImageError(
          error instanceof Error ? error.message : 'Failed to generate image'
        );
      } finally {
        setIsGeneratingImage(false);
      }
    }
  };

  const handlePromptClose = () => {
    setIsPromptInputOpen(false);
    setPromptValue('');
  };

  const handleModalClose = () => {
    setIsPromptModalOpen(false);
    setGeneratedImageData(undefined);
    setImageError(undefined);
    setModelUrl(undefined);
    setError3D(undefined);
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setSceneObjects((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  };

  const handleGenerate3D = async (provider: 'Synexa' | 'Tripo') => {
    if (!generatedImageData || !submittedPrompt) {
      return;
    }

    // Close the prompt modal while generating
    setIsPromptModalOpen(false);

    setIsGenerating3D(true);
    setError3D(undefined);

    try {
      // API keys
      const falApiKey = localStorage.getItem('synexa-api-key');
      const tripoApiKey = localStorage.getItem('tripo-api-key');

      // Check if 3D model already exists in IndexedDB (provider-specific key)
      const modelId = generate3DModelId(`${provider}:${submittedPrompt}`);
      const cached3DModel = await get3DModel(modelId);

      let finalModelUrl: string;

      if (cached3DModel) {
        finalModelUrl = cached3DModel.modelUrl;
        setModelUrl(cached3DModel.modelUrl);
      } else {
        // Generate new 3D model by provider
        let generated3DModel;
        if (provider === 'Synexa') {
          if (!falApiKey) {
            throw new Error('Please set your FAL API key in settings');
          }
          generated3DModel = await generate3DModel(
            generatedImageData,
            submittedPrompt,
            JSON.parse(falApiKey)
          );
        } else {
          if (!tripoApiKey) {
            throw new Error('Please set your Tripo API key in settings');
          }
          generated3DModel = await generate3DModelWithTripo(
            generatedImageData,
            submittedPrompt,
            JSON.parse(tripoApiKey)
          );
        }

        // Save to IndexedDB
        await save3DModel(modelId, generated3DModel);

        // Display model in modal
        finalModelUrl = generated3DModel.modelUrl;
        setModelUrl(generated3DModel.modelUrl);
      }

      // Save history record (separate table)
      try {
        const dataUrl = generatedImageData.startsWith('data:')
          ? generatedImageData
          : `data:image/png;base64,${generatedImageData}`;
        await addHistoryRecord({
          id: `${modelId}-history`,
          modelUrl: finalModelUrl,
          imageUrl: dataUrl,
          prompt: submittedPrompt,
          time: Date.now(),
        });
      } catch (e) {
        console.warn('Failed to write history record', e);
      }

      // Check if model already exists in scene (prevent duplicates)
      const modelExists = sceneObjects.some(
        (obj) => obj.modelUrl === finalModelUrl
      );

      if (!modelExists) {
        // Add to scene objects with default transform
        const newSceneObject: SceneObject = {
          id: modelId,
          modelUrl: finalModelUrl,
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: 1,
          },
          prompt: submittedPrompt,
          timestamp: Date.now(),
        };
        setSceneObjects((prev) => [...prev, newSceneObject]);
      }
    } catch (error) {
      console.error('Error generating 3D model:', error);
      setError3D(
        error instanceof Error ? error.message : 'Failed to generate 3D model'
      );
    } finally {
      setIsGenerating3D(false);
    }
  };

  const handleAddFromHistory = (item: {
    id: string;
    modelUrl: string;
    prompt?: string;
    timestamp?: number;
  }) => {
    const exists = sceneObjects.some((o) => o.modelUrl === item.modelUrl);
    if (exists) return;
    const newSceneObject: SceneObject = {
      id: `${item.id}-scene-${Date.now()}`,
      modelUrl: item.modelUrl,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: 1,
      },
      prompt: item.prompt ?? '',
      timestamp: item.timestamp ?? Date.now(),
    };
    setSceneObjects((prev) => [...prev, newSceneObject]);
  };

  const handleOpenPromptFromHistory = (args: {
    prompt: string;
    imageData: string;
  }) => {
    // Close history and open prompt modal with provided prompt and image
    setIsHistoryOpen(false);
    setSubmittedPrompt(args.prompt);
    setGeneratedImageData(args.imageData);
    setImageError(undefined);
    setModelUrl(undefined);
    setError3D(undefined);
    setIsPromptModalOpen(true);
  };

  return (
    <div className="w-screen h-screen relative">
      {/* Top right buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {/* Delete Selected Button */}
        {selectedId && (
          <button
            onClick={handleDeleteSelected}
            className="p-3 bg-red-500/90 hover:bg-red-500 rounded-lg shadow-lg transition-all hover:shadow-xl"
            aria-label="Delete selected object"
            title="Delete selected object"
          >
            <IoTrashSharp size={24} className="text-white" />
          </button>
        )}

        {/* History Button */}
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="p-3 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all hover:shadow-xl"
          aria-label="History"
          title="Show history"
        >
          <IoTimeOutline size={24} className="text-gray-700" />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all hover:shadow-xl"
          aria-label="Settings"
        >
          <IoSettingsSharp size={24} className="text-gray-700" />
        </button>
      </div>

      {/* 3D Canvas */}
      <Canvas
        style={{ background: '#d3d3d3' }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <CameraRig
          mode={cameraMode}
          isoIndex={isoIndex}
          lastPoseRef={lastPoseRef}
          lastPerspectivePosRef={lastPerspectivePosRef}
        />
        <SyncCameraOnModeChange
          mode={cameraMode}
          controlsRef={orbitControlsRef}
          lastPoseRef={lastPoseRef}
          lastPerspectivePosRef={lastPerspectivePosRef}
          isoIndex={isoIndex}
        />
        {/* Ambient/Key lights */}
        <ambientLight intensity={0.0} />
        <hemisphereLight intensity={0.5} groundColor="#444444" />
        <directionalLight position={[15, 15, 15]} intensity={3.0} />
        <directionalLight position={[-15, 15, -15]} intensity={1.0} />

        {/* Grid on horizontal plane (XZ), visible from both sides */}
        <Grid
          args={[10, 10]} // 10m x 10m grid
          cellSize={0.1} // 10cm cells
          cellThickness={1}
          cellColor="#666"
          sectionSize={1} // 1m sections
          sectionThickness={0.5}
          sectionColor="#333"
          fadeDistance={25}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
          side={2} // THREE.DoubleSide - visible from both sides
        />

        {/* Display all scene objects or rotating cube placeholder */}
        {sceneObjects.length > 0 ? (
          sceneObjects.map((obj) => (
            <group
              key={obj.id}
              ref={(el) => {
                if (el) {
                  objectRefs.current[obj.id] = el;
                } else {
                  delete objectRefs.current[obj.id];
                }
              }}
              position={obj.transform.position}
              rotation={obj.transform.rotation}
              scale={obj.transform.scale}
              userData={{ id: obj.id }}
              onClick={(e) => {
                // Ignore selection while manipulating/hovering transform gizmo
                if (isTransforming || isTransformHovered) {
                  return;
                }
                e.stopPropagation();
                console.log('[select]', {
                  id: obj.id,
                  modelUrl: obj.modelUrl,
                  intersectedUuid: e.object.uuid,
                  targetUuid: e.eventObject.uuid,
                });
                setSelectedId(obj.id);
              }}
            >
              <Model3D
                modelUrl={obj.modelUrl}
                renderMode={renderMode}
                colorHex={
                  renderMode === 'solid' ? pastelFromId(obj.id) : undefined
                }
              />
            </group>
          ))
        ) : (
          <RotatingCube />
        )}

        {/* Postprocessing - Ambient Occlusion */}
        <EffectComposer>
          <N8AO
            intensity={8}
            aoRadius={3}
            distanceFalloff={0.5}
            quality="ultra"
            aoSamples={32}
            denoiseSamples={2}
            denoiseRadius={8}
          />
          <HueSaturation saturation={0.1} />
          <BrightnessContrast brightness={0.2} contrast={0.2} />
          {/* <Bloom
            intensity={0.2}
            radius={0.05}
            luminanceThreshold={0.01}
            mipmapBlur
          /> */}
        </EffectComposer>

        {/* Transform controls attached to the selected object */}
        {selectedObject && (
          <TransformControls
            key={`${selectedId ?? 'none'}-${controlsReset}`}
            object={selectedObject}
            mode={transformMode}
            ref={transformControlsRef}
            onChange={() => {
              // Vertical snapping to ground and other objects' top planes during translation
              if (transformMode !== 'translate') return;
              const id = selectedId;
              const o = id ? (objectRefs.current[id] ?? null) : null;
              if (!o) return;

              const aabb = new Box3().setFromObject(o);
              const bottomY = aabb.min.y;

              // Gather candidate target Y planes: ground (0) and other objects' top faces when XZ overlap
              const candidatePlanesY: number[] = [0];
              for (const [otherId, otherObj] of Object.entries(
                objectRefs.current
              )) {
                if (!otherObj || otherId === id) continue;
                const otherBox = new Box3().setFromObject(otherObj);
                const xOverlap =
                  aabb.max.x > otherBox.min.x && aabb.min.x < otherBox.max.x;
                const zOverlap =
                  aabb.max.z > otherBox.min.z && aabb.min.z < otherBox.max.z;
                if (xOverlap && zOverlap) {
                  candidatePlanesY.push(otherBox.max.y);
                }
              }

              // Find best plane within threshold (smallest absolute delta)
              let bestDelta = Infinity;
              for (const planeY of candidatePlanesY) {
                const delta = planeY - bottomY;
                if (
                  Math.abs(delta) <= snapThreshold &&
                  Math.abs(delta) < Math.abs(bestDelta)
                ) {
                  bestDelta = delta;
                }
              }

              if (bestDelta !== Infinity) {
                o.position.y += bestDelta;
                setIsSnapActive(true);
              } else {
                setIsSnapActive(false);
              }

              // Apply grouped translation to carried objects (keep relative offsets)
              if (rootStartPosRef.current && carriedIdsRef.current.size > 0) {
                const delta = o.position.clone().sub(rootStartPosRef.current);
                for (const cid of carriedIdsRef.current) {
                  if (cid === id) continue; // root is already moved by controls
                  const co = objectRefs.current[cid] ?? null;
                  const start = groupStartPositionsRef.current[cid];
                  if (co && start) {
                    co.position.set(
                      start[0] + delta.x,
                      start[1] + delta.y,
                      start[2] + delta.z
                    );
                  }
                }
              }
            }}
            onMouseDown={() => {
              setOrbitEnabled(false);
              setIsTransforming(true);
              setIsSnapActive(false);
              const id = selectedId;
              const o = id ? (objectRefs.current[id] ?? null) : null;
              if (o) {
                dragStartSnapshotRef.current = {
                  position: [o.position.x, o.position.y, o.position.z],
                  rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
                  scale: o.scale.x,
                };
                // Prepare grouped carry data for translate mode
                if (transformMode === 'translate' && id) {
                  // Helper to find all objects stacked on top (recursively)
                  const collectStackAbove = (
                    baseId: string,
                    acc: Set<string>
                  ) => {
                    const baseObj = objectRefs.current[baseId] ?? null;
                    if (!baseObj) return;
                    const baseBox = new Box3().setFromObject(baseObj);
                    const baseTopY = baseBox.max.y;
                    for (const [oid, obj] of Object.entries(
                      objectRefs.current
                    )) {
                      if (!obj || oid === baseId || acc.has(oid)) continue;
                      const box = new Box3().setFromObject(obj);
                      const xOverlap =
                        baseBox.max.x > box.min.x && baseBox.min.x < box.max.x;
                      const zOverlap =
                        baseBox.max.z > box.min.z && baseBox.min.z < box.max.z;
                      const restingOnTop =
                        Math.abs(box.min.y - baseTopY) <= snapThreshold;
                      if (xOverlap && zOverlap && restingOnTop) {
                        acc.add(oid);
                        collectStackAbove(oid, acc);
                      }
                    }
                  };
                  const group = new Set<string>([id]);
                  collectStackAbove(id, group);
                  carriedIdsRef.current = group;
                  // Snapshot start positions for all carried objects
                  groupStartPositionsRef.current = {};
                  for (const cid of group) {
                    const co = objectRefs.current[cid] ?? null;
                    if (co) {
                      groupStartPositionsRef.current[cid] = [
                        co.position.x,
                        co.position.y,
                        co.position.z,
                      ];
                    }
                  }
                  rootStartPosRef.current = o.position.clone();
                } else {
                  carriedIdsRef.current.clear();
                  groupStartPositionsRef.current = {};
                  rootStartPosRef.current = null;
                }
              } else {
                dragStartSnapshotRef.current = null;
                carriedIdsRef.current.clear();
                groupStartPositionsRef.current = {};
                rootStartPosRef.current = null;
              }
              skipCommitRef.current = false;
            }}
            onMouseUp={() => {
              setOrbitEnabled(true);
              setIsTransforming(false);
              setIsSnapActive(false);
              if (skipCommitRef.current) {
                // Clear the flag and skip committing the transform
                skipCommitRef.current = false;
                carriedIdsRef.current.clear();
                groupStartPositionsRef.current = {};
                rootStartPosRef.current = null;
                return;
              }
              const id = selectedId;
              const o = id ? (objectRefs.current[id] ?? null) : null;
              if (o && id) {
                // Commit positions for all carried objects if translating; always commit root fully
                const carried = new Set<string>(carriedIdsRef.current);
                setSceneObjects((prev) =>
                  prev.map((p) => {
                    const refObj = objectRefs.current[p.id] ?? null;
                    if (!refObj) return p;
                    if (p.id === id) {
                      // Root: commit pos+rot+scale
                      return {
                        ...p,
                        transform: {
                          position: [
                            refObj.position.x,
                            refObj.position.y,
                            refObj.position.z,
                          ],
                          rotation: [
                            refObj.rotation.x,
                            refObj.rotation.y,
                            refObj.rotation.z,
                          ],
                          scale: refObj.scale.x,
                        },
                      };
                    }
                    if (transformMode === 'translate' && carried.has(p.id)) {
                      // Carried child: commit new position, keep rotation/scale
                      return {
                        ...p,
                        transform: {
                          position: [
                            refObj.position.x,
                            refObj.position.y,
                            refObj.position.z,
                          ],
                          rotation: p.transform.rotation,
                          scale: p.transform.scale,
                        },
                      };
                    }
                    return p;
                  })
                );
              }
              carriedIdsRef.current.clear();
              groupStartPositionsRef.current = {};
              rootStartPosRef.current = null;
            }}
          />
        )}

        {/* Bounding box for selected object */}
        {selectedObject && (
          <SelectionBounds
            object={selectedObject}
            threshold={snapThreshold}
            snapActive={isSnapActive}
          />
        )}

        {/* Orbit controls for camera rotation and zoom */}
        <OrbitControls
          ref={orbitControlsRef}
          enableDamping
          dampingFactor={0.05}
          target={[0, 0, 0]} // Look at origin
          enabled={orbitEnabled}
          enableZoom={cameraMode === 'isometric'}
          enableRotate={cameraMode !== 'isometric'}
          enablePan={cameraMode !== 'isometric'}
        />

        {/* Custom cursor-centered zoom handler */}
        <CursorWheelZoom
          controlsRef={orbitControlsRef}
          enabled={orbitEnabled && cameraMode === 'perspective'}
        />
        {/* Map horizontal drags to iso view steps when in isometric and not transforming */}
        <IsoDragRotate
          enabled={
            orbitEnabled &&
            cameraMode === 'isometric' &&
            !isTransforming &&
            !isTransformHovered
          }
          onSetIndex={(index) => setIsoIndex(index % 8)}
        />
        {/* Persist camera position and orbit target across reloads */}
        <PersistCamera controlsRef={orbitControlsRef} />
      </Canvas>

      {/* Transform mode toolbar */}
      {selectedId && (
        <div className="absolute top-4 left-4 z-10 flex gap-2 bg-white/90 rounded-lg shadow-lg p-1">
          <button
            onClick={() => setTransformMode('translate')}
            className={`${transformMode === 'translate' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700'} px-3 py-1 rounded flex items-center justify-center`}
            aria-label="Move"
            title="Move"
          >
            <FaArrowsAlt size={18} />
          </button>
          <button
            onClick={() => setTransformMode('rotate')}
            className={`${transformMode === 'rotate' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700'} px-3 py-1 rounded flex items-center justify-center`}
            aria-label="Rotate"
            title="Rotate"
          >
            <FaRotate size={18} />
          </button>
          <button
            onClick={() => setTransformMode('scale')}
            className={`${transformMode === 'scale' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700'} px-3 py-1 rounded flex items-center justify-center`}
            aria-label="Scale"
            title="Scale"
          >
            <PiResizeBold size={18} />
          </button>
        </div>
      )}

      {/* Plus button to open prompt input (visible when not editing) */}
      {!selectedId &&
        !isTransforming &&
        !isPromptInputOpen &&
        !isPromptModalOpen &&
        !isSettingsOpen &&
        !isHistoryOpen && (
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => setIsPromptInputOpen(true)}
              className="p-3 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all hover:shadow-xl"
              aria-label="New prompt"
              title="New prompt"
            >
              <IoAdd size={24} className="text-gray-700" />
            </button>
          </div>
        )}

      {/* Render mode toggle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 rounded-lg shadow-lg px-2 py-1 flex items-center gap-2">
        <button
          onClick={() => setRenderMode('textured')}
          className={`${renderMode === 'textured' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700'} px-2 py-1 rounded text-xs`}
        >
          Textured
        </button>
        <button
          onClick={() => setRenderMode('solid')}
          className={`${renderMode === 'solid' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700'} px-2 py-1 rounded text-xs`}
        >
          Solid
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          onClick={() => setCameraMode('perspective')}
          className={`${cameraMode === 'perspective' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700'} px-2 py-1 rounded text-xs`}
          title="Perspective camera"
        >
          Persp
        </button>
        <div className="flex items-center bg-white rounded">
          <button
            onClick={() => setCameraMode('isometric')}
            className={`${cameraMode === 'isometric' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700'} px-2 py-1 rounded-l text-xs`}
            title="Isometric camera"
          >
            Iso
          </button>
          {cameraMode === 'isometric' && (
            <div className="flex">
              <button
                onClick={() => setIsoIndex((v) => (v + 1) % 8)}
                className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                title="Rotate left (←)"
              >
                ←
              </button>
              <button
                onClick={() => setIsoIndex((v) => (v + 7) % 8)}
                className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded-r"
                title="Rotate right (→)"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prompt Input */}
      <PromptInput
        isOpen={isPromptInputOpen}
        value={promptValue}
        onChange={setPromptValue}
        onSubmit={handlePromptSubmit}
        onClose={handlePromptClose}
      />

      {/* Prompt Modal */}
      <PromptModal
        isOpen={isPromptModalOpen}
        prompt={submittedPrompt}
        imageData={generatedImageData}
        isLoading={isGeneratingImage}
        error={imageError}
        modelUrl={modelUrl}
        isGenerating3D={isGenerating3D}
        error3D={error3D}
        onClose={handleModalClose}
        onGenerate3D={handleGenerate3D}
        onUpdatePrompt={async (newPrompt) => {
          const trimmed = newPrompt.trim();
          if (!trimmed) return;
          // Update prompt and regenerate image without closing modal
          setSubmittedPrompt(trimmed);
          setGeneratedImageData(undefined);
          setImageError(undefined);
          setIsGeneratingImage(true);
          try {
            const apiKey = localStorage.getItem('gemini-api-key');
            if (!apiKey) {
              throw new Error('Please set your Gemini API key in settings');
            }
            const enhancedPrompt = `Create an image for me: ${trimmed}. White background, no shadow, top-corner view. No other objects in the image.`;
            const imageId = generateImageId(trimmed);
            const cachedImage = await getGeneratedImage(imageId);
            if (cachedImage) {
              setGeneratedImageData(cachedImage.data);
            } else {
              const generatedImage = await generateImage(
                enhancedPrompt,
                JSON.parse(apiKey)
              );
              await saveGeneratedImage(imageId, {
                ...generatedImage,
                prompt: trimmed,
              });
              setGeneratedImageData(generatedImage.data);
            }
          } catch (error) {
            console.error('Error generating image:', error);
            setImageError(
              error instanceof Error
                ? error.message
                : 'Failed to generate image'
            );
          } finally {
            setIsGeneratingImage(false);
          }
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onAddToScene={handleAddFromHistory}
        onOpenPrompt={handleOpenPromptFromHistory}
      />

      {/* Bottom-left generation progress button */}
      {isGenerating3D && (
        <div className="absolute bottom-4 left-4 z-10">
          <button
            className="flex items-center gap-3 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all hover:shadow-xl px-3 py-2"
            aria-label="Generating 3D model"
            title="Generating 3D model"
          >
            {generatedImageData && (
              <img
                src={`data:image/png;base64,${generatedImageData}`}
                alt="Prompt thumbnail"
                className="w-8 h-8 object-cover"
              />
            )}
            <span className="text-sm text-gray-700 truncate max-w-[240px]">
              {submittedPrompt}
            </span>
            <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </button>
        </div>
      )}
    </div>
  );
}
// FNV-1a 32-bit hash for stable ID hashing
function hashFNV1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0; // unsigned 32-bit
}

// Generate a soft pastel color (hex) based on a stable object id
function pastelFromId(id: string): string {
  const h = hashFNV1a(id);
  // Map hash to hue using golden ratio for even distribution
  const golden = 0.61803398875;
  const hue = ((h * golden) % 1) * 360; // 0..360
  const saturation = 0.5; // 50%
  const lightness = 0.82; // 82% very light pastel
  return hslToHex(hue / 360, saturation, lightness);
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

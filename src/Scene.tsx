import { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  TransformControls,
  OrthographicCamera,
  PerspectiveCamera,
} from '@react-three/drei';
import type { Object3D, LineSegments, Mesh } from 'three';
import type {
  OrbitControls as ThreeOrbitControls,
  TransformControls as ThreeTransformControls,
} from 'three-stdlib';
import { Box3, Vector3, BoxGeometry, Plane, Raycaster, Vector2 } from 'three';
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
          const next = e.key === 'ArrowLeft' ? (prev + 1) % 4 : (prev + 3) % 4;
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

  const handleGenerate3D = async () => {
    if (!generatedImageData || !submittedPrompt) {
      return;
    }

    // Close the prompt modal while generating
    setIsPromptModalOpen(false);

    setIsGenerating3D(true);
    setError3D(undefined);

    try {
      // Get FAL API key from localStorage
      const falApiKey = localStorage.getItem('synexa-api-key');
      if (!falApiKey) {
        throw new Error('Please set your FAL API key in settings');
      }

      // Check if 3D model already exists in IndexedDB
      const modelId = generate3DModelId(submittedPrompt);
      const cached3DModel = await get3DModel(modelId);

      let finalModelUrl: string;

      if (cached3DModel) {
        finalModelUrl = cached3DModel.modelUrl;
        setModelUrl(cached3DModel.modelUrl);
      } else {
        // Generate new 3D model
        const generated3DModel = await generate3DModel(
          generatedImageData,
          submittedPrompt,
          JSON.parse(falApiKey)
        );

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
        <ambientLight intensity={1.0} />
        <hemisphereLight intensity={0.6} groundColor="#444444" />
        <directionalLight position={[15, 15, 15]} intensity={4} />
        <directionalLight position={[-15, 15, -15]} intensity={1.5} />

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
            intensity={3}
            aoRadius={10}
            distanceFalloff={0.5}
            quality="ultra"
            aoSamples={32}
            denoiseSamples={2}
            denoiseRadius={8}
          />
          <HueSaturation saturation={0.3} />
          <BrightnessContrast brightness={0.25} contrast={0.2} />
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
              } else {
                dragStartSnapshotRef.current = null;
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
                return;
              }
              const id = selectedId;
              const o = id ? (objectRefs.current[id] ?? null) : null;
              if (o && id) {
                const newPos: [number, number, number] = [
                  o.position.x,
                  o.position.y,
                  o.position.z,
                ];
                const newRot: [number, number, number] = [
                  o.rotation.x,
                  o.rotation.y,
                  o.rotation.z,
                ];
                const newScale = o.scale.x;
                setSceneObjects((prev) =>
                  prev.map((p) =>
                    p.id === id
                      ? {
                        ...p,
                        transform: {
                          position: newPos,
                          rotation: newRot,
                          scale: newScale,
                        },
                      }
                      : p
                  )
                );
              }
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
        />

        {/* Custom cursor-centered zoom handler */}
        <CursorWheelZoom
          controlsRef={orbitControlsRef}
          enabled={orbitEnabled && cameraMode === 'perspective'}
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
                onClick={() => setIsoIndex((v) => (v + 1) % 4)}
                className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                title="Rotate left (←)"
              >
                ←
              </button>
              <button
                onClick={() => setIsoIndex((v) => (v + 3) % 4)}
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

function CameraRig({
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

function SyncCameraOnModeChange({
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

    const targetIsoPositions = [
      new Vector3(1, 1, 1),
      new Vector3(-1, 1, 1),
      new Vector3(-1, 1, -1),
      new Vector3(1, 1, -1),
    ].map((v) => v.multiplyScalar(5));

    const to =
      mode === 'isometric'
        ? targetIsoPositions[isoIndex % 4]
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

function PersistCamera({
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

function CursorWheelZoom({
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

function SelectionBounds({
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

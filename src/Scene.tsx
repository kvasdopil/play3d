import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { IoSettingsSharp, IoTrashSharp } from 'react-icons/io5';
import { RotatingCube } from './RotatingCube';
import { SettingsModal } from './components/SettingsModal';
import { PromptInput } from './components/PromptInput';
import { PromptModal } from './components/PromptModal';
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
} from './services/storage';

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

    // Load persisted scene objects on mount
    useEffect(() => {
        const loadScene = async () => {
            const objects = await getSceneObjects();

            // Only update state if content actually changed (compare by length and IDs)
            setSceneObjects(prev => {
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
            // Ignore if settings modal is open or if typing in an input
            if (
                isSettingsOpen ||
                isPromptModalOpen ||
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
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
    }, [isSettingsOpen, isPromptModalOpen]);

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

    const handleClearScene = () => {
        if (confirm('Clear all objects from the scene? This cannot be undone.')) {
            setSceneObjects([]);
            // Also clear from storage
            saveSceneObjects([]);
        }
    };

    const handleGenerate3D = async () => {
        if (!generatedImageData || !submittedPrompt) {
            return;
        }

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

            // Check if model already exists in scene (prevent duplicates)
            const modelExists = sceneObjects.some(obj => obj.modelUrl === finalModelUrl);

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

    return (
        <div className="w-screen h-screen relative">
            {/* Top right buttons */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                {/* Clear Scene Button */}
                {sceneObjects.length > 0 && (
                    <button
                        onClick={handleClearScene}
                        className="p-3 bg-red-500/90 hover:bg-red-500 rounded-lg shadow-lg transition-all hover:shadow-xl"
                        aria-label="Clear Scene"
                        title="Clear all objects from scene"
                    >
                        <IoTrashSharp size={24} className="text-white" />
                    </button>
                )}

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
                camera={{
                    position: [1, 1, 1], // 100cm = 1 unit in Three.js (we'll use meters)
                    fov: 50,
                }}
                style={{ background: '#d3d3d3' }}
            >
                {/* Ambient light for general illumination */}
                <ambientLight intensity={10.0} />

                {/* Directional light for shadows and depth */}
                <directionalLight position={[5, 5, 5]} intensity={3} />

                {/* Grid on horizontal plane (XZ), visible from both sides */}
                <Grid
                    args={[10, 10]} // 10m x 10m grid
                    cellSize={0.1} // 10cm cells
                    cellThickness={1}
                    cellColor="#999"
                    sectionSize={1} // 1m sections
                    sectionThickness={0.5}
                    sectionColor="#666"
                    fadeDistance={25}
                    fadeStrength={1}
                    followCamera={false}
                    infiniteGrid={false}
                    side={2} // THREE.DoubleSide - visible from both sides
                />

                {/* Display all scene objects or rotating cube placeholder */}
                {sceneObjects.length > 0 ? (
                    sceneObjects.map((obj) => (
                        <Model3D
                            key={obj.id}
                            modelUrl={obj.modelUrl}
                            transform={obj.transform}
                        />
                    ))
                ) : (
                    <RotatingCube />
                )}

                {/* Orbit controls for camera rotation and zoom */}
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    target={[0, 0, 0]} // Look at origin
                />
            </Canvas>

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
            />

            {/* Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
}

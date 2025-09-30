import { get, set, del } from 'idb-keyval';
import type { GeneratedImage, SceneObject } from './types';
import type { Synexa3DResult } from './synexa';

const IMAGE_KEY_PREFIX = 'generated-image-';
const MODEL_3D_KEY_PREFIX = 'generated-3d-model-';
const SCENE_OBJECTS_KEY = 'scene-objects';

export async function saveGeneratedImage(
  id: string,
  image: GeneratedImage
): Promise<void> {
  await set(`${IMAGE_KEY_PREFIX}${id}`, image);
}

export async function getGeneratedImage(
  id: string
): Promise<GeneratedImage | undefined> {
  return await get(`${IMAGE_KEY_PREFIX}${id}`);
}

export async function deleteGeneratedImage(id: string): Promise<void> {
  await del(`${IMAGE_KEY_PREFIX}${id}`);
}

// Generate a unique ID for each prompt
export function generateImageId(prompt: string): string {
  return `${prompt}-${Date.now()}`;
}

// 3D Model storage functions
export async function save3DModel(
  id: string,
  model: Synexa3DResult
): Promise<void> {
  await set(`${MODEL_3D_KEY_PREFIX}${id}`, model);
}

export async function get3DModel(
  id: string
): Promise<Synexa3DResult | undefined> {
  return await get(`${MODEL_3D_KEY_PREFIX}${id}`);
}

export async function delete3DModel(id: string): Promise<void> {
  await del(`${MODEL_3D_KEY_PREFIX}${id}`);
}

export function generate3DModelId(prompt: string): string {
  return `${prompt}-3d-${Date.now()}`;
}

// Scene objects storage functions
export async function saveSceneObjects(
  objects: SceneObject[]
): Promise<void> {
  await set(SCENE_OBJECTS_KEY, objects);
}

export async function getSceneObjects(): Promise<SceneObject[]> {
  const objects = await get<SceneObject[]>(SCENE_OBJECTS_KEY);
  return objects || [];
}

export async function clearSceneObjects(): Promise<void> {
  await del(SCENE_OBJECTS_KEY);
}

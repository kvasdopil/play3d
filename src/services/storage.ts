import { get, set, del, createStore, entries } from 'idb-keyval';
import type {
  GeneratedImage,
  SceneObject,
  HistoryRecord,
  Model3DResult,
} from './types';

const IMAGE_KEY_PREFIX = 'generated-image-';
const MODEL_3D_KEY_PREFIX = 'generated-3d-model-';
const SCENE_OBJECTS_KEY = 'scene-objects';
const HISTORY_STORE = createStore('play3d-history', 'history');

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
  model: Model3DResult
): Promise<void> {
  await set(`${MODEL_3D_KEY_PREFIX}${id}`, model);
}

export async function get3DModel(
  id: string
): Promise<Model3DResult | undefined> {
  return await get(`${MODEL_3D_KEY_PREFIX}${id}`);
}

export async function delete3DModel(id: string): Promise<void> {
  await del(`${MODEL_3D_KEY_PREFIX}${id}`);
}

export function generate3DModelId(prompt: string): string {
  return `${prompt}-3d-${Date.now()}`;
}

// Scene objects storage functions
export async function saveSceneObjects(objects: SceneObject[]): Promise<void> {
  await set(SCENE_OBJECTS_KEY, objects);
}

export async function getSceneObjects(): Promise<SceneObject[]> {
  const objects = await get<SceneObject[]>(SCENE_OBJECTS_KEY);
  return objects || [];
}

export async function clearSceneObjects(): Promise<void> {
  await del(SCENE_OBJECTS_KEY);
}

// History records storage (separate object store)
export async function addHistoryRecord(record: HistoryRecord): Promise<string> {
  const key = `history-${record.time}`;
  await set(key, record, HISTORY_STORE);
  return key;
}

export async function listHistoryRecords(): Promise<
  {
    key: string;
    value: HistoryRecord;
  }[]
> {
  const all = await entries(HISTORY_STORE);
  const results: { key: string; value: HistoryRecord }[] = [];
  for (const [key, value] of all) {
    if (!value || typeof value !== 'object') continue;
    const rec = value as Record<string, unknown>;
    const hasPrompt = 'prompt' in rec && typeof rec.prompt === 'string';
    const hasTime = 'time' in rec && typeof rec.time === 'number';
    const hasModel = 'modelUrl' in rec && typeof rec.modelUrl === 'string';
    const hasImage = 'imageUrl' in rec && typeof rec.imageUrl === 'string';
    const hasTask = 'taskId' in rec && typeof rec.taskId === 'string';
    if (hasPrompt && hasTime && (hasModel || hasImage || hasTask)) {
      results.push({ key: String(key), value: value as HistoryRecord });
    }
  }
  return results;
}

export async function deleteHistoryRecord(key: string): Promise<void> {
  await del(key, HISTORY_STORE);
}

// Update a history record in-place by key (partial update)
export async function updateHistoryRecord(
  key: string,
  partial: Partial<HistoryRecord>
): Promise<void> {
  const existing = (await get(key, HISTORY_STORE)) as HistoryRecord | undefined;
  if (!existing) return;
  await set(key, { ...existing, ...partial }, HISTORY_STORE);
}

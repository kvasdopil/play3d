export interface GeneratedImage {
  data: string; // base64 encoded image
  prompt: string;
  timestamp: number;
}

export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export interface SceneObject {
  id: string;
  modelUrl: string;
  transform: Transform;
  prompt: string;
  timestamp: number;
}

import type { Model3DResult } from './types';

interface TripoUploadResponse {
  data: {
    image_id: string;
  };
}

interface TripoJobResponse {
  data: {
    job_id: string;
  };
}

interface TripoJobStatusResponse {
  data: {
    status: 'pending' | 'running' | 'succeeded' | 'failed';
    model_url?: string;
    error?: string;
  };
}

function ensureDataUrl(image: string): string {
  return image.startsWith('data:') ? image : `data:image/png;base64,${image}`;
}

function baseUrl() {
  // Use Vite dev proxy in development
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return '/tripo';
  }
  return 'https://api.tripo3d.ai';
}

export async function uploadToTripo(
  imageDataUrl: string,
  apiKey: string
): Promise<string> {
  const body = new FormData();
  // Tripo accepts either file upload or URL; send as file from data URL
  const res = await fetch(ensureDataUrl(imageDataUrl));
  const blob = await res.blob();
  body.append('file', blob, 'input.png');

  const response = await fetch(`${baseUrl()}/v1/images/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tripo upload failed: ${response.status} ${text}`);
  }
  const json = (await response.json()) as TripoUploadResponse;
  const imageId = json?.data?.image_id;
  if (!imageId) throw new Error('Tripo upload: missing image_id');
  return imageId;
}

export async function generate3DWithTripo(
  imageId: string,
  prompt: string,
  apiKey: string
): Promise<Model3DResult> {
  // Create generation job
  const createResp = await fetch(`${baseUrl()}/v1/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      image_id: imageId,
      model: 'v3.0-20250812',
      auto_size: true,
    }),
  });
  if (!createResp.ok) {
    const text = await createResp.text();
    throw new Error(`Tripo create failed: ${createResp.status} ${text}`);
  }
  const createJson = (await createResp.json()) as TripoJobResponse;
  const jobId = createJson?.data?.job_id;
  if (!jobId) throw new Error('Tripo generation: missing job_id');

  // Poll job status
  let attempt = 0;
  const maxAttempts = 120; // up to ~2 minutes if 1s interval
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  while (attempt < maxAttempts) {
    const statusResp = await fetch(
      `${baseUrl()}/v1/generations/${encodeURIComponent(jobId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    if (!statusResp.ok) {
      const text = await statusResp.text();
      throw new Error(`Tripo status failed: ${statusResp.status} ${text}`);
    }
    const statusJson = (await statusResp.json()) as TripoJobStatusResponse;
    const s = statusJson?.data?.status;
    if (s === 'succeeded') {
      const url = statusJson?.data?.model_url;
      if (!url) throw new Error('Tripo status: missing model_url');
      return { modelUrl: url, prompt, timestamp: Date.now() };
    }
    if (s === 'failed') {
      const err = statusJson?.data?.error || 'unknown error';
      throw new Error(`Tripo generation failed: ${err}`);
    }
    attempt += 1;
    await delay(1000);
  }
  throw new Error('Tripo generation timed out');
}

export async function generate3DModelWithTripo(
  imageDataUrl: string,
  prompt: string,
  apiKey: string
): Promise<Model3DResult> {
  if (!apiKey) throw new Error('Tripo API key is required');
  const imageId = await uploadToTripo(imageDataUrl, apiKey);
  return await generate3DWithTripo(imageId, prompt, apiKey);
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface TripoSTSResponse {
  code?: number;
  data?: {
    image_token?: string;
    upload_url?: string;
    fields?: Record<string, string>;
    form?: Record<string, string>;
    image_id?: string;
    id?: string;
    file_id?: string;
  };
  upload_url?: string;
}

interface TripoTaskCreateResponse {
  code?: number;
  data?: {
    task_id?: string;
    id?: string;
  };
}

function ensureDataUrl(image: string): string {
  return image.startsWith('data:') ? image : `data:image/png;base64,${image}`;
}

export async function POST(req: NextRequest) {
  try {
    console.log('Tripo generation request received');
    const { imageDataUrl, prompt } = await req.json();
    console.log('Parsed request:', {
      imageDataUrl: imageDataUrl?.substring(0, 50) + '...',
      prompt,
    });

    if (!imageDataUrl || !prompt) {
      return NextResponse.json(
        { error: 'imageDataUrl and prompt are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.TRIPO_API_KEY;
    console.log('API key present:', !!apiKey);

    if (!apiKey) {
      console.error('TRIPO_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error: API key not found' },
        { status: 500 }
      );
    }

    // Step 1: STS request + upload image to storage (per docs)
    const res = await fetch(ensureDataUrl(imageDataUrl));
    const blob = await res.blob();

    // 1a) Direct multipart upload to STS endpoint (per docs): include 'file'
    const uploadForm = new FormData();
    uploadForm.append(
      'file',
      blob,
      blob.type ? `input.${blob.type.split('/')[1] || 'png'}` : 'input.png'
    );

    const stsResp = await fetch(
      'https://api.tripo3d.ai/v2/openapi/upload/sts',
      {
        method: 'POST',
        headers: {
          // Do not set Content-Type to let boundary be generated
          Authorization: `Bearer ${apiKey}`,
        },
        body: uploadForm,
      }
    );
    if (!stsResp.ok) {
      const txt = await stsResp.text().catch(() => '');
      throw new Error(`Tripo STS request failed: ${stsResp.status} ${txt}`);
    }
    const stsJson = (await stsResp.json()) as TripoSTSResponse;
    // Check for success code
    if (stsJson.code !== 0) {
      throw new Error(`Tripo upload failed: code ${stsJson.code}`);
    }
    const imageId =
      stsJson?.data?.image_token ||
      stsJson?.data?.image_id ||
      stsJson?.data?.id ||
      stsJson?.data?.file_id;
    if (!imageId) {
      throw new Error('Tripo upload: missing image_token in response');
    }

    // Step 2: Create generation task (v2 task API)
    // Determine file type from blob
    const fileType =
      blob.type === 'image/jpeg'
        ? 'jpg'
        : blob.type === 'image/webp'
          ? 'webp'
          : 'png';

    const createResponse = await fetch(
      'https://api.tripo3d.ai/v2/openapi/task',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          type: 'image_to_model',
          model_version: 'v3.0-20250812',
          file: {
            type: fileType,
            file_token: imageId,
          },
          // face_limit: 10000,
          smart_low_poly: true,
          texture: true,
          pbr: true,
        }),
      }
    );

    if (!createResponse.ok) {
      const text = await createResponse.text();
      throw new Error(`Tripo create failed: ${createResponse.status} ${text}`);
    }

    const createJson = (await createResponse.json()) as TripoTaskCreateResponse;
    // Check for success code
    if (createJson.code !== 0) {
      throw new Error(`Tripo task creation failed: code ${createJson.code}`);
    }
    const jobId = createJson?.data?.task_id || createJson?.data?.id;
    if (!jobId) {
      throw new Error('Tripo generation: missing task_id');
    }

    return NextResponse.json({
      taskId: jobId,
      status: 'queued',
    });
  } catch (error) {
    console.error('Error starting Tripo generation:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

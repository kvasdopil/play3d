import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, prompt } = await req.json();

    if (!imageDataUrl || !prompt) {
      return NextResponse.json(
        { error: 'imageDataUrl and prompt are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.SYNEXA_API_KEY;

    if (!apiKey) {
      console.error('SYNEXA_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error: API key not found' },
        { status: 500 }
      );
    }

    // Configure fal client with API key
    fal.config({
      credentials: apiKey,
    });

    // Convert base64 data to proper data URI format
    const imageUrl = imageDataUrl.startsWith('data:')
      ? imageDataUrl
      : `data:image/png;base64,${imageDataUrl}`;

    // Submit the generation job
    const { request_id } = await fal.queue.submit('fal-ai/hunyuan3d/v2', {
      input: {
        input_image_url: imageUrl,
        seed: Math.floor(Math.random() * 10000),
        num_inference_steps: 20,
        guidance_scale: 7.5,
        octree_resolution: 96,
        textured_mesh: true,
      },
    });

    return NextResponse.json({
      taskId: request_id,
      status: 'queued',
    });
  } catch (error) {
    console.error('Error starting Synexa generation:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

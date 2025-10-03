import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
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

    // Get the final result
    const result = await fal.queue.result('fal-ai/hunyuan3d/v2', {
      requestId: taskId,
    });

    // Extract model URL from result
    const modelUrl = result.data?.model_mesh?.url;
    if (!modelUrl) {
      return NextResponse.json(
        { error: 'No model URL in result' },
        { status: 404 }
      );
    }

    // Fetch the model file
    const modelResponse = await fetch(modelUrl);

    if (!modelResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch model file' },
        { status: 500 }
      );
    }

    // Return the model file as a downloadable response
    const modelBlob = await modelResponse.blob();
    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    headers.set(
      'Content-Disposition',
      `attachment; filename="model_${taskId}.glb"`
    );

    return new Response(modelBlob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error downloading Synexa model:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

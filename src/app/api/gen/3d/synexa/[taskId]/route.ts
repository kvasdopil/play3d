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

    // Check the status of the generation
    const status = await fal.queue.status('fal-ai/hunyuan3d/v2', {
      requestId: taskId,
      logs: true,
    });

    // Map FAL status to our API status
    let apiStatus: string;
    const falStatus = status.status as string;
    switch (falStatus) {
      case 'IN_QUEUE':
        apiStatus = 'queued';
        break;
      case 'IN_PROGRESS':
        apiStatus = 'processing';
        break;
      case 'COMPLETED':
        apiStatus = 'completed';
        break;
      case 'FAILED':
        apiStatus = 'failed';
        break;
      default:
        apiStatus = 'unknown';
    }

    // On completion, fetch the final result to expose a stable modelUrl
    let modelUrl: string | null = null;
    if (apiStatus === 'completed') {
      try {
        const result = await fal.queue.result('fal-ai/hunyuan3d/v2', {
          requestId: taskId,
        });
        // Attempt to extract URL from known fields
        const resultData: unknown = (result as unknown as { data?: unknown })
          ?.data;
        if (
          resultData &&
          typeof resultData === 'object' &&
          'model_mesh' in (resultData as Record<string, unknown>)
        ) {
          const mesh = (resultData as { model_mesh?: { url?: string } })
            .model_mesh;
          modelUrl = mesh?.url ?? null;
        }
        if (
          !modelUrl &&
          resultData &&
          typeof resultData === 'object' &&
          'url' in (resultData as Record<string, unknown>)
        ) {
          modelUrl = (resultData as { url?: string }).url ?? null;
        }
      } catch (e) {
        // If we fail to retrieve the result here, keep modelUrl as null
        console.warn('Failed to fetch completed result for task', taskId, e);
      }
    }

    return NextResponse.json({
      taskId,
      status: apiStatus,
      logs:
        'logs' in status
          ? ((status as unknown as { logs?: Array<{ message: string }> })
              .logs ?? null)
          : null,
      // Keep raw data only if present on status (non-standard), but prefer modelUrl above
      result:
        'data' in status
          ? ((status as unknown as { data?: unknown }).data ?? null)
          : null,
      modelUrl,
    });
  } catch (error) {
    console.error('Error checking Synexa status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

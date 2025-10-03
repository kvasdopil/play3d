import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface TripoTaskStatusResponse {
  code?: number;
  data?: {
    status?: 'pending' | 'running' | 'success' | 'failed';
    output?: {
      pbr_model?: string;
    };
    result?: {
      pbr_model?: string;
    };
    progress?: number;
    error?: string;
  };
}

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

    const apiKey = process.env.TRIPO_API_KEY;

    if (!apiKey) {
      console.error('TRIPO_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error: API key not found' },
        { status: 500 }
      );
    }

    // Check the status of the generation task (v2 task API)
    const statusResponse = await fetch(
      `https://api.tripo3d.ai/v2/openapi/task/${encodeURIComponent(taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!statusResponse.ok) {
      const text = await statusResponse.text();
      throw new Error(`Tripo status failed: ${statusResponse.status} ${text}`);
    }

    const statusJson = (await statusResponse.json()) as TripoTaskStatusResponse;
    // Check for success code
    if (statusJson.code !== 0) {
      return NextResponse.json({
        taskId,
        status: 'failed',
        error: `API error: code ${statusJson.code}`,
      });
    }
    const s = statusJson?.data?.status;

    console.log('Tripo status:', statusJson);

    // Map Tripo status to our API status
    let apiStatus: string;
    switch (s) {
      case 'pending':
        apiStatus = 'queued';
        break;
      case 'running':
        apiStatus = 'processing';
        break;
      case 'success':
        apiStatus = 'completed';
        break;
      case 'failed':
        apiStatus = 'failed';
        break;
      default:
        apiStatus = 'unknown';
    }

    // Extract model URL - try multiple possible locations
    let modelUrl = null;
    if (statusJson?.data?.output?.pbr_model) {
      modelUrl = statusJson.data.output.pbr_model;
    }
    if (!modelUrl && statusJson?.data?.result?.pbr_model) {
      modelUrl = statusJson.data.result.pbr_model;
    }

    return NextResponse.json({
      taskId,
      status: apiStatus,
      progress: statusJson?.data?.progress || 0,
      modelUrl,
      error: statusJson?.data?.error,
    });
  } catch (error) {
    console.error('Error checking Tripo status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

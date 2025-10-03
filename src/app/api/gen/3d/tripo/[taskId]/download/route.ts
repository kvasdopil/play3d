import { NextRequest, NextResponse } from 'next/server';

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

        const apiKey = process.env.TRIPO_API_KEY;

        if (!apiKey) {
            console.error('TRIPO_API_KEY environment variable is not set');
            return NextResponse.json(
                { error: 'Server configuration error: API key not found' },
                { status: 500 }
            );
        }

        // First get the job status to find the model URL
        const statusResponse = await fetch(
            `https://api.tripo3d.ai/v1/generations/${encodeURIComponent(taskId)}`,
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

        const statusJson = await statusResponse.json();
        const modelUrl = statusJson?.data?.model_url;

        if (!modelUrl) {
            return NextResponse.json(
                { error: 'Model URL not available' },
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
        headers.set('Content-Disposition', `attachment; filename="model_${taskId}.glb"`);

        return new Response(modelBlob, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Error downloading Tripo model:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}

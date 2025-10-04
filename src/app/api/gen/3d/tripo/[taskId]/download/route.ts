import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

export const runtime = 'nodejs';

function getAssetsPath(taskId: string): string {
  const assetsDir = path.join(process.cwd(), 'data', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  return path.join(assetsDir, `${taskId}.glb`);
}

function streamFile(filePath: string): Response {
  const stat = fs.statSync(filePath);
  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(
    nodeStream
  ) as unknown as ReadableStream<Uint8Array>;
  const headers = new Headers();
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Length', String(stat.size));
  headers.set(
    'Content-Disposition',
    `attachment; filename="${path.basename(filePath)}"`
  );
  return new Response(webStream, { status: 200, headers });
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

    const filePath = getAssetsPath(taskId);
    // If file already cached, stream from disk
    if (fs.existsSync(filePath)) {
      return streamFile(filePath);
    }

    const apiKey = process.env.TRIPO_API_KEY;
    if (!apiKey) {
      console.error('TRIPO_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error: API key not found' },
        { status: 500 }
      );
    }

    // Check task status (v2) to locate the pbr model URL
    const statusResponse = await fetch(
      `https://api.tripo3d.ai/v2/openapi/task/${encodeURIComponent(taskId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );
    if (!statusResponse.ok) {
      const text = await statusResponse.text().catch(() => '');
      throw new Error(`Tripo status failed: ${statusResponse.status} ${text}`);
    }
    const statusJson = await statusResponse.json();
    const modelUrl =
      statusJson?.data?.output?.pbr_model ||
      statusJson?.data?.result?.pbr_model;

    if (!modelUrl) {
      return NextResponse.json(
        { error: 'Model URL not available (task not completed yet?)' },
        { status: 404 }
      );
    }

    // Fetch and cache the model file to disk
    const modelResponse = await fetch(modelUrl);
    if (!modelResponse.ok || !modelResponse.body) {
      return NextResponse.json(
        { error: 'Failed to fetch model file' },
        { status: 500 }
      );
    }

    // Stream to file while also serving to client
    const tempPath = `${filePath}.tmp`;
    await new Promise<void>((resolve, reject) => {
      const dest = fs.createWriteStream(tempPath);
      const reader = modelResponse.body!.getReader();
      const writer = dest;

      function pump() {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              writer.end();
              resolve();
              return;
            }
            if (value) {
              writer.write(Buffer.from(value));
            }
            pump();
          })
          .catch(reject);
      }
      dest.on('error', reject);
      pump();
    });
    fs.renameSync(tempPath, filePath);

    // Stream the saved file back
    return streamFile(filePath);
  } catch (error) {
    console.error('Error downloading Tripo model:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

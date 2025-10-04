import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.glb')) {
      return NextResponse.json(
        { error: 'Only .glb files are allowed' },
        { status: 400 }
      );
    }

    // Generate UUID for filename
    const uuid = crypto.randomUUID();
    const filename = `${uuid}.glb`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to data/assets directory
    const assetsDir = join(process.cwd(), 'data', 'assets');
    const filepath = join(assetsDir, filename);

    await writeFile(filepath, buffer);

    // Return the UUID and file path
    const fileUrl = `/assets/${filename}`;
    return NextResponse.json({
      success: true,
      uuid,
      fileUrl,
      filename,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

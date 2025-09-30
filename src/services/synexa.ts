import { fal } from '@fal-ai/client';

export interface Synexa3DResult {
  modelUrl: string; // URL to the generated 3D model (.glb file)
  prompt: string;
  timestamp: number;
}

export async function generate3DModel(
  imageDataUrl: string,
  prompt: string,
  apiKey: string
): Promise<Synexa3DResult> {
  if (!apiKey) {
    throw new Error('FAL API key is required');
  }

  // Configure fal client with API key
  fal.config({
    credentials: apiKey,
  });

  // Convert base64 data to proper data URI format
  const imageUrl = imageDataUrl.startsWith('data:')
    ? imageDataUrl
    : `data:image/png;base64,${imageDataUrl}`;

  try {
    // Subscribe to the model and wait for completion
    const result = await fal.subscribe('fal-ai/hunyuan3d/v2', {
      input: {
        input_image_url: imageUrl,
        seed: Math.floor(Math.random() * 10000),
        num_inference_steps: 50,
        guidance_scale: 7.5,
        octree_resolution: 256,
        textured_mesh: true, // Generate textured mesh
      },
      logs: true,
      onQueueUpdate: (update: {
        status: string;
        logs?: Array<{ message: string }>;
      }) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('3D Generation in progress...');
          update.logs
            ?.map((log: { message: string }) => log.message)
            .forEach(console.log);
        }
      },
    });

    // Extract model URL from result
    const modelUrl = result.data?.model_mesh?.url;
    if (!modelUrl) {
      throw new Error('No model URL in response');
    }

    return {
      modelUrl,
      prompt,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('FAL API error:', error);
    throw new Error(
      error instanceof Error
        ? `3D generation failed: ${error.message}`
        : 'Failed to generate 3D model'
    );
  }
}

import { GoogleGenAI } from '@google/genai';
import type { GeneratedImage } from './types';

export async function generateImage(
  prompt: string,
  apiKey: string
): Promise<GeneratedImage> {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: prompt,
  });

  // Extract image data from response
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('No candidates returned from API');
  }

  const firstCandidate = response.candidates[0];
  if (
    !firstCandidate ||
    !firstCandidate.content ||
    !firstCandidate.content.parts
  ) {
    throw new Error('Invalid response structure');
  }

  for (const part of firstCandidate.content.parts) {
    if (part.inlineData && part.inlineData.data) {
      return {
        data: part.inlineData.data,
        prompt,
        timestamp: Date.now(),
      };
    }
  }

  throw new Error('No image was generated');
}

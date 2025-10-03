import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error: API key not found' },
        { status: 500 }
      );
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
        return NextResponse.json({
          data: part.inlineData.data,
          prompt,
          timestamp: Date.now(),
        });
      }
    }

    return NextResponse.json(
      { error: 'No image was generated' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

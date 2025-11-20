import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getModel } from '@/lib/ai-providers';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    console.log('Generating notification content for prompt:', prompt);

    // Try different models in order of preference
    const modelsToTry = ['codestral-latest', 'a0-dev-llm', 'auto'];

    for (const modelId of modelsToTry) {
      try {
        console.log(`Trying model: ${modelId}`);

        const model = getModel(modelId);

        const systemPrompt = `You are an expert content creator for admin notifications. Generate engaging, professional notification content based on the user's request.

Return your response as a JSON object with exactly two fields:
- "title": A concise, attention-grabbing title (max 60 characters)
- "message": A detailed, engaging message body (max 200 characters)

The content should be suitable for user notifications and follow these guidelines:
- Title should be clear and actionable
- Message should be informative and encourage engagement
- Use friendly, professional tone
- Keep it concise but impactful
- Avoid spam-like language

Example format:
{"title": "New Feature Available!", "message": "We've added exciting new features to enhance your experience. Check them out now!"}`;

        const result = await generateText({
          model,
          prompt: `${systemPrompt}\n\nUser request: ${prompt}`,
          temperature: 0.7
        });

        console.log(`Model ${modelId} succeeded, result:`, result.text);

        // Parse and validate the JSON response
        const content = JSON.parse(result.text);

        if (!content.title || !content.message) {
          throw new Error('Invalid response format: missing title or message');
        }

        return NextResponse.json({
          success: true,
          content: {
            title: content.title,
            message: content.message
          }
        });

      } catch (modelError) {
        console.warn(`Model ${modelId} failed:`, modelError);
        // Continue to next model
      }
    }

    // If all models failed
    return NextResponse.json(
      { error: 'All AI models failed to generate content. Please try again later.' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Error in AI content generation API:', error);
    return NextResponse.json(
      { error: 'Failed to generate content. Please try again.' },
      { status: 500 }
    );
  }
}
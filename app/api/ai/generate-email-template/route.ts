import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getModel } from '@/lib/ai-providers';
import { getTemplateById } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const { templateId, prompt, variables = {} } = await request.json();

    if (!templateId || !prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Template ID and prompt are required' },
        { status: 400 }
      );
    }

    console.log('Generating email template content:', { templateId, prompt, variables });

    // Get the template
    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Try different models in order of preference
    const modelsToTry = ['codestral-latest', 'a0-dev-llm', 'auto'];

    for (const modelId of modelsToTry) {
      try {
        console.log(`Trying model: ${modelId} for template: ${templateId}`);

        const model = getModel(modelId);

        const systemPrompt = `You are an expert email content creator for PiPilot. Generate professional, engaging email content based on the selected template and user requirements.

Template Information:
- Name: ${template.name}
- Type: ${template.type}
- Category: ${template.category}
- Available Variables: ${template.variables.join(', ')}
- Original Subject: ${template.subject}
- Original Content: ${template.content}

Your task is to customize this template based on the user's specific requirements while maintaining the template's structure and purpose.

Return your response as a JSON object with exactly these fields:
- "subject": A customized subject line based on the template and user requirements
- "content": A customized email body based on the template and user requirements
- "variables": An object containing values for any template variables used

Guidelines:
- Keep the email professional and brand-appropriate for PiPilot
- Maintain the template's original intent and structure
- Customize content based on the user's specific prompt
- Fill in template variables with appropriate values
- Ensure the content is engaging and actionable
- Subject should be concise (max 80 characters)
- Content should be well-formatted with proper line breaks

Example format:
{
  "subject": "🚀 Your Custom Feature Update is Here!",
  "content": "Hi {{name}},\n\nWe're excited to announce your custom feature update...\n\nBest regards,\nThe PiPilot Team",
  "variables": {
    "name": "Valued Customer",
    "feature_name": "Custom Dashboard",
    "content": "Your personalized dashboard is now ready with enhanced features."
  }
}`;

        const userPrompt = `Template: ${template.name}
User Requirements: ${prompt}
${Object.keys(variables).length > 0 ? `Provided Variables: ${JSON.stringify(variables)}` : ''}

Please generate customized email content based on this template and requirements.`;

        const result = await generateText({
          model,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          temperature: 0.7
        });

        console.log(`Model ${modelId} succeeded for template ${templateId}`);

        // Parse and validate the JSON response
        const generatedContent = JSON.parse(result.text);

        if (!generatedContent.subject || !generatedContent.content) {
          throw new Error('Invalid response format: missing subject or content');
        }

        // Validate and clean the response
        const cleanedContent = {
          subject: String(generatedContent.subject).trim().substring(0, 80),
          content: String(generatedContent.content).trim(),
          variables: generatedContent.variables || {},
          templateId: templateId,
          templateName: template.name
        };

        // Basic sanitization
        cleanedContent.subject = cleanedContent.subject.replace(/[<>\"'&]/g, '');
        cleanedContent.content = cleanedContent.content.replace(/[<>\"'&]/g, '');

        console.log(`Successfully generated email template content with model ${modelId}`);

        return NextResponse.json({
          success: true,
          content: cleanedContent,
          template: {
            id: template.id,
            name: template.name,
            type: template.type,
            category: template.category
          }
        });

      } catch (modelError) {
        console.warn(`Model ${modelId} failed for template ${templateId}:`, modelError);
        // Continue to next model
      }
    }

    // If all models failed
    return NextResponse.json(
      { error: 'All AI models failed to generate email content. Please try again later.' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Error in AI email template generation API:', error);
    return NextResponse.json(
      { error: 'Failed to generate email content. Please try again.' },
      { status: 500 }
    );
  }
}
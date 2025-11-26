import { generateText } from 'ai';
import { getModel } from './ai-providers';

export interface EmailGenerationOptions {
  type: 'notification' | 'marketing' | 'welcome' | 'support';
  subject?: string;
  context?: string;
  tone?: 'professional' | 'friendly' | 'casual' | 'formal';
  length?: 'short' | 'medium' | 'long';
  recipientType?: 'individual' | 'group' | 'all';
}

export async function generateEmailContent(options: EmailGenerationOptions): Promise<{
  subject: string;
  content: string;
  html: string;
}> {
  const { type, subject, context, tone = 'professional', length = 'medium', recipientType = 'individual' } = options;

  const prompt = `Generate a ${type} email with the following specifications:

Type: ${type}
${subject ? `Subject: ${subject}` : 'Create an appropriate subject'}
Tone: ${tone}
Length: ${length}
Recipient: ${recipientType}
${context ? `Context: ${context}` : ''}

Please provide:
1. A compelling subject line
2. Professional email content in both plain text and HTML format

The email should be well-structured, engaging, and appropriate for the specified type and audience.`;

  try {
    const model = getModel('command-r-08-2024');
    const result = await generateText({
      model,
      prompt,
      temperature: 0.7,
    });

    // Parse the AI response to extract subject and content
    const response = result.text;
    const lines = response.split('\n');

    let subjectLine = '';
    let content = '';
    let htmlContent = '';

    // Extract subject (usually first line or marked)
    for (const line of lines) {
      if (line.toLowerCase().includes('subject:') || line.toLowerCase().includes('subject line:')) {
        subjectLine = line.split(':')[1]?.trim() || line;
        break;
      }
    }

    // If no subject found, use first line
    if (!subjectLine && lines.length > 0) {
      subjectLine = lines[0].replace(/^["']|["']$/g, '');
    }

    // Extract content (everything after subject)
    const contentStart = lines.findIndex(line =>
      line.toLowerCase().includes('content:') ||
      line.toLowerCase().includes('body:') ||
      line.toLowerCase().includes('message:')
    );

    if (contentStart !== -1) {
      content = lines.slice(contentStart + 1).join('\n').trim();
    } else {
      // Use everything after subject line
      const subjectIndex = lines.findIndex(line =>
        line.toLowerCase().includes('subject')
      );
      content = lines.slice(subjectIndex + 1).join('\n').trim();
    }

    // Generate HTML version
    htmlContent = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

    return {
      subject: subjectLine || `Generated ${type} email`,
      content: content || response,
      html: htmlContent || response.replace(/\n/g, '<br>')
    };

  } catch (error) {
    console.error('Error generating email content:', error);
    throw new Error('Failed to generate email content. Please try again.');
  }
}

export async function improveEmailContent(
  currentContent: string,
  improvement: 'grammar' | 'tone' | 'length' | 'clarity' | 'engagement'
): Promise<string> {
  const prompt = `Improve the following email content by focusing on ${improvement}:

Current content:
${currentContent}

Please provide an improved version that enhances the ${improvement} while maintaining the original intent and structure.`;

  try {
    const model = getModel('command-r-08-2024');
    const result = await generateText({
      model,
      prompt,
      temperature: 0.6,
    });

    return result.text.trim();
  } catch (error) {
    console.error('Error improving email content:', error);
    throw new Error('Failed to improve email content. Please try again.');
  }
}
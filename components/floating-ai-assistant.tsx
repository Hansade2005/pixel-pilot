'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Send, X, Loader2, Sparkles } from 'lucide-react';
import { generateText } from 'ai';
import { getModel } from '@/lib/ai-providers';
import { useToast } from '@/hooks/use-toast';

interface FloatingAIAssistantProps {
  onContentGenerated?: (content: { title: string; message: string }) => void;
}

export function FloatingAIAssistant({ onContentGenerated }: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState<{ title: string; message: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for content generation",
        variant: "destructive"
      });
      return;
    }

    console.log('Starting content generation with prompt:', prompt);
    setIsGenerating(true);
    try {
      console.log('Getting codestral model...');
      const codestralModel = getModel('codestral-latest');
      console.log('Model obtained:', codestralModel);

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

      console.log('Calling generateText...');
      const result = await generateText({
        model: codestralModel,
        prompt: `${systemPrompt}\n\nUser request: ${prompt}`,
        temperature: 0.7,
      });

      console.log('Generated result:', result);
      console.log('Result text:', result.text);

      const content = JSON.parse(result.text);
      console.log('Parsed content:', content);
      setGeneratedContent(content);

      // Auto-focus the textarea for easy editing
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);

    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Error",
        description: `Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseContent = () => {
    if (generatedContent && onContentGenerated) {
      onContentGenerated(generatedContent);
      setIsOpen(false);
      setPrompt('');
      setGeneratedContent(null);
      toast({
        title: "Success",
        description: "Content applied to notification",
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPrompt('');
    setGeneratedContent(null);
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 z-50"
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                AI Content Assistant
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 overflow-y-auto">
              {/* Prompt Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  What kind of notification content do you need?
                </label>
                <Textarea
                  placeholder="e.g., 'Create a notification about new features' or 'Announce a maintenance window'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>

              {/* Generated Content */}
              {generatedContent && (
                <div className="space-y-3 border-t pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Generated Title:</label>
                    <Textarea
                      ref={textareaRef}
                      value={generatedContent.title}
                      onChange={(e) => setGeneratedContent(prev => prev ? { ...prev, title: e.target.value } : null)}
                      className="text-sm font-medium"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Generated Message:</label>
                    <Textarea
                      value={generatedContent.message}
                      onChange={(e) => setGeneratedContent(prev => prev ? { ...prev, message: e.target.value } : null)}
                      className="text-sm"
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleUseContent}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Use This Content
                  </Button>
                </div>
              )}

              {/* Instructions */}
              <div className="text-xs text-muted-foreground border-t pt-3">
                <p className="mb-1"><strong>Tips:</strong></p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Be specific about the notification purpose</li>
                  <li>Press Enter to generate quickly</li>
                  <li>Edit the generated content as needed</li>
                  <li>Press Escape to close</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
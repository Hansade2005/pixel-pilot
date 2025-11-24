import PiPilotAI, { Message, Tool, ChatCompletionResponse } from './index.js';

async function typescriptExample() {
  // Initialize the SDK
  const ai = new PiPilotAI({
    maxRetries: 3,
    timeout: 30000
  });

  // Define custom types for your data
  interface WeatherData {
    location: string;
    temperature: number;
    condition: string;
  }

  // Define tools with proper typing
  const tools: Tool[] = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'City name'
            }
          },
          required: ['location']
        }
      }
    }
  ];

  // Type-safe messages
  const messages: Message[] = [
    { role: 'user', content: 'What is the weather like in San Francisco?' }
  ];

  try {
    // Create completion with tools
    const response: ChatCompletionResponse = await ai.createChatCompletion({
      model: 'pipilot-1-chat',
      messages,
      tools,
      temperature: 0.7
    });

    console.log('Response:', response.choices[0].message.content);

    // Handle tool calls with type safety
    if (response.choices[0].message.tool_calls) {
      const toolHandlers: Record<string, (args: any) => Promise<any>> = {
        get_weather: async (args: { location: string }): Promise<WeatherData> => {
          // Simulate weather API call
          console.log(`Getting weather for ${args.location}`);
          return {
            location: args.location,
            temperature: 72,
            condition: 'sunny'
          };
        }
      };

      const results = await ai.executeTools(
        response.choices[0].message.tool_calls,
        toolHandlers
      );

      console.log('Tool results:', results);
    }

    // Use model-specific methods
    const chatResponse = await ai.chat('Hello TypeScript!');
    const thinkResponse = await ai.think('Analyze this briefly: AI is transforming the world');
    const codeResponse = await ai.code('Write a type-safe sum function');

    console.log('All methods work with full type safety!');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
typescriptExample();
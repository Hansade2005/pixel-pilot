# Coding API - Powered by Codestral

Your OpenAI-compatible API now features **specialized coding capabilities** powered by **Mistral's Codestral** model!

## 🚀 Key Features

- **Massive Context Window**: 256k tokens for processing large codebases
- **Specialized Model**: Optimized for code generation, debugging, and explanation
- **Automatic Routing**: Simply use `gpt-4-code` to access Codestral
- **Streaming Support**: Real-time code generation
- **Multi-Language**: Expert proficiency in 80+ programming languages

## 📡 Endpoint

```
POST https://pipilot.dev/api/v1/chat/completions
```

## 💻 Coding Model

### `pipilot-1-code`
**Primary Coding Model** - Powered by Codestral 22B.
Automatically routes to **Codestral 22B**. Use this model for:
- Writing new functions and classes
- Debugging complex issues
- Refactoring legacy code
- Writing unit tests
- Explaining code logic

### `gpt-4-code` (Legacy)
Alias for `pipilot-1-code`.

## 💡 Usage Examples

### PowerShell - Generate Code

```powershell
$body = @{
    model = "pipilot-1-code"
    messages = @(
        @{
            role = "user"
            content = "Write a Python function to calculate the Fibonacci sequence using memoization"
        }
    )
    temperature = 0.1 # Lower temperature for precise code
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "https://pipilot.dev/api/v1/chat/completions" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

Write-Host $response.choices[0].message.content
```

### JavaScript (OpenAI SDK)

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'not-needed',
  baseURL: 'https://pipilot.dev/api/v1',
});

const response = await openai.chat.completions.create({
  model: 'gpt-4-code',
  messages: [
    { role: 'system', content: 'You are an expert React developer.' },
    { role: 'user', content: 'Create a responsive navigation component with Tailwind CSS.' }
  ],
  temperature: 0.2,
});

console.log(response.choices[0].message.content);
```

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    api_key="not-needed",
    base_url="https://pipilot.dev/api/v1"
)

stream = client.chat.completions.create(
    model="gpt-4-code",
    messages=[
        {"role": "user", "content": "Explain the difference between interface and type in TypeScript"}
    ],
    stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

## ⚡ Performance Tips

1. **Low Temperature**: Use `temperature: 0.1` to `0.3` for code generation to ensure precision.
2. **System Prompts**: While `gpt-4-code` has a default system prompt, you can override it for specific frameworks (e.g., "You are a Vue.js expert").
3. **Context Usage**: With 256k context, you can paste entire files or documentation into the prompt for context-aware coding.

## 🔄 How It Works

1. **Request**: You send a request with `model: "gpt-4-code"`
2. **Routing**: API detects the model and routes to Mistral's Codestral API
3. **Processing**: Codestral generates the code
4. **Response**: Returns in OpenAI-compatible format

## 🆚 Comparison

| Feature | Standard Models | Codestral (`gpt-4-code`) |
|---------|----------------|--------------------------|
| **Focus** | General Purpose | Code Generation |
| **Context Window** | Varies | **256k Tokens** |
| **Training Data** | Web Text | 80+ Programming Languages |
| **Best For** | Chat, Writing | Coding, Debugging, Refactoring |

## 📞 Support

For implementation details, check [`route.ts`](file:///c:/Users/DELL/Downloads/ai-app-builder/app/api/v1/chat/completions/route.ts).

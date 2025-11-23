# Default System Prompts - OpenAI-Compatible API

## Overview

The OpenAI-compatible API at `https://pipilot.dev/api/v1/chat/completions` now includes **powerful default system prompts** that are automatically injected based on the model name you specify. This makes the API more capable and specialized without requiring you to write system prompts for every request.

**Example:**
```json
{
  "model": "gpt-4-code",
  "messages": [
    {"role": "user", "content": "Write a Python function to find prime numbers"}
    {"role": "user", "content": "Write a short story about a time traveler"}
  ]
}
```

---

### `gpt-4-analyst`
**Data Analysis & Research Assistant**

Specialized in analysis and insights:
- Analyzing data and identifying patterns
- Creating insights from information
- Explaining statistical concepts
- Helping with research and fact-finding
- Structuring information logically

**Example:**
```json
{
  "model": "gpt-4-analyst",
  "messages": [
    {"role": "user", "content": "Analyze the trend in these sales figures: [data]"}
  ]
}
```

---

### `gpt-4-tutor`
**Patient Teacher & Tutor**

Educational assistant that excels at:
- Explaining complex topics in simple terms
- Breaking down problems step-by-step
- Adapting explanations to different learning styles
- Providing examples and analogies
- Encouraging critical thinking

**Example:**
```json
{
  "model": "gpt-4-tutor",
  "messages": [
    {"role": "user", "content": "Teach me how photosynthesis works"}
  ]
}
```

---

### `gpt-4-business`
**Professional Business Assistant**

Business-focused assistant for:
- Business writing and communication
- Strategic planning and analysis
- Professional emails and documents
- Meeting summaries and action items
- Business problem-solving

**Example:**
```json
{
  "model": "gpt-4-business",
  "messages": [
    {"role": "user", "content": "Draft a professional email to a client about a project delay"}
  ]
}
```

## Usage Examples

### PowerShell - Using Different Models

```powershell
# Code assistant
$body = @{
    model = "gpt-4-code"
    messages = @(
        @{
            role = "user"
            content = "Create a REST API endpoint in Node.js"
        }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "https://pipilot.dev/api/v1/chat/completions" -Method Post -Body $body -ContentType "application/json"
Write-Host $response.choices[0].message.content
```

```powershell
# Creative writing assistant
$body = @{
    model = "gpt-4-creative"
    messages = @(
        @{
            role = "user"
            content = "Write a catchy tagline for a coffee shop"
        }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "https://pipilot.dev/api/v1/chat/completions" -Method Post -Body $body -ContentType "application/json"
Write-Host $response.choices[0].message.content
```

### JavaScript (OpenAI SDK)

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'not-needed',
  baseURL: 'https://pipilot.dev/api/v1',
});

// Use code assistant
const codeResponse = await openai.chat.completions.create({
  model: 'gpt-4-code',
  messages: [
    { role: 'user', content: 'Explain async/await in JavaScript' }
  ],
});

// Use tutor assistant
const tutorResponse = await openai.chat.completions.create({
  model: 'gpt-4-tutor',
  messages: [
    { role: 'user', content: 'Explain calculus to a beginner' }
  ],
});
```

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    api_key="not-needed",
    base_url="https://pipilot.dev/api/v1"
)

# Use business assistant
response = client.chat.completions.create(
    model="gpt-4-business",
    messages=[
        {"role": "user", "content": "Write a professional out-of-office message"}
    ]
)

print(response.choices[0].message.content)
```

## Overriding Default Prompts

If you want to use your own system prompt, simply include it in your messages array:

```json
{
  "model": "gpt-4-code",
  "messages": [
    {
      "role": "system",
      "content": "You are a Python expert who only writes code with type hints."
    },
    {
      "role": "user",
      "content": "Write a function to sort a list"
    }
  ]
}
```

The API will **respect your custom system prompt** and won't inject the default one.

## Benefits

✅ **No Prompt Engineering Required**: Get specialized behavior without writing system prompts  
✅ **Consistent Quality**: Well-crafted prompts ensure consistent, high-quality responses  
✅ **Easy Switching**: Change model names to get different specialized behaviors  
✅ **Flexible**: Override defaults with your own prompts when needed  
✅ **Backward Compatible**: Existing requests with system messages work unchanged  

## Testing Different Models

Try this PowerShell script to test all models:

```powershell
$models = @("gpt-3.5-turbo", "gpt-4-code", "gpt-4-creative", "gpt-4-analyst", "gpt-4-tutor", "gpt-4-business")

foreach ($model in $models) {
    Write-Host "`n=== Testing $model ===" -ForegroundColor Cyan
    
    $body = @{
        model = $model
        messages = @(
            @{
                role = "user"
                content = "Introduce yourself and your capabilities in one sentence."
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "https://pipilot.dev/api/v1/chat/completions" -Method Post -Body $body -ContentType "application/json"
    Write-Host $response.choices[0].message.content -ForegroundColor Green
}
```

## Adding Custom Models

To add your own specialized models, edit the `DEFAULT_SYSTEM_PROMPTS` object in [`route.ts`](file:///c:/Users/DELL/Downloads/ai-app-builder/app/api/v1/chat/completions/route.ts):

```typescript
const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
    // ... existing prompts ...
    
    'your-custom-model': `Your custom system prompt here...`,
};
```

## Summary

The default system prompts feature makes your API more powerful and user-friendly by providing specialized AI assistants for different use cases. Users can simply change the `model` parameter to get different behaviors without writing complex system prompts.

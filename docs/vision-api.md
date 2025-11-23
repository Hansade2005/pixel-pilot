# Vision and Document API - OpenAI-Compatible

Your OpenAI-compatible API now supports **vision and document processing** powered by **Pixtral 12B**! Send images alongside text and get intelligent visual analysis.

## 🎯 Key Features

- 🖼️ **Automatic Vision Routing**: Detects images in requests and routes to Pixtral 12B
- 📸 **Multiple Image Formats**: Supports image URLs and base64 encoded images  
- 📄 **Document Processing**: OCR and text extraction from documents
- 🔄 **Streaming Support**: Real-time streaming for vision responses
- 🤖 **Specialized Vision Models**: Pre-configured prompts for different use cases

## 📡 Endpoint

```
POST https://pipilot.dev/api/v1/chat/completions
```

## 🖼️ Vision Models

### `gpt-4-vision`
General vision analysis - describing images, identifying objects, answering visual questions

### `gpt-4o`  
Advanced multimodal assistant - combines vision and text understanding

### `gpt-4-vision-analyst`
Specialized image analysis - patterns, data visualization, technical analysis

### `gpt-4-vision-ocr`
Document processing - text extraction, OCR, form recognition

## 💡 Usage Examples

### PowerShell - Image URL

```powershell
$body = @{
    model = "gpt-4-vision"
    messages = @(
        @{
            role = "user"
            content = @(
                @{
                    type = "text"
                    text = "What's in this image?"
                },
                @{
                    type = "image_url"
                    image_url = @{
                        url = "https://example.com/image.jpg"
                    }
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "https://pipilot.dev/api/v1/chat/completions" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

Write-Host $response.choices[0].message.content
```

### PowerShell - Base64 Image

```powershell
# Read image and convert to base64
$imageBytes = [IO.File]::ReadAllBytes("C:\path\to\image.jpg")
$base64Image = [Convert]::ToBase64String($imageBytes)
$dataUrl = "data:image/jpeg;base64,$base64Image"

$body = @{
    model = "gpt-4o"
    messages = @(
        @{
            role = "user"
            content = @(
                @{
                    type = "text"
                    text = "Describe this image in detail"
                },
                @{
                    type = "image_url"
                    image_url = @{
                        url = $dataUrl
                    }
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "https://pipilot.dev/api/v1/chat/completions" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### JavaScript (OpenAI SDK)

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'not-needed',
  baseURL: 'https://pipilot.dev/api/v1',
});

const response = await openai.chat.completions.create({
  model: 'gpt-4-vision',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What is in this image?' },
        {
          type: 'image_url',
          image_url: {
            url: 'https://example.com/image.jpg',
          },
        },
      ],
    },
  ],
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

response = client.chat.completions.create(
    model="gpt-4-vision",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What's in this image?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/image.jpg"
                    }
                }
            ]
        }
    ]
)

print(response.choices[0].message.content)
```

### cURL

```bash
curl -X POST https://pipilot.dev/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4-vision",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/image.jpg"
            }
          }
        ]
      }
    ]
  }'
```

## 📄 Document Processing (OCR)

Extract text from documents, receipts, invoices, and forms:

```powershell
$body = @{
    model = "gpt-4-vision-ocr"
    messages = @(
        @{
            role = "user"
            content = @(
                @{
                    type = "text"
                    text = "Extract all text from this document and preserve the formatting"
                },
                @{
                    type = "image_url"
                    image_url = @{
                        url = "https://example.com/document.png"
                    }
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "https://pipilot.dev/api/v1/chat/completions" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

## 🔄 Streaming Support

Vision requests support streaming for real-time responses:

```javascript
const stream = await openai.chat.completions.create({
  model: 'gpt-4-vision',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this image' },
        { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
      ],
    },
  ],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

## 📋 Request Format

```json
{
  "model": "gpt-4-vision",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Your question about the image"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.jpg"
            // OR base64:
            // "url": "data:image/jpeg;base64,/9j/4AAQ..."
          }
        }
      ]
    }
  ],
  "temperature": 0.7,
  "stream": false
}
```

## 🎨 Supported Image Formats

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **WebP** (.webp)
- **GIF** (.gif)

## 📊 Image Input Methods

### 1. Image URL
Provide a publicly accessible image URL:
```json
{
  "type": "image_url",
  "image_url": {
    "url": "https://example.com/image.jpg"
  }
}
```

### 2. Base64 Encoded
Encode image as base64 data URL:
```json
{
  "type": "image_url",
  "image_url": {
    "url": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }
}
```

## 🚀 How It Works

1. **Automatic Detection**: API detects images in request content
2. **Smart Routing**: Automatically routes to Pixtral 12B (Mistral's vision model)
3. **Format Transformation**: Converts OpenAI format to Mistral format
4. **Vision Processing**: Pixtral 12B analyzes the image
5. **Response**: Returns in OpenAI-compatible format

## ⚡ Performance

- **Native Resolution**: Images processed at native resolution (up to 10000x10000)
- **128K Context**: Large context window supports multiple images
- **Streaming**: Real-time token streaming for faster responses

## 🔒 Privacy & Security

- Images sent to Mistral Pixtral API
- No images stored on our servers
- Use HTTPS for secure transmission
- Consider privacy when using public image URLs

## 📝 Use Cases

### Image Analysis
- Describe scenes and objects
- Identify people and places
- Analyze compositions and aesthetics

### Document Processing
- Extract text from scanned documents
- Read receipts and invoices
- Process forms and tables

### Data Visualization
- Interpret charts and graphs
- Analyze data visualizations
- Extract insights from infographics

### Quality Assessment
- Evaluate image quality
- Detect issues or defects
- Assess technical properties

## ⚠️ Limitations

- Maximum image resolution: 10000x10000 pixels
- Large images may be downscaled automatically
- Base64 images increase request size
- Vision requests use Pixtral 12B (different pricing than text-only)

## 🆚 Differences from OpenAI Vision API

| Feature | OpenAI | This API |
|---------|--------|----------|
| Vision Model | GPT-4 Vision | Pixtral 12B |
| Auto-routing | Manual | Automatic |
| Image formats | JPEG, PNG, WebP, GIF | JPEG, PNG, WebP, GIF |
| Max resolution | Variable | 10000x10000 |
| Context window | 128K | 128K |
| Streaming | Yes | Yes |

## 💡 Tips

1. **Be Specific**: Provide clear instructions about what you want to know
2. **Use Appropriate Models**: Choose `gpt-4-vision-ocr` for text extraction
3. **Image Quality**: Higher quality images yield better results
4. **Multiple Images**: You can include multiple images in one request
5. **Combine with Text**: Mix images and text for context

## 🔗 Related Documentation

- [OpenAI-Compatible API](./openai-compatible-api.md)
- [Default System Prompts](./default-system-prompts.md)
- [a0.dev API Documentation](./a0llmdoc.md)

## 📞 Support

For issues or questions about vision capabilities, check the implementation at [`route.ts`](file:///c:/Users/DELL/Downloads/ai-app-builder/app/api/v1/chat/completions/route.ts)

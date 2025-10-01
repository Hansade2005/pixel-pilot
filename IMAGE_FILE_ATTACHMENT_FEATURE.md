# Image and File Attachment Feature

## Overview
This feature allows users to attach images and files to their prompts in the chat interface, enhancing the AI's ability to understand context, clone UI designs, rebuild interfaces, and work with file content.

## Features Implemented

### 1. Home Page Chat Input (Coming Soon)
**Location:** `components/chat-input.tsx`

- Added "Coming Soon" tooltips to the Plus and Image attachment buttons
- When users click these buttons, they see a friendly notification that the feature will be available soon
- This prepares users for the full attachment functionality available in the workspace

### 2. Workspace Chat Panel - Image Attachments
**Location:** `components/workspace/chat-panel.tsx`

#### Features:
- **Maximum 2 images** per message
- **Automatic image processing** using Pixtral vision model
- **Base64 conversion** for secure storage in browser state
- **AI-powered image description** for non-vision models

#### How It Works:
1. User clicks the Plus (+) button at the bottom-left of the chat input
2. Selects "Attach Image" from the dropdown menu
3. Chooses up to 2 images from their device (max 10MB each)
4. Images are converted to base64 and sent to Pixtral for description
5. Pixtral analyzes the image and generates a detailed description including:
   - Layout and UI elements
   - Colors and styling
   - Text content
   - Design patterns
   - Any relevant details for recreating the design
6. The description is stored and displayed as a purple pill below the input
7. When the user sends their message, the image descriptions are included in the AI context

#### Use Cases:
- **UI Cloning:** Upload a screenshot of a design you want to recreate
- **Design Reference:** Share design inspiration for the AI to reference
- **Visual Debugging:** Show UI issues or bugs visually
- **Interface Rebuilding:** Provide existing designs for modernization

### 3. Workspace Chat Panel - File Attachments
**Location:** `components/workspace/chat-panel.tsx`

#### Features:
- **Maximum 10 files** per message
- **Automatic file parsing** and content extraction
- **File size limit** of 5MB per file
- **Disabled when images are attached** (mutual exclusivity)

#### How It Works:
1. User clicks the Plus (+) button at the bottom-left of the chat input
2. Selects "Attach File" from the dropdown menu
3. Chooses files from their device (max 5MB each)
4. Files are read and their content is extracted
5. Content is displayed as blue pills below the input
6. When the user sends their message, file contents are included in the AI context

#### Use Cases:
- **Code Analysis:** Upload code files for review or refactoring
- **Documentation:** Share specs, requirements, or documentation files
- **Configuration:** Provide config files for context
- **Data Files:** Include JSON, CSV, or other data files

### 4. Visual Attachment Pills
**Location:** `components/workspace/chat-panel.tsx`

Three types of attachment pills are displayed:

#### Purple Pills - Image Attachments
- Shows image filename
- Displays processing spinner while Pixtral analyzes the image
- Shows "X" button to remove the image
- Icon: Image icon

#### Blue Pills - Uploaded File Attachments
- Shows filename and file size
- Shows "X" button to remove the file
- Icon: FileText icon

#### Existing Pills - Project File Attachments (@ command)
- Shows filename from project
- Used via the existing @ command system
- Can coexist with image attachments

## API Integration

### Image Description API
**Location:** `app/api/describe-image/route.ts`

- **Endpoint:** `POST /api/describe-image`
- **Model:** Pixtral 12B (Mistral's vision model)
- **Input:** Base64 image data
- **Output:** Detailed image description
- **Max Tokens:** 1024

#### Request Format:
```json
{
  "image": "data:image/jpeg;base64,...",
  "prompt": "Describe this image in detail..."
}
```

#### Response Format:
```json
{
  "success": true,
  "description": "This image shows a modern web interface with..."
}
```

## Message Context Format

When a user sends a message with attachments, the content is structured as follows:

```
[User's original message]

=== ATTACHED IMAGES CONTEXT ===

--- Image: screenshot.png ---
[Pixtral's detailed description of the image]
--- End of Image ---

=== END ATTACHED IMAGES ===

=== UPLOADED FILES CONTEXT ===

--- Uploaded File: config.json ---
[Full file content]
--- End of config.json ---

=== END UPLOADED FILES ===

=== PROJECT FILES CONTEXT ===

--- Project File: src/app/page.tsx ---
[Full file content from project]
--- End of page.tsx ---

=== END PROJECT FILES ===
```

This structured format ensures the AI can clearly distinguish between:
1. The user's original prompt
2. Visual context from images (via Pixtral descriptions)
3. File content from uploaded files
4. Project files from the @ command system

## User Interface Details

### Plus Button
- **Position:** Bottom-left corner of the chat input
- **Style:** Round gray button with hover effect
- **Icon:** Plus (+) icon
- **Behavior:** Opens dropdown menu with attachment options

### Attachment Dropdown Menu
- **Position:** Above the Plus button
- **Options:**
  1. Attach Image (disabled if 2+ images or files attached)
  2. Attach File (disabled if images attached)
- **Style:** Dark themed with hover states

### Input Padding
- **Left padding:** 40px (space for Plus button)
- **Right padding:** 52px (space for Send button)

### Placeholder Text
Updated to: "Plan, build and ship faster. Type @ to attach files or use + for images."

## Validation Rules

### Images:
- ✅ Maximum 2 images per message
- ✅ Maximum 10MB per image
- ✅ Must be valid image file types
- ✅ Cannot attach files when images are attached
- ✅ Must finish processing before sending

### Files:
- ✅ Maximum 10 files per message
- ✅ Maximum 5MB per file
- ✅ Cannot attach when images are attached
- ✅ Any file type supported

### Project Files (@ command):
- ✅ Can be used with images
- ✅ Can be used with uploaded files
- ✅ Unlimited files from project

## State Management

All attachments are stored in React state:

```typescript
// Image attachments
const [attachedImages, setAttachedImages] = useState<Array<{
  id: string
  name: string
  base64: string
  description?: string
  isProcessing?: boolean
}>>([])

// Uploaded file attachments
const [attachedUploadedFiles, setAttachedUploadedFiles] = useState<Array<{
  id: string
  name: string
  content: string
  size: number
}>>([])

// Project file attachments (existing)
const [attachedFiles, setAttachedFiles] = useState<FileSearchResult[]>([])

// Attachment menu visibility
const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
```

## Browser Storage

- Images are stored as base64 in browser state (not persisted)
- File contents are stored in browser state (not persisted)
- Descriptions from Pixtral are cached in state
- All attachments are cleared after sending the message

## Error Handling

Comprehensive error handling includes:

1. **File size validation** - Clear error messages for oversized files
2. **File type validation** - Ensures images are valid image types
3. **Processing errors** - Gracefully handles Pixtral API failures
4. **Read errors** - Handles file reading failures
5. **Mutual exclusivity** - Prevents conflicting attachment types
6. **User feedback** - Toast notifications for all actions

## Performance Considerations

1. **Base64 encoding** - Efficient in-memory conversion
2. **Lazy loading** - Images only processed when attached
3. **Automatic cleanup** - Attachments cleared after sending
4. **Size limits** - Prevents memory issues with large files
5. **Processing indicator** - Shows user when image is being analyzed

## Future Enhancements

Possible improvements for future versions:

1. **Drag and drop** - Allow users to drag files/images into chat
2. **Image preview** - Show thumbnail of attached images
3. **Batch upload** - Allow selecting multiple images at once
4. **Compression** - Automatically compress large images
5. **File preview** - Show preview of file contents
6. **Persistence** - Save attachments in chat history
7. **Multiple vision models** - Support different vision models
8. **Custom prompts** - Allow users to customize image analysis prompts
9. **OCR integration** - Extract text from images
10. **Annotation tools** - Allow users to annotate images before sending

## Testing

To test the feature:

### Image Attachments:
1. Open a project in workspace
2. Click the Plus (+) button at bottom-left of chat input
3. Select "Attach Image"
4. Choose an image file (PNG, JPG, etc.)
5. Wait for processing (spinner shows)
6. Verify purple pill appears with image name
7. Type a message and send
8. Verify AI responds with context from image description

### File Attachments:
1. Open a project in workspace
2. Click the Plus (+) button at bottom-left of chat input
3. Select "Attach File"
4. Choose a text file (JS, JSON, TXT, etc.)
5. Verify blue pill appears with filename and size
6. Type a message and send
7. Verify AI responds with context from file content

### Combined with @ Command:
1. Attach an image using Plus button
2. Type @ in the input to open file dropdown
3. Select a project file
4. Verify both attachments show (purple pill + existing badge)
5. Send message
6. Verify AI has context from both image and project file

## Troubleshooting

### Image not processing:
- Check MISTRAL_API_KEY is set in environment
- Verify image file is valid format
- Check browser console for errors
- Ensure file size is under 10MB

### File not attaching:
- Verify file size is under 5MB
- Check that no images are attached
- Ensure file is readable text format

### Pills not showing:
- Check React state updates
- Verify file reading completed
- Check browser console for errors

## Dependencies

- **@ai-sdk/mistral** - For Pixtral vision model
- **lucide-react** - For Plus and Image icons
- **AI SDK** - For generateText function
- **React hooks** - useState, useRef, useEffect

## Security Considerations

1. **File size limits** - Prevents denial of service
2. **File type validation** - Ensures only appropriate files are processed
3. **Base64 encoding** - Secure storage format
4. **Client-side processing** - No server-side file storage
5. **Automatic cleanup** - Prevents memory leaks
6. **API key security** - Keys stored in environment variables

## Conclusion

This feature significantly enhances the AI's capabilities by allowing it to:
- "See" designs through image descriptions
- Understand visual context
- Work with external file contents
- Clone and rebuild interfaces more effectively
- Provide more contextual and accurate responses

The implementation is user-friendly, secure, and performant, with comprehensive error handling and clear user feedback throughout the process.

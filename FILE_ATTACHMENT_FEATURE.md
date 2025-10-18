# File Attachment Feature (@command)

## Overview
The chat panel now supports file attachments using the `@` command, allowing users to easily attach files to their prompts for better context.

## How to Use

### 1. Basic Usage
- Type `@` in the chat input to trigger the file attachment dropdown
- Start typing to search for files by name
- Use arrow keys to navigate the dropdown
- Press Enter or click to select a file
- The file will appear as `@filename.ext` in your message

### 2. Search and Filter
- **Exact match**: Type the exact filename for highest priority
- **Partial match**: Type part of the filename to find matches
- **Extension search**: Search by file extension (e.g., `.tsx`, `.css`)
- **Path search**: Search by folder or path names

### 3. File Management
- **Multiple files**: Attach multiple files by repeating the `@` command
- **Remove files**: Click the X button on file badges to remove attachments
- **Auto-clear**: Attached files are cleared after sending the message

### 4. Keyboard Shortcuts
- `@` - Open file attachment dropdown
- `↑/↓` - Navigate dropdown options
- `Enter` - Select highlighted file
- `Escape` - Close dropdown
- `Enter` (in input) - Send message with attachments

## Features

### Smart File Search
- **Fuzzy matching**: Finds files even with partial or misspelled queries
- **Relevance scoring**: Prioritizes exact matches and common file types
- **Recent files**: Shows recently modified files first when no query
- **File type filtering**: Easy filtering by extension

### Visual Indicators
- **File badges**: Show attached files with icons and names
- **Dropdown preview**: Rich file information including size and path
- **File type icons**: Different icons for different file types
- **Loading states**: Visual feedback during file operations

### Context Integration
- **Automatic content inclusion**: File contents are automatically added to the message context
- **Structured format**: Files are clearly marked with headers and footers
- **Error handling**: Graceful handling of missing or unreadable files
- **Size optimization**: Efficient handling of large files

## Technical Implementation

### Components Created
1. **FileLookupService** (`lib/file-lookup-service.ts`)
   - Handles file searching and filtering
   - Manages file indexing and caching
   - Provides relevance scoring

2. **FileAttachmentDropdown** (`components/ui/file-attachment-dropdown.tsx`)
   - Interactive file selection interface
   - Keyboard navigation support
   - Real-time search results

3. **FileAttachmentBadge** (`components/ui/file-attachment-badge.tsx`)
   - Visual representation of attached files
   - Remove functionality
   - File type icons

### Integration Points
- **ChatPanel**: Modified to handle @ command detection
- **Message Processing**: Enhanced to include file content in context
- **Storage Manager**: Integrated for file content retrieval

## Example Usage

```
User types: "Can you help me fix this bug? @App.tsx @utils.ts"
```

The system will:
1. Detect the @ commands
2. Show dropdown for file selection
3. Attach App.tsx and utils.ts files
4. Include their content in the message context
5. Send the enhanced message to the AI

## Benefits

### For Users
- **Faster workflow**: No need to copy/paste file contents
- **Better context**: AI has access to relevant file information
- **Visual clarity**: Clear indication of which files are attached
- **Flexible search**: Multiple ways to find and attach files

### For AI Responses
- **Rich context**: Access to actual file contents for better understanding
- **Accurate suggestions**: Can see the current state of files
- **Targeted fixes**: Can provide specific changes based on file content
- **Multi-file awareness**: Can understand relationships between attached files

## Future Enhancements
- Syntax highlighting in file preview
- File content preview in dropdown
- Attachment history and favorites
- Drag-and-drop file attachment
- File diff visualization
- Attachment templates for common file combinations

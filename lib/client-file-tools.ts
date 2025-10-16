/**
 * Client-Side File Operation Tools for AI SDK
 * These tools execute directly on IndexedDB when called by the AI
 */

// Helper to parse search/replace blocks (same logic as server)
export function parseSearchReplaceBlock(blockText: string) {
  const SEARCH_START = "<<<<<<< SEARCH";
  const DIVIDER = "=======";
  const REPLACE_END = ">>>>>>> REPLACE";

  const lines = blockText.split('\n');
  let searchLines = [];
  let replaceLines = [];
  let mode = 'none'; // 'search' | 'replace'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === SEARCH_START) {
      mode = 'search';
    } else if (line.trim() === DIVIDER && mode === 'search') {
      mode = 'replace';
    } else if (line.trim() === REPLACE_END && mode === 'replace') {
      break; // End of block
    } else if (mode === 'search') {
      searchLines.push(line);
    } else if (mode === 'replace') {
      replaceLines.push(line);
    }
  }

  // Remove empty lines from start and end
  while (searchLines.length > 0 && searchLines[0].trim() === '') searchLines.shift();
  while (searchLines.length > 0 && searchLines[searchLines.length - 1].trim() === '') searchLines.pop();
  while (replaceLines.length > 0 && replaceLines[0].trim() === '') replaceLines.shift();
  while (replaceLines.length > 0 && replaceLines[replaceLines.length - 1].trim() === '') replaceLines.pop();

  if (searchLines.length === 0) {
    return null; // Invalid block
  }

  return {
    search: searchLines.join('\n'),
    replace: replaceLines.join('\n')
  };
}

/**
 * Handle client-side file operations
 * @param toolCall The tool call from AI SDK
 * @param projectId The current project ID
 * @param addToolResult Function to add the tool result back to the chat
 * @returns Promise<void>
 */
export async function handleClientFileOperation(
  toolCall: any,
  projectId: string,
  addToolResult: (result: any) => void
) {
  const { storageManager } = await import('@/lib/storage-manager');
  await storageManager.init();

  try {
    switch (toolCall.toolName) {
      case 'write_file': {
        const { path, content } = toolCall.args;
        console.log(`[ClientFileTool] write_file: ${path}`);

        // Validate inputs
        if (!path || typeof path !== 'string') {
          addToolResult({
            tool: 'write_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: 'Invalid file path provided'
          });
          return;
        }

        if (content === undefined || content === null) {
          addToolResult({
            tool: 'write_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: 'Invalid content provided'
          });
          return;
        }

        // Check if file exists
        const existingFile = await storageManager.getFile(projectId, path);

        if (existingFile) {
          // Update existing file
          await storageManager.updateFile(projectId, path, { content });
          console.log(`[ClientFileTool] Updated file: ${path}`);
          
          addToolResult({
            tool: 'write_file',
            toolCallId: toolCall.toolCallId,
            output: {
              success: true,
              message: `✅ File ${path} updated successfully.`,
              path,
              content,
              action: 'updated'
            }
          });
        } else {
          // Create new file
          const newFile = await storageManager.createFile({
            workspaceId: projectId,
            name: path.split('/').pop() || path,
            path,
            content,
            fileType: path.split('.').pop() || 'text',
            type: path.split('.').pop() || 'text',
            size: content.length,
            isDirectory: false,
            metadata: { createdBy: 'ai' }
          });
          console.log(`[ClientFileTool] Created file: ${path}`);

          addToolResult({
            tool: 'write_file',
            toolCallId: toolCall.toolCallId,
            output: {
              success: true,
              message: `✅ File ${path} created successfully.`,
              path,
              content,
              action: 'created',
              fileId: newFile.id
            }
          });
        }

        // Trigger file refresh event
        window.dispatchEvent(new CustomEvent('files-changed', {
          detail: { projectId, forceRefresh: true }
        }));
        break;
      }

      case 'read_file': {
        const { path, includeLineNumbers = false } = toolCall.args;
        console.log(`[ClientFileTool] read_file: ${path}`);

        // Validate path
        if (!path || typeof path !== 'string') {
          addToolResult({
            tool: 'read_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: 'Invalid file path provided'
          });
          return;
        }

        const file = await storageManager.getFile(projectId, path);

        if (!file) {
          addToolResult({
            tool: 'read_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: `File not found: ${path}. Use list_files to see available files.`
          });
          return;
        }

        const content = file.content || '';
        let response: any = {
          success: true,
          message: `✅ File ${path} read successfully.`,
          path,
          content,
          name: file.name,
          type: file.type,
          size: file.size,
          action: 'read'
        };

        // Add line number information if requested
        if (includeLineNumbers) {
          const lines = content.split('\n');
          const lineCount = lines.length;
          const linesWithNumbers = lines.map((line, index) =>
            `${String(index + 1).padStart(4, ' ')}: ${line}`
          ).join('\n');

          response.lineCount = lineCount;
          response.contentWithLineNumbers = linesWithNumbers;
          response.lines = lines; // Array of individual lines
        }

        addToolResult({
          tool: 'read_file',
          toolCallId: toolCall.toolCallId,
          output: response
        });
        break;
      }

      case 'edit_file': {
        const { filePath, searchReplaceBlock } = toolCall.args;
        console.log(`[ClientFileTool] edit_file: ${filePath}`);

        if (!filePath || typeof filePath !== 'string') {
          addToolResult({
            tool: 'edit_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: 'Invalid file path provided'
          });
          return;
        }

        if (!searchReplaceBlock || typeof searchReplaceBlock !== 'string') {
          addToolResult({
            tool: 'edit_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: 'Invalid search/replace block provided'
          });
          return;
        }

        // Read current file content
        const existingFile = await storageManager.getFile(projectId, filePath);

        if (!existingFile) {
          addToolResult({
            tool: 'edit_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: `File not found: ${filePath}. Use list_files to see available files.`
          });
          return;
        }

        const currentContent = existingFile.content || '';

        // Parse the search/replace block
        const editBlock = parseSearchReplaceBlock(searchReplaceBlock);

        if (!editBlock) {
          addToolResult({
            tool: 'edit_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: 'Failed to parse search/replace block. Ensure it follows the format: <<<<<<< SEARCH\\n[old code]\\n=======\\n[new code]\\n>>>>>>> REPLACE'
          });
          return;
        }

        // Apply the search/replace
        let modifiedContent = currentContent;
        const appliedEdits = [];
        const failedEdits = [];

        if (modifiedContent.includes(editBlock.search)) {
          modifiedContent = modifiedContent.replace(editBlock.search, editBlock.replace);
          appliedEdits.push({
            search: editBlock.search,
            replace: editBlock.replace,
            status: 'applied'
          });
        } else {
          failedEdits.push({
            search: editBlock.search,
            replace: editBlock.replace,
            status: 'failed',
            reason: 'Search text not found in file content'
          });
        }

        // Save the modified content
        if (appliedEdits.length > 0) {
          await storageManager.updateFile(projectId, filePath, { content: modifiedContent });
          console.log(`[ClientFileTool] Edited file: ${filePath}`);

          addToolResult({
            tool: 'edit_file',
            toolCallId: toolCall.toolCallId,
            output: {
              success: true,
              message: `✅ File ${filePath} edited successfully.`,
              path: filePath,
              content: modifiedContent,
              appliedEdits,
              failedEdits,
              action: 'edited'
            }
          });

          // Trigger file refresh event
          window.dispatchEvent(new CustomEvent('files-changed', {
            detail: { projectId, forceRefresh: true }
          }));
        } else {
          addToolResult({
            tool: 'edit_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: `Failed to apply edit: ${failedEdits[0]?.reason || 'Unknown error'}`
          });
        }
        break;
      }

      case 'delete_file': {
        const { path } = toolCall.args;
        console.log(`[ClientFileTool] delete_file: ${path}`);

        // Validate path
        if (!path || typeof path !== 'string') {
          addToolResult({
            tool: 'delete_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: 'Invalid file path provided'
          });
          return;
        }

        // Check if file exists
        const existingFile = await storageManager.getFile(projectId, path);

        if (!existingFile) {
          addToolResult({
            tool: 'delete_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: `File not found: ${path}. Use list_files to see available files.`
          });
          return;
        }

        // Delete the file
        const result = await storageManager.deleteFile(projectId, path);

        if (result) {
          console.log(`[ClientFileTool] Deleted file: ${path}`);
          
          addToolResult({
            tool: 'delete_file',
            toolCallId: toolCall.toolCallId,
            output: {
              success: true,
              message: `✅ File ${path} deleted successfully.`,
              path,
              action: 'deleted'
            }
          });

          // Trigger file refresh event
          window.dispatchEvent(new CustomEvent('files-changed', {
            detail: { projectId, forceRefresh: true }
          }));
        } else {
          addToolResult({
            tool: 'delete_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: `Failed to delete file ${path}`
          });
        }
        break;
      }

      default:
        console.warn(`[ClientFileTool] Unknown tool: ${toolCall.toolName}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ClientFileTool] Error executing ${toolCall.toolName}:`, error);

    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      state: 'output-error',
      errorText: `Failed to execute ${toolCall.toolName}: ${errorMessage}`
    });
  }
}

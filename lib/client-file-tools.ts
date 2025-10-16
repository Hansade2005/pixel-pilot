/**
 * Client-Side File Operation Tools for AI SDK
 * These tools execute directly on IndexedDB when called by the AI
 * 
 * IMPORTANT: Follows AI SDK client-side tool pattern:
 * 1. Check if toolCall.dynamic is true (skip if true)
 * 2. Match toolName and execute client-side logic
 * 3. Call addToolResult() immediately (NEVER await it - causes deadlocks)
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
 * Handle client-side file operations following AI SDK pattern
 * @param toolCall The tool call from AI SDK (contains toolName, toolCallId, args)
 * @param projectId The current project ID
 * @param addToolResult Function to add the tool result back to the chat
 * @returns Promise<void>
 * 
 * CRITICAL: This function MUST NOT await addToolResult() - it causes deadlocks in AI SDK streaming.
 * The function can be async internally, but addToolResult is called synchronously without await.
 */
export async function handleClientFileOperation(
  toolCall: any,
  projectId: string,
  addToolResult: (result: any) => void
) {
  // Step 1: Always check if the tool is dynamic (per AI SDK docs)
  if (toolCall.dynamic) {
    console.log('[ClientFileTool] Skipping dynamic tool:', toolCall.toolName);
    return;
  }

  const { storageManager } = await import('@/lib/storage-manager');
  await storageManager.init();

  try {
    // Step 2: Match tool names
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
          // Use indexOf + substring for memory-efficient first-occurrence replacement in browser
          const searchIndex = modifiedContent.indexOf(editBlock.search);
          if (searchIndex !== -1) {
            modifiedContent = modifiedContent.substring(0, searchIndex) +
                             editBlock.replace +
                             modifiedContent.substring(searchIndex + editBlock.search.length);
          }
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

      case 'add_package': {
        const { name: packageNames, version = 'latest', isDev = false } = toolCall.args;
        console.log(`[ClientFileTool] add_package:`, { packageNames, version, isDev });

        // Normalize package names to array
        let names: string[];
        if (Array.isArray(packageNames)) {
          names = packageNames;
        } else {
          const nameStr = packageNames.trim();
          if (nameStr.startsWith('[') && nameStr.endsWith(']')) {
            try {
              const parsed = JSON.parse(nameStr);
              names = Array.isArray(parsed) ? parsed : [nameStr];
            } catch {
              names = [nameStr];
            }
          } else if (nameStr.includes(',')) {
            names = nameStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          } else {
            names = [nameStr];
          }
        }

        try {
          // Get package.json or create if it doesn't exist
          let packageFile = await storageManager.getFile(projectId, 'package.json');
          let packageJson: any = {};

          if (!packageFile) {
            console.log(`[ClientFileTool] package.json not found, creating new one`);
            packageJson = {
              name: 'ai-generated-project',
              version: '1.0.0',
              description: 'AI-generated project',
              main: 'index.js',
              scripts: {
                test: 'echo "Error: no test specified" && exit 1'
              },
              keywords: [],
              author: '',
              license: 'ISC'
            };
            
            await storageManager.createFile({
              workspaceId: projectId,
              name: 'package.json',
              path: 'package.json',
              content: JSON.stringify(packageJson, null, 2),
              fileType: 'json',
              type: 'json',
              size: JSON.stringify(packageJson, null, 2).length,
              isDirectory: false
            });
          } else {
            packageJson = JSON.parse(packageFile.content || '{}');
          }

          const depType = isDev ? 'devDependencies' : 'dependencies';

          // Initialize dependency section if it doesn't exist
          if (!packageJson[depType]) {
            packageJson[depType] = {};
          }

          // Add all packages
          const addedPackages: string[] = [];
          for (const packageName of names) {
            const packageVersion = version === 'latest' ? `^1.0.0` : version;
            packageJson[depType][packageName] = packageVersion;
            addedPackages.push(packageName);
          }

          // Update package.json
          await storageManager.updateFile(projectId, 'package.json', {
            content: JSON.stringify(packageJson, null, 2)
          });

          console.log(`[ClientFileTool] Added packages: ${addedPackages.join(', ')}`);

          addToolResult({
            tool: 'add_package',
            toolCallId: toolCall.toolCallId,
            output: {
              success: true,
              message: `✅ Packages ${addedPackages.join(', ')} added to ${depType} successfully.`,
              packages: addedPackages,
              version,
              dependencyType: depType,
              path: 'package.json',
              action: 'packages_added'
            }
          });

          // Trigger file refresh event
          window.dispatchEvent(new CustomEvent('files-changed', {
            detail: { projectId, forceRefresh: true }
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addToolResult({
            tool: 'add_package',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: `Failed to add packages: ${errorMessage}`
          });
        }
        break;
      }

      case 'remove_package': {
        const { name: packageNames, isDev = false } = toolCall.args;
        console.log(`[ClientFileTool] remove_package:`, { packageNames, isDev });

        // Normalize package names to array
        let names: string[];
        if (Array.isArray(packageNames)) {
          names = packageNames;
        } else {
          const nameStr = packageNames.trim();
          if (nameStr.startsWith('[') && nameStr.endsWith(']')) {
            try {
              const parsed = JSON.parse(nameStr);
              names = Array.isArray(parsed) ? parsed : [nameStr];
            } catch {
              names = [nameStr];
            }
          } else if (nameStr.includes(',')) {
            names = nameStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          } else {
            names = [nameStr];
          }
        }

        try {
          // Get package.json
          const packageFile = await storageManager.getFile(projectId, 'package.json');
          if (!packageFile) {
            addToolResult({
              tool: 'remove_package',
              toolCallId: toolCall.toolCallId,
              state: 'output-error',
              errorText: 'package.json not found'
            });
            return;
          }

          const packageJson = JSON.parse(packageFile.content || '{}');
          const depType = isDev ? 'devDependencies' : 'dependencies';

          // Check if all packages exist
          const missingPackages: string[] = [];
          for (const packageName of names) {
            if (!packageJson[depType] || !packageJson[depType][packageName]) {
              missingPackages.push(packageName);
            }
          }

          if (missingPackages.length > 0) {
            addToolResult({
              tool: 'remove_package',
              toolCallId: toolCall.toolCallId,
              state: 'output-error',
              errorText: `Package(s) ${missingPackages.join(', ')} not found in ${depType}`
            });
            return;
          }

          // Remove all packages
          const removedPackages: string[] = [];
          for (const packageName of names) {
            delete packageJson[depType][packageName];
            removedPackages.push(packageName);
          }

          // Update package.json
          await storageManager.updateFile(projectId, 'package.json', {
            content: JSON.stringify(packageJson, null, 2)
          });

          console.log(`[ClientFileTool] Removed packages: ${removedPackages.join(', ')}`);

          addToolResult({
            tool: 'remove_package',
            toolCallId: toolCall.toolCallId,
            output: {
              success: true,
              message: `✅ Packages ${removedPackages.join(', ')} removed from ${depType} successfully.`,
              packages: removedPackages,
              dependencyType: depType,
              path: 'package.json',
              action: 'packages_removed'
            }
          });

          // Trigger file refresh event
          window.dispatchEvent(new CustomEvent('files-changed', {
            detail: { projectId, forceRefresh: true }
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addToolResult({
            tool: 'remove_package',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: `Failed to remove packages: ${errorMessage}`
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

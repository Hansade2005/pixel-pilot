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

  // Don't trim empty lines to preserve exact whitespace for matching
  // Only check if we have any content at all
  const hasSearchContent = searchLines.some(line => line.trim() !== '');
  const hasReplaceContent = replaceLines.some(line => line.trim() !== '');

  if (!hasSearchContent && !hasReplaceContent) {
    return null; // Completely empty block
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
        
        // Check for large files and truncate if necessary to prevent response size issues
        const MAX_CONTENT_SIZE = 500000; // 500KB limit for content in response
        let wasTruncated = false;
        let finalContent = content;
        if (content.length > MAX_CONTENT_SIZE) {
          finalContent = content.substring(0, MAX_CONTENT_SIZE);
          wasTruncated = true;
          console.log(`[ClientFileTool] read_file: Content truncated to ${MAX_CONTENT_SIZE} chars for ${path}`);
        }
        
        let response: any = {
          success: true,
          message: `✅ File ${path} read successfully${wasTruncated ? ` (content truncated to ${MAX_CONTENT_SIZE} characters)` : ''}.`,
          path,
          content: finalContent,
          name: file.name,
          type: file.type,
          size: file.size,
          action: 'read'
        };

        // Add truncation warning
        if (wasTruncated) {
          response.truncated = true;
          response.maxContentSize = MAX_CONTENT_SIZE;
          response.fullSize = content.length;
        }

        // Add line number information if requested
        if (includeLineNumbers) {
          const lines = finalContent.split('\n');
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
        const { filePath, searchReplaceBlock, useRegex = false, replaceAll = false } = toolCall.args;
        console.log(`[ClientFileTool] edit_file: ${filePath} (regex: ${useRegex}, replaceAll: ${replaceAll})`);

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
        const originalLines = currentContent.split('\n');
        const originalLineCount = originalLines.length;

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

        const { search, replace } = editBlock;

        // Create backup for potential rollback
        const backupContent = currentContent;

        let modifiedContent = currentContent;
        const appliedEdits = [];
        const failedEdits = [];
        let replacementCount = 0;

        try {
          if (useRegex) {
            // Handle regex replacement
            const regexFlags = replaceAll ? 'g' : '';
            const regex = new RegExp(search, regexFlags);

            if (regex.test(currentContent)) {
              modifiedContent = currentContent.replace(regex, replace);
              replacementCount = replaceAll ? (currentContent.match(regex) || []).length : 1;

              appliedEdits.push({
                type: 'regex',
                pattern: search,
                replacement: replace,
                flags: regexFlags,
                occurrences: replacementCount,
                status: 'applied'
              });
            } else {
              failedEdits.push({
                type: 'regex',
                pattern: search,
                replacement: replace,
                status: 'failed',
                reason: 'Regex pattern not found in file content'
              });
            }
          } else {
            // Handle string replacement
            if (replaceAll) {
              // Replace all occurrences
              let occurrences = 0;
              const allMatches = [];
              let searchIndex = 0;

              while ((searchIndex = modifiedContent.indexOf(search, searchIndex)) !== -1) {
                allMatches.push(searchIndex);
                searchIndex += search.length;
                occurrences++;
              }

              if (occurrences > 0) {
                modifiedContent = modifiedContent.replaceAll(search, replace);
                replacementCount = occurrences;

                appliedEdits.push({
                  type: 'string',
                  search: search,
                  replacement: replace,
                  occurrences: replacementCount,
                  positions: allMatches,
                  status: 'applied'
                });
              } else {
                failedEdits.push({
                  type: 'string',
                  search: search,
                  replacement: replace,
                  status: 'failed',
                  reason: 'Search text not found in file content'
                });
              }
            } else {
              // Replace first occurrence only
              if (modifiedContent.includes(search)) {
                const searchIndex = modifiedContent.indexOf(search);
                modifiedContent = modifiedContent.replace(search, replace);
                replacementCount = 1;

                appliedEdits.push({
                  type: 'string',
                  search: search,
                  replacement: replace,
                  occurrences: 1,
                  position: searchIndex,
                  status: 'applied'
                });
              } else {
                failedEdits.push({
                  type: 'string',
                  search: search,
                  replacement: replace,
                  status: 'failed',
                  reason: 'Search text not found in file content'
                });
              }
            }
          }

          // Generate diff information
          const generateDiff = (oldContent: string, newContent: string) => {
            const oldLines = oldContent.split('\n');
            const newLines = newContent.split('\n');
            const diff = [];

            const maxLines = Math.max(oldLines.length, newLines.length);
            for (let i = 0; i < maxLines; i++) {
              const oldLine = oldLines[i] || '';
              const newLine = newLines[i] || '';

              if (oldLine !== newLine) {
                if (oldLine && !newLine) {
                  diff.push({ line: i + 1, type: 'removed', content: oldLine });
                } else if (!oldLine && newLine) {
                  diff.push({ line: i + 1, type: 'added', content: newLine });
                } else {
                  diff.push({
                    line: i + 1,
                    type: 'modified',
                    oldContent: oldLine,
                    newContent: newLine
                  });
                }
              }
            }

            return diff;
          };

          const diff = generateDiff(currentContent, modifiedContent);
          const modifiedLines = modifiedContent.split('\n');
          const newLineCount = modifiedLines.length;

          // Save the modified content
          if (appliedEdits.length > 0) {
            await storageManager.updateFile(projectId, filePath, { content: modifiedContent });
            console.log(`[ClientFileTool] Edited file: ${filePath} (${replacementCount} replacements)`);

            addToolResult({
              tool: 'edit_file',
              toolCallId: toolCall.toolCallId,
              output: {
                success: true,
                message: `✅ File ${filePath} edited successfully (${replacementCount} replacement${replacementCount !== 1 ? 's' : ''}).`,
                path: filePath,
                originalContent: currentContent,
                newContent: modifiedContent,
                appliedEdits,
                failedEdits,
                diff,
                stats: {
                  originalSize: currentContent.length,
                  newSize: modifiedContent.length,
                  originalLines: originalLineCount,
                  newLines: newLineCount,
                  replacements: replacementCount
                },
                backupAvailable: true,
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
        } catch (editError) {
          console.error(`[ClientFileTool] Edit error:`, editError);
          addToolResult({
            tool: 'edit_file',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: `Edit failed: ${editError instanceof Error ? editError.message : 'Unknown error'}`
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
          const packageVersions: Record<string, string> = {};

          for (const packageName of names) {
            let packageVersion: string;

            if (version === 'latest') {
              // Keep 'latest' as-is for npm/yarn to resolve
              packageVersion = 'latest';
            } else if (version && typeof version === 'string') {
              // Use the exact version passed by AI (could be "1.2.3", "^1.2.3", "~1.2.3", etc.)
              packageVersion = version;
            } else {
              // Fallback to latest if version is invalid
              packageVersion = 'latest';
            }

            packageJson[depType][packageName] = packageVersion;
            addedPackages.push(packageName);
            packageVersions[packageName] = packageVersion;
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
              packageVersions,
              requestedVersion: version,
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

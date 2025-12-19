
import { Octokit } from '@octokit/rest'

// Helper to get optimized file context
export const getOptimizedFileContext = async (octokit: Octokit, owner: string, repo: string, branch: string): Promise<string> => {
    try {
        const response = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: branch,
            recursive: '1'
        })

        if (!response.data.truncated && response.data.tree) {
            const files = response.data.tree

            // Group by directory
            const dirMap = new Map<string, string[]>()
            const rootFiles: string[] = []

            files.forEach((file: any) => {
                if (!file.path) return
                const parts = file.path.split('/')
                if (parts.length === 1) {
                    rootFiles.push(file.path)
                } else {
                    const dir = parts[0]
                    if (!dirMap.has(dir)) dirMap.set(dir, [])
                    dirMap.get(dir)!.push(parts.slice(1).join('/'))
                }
            })

            let context = "Repository Structure:\n"

            // Add root files
            rootFiles.forEach(f => context += `- ${f}\n`)

            // Add directories
            dirMap.forEach((files, dir) => {
                context += `- ${dir}/\n`
                if (files.length > 10) {
                    context += `  (Contains ${files.length} files - use list_files to view)\n`
                } else {
                    files.forEach(f => context += `  - ${f}\n`)
                }
            })

            return context
        }
        return "Repository structure too large to preload. Use list_files to explore."
    } catch (error) {
        console.error('[RepoAgent] Failed to get optimized context:', error)
        return ""
    }
}

// Helper to find staged changes in conversation history
export const getStagedChanges = (messages: any[], currentStaged: Map<string, any>) => {
    const changes = new Map<string, any>(currentStaged)

    // Iterate strictly chronological
    if (messages && Array.isArray(messages)) {
        messages.forEach(msg => {
            // Check for tool calls in the message
            // Note: structure depends on provider, but AI SDK normalizes
            const toolCalls = msg.toolInvocations || []
            toolCalls.forEach((tc: any) => {
                if (tc.toolName === 'github_stage_change' && tc.state === 'result') { // Only count completed
                    const args = tc.args
                    const path = args.path

                    if (args.operation === 'delete') {
                        changes.set(path, { operation: 'delete' })
                    } else {
                        changes.set(path, {
                            operation: args.operation || 'update',
                            content: args.content
                        })
                    }
                }
            })
        })
    }

    return changes
}

// Helper to get file content from GitHub
export const getFileContent = async (octokit: Octokit, owner: string, repo: string, path: string, branch: string): Promise<string> => {
    try {
        const response = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref: branch
        })

        if ('content' in response.data) {
            // Decode base64 content
            return Buffer.from(response.data.content, 'base64').toString('utf-8')
        } else {
            throw new Error('File not found or is a directory')
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to read file ${path}: ${errorMessage}`)
    }
}

// Helper to apply incremental edits to file content
export const applyIncrementalEdits = (content: string, operations: Array<{
    old_string: string
    new_string: string
    context_lines?: number
}>): string => {
    let result = content

    for (const op of operations) {
        const { old_string, new_string, context_lines = 3 } = op

        // Find the old string with context to ensure uniqueness
        const lines = result.split('\n')
        let foundIndex = -1

        for (let i = 0; i < lines.length; i++) {
            // Check if this line contains the old_string
            if (lines[i].includes(old_string)) {
                // Verify context matches (lines before and after)
                let contextMatches = true
                const startLine = Math.max(0, i - context_lines)
                const endLine = Math.min(lines.length - 1, i + context_lines)

                // For now, just check if old_string appears and replace the first occurrence
                // In a more robust implementation, we'd check surrounding context
                if (contextMatches) {
                    foundIndex = i
                    break
                }
            }
        }

        if (foundIndex === -1) {
            throw new Error(`Could not find unique occurrence of "${old_string}" with ${context_lines} lines of context`)
        }

        // Replace the line containing old_string
        lines[foundIndex] = lines[foundIndex].replace(old_string, new_string)
        result = lines.join('\n')
    }

    return result
}

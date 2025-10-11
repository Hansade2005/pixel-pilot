"use strict";
/**
 * JSON-based Tool Parser for AI-generated tool calls
 * Replaces XML parsing with reliable JSON parsing similar to specs route
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonToolParser = exports.JsonToolParser = void 0;
exports.parseJsonTools = parseJsonTools;
const schema_aware_json_repair_engine_js_1 = require("../../schema-aware-json-repair-engine.js");
/**
 * Parse JSON tool calls from AI streaming content
 * Supports JSON format like: {"tool": "write_file", "path": "...", "content": "..."}
 */
class JsonToolParser {
    constructor() {
        this.supportedTools = [
            'write_file', 'edit_file', 'delete_file',
            'read_file', 'list_files', 'create_directory',
            'pilotwrite', 'pilotedit', 'pilotdelete',
            'add_package', 'remove_package'
        ];
        this.repairEngine = new schema_aware_json_repair_engine_js_1.SchemaAwareJSONRepairEngine();
    }
    /**
     * Extract and parse JSON tool calls from content
     */
    parseJsonTools(content) {
        const tools = [];
        let processedContent = content;
        // Find JSON tool patterns in the content using enhanced parsing
        const toolMatches = this.findJsonToolBlocksEnhanced(content);
        for (const match of toolMatches) {
            try {
                const parsedTool = this.parseJsonBlockEnhanced(match.json, match.startIndex);
                if (parsedTool) {
                    tools.push({
                        ...parsedTool,
                        id: this.generateId(),
                        startTime: Date.now()
                    });
                    // Replace JSON block with placeholder in processed content
                    const placeholder = `[${parsedTool.tool.toUpperCase()}: ${parsedTool.path || parsedTool.args.path || 'unknown'}]`;
                    processedContent = processedContent.replace(match.json, placeholder);
                }
            }
            catch (error) {
                console.error('[JsonToolParser] Failed to parse JSON block:', error, match.json);
            }
        }
        return { tools, processedContent };
    }
    /**
     * Enhanced JSON tool block finding with better malformed JSON support
     */
    findJsonToolBlocksEnhanced(content) {
        const blocks = [];
        // Skip enhanced parsing for now and go straight to code block parsing
        // const enhancedResult = this.repairEngine.parseToolCall(content);
        // if (enhancedResult) {
        //     // If enhanced parsing found a tool call, extract the JSON portion
        //     const jsonMatch = content.match(/\{[\s\S]*\}/);
        //     if (jsonMatch) {
        //         blocks.push({
        //             json: jsonMatch[0],
        //             startIndex: jsonMatch.index || 0
        //         });
        //         return blocks; // Return early if enhanced parsing worked
        //     }
        // }
        // Fall back to original method for multiple tool calls or when enhanced parsing doesn't find anything
        // Pattern to find JSON objects with "tool" property (but not inside code blocks)
        // First remove code blocks temporarily to avoid matching JSON inside them
        let contentWithoutCodeBlocks = content;
        const codeBlockPlaceholders = [];
        const tempCodeBlockPattern = /```(?:json)?\s*\n?(\{[\s\S]*?\n?\})\s*\n?```/g;
        let tempMatch;
        let placeholderIndex = 0;
        while ((tempMatch = tempCodeBlockPattern.exec(content)) !== null) {
            const placeholder = `__CODE_BLOCK_${placeholderIndex}__`;
            codeBlockPlaceholders.push({ placeholder, json: tempMatch[1].trim() });
            contentWithoutCodeBlocks = contentWithoutCodeBlocks.replace(tempMatch[0], placeholder);
            placeholderIndex++;
        }

        const jsonToolPattern = /\{\s*["\']tool["\']\s*:\s*["\']([^"\']+)["\']\s*[,}][\s\S]*?\}/g;
        let match;
        while ((match = jsonToolPattern.exec(contentWithoutCodeBlocks)) !== null) {
            const toolName = match[1];
            if (this.supportedTools.includes(toolName)) {
                // Try to extract the complete JSON object
                const completeJson = this.extractCompleteJson(contentWithoutCodeBlocks, match.index);
                if (completeJson) {
                    blocks.push({
                        json: completeJson,
                        startIndex: match.index
                    });
                }
            }
        }

        // Restore code blocks and parse them
        // Also look for code blocks containing JSON
        const codeBlockPattern = /```(?:json)?\s*\n?(\{[\s\S]*?\n?\})\s*\n?```/g;
        while ((match = codeBlockPattern.exec(content)) !== null) {
            try {
                const jsonContent = match[1].trim();
                // Try standard JSON.parse first
                let parsed;
                try {
                    parsed = JSON.parse(jsonContent);
                }
                catch (parseError) {
                    // If standard parsing fails, use schema-aware repair engine
                    const repairResult = this.repairEngine.repair(jsonContent);
                    if (repairResult.data && repairResult.confidence > 0.5) {
                        parsed = repairResult.data;
                    }
                    else {
                        continue;
                    }
                }
                if (parsed.tool && this.supportedTools.includes(parsed.tool)) {
                    blocks.push({
                        json: jsonContent,
                        startIndex: match.index
                    });
                }
            }
            catch (error) {
                // Continue processing other blocks
            }
        }
        return blocks;
    }
    /**
     * Enhanced JSON block parsing using the schema-aware engine
     */
    parseJsonBlockEnhanced(jsonString, startIndex) {
        try {
            // First try the enhanced parsing method
            const enhancedResult = this.repairEngine.parseToolCall(jsonString);
            if (enhancedResult) {
                // Convert enhanced result to JsonToolCall format
                return {
                    tool: enhancedResult.tool,
                    name: enhancedResult.tool,
                    path: enhancedResult.path,
                    content: enhancedResult.content,
                    operation: enhancedResult.args.operation,
                    search: enhancedResult.args.search,
                    replace: enhancedResult.args.replace,
                    searchReplaceBlocks: enhancedResult.args.searchReplaceBlocks,
                    replaceAll: enhancedResult.args.replaceAll,
                    occurrenceIndex: enhancedResult.args.occurrenceIndex,
                    validateAfter: enhancedResult.args.validateAfter,
                    dryRun: enhancedResult.args.dryRun,
                    rollbackOnFailure: enhancedResult.args.rollbackOnFailure,
                    args: enhancedResult.args,
                    status: 'detected'
                };
            }
            // Fall back to original parsing method
            return this.parseJsonBlock(jsonString, startIndex);
        }
        catch (error) {
            console.error('[JsonToolParser] Enhanced parsing completely failed:', error);
            return null;
        }
    }
    /**
     * Find JSON tool blocks in content
     * Looks for patterns like: {"tool": "write_file", ...}
     */
    findJsonToolBlocks(content) {
        const blocks = [];
        // Pattern to find JSON objects with "tool" property
        const jsonToolPattern = /\{\s*["\']tool["\']\s*:\s*["\']([^"\']+)["\']\s*[,}][\s\S]*?\}/g;
        let match;
        while ((match = jsonToolPattern.exec(content)) !== null) {
            const toolName = match[1];
            if (this.supportedTools.includes(toolName)) {
                // Try to extract the complete JSON object
                const completeJson = this.extractCompleteJson(content, match.index);
                if (completeJson) {
                    blocks.push({
                        json: completeJson,
                        startIndex: match.index
                    });
                }
            }
        }
        // Also look for code blocks containing JSON
        const codeBlockPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
        while ((match = codeBlockPattern.exec(content)) !== null) {
            try {
                const jsonContent = match[1];
                const parsed = JSON.parse(jsonContent);
                if (parsed.tool && this.supportedTools.includes(parsed.tool)) {
                    blocks.push({
                        json: jsonContent,
                        startIndex: match.index
                    });
                }
            }
            catch (error) {
                // Ignore malformed JSON in code blocks
            }
        }
        return blocks;
    }
    /**
     * Extract complete JSON object from content starting at index
     */
    extractCompleteJson(content, startIndex) {
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        let jsonEnd = -1;
        for (let i = startIndex; i < content.length; i++) {
            const char = content[i];
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            if (char === '"' || char === "'") {
                inString = !inString;
                continue;
            }
            if (!inString) {
                if (char === '{') {
                    braceCount++;
                }
                else if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        jsonEnd = i;
                        break;
                    }
                }
            }
        }
        if (jsonEnd > startIndex) {
            return content.substring(startIndex, jsonEnd + 1);
        }
        return null;
    }
    /**
     * Parse individual JSON block using schema-aware repair engine
     */
    parseJsonBlock(jsonString, startIndex) {
        try {
            // First try standard JSON.parse
            let parsed;
            try {
                parsed = JSON.parse(jsonString);
            }
            catch (parseError) {
                // If standard parsing fails, use schema-aware repair engine
                console.log('[JsonToolParser] Standard parse failed, trying schema-aware repair...');
                const repairResult = this.repairEngine.repair(jsonString);
                if (repairResult.data && repairResult.confidence > 0.5) {
                    parsed = repairResult.data;
                    console.log('[JsonToolParser] Successfully repaired JSON with confidence:', repairResult.confidence);
                    if (repairResult.fixes.length > 0) {
                        console.log('[JsonToolParser] Applied fixes:', repairResult.fixes);
                    }
                }
                else {
                    console.error('[JsonToolParser] Schema-aware repair failed or low confidence:', repairResult.confidence);
                    return null;
                }
            }
            if (!parsed.tool || !this.supportedTools.includes(parsed.tool)) {
                console.warn('[JsonToolParser] Invalid or unsupported tool:', parsed.tool);
                return null;
            }
            // Build standardized args object
            const args = { ...parsed };
            delete args.tool; // Remove tool from args since it's a separate field
            return {
                tool: parsed.tool,
                name: parsed.tool, // For compatibility
                path: parsed.path || args.file || args.filename,
                content: parsed.content || args.content,
                operation: parsed.operation,
                search: parsed.search,
                replace: parsed.replace,
                searchReplaceBlocks: parsed.searchReplaceBlocks,
                replaceAll: parsed.replaceAll,
                occurrenceIndex: parsed.occurrenceIndex,
                validateAfter: parsed.validateAfter,
                dryRun: parsed.dryRun,
                rollbackOnFailure: parsed.rollbackOnFailure,
                args,
                status: 'detected'
            };
        }
        catch (error) {
            console.error('[JsonToolParser] JSON parsing completely failed:', error);
            return null;
        }
    }
    /**
     * Generate unique ID for tool call
     */
    generateId() {
        return `json_tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Validate if content contains supported JSON tools
     */
    hasJsonTools(content) {
        const toolPattern = this.supportedTools.join('|');
        const jsonToolRegex = new RegExp(`\\{[^}]*["\']tool["\']\s*:\s*["\'](?:${toolPattern})["\']`, 'i');
        return jsonToolRegex.test(content);
    }
    /**
     * Get supported tool names
     */
    getSupportedTools() {
        return [...this.supportedTools];
    }
}
exports.JsonToolParser = JsonToolParser;
// Export singleton instance
exports.jsonToolParser = new JsonToolParser();
// Export utility function
function parseJsonTools(content) {
    const result = exports.jsonToolParser.parseJsonTools(content);
    return result.tools;
}

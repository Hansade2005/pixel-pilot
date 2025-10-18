# Full Context Structure Sent to AI Assistant

This document outlines the complete context structure provided to the AI assistant in each request, including the order of reception from system and user roles.

## Order of Context Reception

### 1. System-Provided Context (Before User Query)
The system sends the following context elements in this order:

#### `<environment_info>`
- Current OS and shell information
- Example: "The user's current OS is: Windows", "The user's default shell is: "cmd.exe""

#### `<workspace_info>`
- Workspace folder structure and contents
- Current working directory path
- List of files and folders in the workspace
- Example: "I am working in a workspace with the following folders: - c:\Users\DELL\Downloads\ai-app-builder"

#### `<conversation-summary>`
- Analysis section with chronological review, intent mapping, technical inventory, etc.
- Summary section with conversation overview, technical foundation, codebase status, etc.
- Provides historical context of the ongoing conversation

#### `<instructions>`
- Core AI behavior guidelines and rules
- Tool usage policies and restrictions
- Response formatting requirements
- Security and content policies

#### `<toolUseInstructions>`
- Specific rules for using available tools
- Tool calling format and restrictions
- When to use tools vs direct responses
- Parallel tool usage guidelines

#### `<planning_instructions>`
- Guidelines for using the manage_todo_list tool
- When to create plans vs simple execution
- Progress tracking rules and workflow

#### `<notebookInstructions>`
- Special rules for Jupyter notebook operations
- Cell execution guidelines
- Notebook file editing protocols

#### `<outputFormatting>`
- Markdown formatting standards
- Code block usage rules
- Citation and reference guidelines

### 2. User-Provided Context (During Interaction)
#### `<context>` (Real-time Context)
- Current date and time
- Active terminals information
- Current todo list status
- Example: "The current date is October 11, 2025."

#### `<editorContext>`
- Currently open file in the editor
- Example: "The user's current file is c:\Users\DELL\Downloads\ai-app-builder\system_prompt_structure.md"

#### `<repoContext>`
- Git repository information
- Repository name, owner, current branch
- Example: "Repository name: pixel-pilot, Owner: Hansade2005, Current branch: main"

#### `<reminderInstructions>`
- Specific reminders for tool usage
- Example: "When using the replace_string_in_file tool, include 3-5 lines of unchanged code before and after..."

### 3. User Query
#### `<user_query>`
- The actual user message/request
- This is the final element received
- Example: "whats are the full context being sent to you in the request write it in a single file including the order inwhich you receive it from the system role and the user role"

## Complete Context Flow

1. **System Initialization**: All static context tags (<environment_info> through <outputFormatting>)
2. **Runtime Context**: Dynamic context tags (<context>, <editorContext>, <repoContext>, <reminderInstructions>)
3. **User Input**: <user_query> tag with the actual request

## Context Processing Order

The AI assistant processes context in this sequence:
1. Reads system instructions and rules
2. Understands workspace and environment
3. Reviews conversation history from summary
4. Applies tool usage guidelines
5. Considers current editor and repository state
6. Processes the user query
7. Generates response using appropriate tools if needed

## Key Context Categories

- **Static Context**: Instructions, tool definitions, formatting rules (set once)
- **Dynamic Context**: Environment, workspace, editor state (updates per request)
- **Historical Context**: Conversation summary (accumulates over session)
- **User Context**: Current query and immediate state (per interaction)

This structure ensures the AI has complete awareness of the environment, history, capabilities, and current user intent for each interaction.
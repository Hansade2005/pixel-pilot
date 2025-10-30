# Project Context Filtering System: Technical Documentation

## 1. Overview

This document outlines the intelligent filtering system designed to optimize the project context provided to the AI. The primary goal is to create a focused, relevant, and efficient context, especially for large codebases, by filtering the files sent to the AI based on a set of predefined rules. This system is implemented on both the client and server to ensure consistency and reduce unnecessary data transfer.

---

## 2. Core Logic and Activation

The filtering logic is conditional and is only activated when the total number of files in the project exceeds **100**.

- **If Project Files ≤ 100**: No filtering is applied. All files are included in the context.
- **If Project Files > 100**: The filtering and truncation rules described below are activated.

This conditional activation ensures that smaller projects benefit from a complete view of the codebase without any filtering overhead.

---

## 3. Filtering Rules (When Activated)

When a project has more than 100 files, the following rules are applied to select the most relevant files for the AI's context.

### 3.1. Directory-Based Inclusion

The system prioritizes files located within the following key directories:

- `app/`
- `components/`
- `hooks/`
- `lib/`
- `public/`

This rule is smart enough to handle different project structures, including standard Next.js/Vite projects and those that use a `src/` directory (e.g., it will correctly include files from `src/app/`, `src/components/`, etc.).

### 3.2. Global Exclusions

To reduce noise, files located in the following common directories are **always excluded**:

- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- `.next/`
- `__tests__/`

### 3.3. Root Directory File Handling

Files located in the project's root directory are handled with special care:

- **General Rule**: All non-markdown files are included.
- **Markdown (`.md`) Rule**: Most `.md` files are **excluded** to save space.
- **Markdown Exceptions**: The following specific markdown files are **always included** due to their critical importance for providing context to the AI:
    - `README.md`
    - `USER_AUTHENTICATION_README.md`
    - `STORAGE_SYSTEM_IMPLEMENTATION.md`
    - `EXTERNAL_APP_INTEGRATION_GUIDE.md`

---

## 4. File Limit and AI Notification

- **Hard Limit**: After applying the filtering rules, the final list of files is capped at a maximum of **100**.
- **Truncation Message**: If the file list is truncated, a notification is appended to the AI's system prompt. This message informs the AI that the context is partial and advises it to use file-system tools (`list_files`, `grep_search`, etc.) to explore the project further.

**Example Notification:**
```
--- 
**Note**: The file tree is truncated to 100 files from the original [Total File Count] due to a large codebase. 
The AI should use file system tools like `list_files`, `semantic_code_navigator`, or `grep_search` to discover and interact with other files as needed.
---
```

---

## 5. Example Scenarios

### Scenario A: Small Project
- **Total Files**: 85
- **Result**: The activation condition ( > 100 files) is not met. **No filtering is applied.** All 85 files are included in the context.

### Scenario B: Large Next.js Project with `src`
- **Total Files**: 560
- **Activation**: The > 100 files condition is met, so filtering is activated.
- **Example Filtered Output**:
    - `src/app/layout.tsx` (Included)
    - `src/components/ui/button.tsx` (Included)
    - `src/lib/utils.ts` (Included)
    - `src/__tests__/button.test.ts` (Excluded)
    - `node_modules/react/index.js` (Excluded)
    - `docs/guide.md` (Excluded, as it's not in a priority directory)
    - `README.md` (Included, due to exception)
    - `CONTRIBUTING.md` (Excluded, as it's a non-whitelisted root markdown file)

### Scenario C: Root File Filtering
- **Files in Root**: `package.json`, `README.md`, `DEVELOPMENT.md`, `next.config.mjs`
- **Result**:
    - `package.json` (Included)
    - `README.md` (Included - exception)
    - `DEVELOPMENT.md` (Excluded - `.md` file not in exception list)
    - `next.config.mjs` (Included)

---

## 6. Implementation Details

This filtering logic is implemented and synchronized in two key locations:

1.  **Backend**: `app/api/chat-v2/route.ts` within the `buildOptimizedProjectContext` function.
    - This ensures that even if the client sends an unfiltered list, the server enforces the rules to create a safe and efficient context for the AI.

2.  **Frontend**: `components/workspace/chat-panel-v2.tsx` within the `buildProjectFileTree` function.
    - This pre-filters the file list on the client-side before it is sent to the server. This is a crucial optimization that reduces the size of the request payload, saving bandwidth and improving request speed.

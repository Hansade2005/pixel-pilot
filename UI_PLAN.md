# Desktop IDE: UI/UX Plan

## 1. Overview

This document outlines the User Interface (UI) and User Experience (UX) plan for the desktop IDE application. The design will be heavily inspired by modern IDEs like Cursor and VS Code, prioritizing a clean, intuitive, and developer-focused interface.

**Design Goals:**
- **Modern & Clean:** Aesthetically pleasing with a dark-themed, minimalist design.
- **Intuitive:** A familiar layout that is easy for developers to navigate.
- **Efficient:** Workflows designed to minimize clicks and maximize productivity.

## 2. Layout & Key Components

The application will use a three-column layout with a main content area and two sidebars.

### 2.1. Main Layout (`MainLayout.tsx`)
- A top-level component that orchestrates the main sections of the UI.
- It will manage the visibility and state of the sidebars.

### 2.2. Left Icon Sidebar (`IconSidebar.tsx`)
- **Position:** Far left, vertical orientation.
- **Content:** A series of icons acting as primary navigation toggles.
  - **File Explorer Icon:** Toggles the visibility of the File Explorer panel.
  - **Preview Icon (Eye):** Opens the integrated preview in a new editor tab.
  - **Settings Icon (Cog):** Opens the application settings panel.

### 2.3. File Explorer Panel (`FileExplorerPanel.tsx`)
- **Position:** Left sidebar area, appears when toggled.
- **Content:** Integrates the existing `file-explorer` component.
- **Functionality:** Allows users to browse, open, create, and manage files stored in IndexedDB.

### 2.4. Main Content Area (Editor)
- **Position:** Center of the application.
- **Components:**
  - **`EditorTabs.tsx`:** A tab bar at the top of this area to manage open files. Each tab will show the file name and an icon to close it.
  - **`CodeEditorView.tsx`:** The main view for the code editor, integrating the extended `code-editor` component.
  - **`PreviewTab.tsx`:** A special tab view that integrates the `preview` component.

### 2.5. Right Chat Panel (`ChatPanel.tsx`)
- **Position:** Right sidebar area.
- **Content:** Integrates the `chat-panel-v2.tsx` component.
- **Functionality:** Provides the AI-powered chat interface. It will be collapsible.

### 2.6. Top Bar / Header
- **Position:** A slim bar at the very top of the window (or integrated with the tab bar).
- **Content:**
  - **AI Icon:** Positioned at the far top-right. Clicking this icon will toggle the visibility of the Right Chat Panel.

### 2.7. Settings Panel
- **Position:** A dedicated view or modal that overlays the main content.
- **Content:** Provides configurable options for the IDE, such as:
  - Editor preferences (font size, theme, keybindings).
  - AI model selection and API key configuration.
  - Authentication management.
  - General application settings.
- **Functionality:** Allows users to customize their IDE experience.

## 3. User Flow & Interactions

### 3.1. Application Startup
- **Flow 1: New/Unauthenticated User**
  1. App opens.
  2. The `WelcomeScreen.tsx` is displayed.
  3. User clicks "Sign In" or "Sign Up".
  4. The authentication flow is initiated.
  5. Upon successful authentication, the user is redirected to the main IDE workspace.
- **Flow 2: Authenticated User**
  1. App opens.
  2. A brief loading state is shown while the session is verified.
  3. The main IDE workspace is displayed directly, with the user's files and layout preserved from the last session.

### 3.2. Core IDE Workflow
- **Managing Files:**
  - User clicks the File Explorer icon in the Left Icon Sidebar.
  - The File Explorer panel slides into view.
  - User clicks a file; it opens in a new tab in the Main Content Area.
- **Using the Editor:**
  - User can type and edit code in the active tab.
  - User can switch between open files by clicking the corresponding tabs.
  - User can close a file by clicking the 'x' on its tab.
- **Using the Chat:**
  - User clicks the AI icon in the top-right corner to open the chat panel.
  - User interacts with the AI assistant.
  - User can close the panel by clicking the AI icon again.
- **Using the Preview:**
  - User clicks the Preview (eye) icon.
  - A new tab, labeled "Preview", opens in the Main Content Area, displaying the rendered output.

## 4. Visual Design & Theming

- **Color Palette:** A dark theme will be the default. We will use a palette similar to VS Code's default dark theme:
  - **Background:** Dark grays (`#1e1e1e`, `#252526`).
  - **Text:** Off-white and light grays.
  - **Accent/Highlight:** A primary blue (`#007acc`) for selections, active states, and links.
- **Typography:**
  - **UI Elements:** A clean sans-serif font like Inter or Segoe UI.
  - **Code Editor:** A popular monospaced font like Fira Code or Cascadia Code.
- **Icons:** A consistent, modern icon set (e.g., from a library like Lucide Icons or similar).
- **Styling:** Tailwind CSS will be used for utility-first styling to ensure consistency and rapid development.

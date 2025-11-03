# PC-Specific Pages Remote URLs

This document lists all the remote URLs for PC-specific pages in the PiPilot application that can be loaded in Electron WebView.

**Base URL:** `https://pipilot.dev`

## PC Authentication Pages (`/pc-auth/*`)

| Route | Full URL | Description |
|-------|----------|-------------|
| `/pc-auth/check-email` | https://pipilot.dev/pc-auth/check-email | Email verification page |
| `/pc-auth/login` | https://pipilot.dev/pc-auth/login | PC login page |
| `/pc-auth/oauth-redirect` | https://pipilot.dev/pc-auth/oauth-redirect | OAuth redirect handler |
| `/pc-auth/signup` | https://pipilot.dev/pc-auth/signup | PC signup page |

## PC Home Page (`/pc-home`)

| Route | Full URL | Description |
|-------|----------|-------------|
| `/pc-home` | https://pipilot.dev/pc-home | PC home/dashboard page |

## PC Workspace Pages (`/pc-workspace/*`)

| Route | Full URL | Description |
|-------|----------|-------------|
| `/pc-workspace` | https://pipilot.dev/pc-workspace | Main PC workspace page |
| `/pc-workspace/account` | https://pipilot.dev/pc-workspace/account | Account management page |
| `/pc-workspace/deployment` | https://pipilot.dev/pc-workspace/deployment | Deployment management page |
| `/pc-workspace/management` | https://pipilot.dev/pc-workspace/management | Workspace management page |
| `/pc-workspace/migration` | https://pipilot.dev/pc-workspace/migration | Migration tools page |
| `/pc-workspace/projects/[slug]` | https://pipilot.dev/pc-workspace/projects/[slug] | Project details page (dynamic slug) |
| `/pc-workspace/teams` | https://pipilot.dev/pc-workspace/teams | Teams management page |
| `/pc-workspace/[id]/database` | https://pipilot.dev/pc-workspace/[id]/database | Database management page (dynamic ID) |
| `/pc-workspace/[id]/database/sql` | https://pipilot.dev/pc-workspace/[id]/database/sql | SQL query interface (dynamic ID) |
| `/pc-workspace/[id]/database/tables/[tableId]` | https://pipilot.dev/pc-workspace/[id]/database/tables/[tableId] | Table management page (dynamic IDs) |

## Usage in Electron WebView

To load these pages in your Electron application, use the WebView component with the full URLs:

```javascript
// Example: Load PC Home page
const webview = document.createElement('webview');
webview.src = 'https://pipilot.dev/pc-home';
webview.style.width = '100%';
webview.style.height = '100%';
document.body.appendChild(webview);
```

## Notes

- Routes with `[slug]`, `[id]`, or `[tableId]` are dynamic routes that require actual values to be substituted
- All PC-specific pages are prefixed with `pc-` in the file system
- These pages are designed specifically for desktop/Electron usage
- Ensure proper authentication and session handling when loading these URLs
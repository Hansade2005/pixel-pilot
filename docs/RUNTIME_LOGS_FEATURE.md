# Runtime Logs Feature Documentation

## Overview
Added runtime logs viewing capability to the Vercel Deployment Manager, allowing users to view real-time logs from deployed applications including edge functions, serverless functions, and HTTP requests.

## Implementation Details

### 1. API Route
**File**: `app/api/vercel/projects/[projectId]/deployments/[deploymentId]/runtime-logs/route.ts`

**Endpoint**: `GET /api/vercel/projects/[projectId]/deployments/[deploymentId]/runtime-logs`

**Vercel API**: `GET https://api.vercel.com/v1/projects/{projectId}/deployments/{deploymentId}/runtime-logs`

**Features**:
- Validates projectId and deploymentId (prevents undefined values)
- Fetches streaming JSON response from Vercel
- Parses line-delimited JSON format
- Returns structured log array with formatted data

**Response Format**:
```typescript
{
  logs: Array<{
    level: 'error' | 'warning' | 'info';
    message: string;
    source: 'edge-function' | 'serverless' | 'request';
    timestamp: number;
    domain?: string;
    requestMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    requestPath?: string;
    responseStatusCode?: number;
    proxy?: object;
    entrypoint?: string;
  }>;
  count: number;
  timestamp: number;
}
```

### 2. UI Component
**File**: `components/vercel-deployment-manager.tsx`

**Changes**:
1. Added `runtimeLogs` state array
2. Added `loadingRuntimeLogs` state boolean
3. Added `getProjectId()` helper function
4. Created `loadRuntimeLogs()` async function
5. Added third tab "Runtime Logs" with Activity icon
6. Implemented color-coded log display

**Tab Features**:
- **Load on demand**: Runtime logs only load when tab is clicked
- **Refresh button**: Manual refresh with loading spinner
- **Color-coded levels**:
  - Error: Red background with red border
  - Warning: Yellow background with yellow border
  - Info: Blue background with blue border
- **HTTP request details**:
  - Method badge (GET, POST, etc.)
  - Request path
  - Response status code with color coding:
    - 2xx: Green (success)
    - 4xx: Yellow (client error)
    - 5xx: Red (server error)
- **Source badges**: Shows origin (edge-function, serverless, request)
- **Timestamp**: Formatted local time

### 3. User Experience

#### Accessing Runtime Logs
1. Navigate to Deployments tab
2. Click "View Details" on any deployment
3. Click "Runtime Logs" tab
4. Logs load automatically (or click Refresh if needed)

#### Log Information Displayed
- **Level badge**: ERROR, WARNING, or INFO
- **Source badge**: Where the log originated (edge-function, serverless, request)
- **Timestamp**: When the log was created
- **HTTP details**: Method, path, and status code (when applicable)
- **Domain**: The domain that served the request
- **Message**: Full log message or JSON payload

#### Visual Design
- Dark theme (slate-950 background)
- Border and color-coded backgrounds for easy scanning
- Monospace font for technical readability
- Scrollable area for long log lists
- Empty state message when no logs available

## Use Cases

### 1. Debugging Production Errors
View runtime errors from deployed edge and serverless functions:
```
ERROR | edge-function | 500
POST /api/users
TypeError: Cannot read property 'id' of undefined
```

### 2. Monitoring HTTP Requests
Track all incoming requests and their responses:
```
INFO | request | 200
GET /api/products
Served from: myapp.vercel.app
```

### 3. Performance Analysis
Identify slow requests or failing endpoints:
```
WARNING | serverless | 503
GET /api/analytics
Timeout exceeded after 10s
```

### 4. API Debugging
View API calls made during server-side rendering:
```
INFO | serverless | 200
GET /api/data
External API call: https://api.example.com/data
```

## Differences from Build Logs

| Feature | Build Logs | Runtime Logs |
|---------|-----------|--------------|
| **When** | During deployment build | After deployment is live |
| **Content** | Compilation, bundling, tests | HTTP requests, function execution |
| **Format** | Terminal output (text) | Structured JSON with metadata |
| **Purpose** | Debug build failures | Debug production issues |
| **Refresh** | Static (logs don't change) | Dynamic (new logs appear) |

## API Compliance

### Vercel API v1 Runtime Logs
**Documentation**: https://vercel.com/docs/rest-api/endpoints/deployments#get-runtime-logs

**Required Headers**:
- `Authorization: Bearer {token}`
- `Accept: application/stream+json`

**Query Parameters**:
- `limit`: Maximum number of logs (default: 100, max: 1000)
- `since`: Timestamp to fetch logs after
- `until`: Timestamp to fetch logs before
- `direction`: 'forward' or 'backward'

**Response Format**: Line-delimited JSON (stream+json)

## Error Handling

### Client-Side Errors
1. **Missing Project ID**: Shows error message in log display
2. **Network failure**: Displays "Error loading runtime logs"
3. **Empty response**: Shows "No runtime logs available"

### API Errors
1. **401 Unauthorized**: Invalid or expired token
2. **403 Forbidden**: Insufficient permissions
3. **404 Not Found**: Deployment or project doesn't exist
4. **500 Server Error**: Vercel API issue

All errors display user-friendly messages in the UI with retry option.

## Performance Considerations

### Lazy Loading
- Runtime logs only fetch when user clicks the Runtime Logs tab
- Prevents unnecessary API calls for users viewing build logs or details

### Pagination (Future Enhancement)
- Current implementation fetches all available logs
- Future: Add "Load More" button for deployments with 1000+ logs
- Use `since` parameter for incremental loading

### Caching
- Logs are cached in component state during dialog session
- Refresh button allows manual cache invalidation
- Logs are not persisted in IndexedDB (they change frequently)

## Testing Checklist

- [ ] Click Runtime Logs tab on recently deployed app
- [ ] Verify logs load and display correctly
- [ ] Check color coding for error/warning/info levels
- [ ] Verify HTTP request details show method, path, status code
- [ ] Test refresh button updates logs
- [ ] Verify error handling for missing project ID
- [ ] Test with deployment that has no runtime logs
- [ ] Check loading spinner appears during fetch
- [ ] Verify timestamps display in local time
- [ ] Test scroll behavior with 100+ logs

## Future Enhancements

1. **Real-time streaming**: WebSocket connection for live log updates
2. **Filtering**: Filter by level, source, status code, or keyword
3. **Export**: Download logs as JSON or text file
4. **Time range picker**: Select custom date/time ranges
5. **Log aggregation**: Group similar logs and show count
6. **Search**: Full-text search across log messages
7. **Bookmarking**: Save important log entries for later review
8. **Alerts**: Configure notifications for specific log patterns

## Related Files

### API Routes
- `app/api/vercel/deployments/[deploymentId]/logs/route.ts` - Build logs
- `app/api/vercel/deployments/[deploymentId]/status/route.ts` - Deployment status
- `app/api/vercel/projects/[projectId]/deployments/[deploymentId]/runtime-logs/route.ts` - Runtime logs

### Components
- `components/vercel-deployment-manager.tsx` - Main deployment manager with tabs
- `components/ui/tabs.tsx` - Tab component
- `components/ui/scroll-area.tsx` - Scrollable log container
- `components/ui/badge.tsx` - Level and source badges

### Storage
- `lib/storage-manager.ts` - IndexedDB wrapper (deployments stored here)

## Support

For issues or questions:
1. Check Vercel API status: https://www.vercel-status.com/
2. Verify token has correct permissions
3. Ensure deployment ID is valid (not 'undefined')
4. Check browser console for detailed error messages

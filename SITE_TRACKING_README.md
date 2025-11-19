# 🚀 PiPilot Site Tracking & Analytics System

## Overview

Your PiPilot platform now includes comprehensive site tracking and analytics! Every hosted site automatically tracks:

- **Creator Information**: Who created the site and when
- **Domain Management**: Automatic unique slug generation
- **View Analytics**: Real-time view counting and detailed analytics
- **SEO Optimization**: Enhanced metadata for better discoverability

## 🗄️ Database Schema

### Sites Table
```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_slug VARCHAR(255) UNIQUE NOT NULL,
  original_slug VARCHAR(255), -- If AI-generated a different slug
  auth_user_id VARCHAR(255) NOT NULL,
  auth_username VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_views BIGINT DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);
```

### Site Views Table (Optional Advanced Analytics)
```sql
CREATE TABLE site_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT,
  ip_hash VARCHAR(64), -- Anonymized
  country VARCHAR(2),
  device_type VARCHAR(20) -- mobile, desktop, tablet
);
```

## 🔧 API Integration

### Frontend Request Format

When creating a preview, your frontend must now include auth information:

```javascript
const response = await fetch('/api/preview', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    projectId: 'my-project-123',
    projectSlug: 'my-awesome-app', // Desired slug
    files: [...], // Your project files
    authUserId: 'user-uuid-from-supabase-auth', // REQUIRED
    authUsername: 'johndoe' // REQUIRED
  })
});

const result = await response.json();
// Returns: { url: 'https://final-slug.pipilot.dev/', finalSlug: 'final-slug', originalSlug: 'my-awesome-app' }
```

### Response Format

```json
{
  "sandboxId": "sandbox-123",
  "url": "https://final-slug.pipilot.dev/",
  "finalSlug": "final-slug",
  "originalSlug": "my-awesome-app", // null if slug was available
  "hosted": true
}
```

## 🎯 Domain Availability System

### How It Works

1. **Check Availability**: System checks if `projectSlug` exists in sites table
2. **AI Generation**: If taken, uses Codestral AI to generate unique creative names
3. **Fallback**: If AI fails, uses timestamp-based fallback
4. **Storage**: Records both original and final slug for tracking

### AI-Powered Name Examples

| Original | AI Generated |
|----------|--------------|
| `taskmanager` | `quantum-task-forge` |
| `blog` | `narrative-weave-hub` |
| `portfolio` | `creative-canvas-space` |
| `ecommerce` | `marketplace-galaxy` |

## 📊 Analytics & Tracking

### Automatic View Tracking

- **HTML Page Loads**: Every time someone visits any page on your hosted sites
- **SPA Navigation**: Tracks when users navigate between routes
- **Real-time Updates**: View counts update immediately
- **Performance**: Non-blocking async tracking

### View Data Collected

- **Total Views**: Running count per site
- **Last Viewed**: Timestamp of most recent visit
- **Device Types**: Mobile, desktop, tablet detection
- **User Agents**: Browser and device information
- **Referrers**: Where visitors came from
- **Geographic**: Country-level analytics (anonymized)

## 🔒 Security & Privacy

### Data Protection

- **IP Anonymization**: IPs are hashed, not stored in plain text
- **User Agent Storage**: Only for analytics, not tracking
- **No Personal Data**: Only project slugs and anonymous analytics
- **Service Role Access**: Only your backend can modify tracking data

### RLS Policies

```sql
-- Sites table
CREATE POLICY "Service role can do anything" ON sites FOR ALL USING (auth.role() = 'service_role');

-- Views table
CREATE POLICY "Public can insert views" ON site_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON site_views FOR ALL USING (auth.role() = 'service_role');
```

## 🚀 Deployment

### 1. Run Database Schema

Execute the SQL in `supabase/site-tracking-schema.sql` in your hosting Supabase project:

```bash
# In Supabase SQL Editor
# Copy and paste the schema from site-tracking-schema.sql
```

### 2. Environment Variables

Ensure your hosting Supabase credentials are set:

```env
# These should already be in your .env.local
EXTERNAL_SUPABASE_URL=https://your-hosting-project.supabase.co
EXTERNAL_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Deploy & Test

```bash
vercel --prod
```

Test with a preview request including auth data.

## 📈 Analytics Dashboard (Future)

You can build a dashboard to view:

```sql
-- Total sites created
SELECT COUNT(*) as total_sites FROM sites;

-- Most viewed sites
SELECT project_slug, total_views, auth_username
FROM sites
ORDER BY total_views DESC
LIMIT 10;

-- Recent activity
SELECT project_slug, total_views, last_viewed_at, auth_username
FROM sites
WHERE last_viewed_at > NOW() - INTERVAL '24 hours'
ORDER BY last_viewed_at DESC;
```

## 🔧 API Endpoints

### Get Site Analytics (Future Enhancement)

```typescript
// GET /api/sites/[slug]/analytics
{
  "project_slug": "my-site",
  "total_views": 1250,
  "created_by": "johndoe",
  "created_at": "2025-01-19T10:30:00Z",
  "last_viewed": "2025-01-19T15:45:00Z",
  "device_breakdown": {
    "desktop": 60,
    "mobile": 35,
    "tablet": 5
  }
}
```

## 🎯 Benefits

### For Users
- ✅ **Instant Hosting**: Sites go live immediately
- ✅ **Unique URLs**: No conflicts, AI-generated names
- ✅ **SEO Ready**: Proper metadata and social sharing
- ✅ **Analytics**: View tracking and insights

### For Platform
- ✅ **User Attribution**: Know who created what
- ✅ **Domain Management**: Automatic conflict resolution
- ✅ **Analytics**: Understand usage patterns
- ✅ **Monetization**: Track engagement metrics

## 🐛 Troubleshooting

### Issue: "Auth information required"
**Solution**: Frontend must include `authUserId` and `authUsername` in POST request.

### Issue: Sites not tracking views
**Solution**: Check that hosting Supabase has the correct RLS policies and tables.

### Issue: AI name generation failing
**Solution**: System falls back to timestamp-based names automatically.

### Issue: High latency on first load
**Solution**: View tracking is async and non-blocking - won't affect site performance.

## ✅ Frontend Integration Complete

The `CodePreviewPanel` component has been updated to automatically include authentication information when creating previews:

### What Was Changed

1. **Added Supabase Client Import**: Imported `createClient` from `@/lib/supabase/client`
2. **User Authentication Check**: Added user authentication verification before creating previews
3. **Auth Data Extraction**: Extracts `authUserId` (Supabase user ID) and `authUsername` (display name or email prefix)
4. **Metadata Inclusion**: Auth information is now included in the compressed metadata sent to `/api/preview`

### Code Changes

```typescript
// Get current user for auth information
const supabase = createClient()
const { data: { user }, error: userError } = await supabase.auth.getUser()

if (userError || !user) {
  throw new Error('Authentication required. Please sign in to create previews.')
}

const authUserId = user.id
const authUsername = user.user_metadata?.full_name || user.email?.split('@')[0] || 'anonymous'

// Include auth info in compression metadata
const compressedData = await compressProjectFiles(filteredFiles, [], [], { 
  project,
  authUserId,
  authUsername
})
```

### Authentication Requirements

- **User must be signed in** to create previews
- **Automatic auth data extraction** from Supabase session
- **Fallback username** if full name not available
- **Error handling** for unauthenticated users

Now when users create previews, the system automatically includes their authentication information for proper user attribution and analytics tracking!</content>
<parameter name="filePath">c:\Users\DELL\Downloads\ai-app-builder\SITE_TRACKING_README.md
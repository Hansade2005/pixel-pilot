# Website Redesign Feature - API Testing

## Overview
This feature allows users to input a website URL, and AI will scrape the website content and redesign its UI.

## Files Created

### 1. API Route: `/app/api/redesign/route.ts`
- **Endpoint**: `PUT /api/redesign`
- **Purpose**: Fetches website content using Jina AI's reader API
- **Input**: `{ url: string }`
- **Output**: `{ ok: boolean, markdown: string }`

### 2. Test Page: `/app/test-redesign/page.tsx`
- **URL**: `http://localhost:3000/test-redesign`
- **Purpose**: Interactive test interface to try the API
- **Features**:
  - Input field for URL
  - Test button
  - Display markdown output
  - Show raw JSON response
  - Error handling

## How to Test

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Navigate to Test Page
Open your browser and go to:
```
http://localhost:3000/test-redesign
```

### Step 3: Test with Example URL
1. The test page pre-fills with `https://example.com`
2. Click "Test API" button
3. Watch the console for logs
4. See the markdown output in the UI

### Step 4: Try Different URLs
Test with various websites:
- `https://example.com` - Simple test page
- `https://github.com` - Complex modern site
- `https://tailwindcss.com` - Documentation site
- `https://stripe.com` - Marketing site

## Expected Output

The Jina AI Reader API (`r.jina.ai`) returns:
- **Markdown format** of the webpage content
- Includes: headings, paragraphs, links, images
- Structured and clean text representation
- Ready for AI to analyze and redesign

### Example Output Structure
```markdown
Title: Example Domain

This domain is for use in illustrative examples...

[More information...](https://www.iana.org/domains/example)
```

## What We'll Learn

From testing, we'll see:
1. **Content Quality**: How well Jina AI extracts content
2. **Structure**: Whether it preserves layout hierarchy
3. **Image Handling**: How images/media are represented
4. **Link Preservation**: Whether URLs are maintained
5. **Performance**: Response time for different sites

## Next Steps

After testing, we'll:
1. **Analyze Output**: See what data AI can work with
2. **Design Prompt**: Create AI prompt to redesign based on markdown
3. **Build UI**: Create user interface for redesign feature
4. **Integrate**: Add to chat-panel as a tool/action
5. **Generate Code**: AI generates new React components

## API Details

### Jina AI Reader
- **Endpoint**: `https://r.jina.ai/{url}`
- **Method**: GET (we use GET, not POST)
- **Returns**: Clean markdown of webpage
- **Free tier**: Available for testing
- **Docs**: https://jina.ai/reader/

### Our Wrapper
- **Method**: PUT (to match your code style)
- **Input**: JSON with `url` field
- **Output**: JSON with `ok` and `markdown` fields
- **Error handling**: Returns error messages on failure

## Testing Checklist

- [ ] Test with simple page (example.com)
- [ ] Test with complex page (github.com)
- [ ] Test with invalid URL
- [ ] Test with non-existent domain
- [ ] Check markdown quality
- [ ] Verify image descriptions included
- [ ] Check link preservation
- [ ] Measure response time
- [ ] Test with different page types (blog, docs, landing)

## Console Logs to Watch

```javascript
🧪 Testing redesign API with URL: https://example.com
📦 API Response: { ok: true, markdown: "..." }
```

Or if error:
```javascript
❌ Error: Failed to fetch redesign
```

## Troubleshooting

### If API fails:
1. Check internet connection
2. Verify URL is valid and accessible
3. Check if Jina AI service is up
4. Look at Network tab in DevTools

### If markdown is empty:
1. Some sites block scrapers
2. Try different URL
3. Check response status code

## Future Enhancements

After initial testing:
1. Add authentication for Jina AI (if needed for production)
2. Cache results to avoid repeated requests
3. Add rate limiting
4. Parse markdown for better structure
5. Extract colors/themes from original site
6. Capture screenshots for visual reference
7. Add loading states with progress
8. Implement streaming for large pages

---

**Ready to test?** Go to `http://localhost:3000/test-redesign` and click "Test API"! 🚀

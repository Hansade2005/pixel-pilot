# 🧪 URL Attachment Feature - Testing Guide

## Quick Start Testing

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Test Homepage URL Attachment

1. **Go to homepage**: `http://localhost:3000`
2. **Enter a prompt**: "Clone this website"
3. **Paste URL in URL field**: `https://bbc.com`
4. **Click "Start Building"** or hit Enter
5. **Watch the workspace**:
   - ✅ Should navigate to workspace
   - ✅ Should auto-send message
   - ✅ Should include BBC markdown in message
   - ✅ Console should show: "🌐 Fetching URL content from Jina AI"

### Step 3: Test In-Workspace URL Attachment

1. **In workspace**, click the attachment button (📎)
2. **Click "Attach URL"** option
3. **Enter URL**: `https://github.com`
4. **Click "Attach URL"** button
5. **Verify**:
   - ✅ URL chip appears below input
   - ✅ Shows: `🔗 https://github.com [×]`
6. **Type prompt**: "Create a similar layout"
7. **Click Send**
8. **Check**:
   - ✅ Message includes GitHub markdown
   - ✅ URL chip disappears after send
   - ✅ Console shows fetch logs

---

## Test Cases

### ✅ Test 1: Valid URL (Homepage)
**Input**: `https://bbc.com`  
**Expected**: Auto-fetches BBC markdown, auto-sends with content  
**Result**: 

---

### ✅ Test 2: Valid URL (Workspace)
**Input**: `https://github.com`  
**Expected**: Shows chip, fetches on send, includes in message  
**Result**: 

---

### ✅ Test 3: Invalid URL
**Input**: `not-a-valid-url`  
**Expected**: Shows error toast "Please enter a valid URL..."  
**Result**: 

---

### ✅ Test 4: Empty URL
**Input**: Leave blank, click Attach  
**Expected**: Dialog stays open, nothing happens  
**Result**: 

---

### ✅ Test 5: Multiple URLs
**Input**: 
- `https://bbc.com`
- `https://github.com`

**Expected**: Both chips show, both fetched, both in message  
**Result**: 

---

### ✅ Test 6: Remove Attached URL
**Input**: Attach URL, click × button  
**Expected**: URL chip disappears  
**Result**: 

---

### ✅ Test 7: Large Website
**Input**: `https://bbc.com` (20,000+ characters)  
**Expected**: Fetches successfully, may take 2-3 seconds  
**Result**: 

---

### ✅ Test 8: Simple Website
**Input**: `https://example.com`  
**Expected**: Fetches quickly (~500ms)  
**Result**: 

---

## Console Logs to Watch

### ✅ Success Logs:
```
🌐 Fetching URL content from Jina AI: https://bbc.com
✅ Jina AI response received: { contentLength: 20581, preview: "Title: BBC Home..." }
```

### ❌ Error Logs:
```
❌ Error fetching URL: [error details]
Failed to fetch URL: https://invalid-site.com
```

---

## API Testing (Direct)

### Test the API endpoint directly:
```javascript
// Open browser console on any page
fetch('http://localhost:3000/api/redesign', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://bbc.com' })
})
.then(r => r.json())
.then(data => {
  console.log('Success:', data.ok)
  console.log('Markdown length:', data.markdown.length)
  console.log('Preview:', data.markdown.substring(0, 200))
})
```

**Expected Response**:
```json
{
  "ok": true,
  "markdown": "Title: BBC Home - Breaking News...\n\n[full markdown content]"
}
```

---

## Network Tab Verification

### Check fetch request in DevTools:

1. **Open DevTools** → Network tab
2. **Filter**: XHR/Fetch
3. **Send message with URL**
4. **Check request**:
   - **URL**: `/api/redesign`
   - **Method**: PUT
   - **Payload**: `{ "url": "https://bbc.com" }`
   - **Status**: 200
   - **Response**: `{ "ok": true, "markdown": "..." }`

---

## UI Verification Checklist

### Homepage (chat-input.tsx):
- [ ] URL input field visible
- [ ] Placeholder text: "🔗 Attach website URL (optional)"
- [ ] Input accepts URLs
- [ ] URL clears after project creation

### Workspace Attachment Menu:
- [ ] 📎 button shows count "(1)" when URL attached
- [ ] Dropdown shows "Attach URL" option with 🔗 icon
- [ ] Menu closes after selecting URL option

### URL Dialog:
- [ ] Dialog opens when "Attach URL" clicked
- [ ] Input field has placeholder
- [ ] Cancel button closes dialog
- [ ] Attach button validates and attaches URL
- [ ] Dialog closes after successful attachment

### Attached URL Display:
- [ ] URL chips appear below input
- [ ] Shows 🔗 icon and full URL
- [ ] × button removes URL
- [ ] Multiple URLs stack vertically

### Send Behavior:
- [ ] Sends message with URL markdown
- [ ] Clears attached URLs after send
- [ ] Shows loading state during fetch
- [ ] Error toast on failure

---

## Performance Testing

### Timing Tests:
```javascript
// Time the fetch
console.time('fetch-bbc')
fetch('/api/redesign', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://bbc.com' })
})
.then(r => r.json())
.then(() => console.timeEnd('fetch-bbc'))

// Expected: 1000-3000ms
```

---

## Error Scenario Testing

### Test 1: Network Offline
1. Disable internet
2. Try to attach URL
3. **Expected**: Error toast, message sends without URL

### Test 2: Invalid Domain
1. Enter: `https://this-domain-does-not-exist-12345.com`
2. **Expected**: API returns 500 error, user sees error toast

### Test 3: Slow Connection
1. Throttle network in DevTools (Slow 3G)
2. Attach URL
3. **Expected**: Takes longer, still works

### Test 4: Very Large Site
1. Enter: `https://wikipedia.org`
2. **Expected**: May take 5-10 seconds, should eventually work

---

## Success Criteria

### ✅ Feature is successful if:

1. **Homepage Flow**:
   - ✅ URL input visible
   - ✅ URL accepted
   - ✅ Project created with URL param
   - ✅ Auto-fetch works
   - ✅ Auto-send includes markdown

2. **Workspace Flow**:
   - ✅ Attachment button works
   - ✅ URL dialog opens/closes
   - ✅ URL validation works
   - ✅ URL chips display
   - ✅ Remove URL works
   - ✅ Send fetches and includes markdown
   - ✅ URLs cleared after send

3. **API**:
   - ✅ POST method works
   - ✅ Returns markdown text
   - ✅ Handles BBC (markdown format)
   - ✅ Handles example.com (JSON format)
   - ✅ Error handling works

4. **UX**:
   - ✅ No TypeScript errors
   - ✅ No console errors (except network fails)
   - ✅ Smooth interactions
   - ✅ Clear error messages
   - ✅ Loading states visible

---

## Regression Testing

### Check these still work:

- [ ] **Image attachments**: Still work as before
- [ ] **File attachments**: Still work as before
- [ ] **Regular messages**: Send without attachments
- [ ] **Project creation**: Without URL attachment
- [ ] **Auto-send**: Without URL (from template)

---

## Bug Reporting Format

If you find issues, report like this:

```
**Bug**: URL not attaching from homepage

**Steps to Reproduce**:
1. Go to homepage
2. Enter URL: https://bbc.com
3. Enter prompt: "Clone this"
4. Click Start Building

**Expected**: Auto-send with BBC markdown
**Actual**: Auto-send without URL content

**Console Errors**: [paste errors]
**Network Tab**: [screenshot]
```

---

## Final Checklist Before Marking Complete

- [ ] Homepage URL input works
- [ ] Workspace URL attachment works
- [ ] API returns markdown correctly
- [ ] BBC.com tested ✅
- [ ] GitHub.com tested
- [ ] Example.com tested
- [ ] Invalid URL shows error
- [ ] Multiple URLs work
- [ ] Remove URL works
- [ ] Auto-send includes URL
- [ ] Manual send includes URL
- [ ] URLs clear after send
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Loading states work
- [ ] Error toasts work
- [ ] Regression tests pass

---

## Next Steps After Testing

1. **If all tests pass**: Mark feature as complete ✅
2. **If bugs found**: Document and fix
3. **User feedback**: Gather from real usage
4. **Performance optimization**: If fetches are slow
5. **Feature enhancements**: 
   - Preview fetched content before send
   - Cache fetched URLs
   - Show fetch progress
   - Add URL metadata (title, favicon)

---

**Ready to test!** 🚀 Start dev server and go through each test case.

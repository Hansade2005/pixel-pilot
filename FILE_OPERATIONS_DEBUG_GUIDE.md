# 🔍 File Operations Sync - Debugging Quick Reference

## Quick Diagnosis Checklist

### ✅ Everything Working
```
Backend logs:
  ✅ Collected file operation for frontend: write_file - path/to/file
  📤 Sending metadata to frontend: { fileOperationsCount: X }
  ✅ Metadata sent successfully

Frontend logs:
  🎯 Received metadata from server: { fileOperationsCount: X }
  ✅ Stored file operations for application: X
  🔄 Applying all file operations from server
  ✅ Applied X/X file operations to IndexedDB
  🔄 Triggering file explorer refresh

User sees:
  ✅ Success toast: "Successfully applied X file operation(s)"
  ✅ Files immediately visible in explorer
```

---

## 🚨 Common Issues & Solutions

### Issue 1: No Files Appearing in Explorer

**Symptoms:**
```
✅ Backend logs show operations applied
❌ Frontend shows: fileOperationsCount: 0
```

**Diagnosis:** Metadata not reaching frontend

**Check:**
1. Look for: `📤 Sending metadata to frontend`
2. Look for: `🎯 Received metadata from server`
3. If missing, check network tab for aborted requests

**Solution:**
- Ensure stream completes (check for errors)
- Check browser console for network errors
- Verify no request abortion/cancellation

---

### Issue 2: Only Read Operations Being Skipped

**Symptoms:**
```
Backend: ⏭️ Skipped read-only operation: read_file - src/App.tsx
Frontend: No warning
```

**Diagnosis:** ✅ **This is CORRECT behavior!**

**Explanation:** Read operations don't need client-side sync. Only writes should appear in fileOperations.

---

### Issue 3: File Operations in Logs But Not Applied

**Symptoms:**
```
Frontend:
  ✅ fileOperationsCount: 2
  ❌ Applied 0/2 file operations
```

**Diagnosis:** IndexedDB application failing

**Check:**
1. Look for error after "Applying file operation X/Y"
2. Check IndexedDB quota in DevTools
3. Verify project ID is correct

**Solution:**
```javascript
// Check IndexedDB quota
navigator.storage.estimate().then(({usage, quota}) => {
  console.log(`Using ${usage} bytes out of ${quota} bytes (${(usage/quota*100).toFixed(2)}%)`)
})
```

---

### Issue 4: Warning Toast "Some file changes may not have been applied"

**Symptoms:**
```
Frontend:
  ⚠️ WARNING: Tool invocations included file operations but no file operations were received in metadata!
  Toast: "Some file changes may not have been applied"
```

**Diagnosis:** Backend filtered out operations incorrectly OR metadata send failed

**Check:**
1. Backend: Look for file operation collection logs
2. Backend: Verify `isWriteOperation` check is correct
3. Backend: Check if metadata send failed (look for ❌)

**Solution:**
- If backend shows operations collected but not sent → metadata send issue
- If backend doesn't show collection → filtering issue
- Check tool names match: `['write_file', 'edit_file', 'delete_file', 'add_package', 'remove_package']`

---

## 🔬 Debug Commands

### Check If Metadata Was Sent (Backend)
```bash
# In server logs, search for:
grep "Sending metadata to frontend" logs.txt
grep "Metadata sent successfully" logs.txt
```

### Check If Metadata Was Received (Frontend)
```javascript
// In browser console, check for:
"Received metadata from server"
"Stored file operations for application"
```

### Verify File Operations Filter (Backend)
```javascript
// Add this temporarily in route.ts after line 1470:
console.log('[DEBUG-FILTER]', {
  toolName: toolResult.toolName,
  isWriteOperation,
  hasPath: !!toolResultData?.path,
  hasContent: !!toolResultData?.content,
  willInclude: isWriteOperation && toolResultData?.path
})
```

### Check Stream Completion (Frontend)
```javascript
// In browser console after stream ends:
"📊 Stream complete. Final state:"
// Should show toolInvocationsCount and fileOperationsCount
```

---

## 📊 Expected Log Patterns

### Successful File Creation Flow

**Backend:**
```
[DEBUG] Collected tool call: write_file
[DEBUG] ✅ Collected file operation for frontend: write_file - src/NewFile.tsx
[DEBUG] Finished fullStream processing. Total parts: 5, Tool calls: 1, File operations: 1
[DEBUG] 📤 Sending metadata to frontend: { fileOperationsCount: 1, ... }
[DEBUG] ✅ Metadata sent successfully to frontend
[DEBUG] Updated existing file in server storage: src/NewFile.tsx
```

**Frontend:**
```
[ChatPanelV2][DataStream] 🎯 Received metadata from server: { fileOperationsCount: 1, ... }
[ChatPanelV2][DataStream] ✅ Stored file operations for application: 1
[ChatPanelV2][DataStream]   1. write_file: src/NewFile.tsx
[ChatPanelV2][DataStream] 📊 Stream complete. Final state: { fileOperationsCount: 1 }
[ChatPanelV2][DataStream] 🔄 Applying all file operations from server at end of stream: 1 operations
[ChatPanelV2][DataStream] 📝 Applying file operation 1/1: write_file src/NewFile.tsx
[ChatPanelV2][DataStream] ✅ Updated existing file: src/NewFile.tsx
[ChatPanelV2][DataStream] ✅ Applied 1/1 file operations to IndexedDB
[ChatPanelV2][DataStream] 🔄 Triggering file explorer refresh...
```

---

## 🎯 Verification Checklist

After deployment, verify:

- [ ] **Write Operations Sync**
  - Create new file → appears in explorer
  - Edit existing file → changes reflected immediately
  - Delete file → removed from explorer

- [ ] **Read Operations Don't Sync**
  - Backend logs show: ⏭️ Skipped read-only operation
  - Frontend doesn't receive read operations
  - No unnecessary network traffic

- [ ] **Error Handling**
  - Network interruption → warning toast appears
  - IndexedDB full → error message shown
  - Invalid operation → skipped with log

- [ ] **User Feedback**
  - Success toast shows operation count
  - File explorer auto-refreshes
  - No silent failures

---

## 🛠️ Emergency Rollback

If issues persist after this fix:

1. **Revert file operations filtering:**
```typescript
// In route.ts line 1466, remove isWriteOperation check temporarily:
if (toolResultData && toolResultData.success !== false && toolResultData.path) {
  fileOperations.push({ ... })
}
```

2. **Force metadata send:**
```typescript
// Ensure metadata always sends (already implemented)
// But you can add extra logging to verify
```

3. **Client-side manual refresh:**
```typescript
// Add button in UI to manually trigger file tree refresh
window.dispatchEvent(new CustomEvent('files-changed', {
  detail: { projectId: project.id, forceRefresh: true }
}))
```

---

## 📞 Support Resources

- **Documentation:** `FILE_OPERATIONS_SYNC_FIX.md`
- **Modified Files:**
  - `app/api/chat-v2/route.ts` (Backend streaming)
  - `components/workspace/chat-panel-v2.tsx` (Frontend handling)
- **Test Cases:** Coming in next update

---

**Quick Links:**
- [AI SDK v5 Docs](https://sdk.vercel.ai/docs)
- [Stream Protocol Spec](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)
- [IndexedDB Troubleshooting](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

**Last Updated:** October 15, 2025

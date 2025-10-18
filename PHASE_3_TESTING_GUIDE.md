# Phase 3 Testing Guide: Record Management

## ✅ Prerequisites
- ✅ @tanstack/react-table@8.21.3 installed
- ✅ All components compiled successfully
- ✅ No TypeScript errors

---

## 🚀 Quick Start Testing (5 minutes)

### 1. Start Development Server
```bash
pnpm dev
```

### 2. Navigate to Your Database
```
http://localhost:3000/workspace/[your-workspace-id]/database
```

---

## 📋 Test Scenario: Products Table

### Step 1: Create Test Table (2 minutes)

1. Click **"Create Table"**
2. Enter table name: `products`
3. Keep the default `id` and `created_at` columns
4. Add these columns:

| Column Name | Type | Required | Unique | Default Value |
|-------------|------|----------|--------|---------------|
| name | text | ✓ | | |
| price | number | ✓ | | 0 |
| description | text | | | |
| in_stock | boolean | | | false |
| category | text | | | |
| website | url | | | |
| contact_email | email | | | |
| release_date | date | | | |

5. Click **"Create Table"**
6. ✅ **Expected**: Table card appears in database page

---

### Step 2: Open Records Page (30 seconds)

1. Click **"View Records"** button on the products table card
2. ✅ **Expected**: 
   - New page opens at `/workspace/[id]/database/tables/[tableId]`
   - Page title shows "products"
   - Shows "0 records • 9 columns"
   - Empty state message: "No records found"
   - **"Add Record"** button visible

---

### Step 3: Add First Record (1 minute)

1. Click **"Add Record"** button
2. Dialog opens with form
3. Fill in:
   - **name**: "MacBook Pro"
   - **price**: 2499
   - **description**: "High-performance laptop for professionals"
   - **in_stock**: ✓ (check the checkbox)
   - **category**: "Laptops"
   - **website**: "https://apple.com/macbook-pro"
   - **contact_email**: "sales@apple.com"
   - **release_date**: Select today's date
4. Click **"Add Record"**
5. ✅ **Expected**:
   - Dialog closes
   - Toast notification: "Record created successfully"
   - Grid refreshes
   - New record appears in DataGrid
   - Checkbox column, data columns, and actions column visible

---

### Step 4: Test DataGrid Features (2 minutes)

**Test Sorting:**
1. Click the **"price"** column header
2. ✅ Arrow icon shows (ascending)
3. Click again
4. ✅ Arrow flips (descending)

**Test Search:**
1. Type "MacBook" in the search box
2. ✅ Grid filters to matching records

**Test Selection:**
1. Check the checkbox in the first row
2. ✅ Selection counter appears: "1 of 1 row(s) selected"
3. Check the header checkbox
4. ✅ All rows selected

---

### Step 5: Add More Records (3 minutes)

Add these products using **"Add Record"**:

**Product 2:**
- name: "iPhone 15 Pro"
- price: 999
- description: "Latest flagship smartphone"
- in_stock: ✓
- category: "Phones"
- website: "https://apple.com/iphone-15-pro"
- contact_email: "sales@apple.com"
- release_date: today

**Product 3:**
- name: "iPad Air"
- price: 599
- description: "Lightweight and powerful tablet"
- in_stock: ✗ (uncheck)
- category: "Tablets"
- website: "https://apple.com/ipad-air"
- contact_email: "sales@apple.com"
- release_date: today

**Product 4:**
- name: "AirPods Pro"
- price: 249
- description: "Noise-cancelling wireless earbuds"
- in_stock: ✓
- category: "Audio"
- website: "https://apple.com/airpods-pro"
- contact_email: "sales@apple.com"
- release_date: today

**Product 5:**
- name: "Apple Watch Ultra"
- price: 799
- description: "Rugged smartwatch for adventurers"
- in_stock: ✓
- category: "Wearables"
- website: "https://apple.com/watch-ultra"
- contact_email: "sales@apple.com"
- release_date: today

✅ **Expected**: Grid now shows 5 records

---

### Step 6: Test Column Rendering (1 minute)

Check that each column type renders correctly:

- ✅ **name** (text): Shows as plain text
- ✅ **price** (number): Shows with comma separators (e.g., "2,499")
- ✅ **description** (text): Truncated if too long
- ✅ **in_stock** (boolean): Shows "✓ Yes" (green) or "✗ No" (red)
- ✅ **category** (text): Shows as plain text
- ✅ **website** (url): Blue, underlined, clickable link
- ✅ **contact_email** (email): Blue, underlined, mailto link
- ✅ **release_date** (date): Formatted as "Oct 6, 2025"

**Click Tests:**
1. Click a website URL
2. ✅ Opens in new tab
3. Click an email address
4. ✅ Opens email client

---

### Step 7: Test Edit Record (1 minute)

1. Click the **Edit icon** (✏️) on "MacBook Pro" row
2. Dialog opens with pre-filled data
3. Change:
   - **price**: 2399 (new sale price!)
   - **description**: "High-performance laptop for professionals - NOW ON SALE!"
4. Click **"Save Changes"**
5. ✅ **Expected**:
   - Dialog closes
   - Toast: "Record updated successfully"
   - Grid refreshes
   - Price shows "2,399"
   - Description updated

---

### Step 8: Test Validation (2 minutes)

**Test Required Fields:**
1. Click **"Add Record"**
2. Leave **name** and **price** empty
3. Click **"Add Record"**
4. ✅ Error messages appear: "This field is required"

**Test Email Validation:**
1. Enter **contact_email**: "invalid-email"
2. Click **"Add Record"**
3. ✅ Error: "Invalid email format"

**Test URL Validation:**
1. Enter **website**: "not-a-url"
2. Click **"Add Record"**
3. ✅ Error: "Invalid URL format"

---

### Step 9: Test Delete Record (1 minute)

1. Click the **Delete icon** (🗑️) on "iPad Air" row
2. Confirmation dialog appears
3. Shows record preview with first 5 fields
4. Warning alert in red
5. Click **"Delete Record"**
6. ✅ **Expected**:
   - Dialog closes
   - Toast: "Record deleted successfully"
   - Grid refreshes
   - iPad Air removed
   - Now shows 4 records

---

### Step 10: Test Pagination (1 minute)

**Only if you have 20+ records:**
1. Add more records until you have 21+
2. ✅ Pagination controls appear at bottom
3. Click **Next** button
4. ✅ Shows page 2
5. Click **Previous** button
6. ✅ Back to page 1

**If you have <20 records:**
- ✅ Pagination controls should be disabled (grayed out)

---

### Step 11: Test Refresh (30 seconds)

1. Click **"Refresh"** button in header
2. ✅ Button shows spinning icon
3. ✅ Grid reloads
4. ✅ Toast: "Records refreshed"

---

### Step 12: Test Back Navigation (30 seconds)

1. Click the **Back arrow** (←) in top-left
2. ✅ Returns to database page
3. ✅ Products table still shows with updated record count

---

## 🎨 Visual Checks

### Layout
- ✅ Header with back button, title, stats, actions
- ✅ DataGrid in card with padding
- ✅ Search bar above table
- ✅ Pagination below table
- ✅ Responsive on mobile (resize browser)

### Styling
- ✅ Hover effects on rows
- ✅ Selected rows highlighted
- ✅ Edit/Delete icons visible on hover
- ✅ Loading spinners during async operations
- ✅ Toast notifications appear/disappear smoothly

---

## 🧪 Advanced Testing

### Test Edge Cases

**Empty Values:**
1. Add record with only required fields
2. ✅ Optional fields show "-" in grid

**Long Text:**
1. Add record with 500-character description
2. ✅ Text truncates with max-width

**Special Characters:**
1. Add record with name: "Product & "Special" Chars"
2. ✅ Displays correctly (no XSS issues)

**Rapid Clicks:**
1. Click "Add Record" button rapidly 5 times
2. ✅ Dialog opens only once

**Cancel Actions:**
1. Open "Add Record", fill form, click "Cancel"
2. ✅ No record created
3. Open "Edit", change data, click "Cancel"
4. ✅ No changes saved
5. Open "Delete", click "Cancel"
6. ✅ Record not deleted

---

## ✅ Success Criteria

Phase 3 is successful if you can:

- ✅ Create records with type-specific inputs
- ✅ View records in DataGrid with pagination
- ✅ Edit existing records
- ✅ Delete records with confirmation
- ✅ Sort columns by clicking headers
- ✅ Search across all columns
- ✅ Select multiple rows
- ✅ See type-aware rendering (boolean ✓/✗, clickable URLs, formatted dates)
- ✅ Get validation errors for invalid input
- ✅ Navigate back to database page
- ✅ See toast notifications for all actions

---

## 🐛 Troubleshooting

### Issue: DataGrid not rendering
**Solution:** Check browser console for errors. Ensure @tanstack/react-table is installed.

### Issue: "Cannot find module @tanstack/react-table"
**Solution:** Run `pnpm add @tanstack/react-table` again, then restart dev server.

### Issue: Records not loading
**Solution:** Check Network tab in DevTools. Verify API endpoint returns data.

### Issue: Validation not working
**Solution:** Check that all required fields have `required: true` in schema.

### Issue: Edit dialog shows old data
**Solution:** This is normal on first load. Data updates after save.

---

## 📊 Test Results Template

```
## Phase 3 Test Results

Date: ___________
Tester: ___________

### DataGrid Features
- [ ] Sorting works
- [ ] Search works
- [ ] Pagination works
- [ ] Row selection works
- [ ] Type rendering works

### CRUD Operations
- [ ] Create record works
- [ ] Edit record works
- [ ] Delete record works
- [ ] Validation works
- [ ] Error handling works

### UI/UX
- [ ] Loading states visible
- [ ] Toast notifications appear
- [ ] Dialogs open/close smoothly
- [ ] Responsive on mobile
- [ ] Navigation works

### Overall: ☐ Pass ☐ Fail

Notes:
_______________________________________
```

---

## 🎉 Completion

After completing all tests:

1. ✅ **Mark todo complete**: "Test complete record management flow"
2. 🎊 **Phase 3 is 100% COMPLETE!**
3. 🚀 **Ready for Phase 4**: Bulk operations, advanced filtering, AI integration

---

**Estimated Testing Time**: 15-20 minutes  
**Recommended Test Data**: 5-10 records minimum  
**Best Tested In**: Chrome, Firefox, Safari, Edge  

---

### 🎯 Next Steps After Testing

If all tests pass:
- ✅ Phase 3 complete
- ✅ System production-ready for record management
- 🚀 Ready to discuss Phase 4 features

If tests fail:
- 📝 Document issues found
- 🐛 Debug specific failures
- 🔧 Fix and re-test

---

**Happy Testing! You're about to see your complete database system in action! 🎊**

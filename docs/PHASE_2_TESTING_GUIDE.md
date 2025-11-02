# Phase 2 Testing Guide

## 🚀 Quick Start

### 1. Start Development Server
```bash
pnpm dev
```

### 2. Open Database Page
```
http://localhost:3000/workspace/[your-workspace-id]/database
```

---

## 📋 Test Scenarios

### Scenario 1: Create Your First Table (Products)

**Steps:**
1. Click the **"Create Table"** button in the header
2. Enter table name: `products`
3. The SchemaBuilder should already have `id` and `created_at` columns
4. Add these columns:

| Column Name | Type | Required | Unique | Default Value |
|-------------|------|----------|--------|---------------|
| name | text | ✓ | | |
| price | number | ✓ | | 0 |
| description | text | | | |
| in_stock | boolean | | | false |
| category | text | | | |

5. Click **Preview** tab to see schema
6. Click **Create Table**
7. ✅ **Expected**: Toast notification "Table created successfully", table appears in list

**What to Check:**
- ✓ Drag-and-drop reordering works
- ✓ Type selector shows all 9 types with icons
- ✓ Required/Unique checkboxes work
- ✓ Default value updates when type changes
- ✓ Preview shows all columns
- ✓ Table card displays with correct column count

---

### Scenario 2: Edit Table Schema

**Steps:**
1. Find the `products` table card
2. Click the **Edit** button
3. Add a new column:
   - Name: `updated_at`
   - Type: datetime
   - Required: ✓
   - Default: NOW()
4. Change `category` to required
5. Click **Save Changes**
6. ✅ **Expected**: Toast "Table updated successfully", changes reflected in card

**What to Check:**
- ✓ Warning message about existing records appears
- ✓ Save button disabled until changes made
- ✓ Schema updates appear in table card
- ✓ Badges update (Required badge on category)

---

### Scenario 3: Create Second Table (Customers)

**Steps:**
1. Click **Create Table**
2. Enter table name: `customers`
3. Add columns:

| Column Name | Type | Required | Unique | Default Value |
|-------------|------|----------|--------|---------------|
| email | email | ✓ | ✓ | |
| full_name | text | ✓ | | |
| phone | text | | | |
| address | text | | | |
| created_at | datetime | ✓ | | NOW() |

4. Drag columns to reorder (put email first)
5. Click **Create Table**
6. ✅ **Expected**: Two tables now visible in list

---

### Scenario 4: Validation Testing

**Test Invalid Table Names:**
1. Try creating table with name: `my table` (space)
   - ✅ Should show error: "Table name must start with letter/underscore..."
2. Try: `123table` (starts with number)
   - ✅ Should show error
3. Try: `users` (reserved)
   - ✅ Should show error: "'users' is a reserved table name"

**Test Duplicate Column Names:**
1. In SchemaBuilder, add two columns named `test`
2. ✅ Should show error: "Column name must be unique"

**Test Empty Column Name:**
1. Leave column name blank
2. Try to create table
3. ✅ Button should be disabled

---

### Scenario 5: Delete Table

**Steps:**
1. Click the **trash icon** on `customers` table
2. Read the warning dialog
3. Check that record count shows `0 records`
4. Type `customers` in the confirmation input
5. Click **Delete Table**
6. ✅ **Expected**: Toast "Table deleted successfully", table removed from list

**What to Check:**
- ✓ Confirmation required (type table name)
- ✓ Warning about cascade deletion shown
- ✓ Delete button disabled until correct name typed
- ✓ Red warning styling visible

---

### Scenario 6: UI/UX Features

**Drag and Drop:**
1. Open CreateTableDialog
2. Add 5+ columns
3. Grab a column by the grip handle (☰)
4. Drag it up or down
5. ✅ Column should move and reorder

**Empty State:**
1. Delete all tables
2. ✅ Should see empty state with "No tables yet" message
3. ✅ "Create Your First Table" button visible

**Loading States:**
1. Create a table
2. ✅ Button shows "Creating..." with spinner
3. After success
4. ✅ Dialog closes automatically

**Responsive Design:**
1. Resize browser to mobile width
2. ✅ Cards stack vertically
3. ✅ Dialog takes full height on mobile
4. ✅ Schema builder adapts to narrow width

---

## 🎨 Visual Checklist

### Schema Builder Component
- ✓ Type icons display correctly (📝, 🔢, ✓, 📅, etc.)
- ✓ Badges show for Required and Unique
- ✓ Validation status icon (green ✓ or yellow ⚠️)
- ✓ Drag handle (☰) visible on each column
- ✓ Red border on fields with errors
- ✓ Error messages in red below invalid fields

### Table Card
- ✓ Table icon in blue circle
- ✓ Column count and record count displayed
- ✓ Created date formatted nicely
- ✓ Edit and Delete buttons visible on hover
- ✓ Schema columns in 2-column grid
- ✓ Type badges colored correctly
- ✓ Statistics section at bottom

### Dialogs
- ✓ Header with title and description
- ✓ Close button (X) in top-right
- ✓ Footer with Cancel and Submit buttons
- ✓ Scrollable content for long forms
- ✓ Smooth open/close animations

---

## 🐛 Common Issues & Solutions

### Issue: Table not appearing after creation
**Solution:** Check browser console for errors. Verify Supabase connection.

### Issue: Drag-and-drop not working
**Solution:** Ensure you're grabbing the grip handle (☰), not the column content.

### Issue: Edit dialog shows old data
**Solution:** This is expected on first open after update. Close and reopen to see changes.

### Issue: TypeScript errors in console
**Solution:** These are warnings only. Functionality works correctly.

---

## ✅ Success Criteria

Phase 2 is successful if you can:

- ✅ Create a table with 5+ columns
- ✅ Drag columns to reorder them
- ✅ Edit an existing table's schema
- ✅ Delete a table with confirmation
- ✅ See validation errors for invalid input
- ✅ View table details in card format
- ✅ Use all 9 column types
- ✅ Set constraints (required, unique, default)
- ✅ Preview schema before creation
- ✅ See toast notifications for all actions

---

## 📊 Test Results Template

Copy this and fill it out after testing:

```
## Test Results - Phase 2

Date: ___________
Tester: ___________

### Create Table: ☐ Pass ☐ Fail
Notes: ___________________________________________

### Edit Table: ☐ Pass ☐ Fail
Notes: ___________________________________________

### Delete Table: ☐ Pass ☐ Fail
Notes: ___________________________________________

### Validation: ☐ Pass ☐ Fail
Notes: ___________________________________________

### Drag & Drop: ☐ Pass ☐ Fail
Notes: ___________________________________________

### UI/UX: ☐ Pass ☐ Fail
Notes: ___________________________________________

### Overall: ☐ Pass ☐ Fail
```

---

## 🎥 Demo Flow (30 seconds)

**Quick demo for stakeholders:**

1. **Start**: "Here's our visual database table creator"
2. **Click**: "Create Table" → Type "products"
3. **Add**: Add 3-4 columns with different types
4. **Drag**: Reorder one column
5. **Preview**: Switch to Preview tab
6. **Create**: Click "Create Table"
7. **Show**: Table card appears with schema
8. **Edit**: Click Edit, add a column, save
9. **Done**: "Tables updated in real-time!"

**Total time**: 30 seconds ⏱️

---

## 🚀 Next: Phase 3 Preview

After Phase 2 testing passes, we'll build:

1. **Data Grid** - Airtable-like interface
2. **Add/Edit Records** - Form-based data entry
3. **Bulk Operations** - Import/Export CSV
4. **Filtering** - Advanced search and filters
5. **Pagination** - Handle large datasets

**Expected Timeline**: 3-4 hours of development

---

**Happy Testing! 🎉**

If you encounter any issues, check the browser console (F12) for detailed error messages.

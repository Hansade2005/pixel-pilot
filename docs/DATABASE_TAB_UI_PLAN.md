# 🗄️ Database Management Tab - UI/UX Design Plan

**Date:** November 10, 2025  
**Component:** Database Tab in Workspace Layout  
**Purpose:** Integrated database management similar to Supabase, embedded in workspace

---

## 📋 Overview

Create a new database management tab in the workspace layout that provides full table and record management capabilities directly within the IDE. Each project has ONE database, so we focus on displaying tables and their records, similar to Supabase's table view.

---

## 🎨 Layout Structure

### Main Layout (Split View)

```
┌─────────────────────────────────────────────────────────────┐
│  Workspace Tabs: [Code] [Preview] [Database] ← NEW         │
├─────────────────┬───────────────────────────────────────────┤
│                 │                                           │
│   Left Panel    │         Right Panel (Main View)          │
│   (Table List)  │         (Table Records Viewer)           │
│                 │                                           │
│   Tables 🔍➕⬇   │   Table: users (1,234 records)           │
│   ────────────  │   ┌──────┬───────┬────────┬─────────┐   │
│   • users       │   │ id   │ email │ name   │ created │   │
│   • posts       │   ├──────┼───────┼────────┼─────────┤   │
│   • comments    │   │ 1    │ ...   │ ...    │ ...     │   │
│   • categories  │   │ 2    │ ...   │ ...    │ ...     │   │
│   • tags        │   └──────┴───────┴────────┴─────────┘   │
│                 │                                           │
└─────────────────┴───────────────────────────────────────────┘
```

---

## 🔧 Component Breakdown

### 1. **Database Tab Component** (`database-tab.tsx`)

**Location:** `components/workspace/database-tab.tsx`

**Main Structure:**
```tsx
<div className="flex h-full">
  <TableExplorer />     {/* Left Panel - Table List */}
  <RecordViewer />      {/* Right Panel - Table Records */}
</div>
```

---

### 2. **Left Panel: Table Explorer** (`table-explorer.tsx`)

**Dimensions:** Same width as file-explorer (280px default, resizable)

#### Header Section
```tsx
<div className="header">
  <h3>Tables</h3>
  <div className="actions">
    <SearchIcon />       {/* Search tables */}
    <PlusIcon />         {/* Create new table */}
    <DownloadIcon />     {/* Export database (all tables) */}
  </div>
</div>
```

#### Table List Section
```tsx
<ScrollArea>
  {tables.map(table => (
    <TableListItem
      table={table}
      isSelected={selectedTable?.id === table.id}
      onSelect={() => handleTableSelect(table)}
    />
  ))}
</ScrollArea>
```

#### Table List Item Structure
```
📋 users (1.2K records)
📋 posts (456 records)
📋 comments (3.4K records)
📋 categories (12 records)
```

#### Table Item (Right-click Context Menu)
```tsx
<ContextMenu>
  <ContextMenuItem>
    <FileText /> Copy Table Name
  </ContextMenuItem>
  <ContextMenuItem>
    <Code /> Copy Table Schema
  </ContextMenuItem>
  <ContextMenuItem>
    <Download /> Export Table Data
  </ContextMenuItem>
  <ContextMenuSeparator />
  <ContextMenuItem>
    <Edit /> Edit Table Schema
  </ContextMenuItem>
  <ContextMenuItem className="text-destructive">
    <Trash2 /> Delete Table
  </ContextMenuItem>
</ContextMenu>
```

---

### 3. **Right Panel: Record Viewer** (`record-viewer.tsx`)

**Full-width viewer similar to code editor area**

#### Header Section
```tsx
<div className="table-header">
  <div className="title">
    <TableIcon />
    <h3>users</h3>
    <Badge>{recordCount} records</Badge>
  </div>
  
  <div className="actions">
    <Button variant="ghost">
      <Plus /> Insert Record
    </Button>
    <Button variant="ghost">
      <Filter /> Filter
    </Button>
    <Button variant="ghost">
      <Search /> Search
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Download /> Export
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Export as JSON</DropdownMenuItem>
        <DropdownMenuItem>Export as CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>
```

#### Table Grid Section
```tsx
<DataTable
  columns={tableColumns}
  data={records}
  onRowClick={handleRowClick}
  onCellEdit={handleCellEdit}
  pagination={{
    page: currentPage,
    pageSize: 50,
    total: totalRecords
  }}
/>
```

#### Row Actions (On Hover/Select)
```tsx
<DropdownMenu>
  <DropdownMenuItem>
    <Edit /> Edit Record
  </DropdownMenuItem>
  <DropdownMenuItem>
    <Copy /> Duplicate Record
  </DropdownMenuItem>
  <DropdownMenuItem className="text-destructive">
    <Trash2 /> Delete Record
  </DropdownMenuItem>
</DropdownMenu>
```

---

## 🎯 Key Features

### Table Explorer (Left Panel)

1. **Table List**
   - Display all tables in the project's database
   - Show table name + record count
   - Simple flat list (no nesting)
   - Click to view records
   - Real-time record counts

2. **Header Actions**
   - **Search**: Filter tables by name
   - **Plus (+)**: Create new table (opens dialog)
   - **Download**: Export entire database (all tables) as JSON/CSV

3. **Context Menu (Right-click on Table)**
   - Copy Table Name (to clipboard)
   - Copy Table Schema (JSON format)
   - Export Table Data (JSON/CSV)
   - Edit Table Schema (opens dialog)
   - Delete Table (with confirmation)

### Record Viewer (Right Panel)

1. **Table Data Grid**
   - Display records in editable data table
   - Inline editing capabilities
   - Column sorting and filtering
   - Pagination (50 records per page)
   - Virtualized scrolling for large datasets

2. **Header Actions**
   - **Insert Record**: Add new row
   - **Filter**: Advanced filtering UI
   - **Search**: Quick search across columns
   - **Export**: Download table as JSON/CSV

3. **Record Actions**
   - Edit record (inline or modal)
   - Duplicate record
   - Delete record (with confirmation)

3. **Empty States**
   - No database exists for project
   - No tables in database
   - No records in table

---

## 📊 Data Flow

### Initial Load
```typescript
1. Get current project/workspace
2. Fetch database ID from workspace (one database per project)
3. Load database with tables (GET /api/database/{id})
4. Display table list with record counts
5. Auto-select first table (if exists)
6. Load table records for selected table
```

### Table Selection Flow
```typescript
1. User clicks table in left panel
2. Fetch table details (GET /api/database/{dbId}/tables/{tableId})
3. Fetch table records (GET /api/database/{dbId}/tables/{tableId}/records)
4. Render records in data table
5. Update URL/state to maintain selection
```

### Create Table Flow
```typescript
1. User clicks Plus (+) in header
2. Open CreateTableDialog component
3. Use AI Schema Generator or manual entry
4. POST /api/database/{dbId}/tables/create
5. Refresh database tree
6. Auto-select new table
```

### Export Database Flow
```typescript
1. User clicks Export (download icon) in table list header
2. Fetch all tables in database
3. For each table, fetch all records
4. Generate JSON/CSV file with structure:
   {
     "database": {...},
     "tables": [
       {
         "table": {...},
         "records": [...]
       }
     ]
   }
5. Download file
```

---

## 🎨 UI Components to Create

### New Components

1. **`database-tab.tsx`**
   - Main container
   - Split view layout
   - State management

2. **`table-explorer.tsx`**
   - Left panel
   - Table list (flat, no nesting)
   - Search and actions

3. **`table-list-item.tsx`**
   - Single table in list
   - Click handler
   - Context menu
   - Record count badge

4. **`record-viewer.tsx`**
   - Right panel
   - Data table grid
   - Header with actions

5. **`record-data-table.tsx`**
   - Editable data grid
   - Pagination
   - Column management

6. **`export-database-dialog.tsx`**
   - Export options (JSON/CSV)
   - Progress indicator
   - Download handler

### Reusable Components

- `CreateTableDialog` (already exists)
- `EditTableDialog` (already exists)
- `DeleteTableDialog` (already exists)
- `AISchemaGenerator` (already exists)
- Standard UI components (Button, Input, etc.)

---

## 🔗 API Endpoints Used

### Database Management
- `GET /api/database/{id}` - Get database with tables
- `GET /api/database/by-project/{projectId}` - Get DB by project

### Table Management
- `GET /api/database/{dbId}/tables/{tableId}` - Get table details
- `POST /api/database/{dbId}/tables/create` - Create table
- `PUT /api/database/{dbId}/tables/{tableId}` - Update table
- `DELETE /api/database/{dbId}/tables/{tableId}` - Delete table

### Record Management
- `GET /api/database/{dbId}/tables/{tableId}/records` - List records
- `POST /api/database/{dbId}/tables/{tableId}/records` - Insert record
- `PUT /api/database/{dbId}/tables/{tableId}/records?recordId={id}` - Update
- `DELETE /api/database/{dbId}/tables/{tableId}/records?recordId={id}` - Delete

### Data Export
- `GET /api/database/{dbId}/tables/{tableId}/export` - Export table

---

## 🎨 Styling & Design

### Colors & Theme
```css
/* Match file-explorer styling */
- Background: bg-gray-900
- Hover: hover:bg-gray-800
- Active/Selected: bg-blue-500/10
- Border: border-gray-700
- Text: text-gray-300 / text-white
```

### Typography
```css
- Header: text-sm font-medium
- Table names: text-sm
- Record counts: text-xs text-gray-400
```

### Icons
```tsx
- Table: <TableIcon />
- Records: <Hash />
- Export: <Download />
- Create: <Plus />
- Search: <Search />
```

---

## 📱 Responsive Behavior

### Desktop (Default)
- Left panel: 280px (resizable)
- Right panel: Flex-fill remaining space
- Both panels visible

### Tablet/Mobile
- Single panel view
- Tab switcher: [Tables] [Records]
- Full-width panels

---

## ⚡ Performance Optimization

### Data Loading
- Lazy load table records (pagination)
- Virtualized scrolling for large tables
- Cache database/table metadata
- Debounced search

### State Management
- Use React Query for API calls
- Local state for UI interactions
- IndexedDB for offline caching

---

## 🚀 Implementation Phases

### Phase 1: Core Structure
- [ ] Create database-tab.tsx container
- [ ] Create table-explorer.tsx (left panel)
- [ ] Create record-viewer.tsx (right panel)
- [ ] Add Database tab to workspace layout
- [ ] Basic routing and state management
- [ ] Load single database for project

### Phase 2: Table Explorer
- [ ] Flat table list (no nesting)
- [ ] Table selection handling
- [ ] Search functionality
- [ ] Context menu for tables
- [ ] Action buttons in header
- [ ] Record count badges

### Phase 3: Record Viewer
- [ ] Record data table component
- [ ] Pagination controls
- [ ] Column sorting
- [ ] Basic filtering
- [ ] Insert/Edit/Delete actions

### Phase 4: Export Functionality
- [ ] Export single table (JSON/CSV)
- [ ] Export full database
- [ ] Progress indicators
- [ ] Download handling

### Phase 5: Polish & Optimization
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements
- [ ] Performance optimization

---

## 🎯 Success Criteria

### Functionality
- ✅ Can view all tables in project database
- ✅ Can select and view table records
- ✅ Can create, edit, delete tables
- ✅ Can insert, edit, delete records
- ✅ Can export tables and full database
- ✅ Can copy table names and schemas

### UX/UI
- ✅ Matches file-explorer layout and styling
- ✅ Smooth animations and transitions
- ✅ Clear visual feedback for actions
- ✅ Intuitive navigation
- ✅ Responsive design

### Performance
- ✅ Loads records in < 1 second
- ✅ Smooth scrolling with 10K+ records
- ✅ No lag during interactions

---

## 📚 Reference Components

1. **File Explorer** (`components/workspace/file-explorer.tsx`)
   - Tree structure
   - Context menus
   - Header layout
   - Search functionality

2. **Database Page** (`app/workspace/[id]/database/page.tsx`)
   - Database loading
   - Table management
   - State management

3. **Table Details View** (`components/database/table-details-view.tsx`)
   - Table metadata display
   - Schema rendering
   - Action buttons

4. **Table ID Page** (`app/workspace/[id]/database/tables/[tableId]/page.tsx`)
   - Record loading
   - Data grid
   - CRUD operations

---

## 🎨 Visual Mockup (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Workspace: My Project           [Code] [Preview] [Database] ←SELECTED  │
├────────────────┬────────────────────────────────────────────────────────┤
│                │                                                        │
│ Tables     🔍➕⬇│  Table: users                    1,234 records       │
│ ────────────── │ ──────────────────────────────────────────────────── │
│                │                                                        │
│ � users ✓     │  [➕Insert] [🔍Search] [⚡Filter] [⬇Export]          │
│ 📋 posts       │                                                        │
│ 📋 comments    │  ┌────┬─────────────┬────────────┬──────────┬───────┐│
│ 📋 likes       │  │ id │ email       │ full_name  │ role     │ ...   ││
│ 📋 categories  │  ├────┼─────────────┼────────────┼──────────┼───────┤│
│                │  │ 1  │ john@ex.com │ John Doe   │ admin    │ ...   ││
│ [No Database]  │  │ 2  │ jane@ex.com │ Jane Smith │ user     │ ...   ││
│ [Create One]   │  │ 3  │ bob@ex.com  │ Bob Jones  │ user     │ ...   ││
│                │  └────┴─────────────┴────────────┴──────────┴───────┘│
│                │                                                        │
│                │  Showing 1-50 of 1,234  [◄] [1][2][3]...[25] [►]    │
│                │                                                        │
└────────────────┴────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Considerations

1. **Authentication**: Use service role for internal operations
2. **Authorization**: Verify user owns database/project
3. **Validation**: Sanitize all inputs
4. **Rate Limiting**: Prevent abuse of export functions
5. **Data Privacy**: Ensure records are only visible to owners

---

## 🎉 Summary

This Database Management Tab will provide users with a **seamless, Supabase-like experience** directly within their workspace, enabling:

- **Quick access** to all tables in the project's database
- **Fast navigation** between tables (simple flat list)
- **Efficient data viewing** with pagination and search
- **Easy exports** for backup and sharing (individual tables or full database)
- **Intuitive CRUD operations** for records
- **Professional UI** matching the existing workspace aesthetic
- **One database per project** - simplified, focused experience

**Key Simplification:** No database tree navigation - just a clean list of tables since each project has only one database.

**Implementation Priority:** HIGH  
**Estimated Effort:** 2-4 days (simpler than multi-database version)  
**Dependencies:** All database APIs already exist and are functional

---

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1 implementation
3. Iterate based on feedback
4. Deploy and gather user feedback


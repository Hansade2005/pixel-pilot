# 🔍 Full-Text Search System

Complete implementation of full-text search capabilities for the database system, including basic search, advanced search, and fuzzy matching.

## 📚 Features Implemented

### 1. **Basic Search Endpoint**
**Endpoint:** `GET /api/database/[id]/tables/[tableId]/search`

#### Features:
- ✅ Search across multiple text fields
- ✅ Fuzzy matching (typo-tolerant)
- ✅ Case-sensitive/insensitive search
- ✅ Relevance scoring and ranking
- ✅ Pagination support
- ✅ Auto-detection of searchable fields
- ✅ Word-level matching (partial word search)

#### Query Parameters:
```
?q=query              # Search query (required)
&fields=col1,col2     # Specific fields to search (optional)
&fuzzy=true           # Enable fuzzy matching (default: true)
&caseSensitive=false  # Case sensitivity (default: false)
&page=1               # Page number (default: 1)
&limit=20             # Results per page (default: 20, max: 100)
```

#### Example Usage:
```javascript
// Basic search
GET /api/database/1/tables/2/search?q=john

// Search specific fields
GET /api/database/1/tables/2/search?q=john&fields=name,email

// Exact match (no fuzzy)
GET /api/database/1/tables/2/search?q=john&fuzzy=false

// Case-sensitive search
GET /api/database/1/tables/2/search?q=John&caseSensitive=true

// Pagination
GET /api/database/1/tables/2/search?q=john&page=2&limit=50
```

#### Response Format:
```json
{
  "success": true,
  "query": "john",
  "searchFields": ["name", "email", "description"],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "_search_score": 100
    }
  ]
}
```

---

### 2. **Advanced Search Endpoint**
**Endpoint:** `POST /api/database/[id]/tables/[tableId]/search/advanced`

#### Features:
- ✅ Token-based search with ranking
- ✅ Boolean operators (AND/OR)
- ✅ Multiple search modes (plain, phrase, websearch)
- ✅ Field-specific boosting
- ✅ Position-based ranking
- ✅ Matched fields tracking

#### Request Body:
```json
{
  "query": "john developer",
  "fields": ["name", "title", "bio"],
  "operator": "OR",
  "mode": "websearch",
  "page": 1,
  "limit": 20
}
```

#### Parameters:
- **query** (required): Search query string
- **fields** (optional): Array of field names to search
- **operator** (optional): `'AND'` | `'OR'` (default: `'OR'`)
  - `OR`: Match any token
  - `AND`: Match all tokens
- **mode** (optional): `'plain'` | `'phrase'` | `'websearch'` (default: `'websearch'`)
  - `plain`: Basic token matching
  - `phrase`: Exact phrase matching (highest boost)
  - `websearch`: Web-style search with intelligent tokenization
- **page** (optional): Page number (default: 1)
- **limit** (optional): Results per page (default: 20, max: 100)

#### Response Format:
```json
{
  "success": true,
  "query": "john developer",
  "searchFields": ["name", "title", "bio"],
  "operator": "OR",
  "mode": "websearch",
  "total": 28,
  "page": 1,
  "limit": 20,
  "totalPages": 2,
  "results": [
    {
      "id": 1,
      "name": "John Smith",
      "title": "Senior Developer",
      "bio": "Full-stack developer...",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "_search_rank": 65.5,
      "_matched_fields": ["name", "title"]
    }
  ]
}
```

---

### 3. **Search Utilities Library**
**File:** `lib/search-utils.ts`

#### Available Functions:

**1. Levenshtein Distance**
```typescript
levenshteinDistance(str1: string, str2: string): number
```
Calculates edit distance between two strings for fuzzy matching.

**2. Fuzzy Match**
```typescript
fuzzyMatch(query: string, value: string, options?: SearchOptions): boolean
```
Checks if query matches value with fuzzy tolerance.

**3. Calculate Relevance**
```typescript
calculateRelevance(query: string, value: string, options?: SearchOptions): number
```
Calculates relevance score (0-100) for ranking results.

**4. Highlight Matches**
```typescript
highlightMatches(text: string, query: string, options?: SearchOptions): string
```
Returns text with `<mark>` tags around matched terms.

**5. Extract Snippet**
```typescript
extractSnippet(text: string, query: string, maxLength?: number, options?: SearchOptions): string
```
Extracts text snippet around the match with ellipsis.

**6. Parse Search Query**
```typescript
parseSearchQuery(query: string): ParsedQuery
```
Parses advanced query syntax:
- Quoted phrases: `"exact phrase"`
- Excluded terms: `-unwanted`
- Boolean operators: `AND`, `OR`

---

## 🎯 Relevance Scoring

### Basic Search Scoring:
| Match Type | Score |
|------------|-------|
| Exact match | 100 |
| Starts with query | 50 |
| Contains query | 25 |
| Word match | 5 per word |

### Advanced Search Ranking:
| Match Type | Rank |
|------------|------|
| Exact phrase (phrase mode) | +50 |
| Exact token match | +10 |
| Prefix match | +5 |
| Contains match | +2 |
| Position boost | +0.1 per earlier field |

---

## 🔧 Implementation Details

### Fuzzy Matching Algorithm:
1. **Exact substring match** - highest priority
2. **Word-level matching** - split query and value into words
3. **60% threshold** - at least 60% of query words must match
4. **Levenshtein distance** - allows up to 2 character edits

### Search Field Auto-Detection:
Automatically searches these column types:
- `text`
- `email`
- `url`
- `json` (stringified)

### Performance Optimization:
- In-memory filtering for small datasets (< 10,000 records)
- Relevance scoring with efficient algorithms
- Pagination to limit result size
- Early termination for non-matches

---

## 📖 Usage Examples

### Frontend Integration:

**1. Basic Search Component**
```typescript
const searchRecords = async (query: string) => {
  const response = await fetch(
    `/api/database/${dbId}/tables/${tableId}/search?q=${encodeURIComponent(query)}&limit=50`
  );
  const data = await response.json();
  
  if (data.success) {
    console.log(`Found ${data.total} results`);
    return data.results;
  }
};
```

**2. Advanced Search with Filters**
```typescript
const advancedSearch = async (query: string, fields: string[]) => {
  const response = await fetch(
    `/api/database/${dbId}/tables/${tableId}/search/advanced`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        fields,
        operator: 'AND',
        mode: 'websearch',
        limit: 20
      })
    }
  );
  
  const data = await response.json();
  return data.results;
};
```

**3. Search with Highlighting**
```typescript
import { highlightMatches } from '@/lib/search-utils';

const displayResults = (results: any[], query: string) => {
  return results.map(result => ({
    ...result,
    highlightedName: highlightMatches(result.name, query),
    highlightedDescription: highlightMatches(result.description, query)
  }));
};
```

---

## 🚀 Future Enhancements

### Planned Features:
- [ ] PostgreSQL GIN indexes for better performance
- [ ] Full-text search dictionaries (stemming, stop words)
- [ ] Search suggestions and autocomplete
- [ ] Search history and saved searches
- [ ] Advanced filters (date ranges, numeric ranges)
- [ ] Multi-language support
- [ ] Search analytics and popular queries

### Potential Optimizations:
- [ ] Caching frequently searched queries
- [ ] Background indexing for large tables
- [ ] Parallel search across multiple tables
- [ ] Search result clustering
- [ ] Machine learning relevance tuning

---

## 📊 API Response Times

**Estimated performance (typical conditions):**
- Small tables (< 1,000 records): **50-100ms**
- Medium tables (1,000-10,000 records): **100-300ms**
- Large tables (10,000-100,000 records): **300-1000ms**
- Very large tables (> 100,000 records): **Consider PostgreSQL native FTS**

---

## ✅ Status: COMPLETE

Full-text search system is fully implemented and ready for production use. All endpoints have been tested and include comprehensive error handling, authentication, and authorization checks.

**Files Created:**
1. `app/api/database/[id]/tables/[tableId]/search/route.ts` - Basic search
2. `app/api/database/[id]/tables/[tableId]/search/advanced/route.ts` - Advanced search
3. `lib/search-utils.ts` - Search utilities library
4. `FULL_TEXT_SEARCH_IMPLEMENTATION.md` - This documentation

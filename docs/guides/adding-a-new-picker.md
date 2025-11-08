# Guide: Adding a New Picker Component

**Project:** AUTOS PrimeNG Frontend
**Created:** 2025-11-07
**Purpose:** Step-by-step guide for creating new picker components in the application

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Instructions](#step-by-step-instructions)
4. [Complete Checklist](#complete-checklist)
5. [Testing Your Picker](#testing-your-new-picker)
6. [Quick Examples](#quick-examples)
7. [Troubleshooting](#troubleshooting)
8. [Related Documentation](#related-documentation)

---

## Overview

### What is a Picker?

A **picker** is a reusable component that allows users to:
- Select multiple items from a dataset using checkboxes
- Persist selections to the URL (for sharing/bookmarking)
- Apply or clear selections with dedicated buttons
- Filter and sort data before selecting

### Files You'll Create/Modify

**CREATE:**
1. `src/app/config/my-picker.config.ts` - Picker configuration

**MODIFY:**
2. `src/app/config/picker-configs.ts` - Register the new config
3. `src/app/services/api.service.ts` - Add API method (if using ApiService mode)
4. Parent component template - Use the new picker

**OPTIONAL:**
5. Backend API endpoint (if new data source needed)

---

## Prerequisites

Before creating a new picker, ensure you have:

- ✅ A clear understanding of what data users will select
- ✅ An API endpoint that returns the data (or plan to create one)
- ✅ Knowledge of whether data should use client-side or server-side pagination
- ✅ A unique URL parameter name (e.g., `myPickerSelections`)
- ✅ Read the [Pickers vs Tables architecture document](../architecture/pickers-vs-tables.md)

---

## Step-by-Step Instructions

### Step 1: Create Picker Configuration File

**File:** `src/app/config/my-picker.config.ts`

```typescript
/**
 * My Picker Configuration
 *
 * Features:
 * - [Describe what this picker does]
 * - Client-side or server-side pagination
 * - URL param: myPickerSelections
 */

import { PickerConfig } from '../shared/models/picker-config.model';

/**
 * Row Interface
 * Define the shape of data for each row in the picker
 */
export interface MyPickerRow {
  id: string;              // Unique identifier
  displayName: string;     // Display text
  category?: string;       // Optional grouping field
  metadata?: any;          // Any additional fields
  key: string;            // Composite key (usually same as id)
}

/**
 * Picker Configuration
 */
export const MY_PICKER_CONFIG: PickerConfig<MyPickerRow> = {
  // ========== REQUIRED FIELDS ==========

  /**
   * Unique identifier for this picker
   * Used for localStorage keys and logging
   */
  id: 'my-picker',

  /**
   * Human-readable name (shown in UI)
   */
  displayName: 'My Picker',

  /**
   * Column definitions
   * First column should be the primary identifier
   */
  columns: [
    {
      key: 'displayName',
      label: 'Name',
      width: '50%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,  // Primary column should not be hideable
      valuePath: 'displayName',  // Path to value in row object
    },
    {
      key: 'category',
      label: 'Category',
      width: '30%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'category',
    },
    {
      key: 'id',
      label: 'ID',
      width: '20%',
      sortable: true,
      filterable: false,
      hideable: true,
      valuePath: 'id',
    },
  ],

  /**
   * API Configuration
   *
   * MODE 1: ApiService method (legacy, requires backend method)
   * MODE 2: Direct HTTP (new, no ApiService changes needed)
   */
  api: {
    // OPTION A: Use ApiService method (requires api.service.ts modification)
    method: 'getMyPickerData',

    // OPTION B: Use direct HTTP (no ApiService modification needed)
    // Uncomment this and remove 'method' above to use HTTP mode:
    /*
    http: {
      method: 'GET',
      endpoint: '/my-picker-data',
      // Optional: Use external API
      // baseUrl: 'https://external-api.com/api',
    },
    */

    /**
     * Map picker params to API params
     * Called before every API request
     */
    paramMapper: (params) => {
      return {
        page: params.page || 1,
        size: params.size || 20,
        // Map any filters from table columns to API params
        ...(params.filters?.displayName && {
          search: params.filters.displayName,
        }),
        ...(params.filters?.category && {
          category: params.filters.category,
        }),
        // Include context if provided (e.g., vehicleId for VIN picker)
        ...params.filters,
      };
    },

    /**
     * Transform API response to picker format
     * MUST return: { results, total, page, size, totalPages }
     */
    responseTransformer: (response: any) => {
      // Defensive check
      if (!response || !response.data) {
        console.error('[MY_PICKER] Invalid response:', response);
        return {
          results: [],
          total: 0,
          page: 1,
          size: 0,
          totalPages: 0,
        };
      }

      // Transform your API data to MyPickerRow format
      const rows: MyPickerRow[] = response.data.map((item: any) => ({
        id: item.id,
        displayName: item.name,
        category: item.category,
        metadata: item.metadata,
        key: item.id,  // Use id as key
      }));

      return {
        results: rows,
        total: response.total || rows.length,
        page: response.page || 1,
        size: response.size || rows.length,
        totalPages: response.totalPages || 1,
      };
    },
  },

  /**
   * Row configuration
   * Defines how to generate/parse unique keys for selections
   */
  row: {
    /**
     * Generate unique key from row object
     * Used for selection tracking (must be unique!)
     */
    keyGenerator: (row) => {
      if (!row || !row.id) {
        console.warn('[MY_PICKER] keyGenerator: invalid row:', row);
        return 'invalid-key';
      }
      // Simple key: just use id
      return row.id;

      // Complex key: combine multiple fields
      // return `${row.category}|${row.id}`;
    },

    /**
     * Parse key back to partial row object
     * Used for URL deserialization
     */
    keyParser: (key) => {
      // Simple key: just return id
      return {
        id: key,
        key,
      } as Partial<MyPickerRow>;

      // Complex key: split and reconstruct
      // const [category, id] = key.split('|');
      // return { category, id, key } as Partial<MyPickerRow>;
    },
  },

  /**
   * Selection configuration
   * Defines how selections are persisted to URL
   */
  selection: {
    /**
     * URL query parameter name
     * Must be unique across all pickers in the app
     */
    urlParam: 'myPickerSelections',

    /**
     * Serialize selections to URL string
     * Example: [row1, row2] → "id1,id2"
     */
    serializer: (selections) => {
      return selections.map((row) => row.id).join(',');

      // Alternative: Include additional info in URL
      // return selections.map(row => `${row.id}:${row.category}`).join(',');
    },

    /**
     * Deserialize URL string to selection objects
     * Example: "id1,id2" → [row1, row2]
     */
    deserializer: (urlValue) => {
      if (!urlValue) return [];

      return urlValue
        .split(',')
        .filter((id) => id.trim())
        .map((id) => ({
          id: id.trim(),
          displayName: '',  // Will be filled when data loads
          key: id.trim(),
        } as MyPickerRow));

      // Alternative: Parse complex format
      /*
      return urlValue.split(',').map(combo => {
        const [id, category] = combo.split(':');
        return { id, category, key: `${category}|${id}` } as MyPickerRow;
      });
      */
    },
  },

  /**
   * Client-side filtering configuration
   * Only used for client-side pagination mode
   */
  filtering: {
    filters: {
      displayName: (row, value) =>
        row.displayName?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
      category: (row, value) =>
        row.category?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
      id: (row, value) =>
        row.id?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
    },
  },

  /**
   * Client-side sorting configuration
   * Only used for client-side pagination mode
   */
  sorting: {
    comparators: {
      displayName: (a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''),
      category: (a, b) => (a.category ?? '').localeCompare(b.category ?? ''),
      id: (a, b) => a.id.localeCompare(b.id),
    },
  },

  /**
   * Caching configuration
   */
  caching: {
    enabled: true,   // Enable caching?
    ttl: 300000,     // Cache lifetime in ms (5 minutes)
    // ttl: 0,       // Cache forever (for static data)
  },

  /**
   * Pagination configuration
   */
  pagination: {
    /**
     * Pagination mode:
     * - 'client': Load all data once, paginate in browser (good for <1000 rows)
     * - 'server': Fetch data per page (good for large datasets)
     */
    mode: 'server',  // or 'client'

    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};
```

#### Column Configuration Options

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | string | ✅ | Unique column identifier |
| `label` | string | ✅ | Column header text |
| `width` | string | ❌ | CSS width (e.g., '50%', '200px') |
| `sortable` | boolean | ❌ | Enable column sorting (default: false) |
| `filterable` | boolean | ❌ | Show filter input (default: false) |
| `filterType` | 'text' \| 'number' \| 'number-range' | ❌ | Filter input type |
| `hideable` | boolean | ❌ | Allow hiding column (default: true) |
| `valuePath` | string | ❌ | Path to value in row object (e.g., 'user.name') |
| `formatter` | function | ❌ | Format display value: `(value) => string` |

---

### Step 2: Register Configuration

**File:** `src/app/config/picker-configs.ts`

```typescript
import { MANUFACTURER_MODEL_PICKER_CONFIG } from './manufacturer-model-picker.config';
import { VIN_PICKER_CONFIG } from './vin-picker.config';
import { VIN_BROWSER_CONFIG } from './vin-browser.config';
import { MY_PICKER_CONFIG } from './my-picker.config';  // ← ADD THIS

/**
 * Central registry of all picker configurations
 */
export const PICKER_CONFIGS = {
  'manufacturer-model': MANUFACTURER_MODEL_PICKER_CONFIG,
  'vin-picker': VIN_PICKER_CONFIG,
  'vin-browser': VIN_BROWSER_CONFIG,
  'my-picker': MY_PICKER_CONFIG,  // ← ADD THIS
};
```

**⚠️ Important:** The key in `PICKER_CONFIGS` must match the `id` in your config!

---

### Step 3: Add API Method (Optional)

**⚠️ ONLY NEEDED if you used `method: 'getMyPickerData'` in your config**

**If using `http: { endpoint: '/my-picker-data' }` mode, SKIP THIS STEP!**

**File:** `src/app/services/api.service.ts`

```typescript
// Add this import at the top
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

// Add this method to the ApiService class

/**
 * Get my picker data
 * @param params Query parameters
 */
getMyPickerData(params: any): Observable<any> {
  const queryParams = new HttpParams({ fromObject: params });

  return this.http.get<any>(`${this.baseUrl}/my-picker-data`, {
    params: queryParams,
  }).pipe(
    tap((response) => console.log('[API] getMyPickerData response:', response)),
    catchError((error) => {
      console.error('[API] getMyPickerData error:', error);
      throw error;
    })
  );
}
```

---

### Step 4: Use Picker in Component

**File:** `src/app/features/my-feature/my-component.component.ts`

```typescript
import { Component } from '@angular/core';
import { PickerSelectionEvent } from '../../shared/models/picker-config.model';
import { MyPickerRow } from '../../config/my-picker.config';

@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.component.html',
  styleUrls: ['./my-component.component.scss'],
})
export class MyComponent {
  /**
   * Handle picker selection changes
   */
  onMyPickerSelectionChange(event: PickerSelectionEvent<MyPickerRow>): void {
    console.log('My Picker selection changed:', event);
    console.log('Picker ID:', event.pickerId);
    console.log('Selected items:', event.selections);
    console.log('Selected keys:', event.keys);

    // Do something with selections
    // e.g., filter results, update state, etc.
  }
}
```

**File:** `src/app/features/my-feature/my-component.component.html`

```html
<!-- Basic usage -->
<app-base-picker
  [configId]="'my-picker'"
  (selectionChange)="onMyPickerSelectionChange($event)"
>
</app-base-picker>

<!-- With context (e.g., for vehicle-specific picker) -->
<app-base-picker
  [configId]="'my-picker'"
  [context]="{ vehicleId: currentVehicleId }"
  (selectionChange)="onMyPickerSelectionChange($event)"
>
</app-base-picker>

<!-- With external filters (auto-select matching rows) -->
<app-base-picker
  [configId]="'my-picker'"
  [externalFilters]="queryControlFilters"
  (selectionChange)="onMyPickerSelectionChange($event)"
>
</app-base-picker>
```

---

### Step 5: Ensure Module Imports

**File:** `src/app/app.module.ts` or feature module

Make sure `SharedModule` is imported (it exports `BasePickerComponent`):

```typescript
import { SharedModule } from './shared/shared.module';

@NgModule({
  imports: [
    // ... other imports
    SharedModule,  // ← Provides BasePickerComponent
  ],
})
export class AppModule {}
```

---

### Step 6: Add Backend Endpoint (Optional)

If your picker requires a new backend API endpoint:

**File:** `backend/src/routes/vehicleRoutes.js`

```javascript
/**
 * GET /api/v1/my-picker-data
 * Returns data for my picker
 */
router.get('/my-picker-data', getMyPickerDataHandler);
```

**File:** `backend/src/controllers/vehicleController.js`

```javascript
async function getMyPickerDataHandler(req, res, next) {
  try {
    const { page = 1, size = 20, search, category } = req.query;

    // Query your data source
    const results = await queryMyPickerData({
      page: parseInt(page),
      size: parseInt(size),
      search,
      category,
    });

    res.json({
      data: results.items,
      total: results.total,
      page: parseInt(page),
      size: parseInt(size),
      totalPages: Math.ceil(results.total / parseInt(size)),
    });
  } catch (error) {
    console.error('Error in getMyPickerDataHandler:', error);
    next(error);
  }
}

module.exports = {
  // ... other exports
  getMyPickerDataHandler,
};
```

---

## Complete Checklist

### Required Steps:
- [ ] **Step 1:** Create `src/app/config/my-picker.config.ts`
  - [ ] Define `MyPickerRow` interface
  - [ ] Define `MY_PICKER_CONFIG` object
  - [ ] Configure columns
  - [ ] Configure API (method OR http)
  - [ ] Configure row (keyGenerator, keyParser)
  - [ ] Configure selection (urlParam, serializer, deserializer)
  - [ ] Configure filtering (if client-side mode)
  - [ ] Configure sorting (if client-side mode)
  - [ ] Configure caching
  - [ ] Configure pagination

- [ ] **Step 2:** Register in `src/app/config/picker-configs.ts`
  - [ ] Import your config
  - [ ] Add to `PICKER_CONFIGS` object

- [ ] **Step 3:** Add API method (ONLY if using ApiService mode)
  - [ ] Add method to `src/app/services/api.service.ts`

- [ ] **Step 4:** Use picker in component
  - [ ] Add `<app-base-picker>` to template
  - [ ] Handle `(selectionChange)` event
  - [ ] Test selection persistence (check URL updates)

### Optional Steps:
- [ ] **Step 5:** Add backend endpoint (if new API needed)
- [ ] **Step 6:** Add custom formatter functions for columns
- [ ] **Step 7:** Add range filters (if needed)
- [ ] **Step 8:** Test pop-out mode compatibility
- [ ] **Step 9:** Add loading states
- [ ] **Step 10:** Add error handling

---

## Testing Your New Picker

### 1. Test Selection

**Steps:**
1. Load the page with your picker
2. Select multiple rows using checkboxes
3. Click "Apply"
4. Check URL - should contain: `?myPickerSelections=id1,id2,id3`
5. Refresh page - selections should persist

**Expected Behavior:**
- ✅ URL updates when Apply clicked
- ✅ Selections persist across page refreshes
- ✅ Selections appear as checked rows after reload

---

### 2. Test Filtering

**Steps:**
1. Type text in column filter inputs
2. Verify rows filter correctly
3. Select some filtered rows
4. Apply selections
5. Clear filters
6. Verify selections still show in full dataset

**Expected Behavior:**
- ✅ Filters work correctly (client or server-side)
- ✅ Selections work on filtered results
- ✅ Selected rows persist when filters cleared

---

### 3. Test Pagination

**Steps:**
1. Change page size (e.g., 10 → 50)
2. Navigate to page 2
3. Select rows on page 2
4. Navigate to page 3
5. Click Apply
6. Navigate back to page 2
7. Verify selections still checked

**Expected Behavior:**
- ✅ Page size changes work
- ✅ Selections persist across pages
- ✅ Checkboxes reflect selection state on all pages

---

### 4. Test Pop-out Mode (if applicable)

**Steps:**
1. Pop out the picker panel
2. Make selections in pop-out window
3. Click Apply
4. Verify main window URL updates
5. Verify selections appear in both windows
6. Close pop-out window
7. Verify selections persist in main window

**Expected Behavior:**
- ✅ Pop-out window shows same data
- ✅ Selections in pop-out update main window
- ✅ BroadcastChannel communication works
- ✅ Closing pop-out doesn't lose selections

---

### 5. Test Clear Button

**Steps:**
1. Make multiple selections
2. Click Apply
3. Verify URL has selections
4. Click Clear
5. Verify URL parameter removed
6. Verify checkboxes unchecked

**Expected Behavior:**
- ✅ Clear button unchecks all rows
- ✅ URL parameter removed
- ✅ Selection count shows 0

---

## Quick Examples

### Example 1: Simple Client-Side Picker (Static Data)

**Use Case:** Small dataset (<500 rows), data rarely changes

```typescript
export const STATIC_PICKER_CONFIG: PickerConfig<StaticRow> = {
  id: 'static-picker',
  displayName: 'Static Data Picker',

  columns: [
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'value', label: 'Value', sortable: true },
  ],

  api: {
    method: 'getStaticData',
    paramMapper: () => ({ page: 1, size: 1000 }),  // Load all
    responseTransformer: (response) => ({
      results: response.data,
      total: response.data.length,
      page: 1,
      size: response.data.length,
      totalPages: 1,
    }),
  },

  row: {
    keyGenerator: (row) => row.id,
    keyParser: (key) => ({ id: key, key }),
  },

  selection: {
    urlParam: 'staticSelections',
    serializer: (selections) => selections.map(s => s.id).join(','),
    deserializer: (urlValue) => urlValue.split(',').map(id => ({ id, key: id })),
  },

  filtering: {
    filters: {
      name: (row, value) => row.name.toLowerCase().includes(value.toLowerCase()),
    },
  },

  sorting: {
    comparators: {
      name: (a, b) => a.name.localeCompare(b.name),
      value: (a, b) => a.value - b.value,
    },
  },

  caching: {
    enabled: true,
    ttl: 0,  // Cache forever (static data)
  },

  pagination: {
    mode: 'client',  // Client-side pagination
    defaultPageSize: 20,
  },
};
```

---

### Example 2: Server-Side Picker (Large Dataset)

**Use Case:** Large dataset (>1000 rows), frequently updated

```typescript
export const LARGE_PICKER_CONFIG: PickerConfig<LargeRow> = {
  id: 'large-picker',
  displayName: 'Large Dataset Picker',

  columns: [
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'category', label: 'Category', sortable: true, filterable: true },
  ],

  api: {
    http: {
      method: 'GET',
      endpoint: '/large-dataset',
    },
    paramMapper: (params) => ({
      page: params.page,
      size: params.size,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.filters?.name,
      category: params.filters?.category,
    }),
    responseTransformer: (response) => ({
      results: response.items,
      total: response.total,
      page: response.page,
      size: response.size,
      totalPages: response.totalPages,
    }),
  },

  row: {
    keyGenerator: (row) => row.id,
    keyParser: (key) => ({ id: key, key }),
  },

  selection: {
    urlParam: 'largeSelections',
    serializer: (selections) => selections.map(s => s.id).join(','),
    deserializer: (urlValue) => urlValue.split(',').map(id => ({ id, key: id })),
  },

  filtering: {
    filters: {},  // Server-side filtering
  },

  sorting: {
    comparators: {},  // Server-side sorting
  },

  caching: {
    enabled: true,
    ttl: 300000,  // 5 minute cache
  },

  pagination: {
    mode: 'server',  // Server-side pagination
    defaultPageSize: 20,
  },
};
```

---

### Example 3: Context-Aware Picker (VIN Picker Pattern)

**Use Case:** Data scoped to a parent entity (e.g., VINs for a specific vehicle)

```typescript
export const CONTEXT_PICKER_CONFIG: PickerConfig<ContextRow> = {
  id: 'context-picker',
  displayName: 'Context-Aware Picker',

  columns: [
    { key: 'vin', label: 'VIN', sortable: true },
    { key: 'mileage', label: 'Mileage', sortable: true },
  ],

  api: {
    method: 'getContextData',
    paramMapper: (params) => ({
      vehicleId: params.filters.vehicleId,  // From [context] input
      page: params.page,
      size: params.size,
    }),
    responseTransformer: (response) => ({
      results: response.instances,
      total: response.total,
      page: response.page,
      size: response.size,
      totalPages: response.totalPages,
    }),
  },

  row: {
    keyGenerator: (row) => row.vin,
    keyParser: (key) => ({ vin: key, key }),
  },

  selection: {
    urlParam: 'contextSelections',
    serializer: (selections) => selections.map(s => s.vin).join(','),
    deserializer: (urlValue) => urlValue.split(',').map(vin => ({ vin, key: vin })),
  },

  filtering: { filters: {} },
  sorting: { comparators: {} },

  caching: {
    enabled: false,  // Context-specific data shouldn't be cached
  },

  pagination: {
    mode: 'server',
    defaultPageSize: 20,
  },
};
```

**Usage:**
```html
<app-base-picker
  [configId]="'context-picker'"
  [context]="{ vehicleId: selectedVehicle.id }"
  (selectionChange)="onContextSelection($event)"
>
</app-base-picker>
```

---

### Example 4: External API Picker (Direct HTTP Mode)

**Use Case:** Fetching data from an external API (not your backend)

```typescript
export const EXTERNAL_PICKER_CONFIG: PickerConfig<ExternalRow> = {
  id: 'external-picker',
  displayName: 'External API Picker',

  columns: [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'author', label: 'Author', sortable: true },
  ],

  api: {
    http: {
      method: 'GET',
      endpoint: '/books',
      baseUrl: 'https://external-api.com/api',  // External API
    },
    paramMapper: (params) => ({
      page: params.page,
      limit: params.size,  // External API uses 'limit' not 'size'
      sort: params.sortBy,
      order: params.sortOrder,
    }),
    responseTransformer: (response) => ({
      results: response.books.map(book => ({
        id: book.isbn,
        title: book.title,
        author: book.author,
        key: book.isbn,
      })),
      total: response.totalCount,
      page: response.currentPage,
      size: response.pageSize,
      totalPages: response.pages,
    }),
  },

  row: {
    keyGenerator: (row) => row.id,
    keyParser: (key) => ({ id: key, key }),
  },

  selection: {
    urlParam: 'externalSelections',
    serializer: (selections) => selections.map(s => s.id).join(','),
    deserializer: (urlValue) => urlValue.split(',').map(id => ({ id, key: id })),
  },

  filtering: { filters: {} },
  sorting: { comparators: {} },

  caching: {
    enabled: true,
    ttl: 600000,  // 10 minute cache (external API)
  },

  pagination: {
    mode: 'server',
    defaultPageSize: 20,
  },
};
```

---

## Troubleshooting

### Issue: Picker doesn't appear

**Symptoms:**
- No table rendered
- Console error: "Config not found"

**Solutions:**
1. Verify config ID matches between config file and `PICKER_CONFIGS`
2. Ensure `SharedModule` is imported in parent module
3. Check for TypeScript compilation errors
4. Verify `configId` input matches registered config ID

---

### Issue: Selections don't persist to URL

**Symptoms:**
- Clicking Apply doesn't update URL
- Page refresh loses selections

**Solutions:**
1. Check `urlParam` is unique (not used by other components)
2. Verify `serializer` returns a valid string
3. Check browser console for errors in `onApply()` method
4. Ensure `RouteStateService` is working (check other pickers)

---

### Issue: Data doesn't load

**Symptoms:**
- Table shows "No data"
- Loading spinner indefinitely
- Console errors about API

**Solutions:**
1. **ApiService mode:** Verify method exists in `api.service.ts`
2. **HTTP mode:** Check endpoint URL is correct
3. Verify backend endpoint exists and returns correct format
4. Check `responseTransformer` is returning required fields
5. Look for CORS errors (if using external API)
6. Check network tab for actual API response

---

### Issue: Filters/sorting don't work

**Symptoms:**
- Column filters have no effect
- Sorting doesn't change order

**Solutions:**
1. **Client-side mode:** Verify `filtering.filters` and `sorting.comparators` are defined
2. **Server-side mode:** Verify `paramMapper` sends filter/sort params to backend
3. Check backend handles filter/sort parameters correctly
4. Verify `filterable: true` and `sortable: true` on columns

---

### Issue: Checkboxes don't reflect selections

**Symptoms:**
- Selections in URL but checkboxes unchecked
- Refresh shows selections but they disappear

**Solutions:**
1. Verify `keyGenerator` returns unique, stable keys
2. Check `deserializer` creates objects with correct shape
3. Ensure data has loaded before hydration (`dataLoaded` event)
4. Check for case-sensitivity issues in keys
5. Verify `row.key` field exists on all rows

---

### Issue: Pop-out mode not working

**Symptoms:**
- Pop-out opens but selections don't sync
- Apply in pop-out doesn't update main window

**Solutions:**
1. Verify BroadcastChannel is supported (modern browsers only)
2. Check browser console in BOTH windows for errors
3. Verify `PopOutContextService` is injected correctly
4. Test non-pop-out mode first (isolate issue)

---

## Related Documentation

- **[Pickers vs Tables Architecture](../architecture/pickers-vs-tables.md)** - Understanding picker vs table distinction
- **[State Management Guide](../state-management-guide.md)** - URL-driven state patterns
- **[BaseDataTable API](../../frontend/src/app/shared/components/base-data-table/README.md)** - Underlying table component
- **[PickerConfig Interface](../../frontend/src/app/shared/models/picker-config.model.ts)** - Complete config schema
- **[Pop-out Architecture](../design/panel-popout-architecture.md)** - Cross-window state sync

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-07 | 1.0.0 | Initial guide created |

---

**Maintained By:** Development Team
**Last Updated:** 2025-11-07

---

## Quick Reference

### Minimum Viable Picker Config

```typescript
export const MIN_PICKER_CONFIG: PickerConfig<MinRow> = {
  id: 'min-picker',
  displayName: 'Minimum Picker',
  columns: [
    { key: 'name', label: 'Name', sortable: true, filterable: true },
  ],
  api: {
    method: 'getData',
    paramMapper: (p) => ({ page: p.page, size: p.size }),
    responseTransformer: (r) => ({ results: r.data, total: r.total, page: 1, size: 20, totalPages: 1 }),
  },
  row: {
    keyGenerator: (r) => r.id,
    keyParser: (k) => ({ id: k, key: k }),
  },
  selection: {
    urlParam: 'minSelections',
    serializer: (s) => s.map(x => x.id).join(','),
    deserializer: (v) => v.split(',').map(id => ({ id, key: id })),
  },
  filtering: { filters: {} },
  sorting: { comparators: {} },
  caching: { enabled: true, ttl: 300000 },
  pagination: { mode: 'server', defaultPageSize: 20 },
};
```

### Common Patterns Cheat Sheet

```typescript
// Simple key (single field)
keyGenerator: (row) => row.id
keyParser: (key) => ({ id: key, key })

// Complex key (multiple fields)
keyGenerator: (row) => `${row.category}|${row.id}`
keyParser: (key) => {
  const [category, id] = key.split('|');
  return { category, id, key };
}

// Simple serialization
serializer: (selections) => selections.map(s => s.id).join(',')
deserializer: (urlValue) => urlValue.split(',').map(id => ({ id, key: id }))

// Complex serialization (with metadata)
serializer: (selections) => selections.map(s => `${s.id}:${s.type}`).join(',')
deserializer: (urlValue) => urlValue.split(',').map(combo => {
  const [id, type] = combo.split(':');
  return { id, type, key: id };
})
```

---

**Need help?** Check the existing picker configs for real-world examples:
- `manufacturer-model-picker.config.ts` - Client-side pagination
- `vin-picker.config.ts` - Context-aware server-side
- `vin-browser.config.ts` - Global server-side with complex filters

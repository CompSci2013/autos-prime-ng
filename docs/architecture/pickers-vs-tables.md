# Architecture: Pickers vs Tables

**Project:** AUTOS PrimeNG Frontend
**Created:** 2025-11-07
**Purpose:** Explain the architectural distinction between Pickers and Tables in the application

---

## Overview

Both **Pickers** and **Tables** use the **BaseDataTableComponent** as their foundation, but they serve fundamentally different purposes and add different layers of functionality on top of it.

**Key Insight:**
- **Pickers** = BaseDataTable + Selection Logic + URL Persistence
- **Tables** = BaseDataTable + Pre-fetched Data + Row Expansion + Ephemeral Filters

---

## BaseDataTableComponent (Foundation Layer)

**Location:** `src/app/shared/components/base-data-table/`

**Purpose:** Reusable table rendering component that handles common table functionality

### What BaseDataTable Provides:
- ✅ Table rendering (columns, rows, pagination controls)
- ✅ Sorting (server-side or client-side)
- ✅ Filtering (column filter inputs)
- ✅ Row expansion (expandable content slots)
- ✅ Column management (reorder, hide/show, reset)
- ✅ State persistence (localStorage for UI preferences: column order, visibility, page size)
- ✅ Data source abstraction (can fetch data OR display pre-fetched data)
- ✅ OnPush change detection optimization

### What BaseDataTable Does NOT Provide:
- ❌ Selection logic (checkboxes, selection state)
- ❌ URL state management (reading/writing query parameters)
- ❌ Multi-select UI (Apply/Clear buttons)
- ❌ Pop-out window messaging

### Key Interfaces:
```typescript
// Column definition
interface TableColumn<T> {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'number' | 'number-range';
  hideable?: boolean;
  clientSideSort?: boolean;  // For computed fields
  formatter?: (value: any) => string;
}

// Query parameters
interface TableQueryParams {
  page: number;
  size: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Data source abstraction
interface TableDataSource<T> {
  fetch(params: TableQueryParams): Observable<TableResponse<T>>;
  getCachedData?(): T[];
}
```

---

## 1. Pickers (BasePickerComponent)

**Location:** `src/app/shared/components/base-picker/`

**Purpose:** Allow users to **select multiple items** from a dataset and persist those selections to the URL for sharing/bookmarking

### Architecture Diagram:
```
┌─────────────────────────────────────────────────────────┐
│ BasePickerComponent<T>                                  │
│ - Manages selection state (Set<string>)                 │
│ - Reads/writes URL state (via urlParam)                 │
│ - Provides Apply/Clear buttons                          │
│ - Configuration-driven (PickerConfig)                   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ BaseDataTableComponent<T>                         │  │
│  │ - Renders table with selection column prepended   │  │
│  │ - Handles pagination, sorting, filtering          │  │
│  │ - Emits queryParamsChange events                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Additional Features (on top of BaseDataTable):
1. **Multi-select Logic**
   - Checkbox column (prepended to table)
   - Set-based selection storage (O(1) lookups)
   - `selectedRows: Set<string>` for performance
   - `selectedItemsDisplay: string[]` for template binding (avoids function calls)

2. **Selection Persistence (URL-Driven)**
   - Reads selections from URL on initialization
   - Hydrates checkboxes when data loads
   - Updates URL when user clicks "Apply"
   - Removes URL param when user clicks "Clear"

3. **Apply / Clear Buttons**
   - **Apply**: Serializes selections → Updates URL → Emits `selectionChange` event
   - **Clear**: Clears selection Set → Removes URL param → Emits empty `selectionChange`

4. **Configuration-Driven (PickerConfig)**
   - All behavior defined in config files
   - API endpoint mapping
   - Selection serialization/deserialization
   - Row key generation
   - Filtering logic
   - Sorting comparators

5. **Pop-out Awareness**
   - Detects if running in pop-out window
   - Sends BroadcastChannel messages to main window
   - Messages: `PICKER_SELECTION_CHANGE`, `PICKER_CLEAR`

6. **External Filter Integration**
   - Accepts `externalFilters` input from parent
   - Auto-selects rows matching external criteria
   - URL selections take precedence over external filters

### Configuration Example:
```typescript
// src/app/config/manufacturer-model-picker.config.ts
export const MANUFACTURER_MODEL_PICKER_CONFIG: PickerConfig<ManufacturerModelPickerRow> = {
  id: 'manufacturer-model',
  displayName: 'Manufacturer & Model Picker',

  columns: [
    { key: 'manufacturer', label: 'Manufacturer', sortable: true, filterable: true },
    { key: 'model', label: 'Model', sortable: true, filterable: true },
    { key: 'count', label: 'Count', sortable: true },
  ],

  api: {
    method: 'getManufacturerModelCombinations',
    responseTransformer: (response) => ({ results, total, page, size, totalPages }),
  },

  row: {
    keyGenerator: (row) => `${row.manufacturer}|${row.model}`,
    keyParser: (key) => { manufacturer, model },
  },

  selection: {
    urlParam: 'modelCombos',
    serializer: (selections) => 'Ford:F-150,Chevrolet:Corvette',
    deserializer: (urlValue) => [...array of objects],
  },

  pagination: {
    mode: 'client',  // or 'server'
    defaultPageSize: 20,
  },

  caching: {
    enabled: true,
    ttl: 0,  // Cache forever (data rarely changes)
  },
};
```

### Usage Example:
```html
<app-base-picker
  [configId]="'manufacturer-model'"
  [externalFilters]="queryControlFilters"
  (selectionChange)="onPickerSelectionChange($event)"
>
</app-base-picker>
```

### Current Pickers in Application:
1. **Manufacturer-Model Picker** (`manufacturer-model-picker.config.ts`)
   - Select vehicle models to search for
   - Client-side pagination (~200 combinations)
   - URL param: `modelCombos`

2. **VIN Picker** (`vin-picker.config.ts`)
   - Select VINs for a specific vehicle
   - Server-side pagination (per vehicle context)
   - URL param: `selectedVins`

3. **VIN Browser** (`vin-browser.config.ts`)
   - Browse ALL VINs globally (55,463 total)
   - Server-side pagination with filtering
   - URL param: `selectedVinsBrowser`

---

## 2. Tables (e.g., ResultsTableComponent)

**Location:** `src/app/features/results/results-table/`

**Purpose:** **Display** data with pagination, sorting, filtering, and row expansion (NO selection)

### Architecture Diagram:
```
┌─────────────────────────────────────────────────────────┐
│ ResultsTableComponent                                   │
│ - Subscribes to StateManagementService                  │
│ - Receives pre-fetched data (results$)                  │
│ - Manages row expansion state                           │
│ - Lazy-loads VIN instances on expand                    │
│ - Handles ephemeral filters (non-URL)                   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ BaseDataTableComponent<VehicleResult>             │  │
│  │ - Renders vehicle results                         │  │
│  │ - NO selection column                             │  │
│  │ - Expandable rows for VIN instances               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Additional Features (on top of BaseDataTable):
1. **Pre-fetched Data Mode**
   - Receives data from `StateManagementService.results$`
   - No direct API calls (StateManagement handles fetching)
   - Passes data via `[data]` input instead of `[dataSource]`

2. **Row Expansion with Lazy Loading**
   - Expandable rows for vehicles with VIN instances
   - Lazy-loads VIN data on first expand (caches afterward)
   - `expandedRowInstances: Map<string, VehicleInstance[]>`
   - `isRowExpandable` callback: `(vehicle) => vehicle.instance_count > 0`

3. **Expand All / Collapse All**
   - Bulk expansion controls
   - `onExpandAll()`: Expands + loads VINs for all vehicles with data
   - `onCollapseAll()`: Collapses all rows (keeps cached VIN data)

4. **Pop-out Awareness**
   - Detects if running in pop-out window
   - Sends messages for pagination/sort changes
   - Messages: `PAGINATION_SORT_CHANGE`, `EPHEMERAL_FILTER_CHANGE`

5. **Ephemeral Filters (Non-URL)**
   - Column filter inputs (text searches)
   - Applied at fetch time, NOT persisted to URL
   - Example: User types "Ford" in manufacturer column
   - Separation: Query Control = URL filters, Table = ephemeral filters

6. **Read-only State (Single Responsibility)**
   - **WRITES (owns):** page, size, sort, sortDirection
   - **READS (doesn't own):** manufacturer, model, yearMin/Max, bodyClass, dataSource
   - Clear separation prevents state conflicts

### State Management Pattern:
```typescript
// ResultsTableComponent READS filter state from URL
this.stateService.filters$.subscribe((filters) => {
  this.tableQueryParams = {
    page: filters.page || 1,
    size: filters.size || 20,
    sortBy: filters.sort,
    sortOrder: filters.sortDirection,
    filters: {},  // Column filters are ephemeral
  };
});

// ResultsTableComponent WRITES pagination/sort state
onTableQueryChange(params: TableQueryParams) {
  if (params.page !== currentFilters.page) {
    this.stateService.updateFilters({ page: params.page });
  }
  // Ephemeral filters don't update URL
  if (hasEphemeralFilters) {
    this.stateService.fetchWithEphemeralFilters(ephemeralFilters);
  }
}
```

### Usage Example:
```html
<app-base-data-table
  tableId="vehicle-results"
  [columns]="columns"
  [data]="results"
  [totalCount]="totalResults"
  [queryParams]="tableQueryParams"
  [loading]="isLoading"
  [expandable]="true"
  [isRowExpandable]="canExpandRow"
  (queryParamsChange)="onTableQueryChange($event)"
  (rowExpand)="onRowExpand($event)"
  (expandAll)="onExpandAll()"
  (collapseAll)="onCollapseAll()"
>
  <ng-template #expansionTemplate let-row>
    <!-- VIN instances display -->
  </ng-template>
</app-base-data-table>
```

---

## Comparison Matrix

| Feature | **BaseDataTableComponent** | **BasePickerComponent** | **ResultsTableComponent** |
|---------|---------------------------|-------------------------|---------------------------|
| **Table rendering** | ✅ (core) | ✅ (uses BaseDataTable) | ✅ (uses BaseDataTable) |
| **Pagination controls** | ✅ (core) | ✅ | ✅ |
| **Sorting** | ✅ (core) | ✅ | ✅ |
| **Column filtering** | ✅ (core) | ✅ | ✅ (ephemeral, non-URL) |
| **Row expansion** | ✅ (core) | ✅ | ✅ (with lazy loading) |
| **Column management** | ✅ (core) | ✅ | ✅ |
| **State persistence** | ✅ (localStorage) | ✅ (localStorage) | ✅ (localStorage) |
| **Multi-select checkboxes** | ❌ | ✅ | ❌ |
| **Apply / Clear buttons** | ❌ | ✅ | ❌ |
| **URL state (selections)** | ❌ | ✅ | ❌ |
| **URL state (pagination/sort)** | ❌ | ❌ | ✅ |
| **Configuration-driven** | ❌ | ✅ (PickerConfig) | ❌ |
| **Selection events** | ❌ | ✅ (`selectionChange`) | ❌ |
| **Pop-out messaging** | ❌ | ✅ | ✅ |
| **External filter integration** | ❌ | ✅ (auto-select rows) | ❌ |
| **Lazy-loaded expansion** | ❌ | ❌ | ✅ (VIN instances) |
| **Pre-fetched data mode** | ✅ (via `[data]`) | ❌ (always fetches) | ✅ (StateManagement) |

---

## Visual Comparison

### Picker UI:
```
┌──────────────────────────────────────────────────────────┐
│  Manufacturer & Model Picker                        [x]  │
├──────────────────────────────────────────────────────────┤
│  [Search: Ford]                            Page: 1 of 10 │
├──────────────────────────────────────────────────────────┤
│  ☑ Select │ Manufacturer │ Model      │ Count            │
│  ─────────┼──────────────┼────────────┼─────────         │
│  ☐        │ Ford         │ Bronco     │ 25               │
│  ☑        │ Ford         │ F-150      │ 250              │
│  ☐        │ Ford         │ Mustang    │ 150              │
│  ☑        │ Chevrolet    │ Corvette   │ 100              │
│  ☐        │ Tesla        │ Model 3    │ 150              │
├──────────────────────────────────────────────────────────┤
│  2 selected                                              │
│                                   [Clear]  [Apply]       │ ← PICKER-SPECIFIC
└──────────────────────────────────────────────────────────┘
```

### Table UI:
```
┌──────────────────────────────────────────────────────────┐
│  Vehicle Search Results                                  │
├──────────────────────────────────────────────────────────┤
│  [Expand All] [Collapse All]                             │ ← TABLE-SPECIFIC
├──────────────────────────────────────────────────────────┤
│  Manufacturer │ Model    │ Year │ Body Class │ VIN Count │
│  ─────────────┼──────────┼──────┼────────────┼────────── │
│  ► Ford       │ F-150    │ 2020 │ Pickup     │ 12        │
│  ▼ Chevrolet  │ Corvette │ 2019 │ Coupe      │ 8         │
│    ┌──────────────────────────────────────────────────┐  │
│    │ VIN Instances (8 total)                          │  │ ← EXPANSION CONTENT
│    │ VIN: 1G1... │ Mileage: 25,000 │ Value: $45,000   │  │
│    │ VIN: 1G1... │ Mileage: 18,500 │ Value: $52,000   │  │
│    └──────────────────────────────────────────────────┘  │
│  ► Tesla      │ Model 3  │ 2021 │ Sedan      │ 15        │
├──────────────────────────────────────────────────────────┤
│  Showing 1-20 of 4,887               [< 1 2 3 4 5 ... >] │
└──────────────────────────────────────────────────────────┘
```

---

## Decision Tree: When to Use Which?

### Use a **Picker** when:
✅ Users need to **select multiple items** from a dataset
✅ Selections need to **persist to URL** (for sharing/bookmarking)
✅ You need **Apply/Clear** buttons to commit selections
✅ Selection state drives other components (e.g., Query Control → Results)
✅ Example: Choosing which vehicle models to search for

### Use a **Table** when:
✅ Users need to **view and explore** data (no selection)
✅ You need **row expansion** for additional details
✅ You want **ephemeral filters** (searches that don't affect URL)
✅ Data is pre-fetched by a parent service (StateManagement)
✅ Example: Viewing search results with VIN details on expand

### Use **BaseDataTable directly** when:
✅ You need a simple table without selection or complex state
✅ You're building a custom component with unique requirements
✅ Neither Picker nor Table patterns fit your use case

---

## Implementation Guidelines

### Creating a New Picker:
1. **Create PickerConfig** in `src/app/config/`:
   ```typescript
   export const MY_PICKER_CONFIG: PickerConfig<MyRow> = {
     id: 'my-picker',
     columns: [...],
     api: { method, responseTransformer },
     row: { keyGenerator, keyParser },
     selection: { urlParam, serializer, deserializer },
     pagination: { mode: 'client' | 'server' },
   };
   ```

2. **Register Config** in `src/app/config/picker-configs.ts`:
   ```typescript
   export const PICKER_CONFIGS = {
     'my-picker': MY_PICKER_CONFIG,
   };
   ```

3. **Use in Template**:
   ```html
   <app-base-picker
     [configId]="'my-picker'"
     (selectionChange)="onSelectionChange($event)"
   >
   </app-base-picker>
   ```

### Creating a New Table:
1. **Create Component** extending results-table pattern
2. **Define Columns** (no selection column needed)
3. **Subscribe to Data Source** (StateManagement or direct API)
4. **Handle Query Changes** (pagination/sort → URL, filters → ephemeral)
5. **Implement Expansion** (optional, if needed)

---

## Related Documentation

- [State Management Guide](../state-management-guide.md) - URL-driven state patterns
- [BaseDataTable API](../../frontend/src/app/shared/components/base-data-table/README.md) - Component API reference
- [Picker Configuration Schema](../../frontend/src/app/shared/models/picker-config.model.ts) - PickerConfig interface
- [Pop-out Architecture](../design/panel-popout-architecture.md) - Cross-window state sync

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-07 | 1.0.0 | Initial documentation created |

---

**Maintained By:** Development Team
**Last Updated:** 2025-11-07

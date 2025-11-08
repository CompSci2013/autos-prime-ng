# Developer Instruction Manual: Adding New Pickers

**Project:** AUTOS PrimeNG Frontend
**Version:** 2.0
**Last Updated:** 2025-11-07
**Target Audience:** Frontend Developers

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Complete Step-by-Step Guide](#complete-step-by-step-guide)
5. [Real-World Example: Parts Picker](#real-world-example-parts-picker)
6. [Testing Your Picker](#testing-your-picker)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Patterns](#advanced-patterns)
9. [Quick Reference](#quick-reference)
10. [Appendices](#appendices)

---

## Introduction

### What is a Picker?

A **picker** is a reusable, configuration-driven component that allows users to:

- ✅ Select multiple items from a dataset using checkboxes
- ✅ Persist selections to the URL for sharing and bookmarking
- ✅ Filter and sort data before selecting
- ✅ Apply or clear selections with dedicated buttons
- ✅ Work seamlessly in pop-out windows

### Why Use Pickers?

**Benefits:**
- **Zero code duplication** - Same component, different configurations
- **Consistent UX** - All pickers behave the same way
- **URL-driven state** - Selections survive page refreshes
- **Multi-API support** - Connect to internal or external APIs
- **Pop-out compatible** - Works in multi-window workflows

**Use Cases:**
- Selecting vehicle models to search
- Choosing specific VINs for a vehicle
- Browsing aftermarket parts
- Selecting engines, transmissions, dealerships, etc.

---

## Prerequisites

### Required Knowledge

Before creating a picker, you should understand:

- ✅ TypeScript interfaces and generics
- ✅ Angular component communication (@Input, @Output)
- ✅ RxJS Observables and operators
- ✅ HTTP API design (request/response formats)
- ✅ URL query parameters and routing

### Required Information

Before you start, gather:

1. **Data Source**
   - API endpoint URL
   - Authentication method (if external API)
   - Request/response format

2. **Display Requirements**
   - Which fields to show as columns
   - Which fields are filterable/sortable
   - How selections should be serialized to URL

3. **Pagination Strategy**
   - Client-side (< 1000 rows, data rarely changes)
   - Server-side (> 1000 rows, frequently updated)

4. **Caching Strategy**
   - How long to cache data (TTL)
   - Is data static or frequently updated?

---

## Architecture Overview

### Component Hierarchy

```
BasePickerComponent (configurable wrapper)
  │
  ├─ Configuration (PickerConfig)
  │   ├─ Columns
  │   ├─ API settings
  │   ├─ Selection logic
  │   └─ Pagination/Caching
  │
  ├─ BaseDataTableComponent (table rendering)
  │   ├─ Column management
  │   ├─ Filtering
  │   ├─ Sorting
  │   └─ Pagination
  │
  └─ BasePickerDataSource (data fetching)
      ├─ API mode detection
      ├─ HTTP client
      └─ Response transformation
```

### Data Flow

```
1. User opens picker
   ↓
2. BasePickerComponent loads config from PickerConfigService
   ↓
3. URL is checked for existing selections (hydration)
   ↓
4. BasePickerDataSource fetches data from API
   ↓
5. ResponseTransformer converts API data to picker rows
   ↓
6. BaseDataTableComponent displays data with checkboxes
   ↓
7. User selects rows and clicks "Apply"
   ↓
8. Serializer converts selections to URL string
   ↓
9. URL is updated with selections
   ↓
10. Page refresh → URL is read → Selections restored
```

---

## Complete Step-by-Step Guide

### Step 1: Create Picker Configuration File

**Filename:** `src/app/config/[picker-name]-picker.config.ts`

```typescript
/**
 * [Picker Name] Configuration
 *
 * Purpose: [Describe what this picker selects]
 * Data Source: [Internal API / External API URL]
 * Authentication: [None / API Key / Bearer Token]
 * Pagination: [Client-side / Server-side]
 */

import { PickerConfig } from '../shared/models/picker-config.model';
import { environment } from '../../environments/environment';

/**
 * Row Interface
 * Define the TypeScript interface for each row in the picker
 */
export interface [PickerName]Row {
  // Primary identifier (required)
  id: string;

  // Display fields
  displayName: string;
  category?: string;

  // Additional fields
  metadata?: any;

  // Composite key (required)
  key: string;
}

/**
 * Picker Configuration
 */
export const [PICKER_NAME]_CONFIG: PickerConfig<[PickerName]Row> = {
  // ========== IDENTITY ==========

  /**
   * Unique identifier for this picker
   * Used for localStorage keys, logging, and registration
   * MUST match the key in picker-configs.ts
   */
  id: '[picker-id]',

  /**
   * Human-readable display name
   * Shown in UI headers and logs
   */
  displayName: '[Picker Display Name]',

  // ========== COLUMNS ==========

  /**
   * Column definitions
   * Define which fields to display and how
   */
  columns: [
    {
      key: 'displayName',           // Column identifier (matches row property)
      label: 'Name',                // Column header text
      width: '40%',                 // CSS width
      sortable: true,               // Enable column sorting
      filterable: true,             // Show filter input
      filterType: 'text',           // Filter input type
      hideable: false,              // Allow hiding via column manager
      valuePath: 'displayName',     // Path to value in row object
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
      width: '30%',
      sortable: true,
      filterable: false,
      hideable: true,
      valuePath: 'id',
    },
  ],

  // ========== API CONFIGURATION ==========

  api: {
    /**
     * API Mode 1: Direct HTTP (recommended for external APIs)
     * No ApiService modification needed!
     */
    http: {
      method: 'GET',                              // HTTP method
      endpoint: '/endpoint-path',                 // API endpoint
      baseUrl: environment.externalApiBaseUrl,    // Optional: override base URL
      headers: {                                  // Optional: custom headers
        'X-API-Key': environment.apiKey,
        'Accept': 'application/json',
      },
    },

    /**
     * API Mode 2: ApiService method (legacy, for internal APIs)
     * Requires adding method to api.service.ts
     *
     * Uncomment this and remove 'http' above to use:
     */
    // method: 'getPickerData',

    /**
     * Parameter Mapper
     * Convert picker parameters to API request format
     */
    paramMapper: (params) => {
      return {
        // Standard pagination
        page: params.page || 1,
        size: params.size || 20,

        // Sorting (if server-side)
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,

        // Filters (map column keys to API parameters)
        ...(params.filters?.displayName && {
          search: params.filters.displayName,
        }),
        ...(params.filters?.category && {
          categoryFilter: params.filters.category,
        }),

        // Context data (from [context] input)
        ...params.filters,
      };
    },

    /**
     * Response Transformer
     * Convert API response to picker format
     *
     * MUST return: { results, total, page, size, totalPages }
     */
    responseTransformer: (response: any) => {
      // Defensive check
      if (!response || !response.items) {
        console.error('[PICKER] Invalid API response:', response);
        return {
          results: [],
          total: 0,
          page: 1,
          size: 0,
          totalPages: 0,
        };
      }

      // Transform API data to picker row format
      const rows: [PickerName]Row[] = response.items.map((item: any) => ({
        id: item.id,
        displayName: item.name,
        category: item.category,
        metadata: item.metadata,
        key: item.id,
      }));

      // Return standardized format
      return {
        results: rows,
        total: response.pagination?.total || rows.length,
        page: response.pagination?.page || 1,
        size: response.pagination?.size || rows.length,
        totalPages: response.pagination?.totalPages || 1,
      };
    },
  },

  // ========== ROW CONFIGURATION ==========

  row: {
    /**
     * Key Generator
     * Generate unique key from row object
     * MUST be deterministic and unique!
     */
    keyGenerator: (row) => {
      if (!row || !row.id) {
        console.warn('[PICKER] keyGenerator: invalid row:', row);
        return 'invalid-key';
      }

      // Simple key: use id
      return row.id;

      // Complex key: combine fields
      // return `${row.category}|${row.id}`;
    },

    /**
     * Key Parser
     * Parse key back to partial row object
     * Used for URL deserialization
     */
    keyParser: (key) => {
      // Simple key
      return { id: key, key } as Partial<[PickerName]Row>;

      // Complex key
      // const [category, id] = key.split('|');
      // return { category, id, key } as Partial<[PickerName]Row>;
    },
  },

  // ========== SELECTION CONFIGURATION ==========

  selection: {
    /**
     * URL Parameter Name
     * MUST be unique across all pickers
     */
    urlParam: 'selected[PickerName]',

    /**
     * Serializer
     * Convert selection array to URL string
     * Example: [row1, row2] → "id1,id2"
     */
    serializer: (selections) => {
      return selections.map(row => row.id).join(',');
    },

    /**
     * Deserializer
     * Convert URL string to selection array
     * Example: "id1,id2" → [row1, row2]
     */
    deserializer: (urlValue) => {
      if (!urlValue) return [];

      return urlValue
        .split(',')
        .filter(id => id.trim())
        .map(id => ({
          id: id.trim(),
          displayName: '',  // Will be filled when data loads
          key: id.trim(),
        } as [PickerName]Row));
    },
  },

  // ========== FILTERING (CLIENT-SIDE) ==========

  /**
   * Client-side filtering functions
   * Only used when pagination.mode = 'client'
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

  // ========== SORTING (CLIENT-SIDE) ==========

  /**
   * Client-side sorting comparators
   * Only used when pagination.mode = 'client'
   */
  sorting: {
    comparators: {
      displayName: (a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''),
      category: (a, b) => (a.category ?? '').localeCompare(b.category ?? ''),
      id: (a, b) => a.id.localeCompare(b.id),
    },
  },

  // ========== CACHING ==========

  caching: {
    enabled: true,     // Enable caching?
    ttl: 300000,       // Cache lifetime (5 minutes = 300000ms)
    // ttl: 0,         // Cache forever (for static data)
  },

  // ========== PAGINATION ==========

  pagination: {
    /**
     * Pagination Mode
     * - 'client': Load all data once, paginate in browser (< 1000 rows)
     * - 'server': Fetch data per page (> 1000 rows, frequently updated)
     */
    mode: 'server',  // or 'client'

    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};
```

---

### Step 2: Register Configuration

**Filename:** `src/app/config/picker-configs.ts`

```typescript
import { MANUFACTURER_MODEL_PICKER_CONFIG } from './manufacturer-model-picker.config';
import { VIN_PICKER_CONFIG } from './vin-picker.config';
import { VIN_BROWSER_CONFIG } from './vin-browser.config';
import { [PICKER_NAME]_CONFIG } from './[picker-name]-picker.config';  // ← ADD

/**
 * Central registry of all picker configurations
 */
export const PICKER_CONFIGS = {
  'manufacturer-model': MANUFACTURER_MODEL_PICKER_CONFIG,
  'vin-picker': VIN_PICKER_CONFIG,
  'vin-browser': VIN_BROWSER_CONFIG,
  '[picker-id]': [PICKER_NAME]_CONFIG,  // ← ADD (must match config.id)
};
```

**⚠️ CRITICAL:** The key must match the `id` in your config file!

---

### Step 3: Add API Method (Optional)

**⚠️ ONLY NEEDED if using `method` instead of `http` in your config**

**Filename:** `src/app/services/api.service.ts`

```typescript
/**
 * Get [picker name] data
 * @param params Query parameters from picker
 */
get[PickerName]Data(params: any): Observable<any> {
  const queryParams = new HttpParams({ fromObject: params });

  return this.http.get<any>(`${this.baseUrl}/picker-endpoint`, {
    params: queryParams,
  }).pipe(
    tap((response) => console.log('[API] get[PickerName]Data response:', response)),
    catchError((error) => {
      console.error('[API] get[PickerName]Data error:', error);
      throw error;
    })
  );
}
```

---

### Step 4: Add Environment Variables (if needed)

**Filename:** `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,

  // Existing
  apiBaseUrl: 'http://localhost:3000/api/v1',

  // Add external API URLs
  externalApiBaseUrl: 'https://external-api.com/v2',  // ← ADD
  externalApiKey: 'dev-api-key-12345',                // ← ADD
};
```

**Filename:** `src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,

  // Existing
  apiBaseUrl: '/api/v1',

  // Add external API URLs
  externalApiBaseUrl: 'https://api.external-api.com/v2',  // ← ADD
  externalApiKey: 'prod-api-key-xxxxx',                   // ← ADD
};
```

---

### Step 5: Use Picker in Component

**Filename:** `src/app/features/my-feature/my-component.component.ts`

```typescript
import { Component } from '@angular/core';
import { PickerSelectionEvent } from '../../shared/models/picker-config.model';
import { [PickerName]Row } from '../../config/[picker-name]-picker.config';

@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.component.html',
  styleUrls: ['./my-component.component.scss'],
})
export class MyComponent {
  /**
   * Handle picker selection changes
   */
  on[PickerName]SelectionChange(event: PickerSelectionEvent<[PickerName]Row>): void {
    console.log('[Component] Picker selection changed:', event);
    console.log('[Component] Picker ID:', event.pickerId);
    console.log('[Component] Selected items:', event.selections);
    console.log('[Component] Selected keys:', event.keys);

    // Do something with selections
    // e.g., filter other data, update state, trigger search, etc.
  }
}
```

**Filename:** `src/app/features/my-feature/my-component.component.html`

```html
<!-- Basic usage -->
<app-base-picker
  [configId]="'[picker-id]'"
  (selectionChange)="on[PickerName]SelectionChange($event)"
>
</app-base-picker>

<!-- With context (for context-aware pickers) -->
<app-base-picker
  [configId]="'[picker-id]'"
  [context]="{ vehicleId: selectedVehicleId, userId: currentUserId }"
  (selectionChange)="on[PickerName]SelectionChange($event)"
>
</app-base-picker>

<!-- With external filters (auto-select matching rows) -->
<app-base-picker
  [configId]="'[picker-id]'"
  [externalFilters]="{ manufacturer: 'Ford,Chevrolet' }"
  (selectionChange)="on[PickerName]SelectionChange($event)"
>
</app-base-picker>
```

---

### Step 6: Add Backend Endpoint (if needed)

**⚠️ ONLY NEEDED if creating a new internal API endpoint**

**Filename:** `backend/src/routes/vehicleRoutes.js`

```javascript
/**
 * GET /api/v1/picker-endpoint
 * Returns data for picker
 */
router.get('/picker-endpoint', get[PickerName]DataHandler);
```

**Filename:** `backend/src/controllers/vehicleController.js`

```javascript
async function get[PickerName]DataHandler(req, res, next) {
  try {
    const {
      page = 1,
      size = 20,
      search,
      categoryFilter,
      sortBy,
      sortOrder,
    } = req.query;

    // Query your data source
    const results = await query[PickerName]Data({
      page: parseInt(page),
      size: parseInt(size),
      search,
      categoryFilter,
      sortBy,
      sortOrder,
    });

    // Return standardized response
    res.json({
      items: results.data,
      pagination: {
        total: results.total,
        page: parseInt(page),
        size: parseInt(size),
        totalPages: Math.ceil(results.total / parseInt(size)),
      },
    });
  } catch (error) {
    console.error('Error in get[PickerName]DataHandler:', error);
    next(error);
  }
}

module.exports = {
  // ... other exports
  get[PickerName]DataHandler,
};
```

---

## Real-World Example: Parts Picker

Let's build a complete Parts Picker that connects to an external aftermarket parts API.

### Sample Elasticsearch Document

```json
{
  "_index": "aftermarket-parts",
  "_id": "BRK-45892-HC",
  "_score": 1.0,
  "_source": {
    "sku": "BRK-45892-HC",
    "productName": "High-Performance Ceramic Brake Pad Set",
    "categoryName": "Brakes & Brake Parts",
    "categoryPath": ["Automotive", "Brakes & Brake Parts", "Brake Pads"],
    "manufacturer": "StopTech",
    "partNumber": "309.08380",
    "description": "Street performance ceramic brake pads...",
    "compatibility": [
      {
        "year": 2015,
        "make": "Ford",
        "model": "Mustang",
        "trim": "GT",
        "notes": "Front axle only"
      }
    ],

    "pricing": {
      "currency": "USD",
      "retail": 189.99,
      "wholesale": 142.49,
      "cost": 95.00,
      "msrp": 229.99,
      "discounts": {
        "dealerDiscount": 0.25,
        "volumeDiscount": {
          "tier1": { "minQty": 10, "discount": 0.10 },
          "tier2": { "minQty": 25, "discount": 0.15 },
          "tier3": { "minQty": 50, "discount": 0.20 }
        }
      },
      "promotions": [
        {
          "code": "FALL2025",
          "description": "Fall Brake Sale",
          "discountPercent": 0.15,
          "validFrom": "2025-09-01",
          "validUntil": "2025-11-30"
        }
      ]
    },

    "inventory": {
      "available": 47,
      "reserved": 3,
      "onOrder": 100,
      "backorderAllowed": true,
      "warehouses": [
        {
          "warehouseId": "WH-EAST-01",
          "location": {
            "city": "Newark",
            "state": "NJ",
            "zipCode": "07102",
            "coordinates": {
              "latitude": 40.7357,
              "longitude": -74.1724
            }
          },
          "quantity": 25,
          "binLocation": "A-12-C-04",
          "lastRestocked": "2025-10-15T14:30:00Z"
        }
      ]
    },

    "vendor": "Performance Parts Unlimited",
    "vendorId": "PPU-8472",

    "specifications": {
      "dimensions": {
        "length": 6.5,
        "width": 3.2,
        "height": 0.8,
        "unit": "inches"
      },
      "weight": { "value": 2.4, "unit": "lbs" },
      "material": "Ceramic composite",
      "temperatureRange": {
        "min": -40,
        "max": 850,
        "unit": "fahrenheit"
      }
    },

    "ratings": {
      "average": 4.6,
      "count": 127,
      "distribution": {
        "5star": 89,
        "4star": 28,
        "3star": 7,
        "2star": 2,
        "1star": 1
      }
    },

    "status": "active",
    "createdAt": "2024-03-15T10:00:00Z",
    "updatedAt": "2025-11-07T18:45:00Z"
  }
}
```

### Complete Parts Picker Configuration

**Filename:** `src/app/config/parts-picker.config.ts`

```typescript
/**
 * Parts Picker Configuration
 *
 * Purpose: Browse and select aftermarket auto parts
 * Data Source: External Parts Supplier API
 * Endpoint: https://parts-supplier.com/api/v2/parts/search
 * Authentication: API Key in X-API-Key header
 * Pagination: Server-side
 */

import { PickerConfig } from '../shared/models/picker-config.model';
import { environment } from '../../environments/environment';

/**
 * Parts Picker Row Interface
 */
export interface PartsPickerRow {
  partNumber: string;
  name: string;
  category: string;
  price: number;
  dealerPrice: number;
  inStock: boolean;
  warehouseLocation: string;
  rating: number;
  manufacturer: string;
  key: string;
}

/**
 * Parts Picker Configuration
 */
export const PARTS_PICKER_CONFIG: PickerConfig<PartsPickerRow> = {
  id: 'parts-picker',
  displayName: 'Aftermarket Parts Browser',

  columns: [
    {
      key: 'partNumber',
      label: 'Part #',
      width: '12%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'partNumber',
    },
    {
      key: 'name',
      label: 'Part Name',
      width: '25%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'name',
    },
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '15%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'manufacturer',
    },
    {
      key: 'category',
      label: 'Category',
      width: '15%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'category',
    },
    {
      key: 'price',
      label: 'Retail Price',
      width: '10%',
      sortable: true,
      filterable: false,
      hideable: false,
      valuePath: 'price',
      formatter: (value) => value ? `$${value.toFixed(2)}` : '-',
    },
    {
      key: 'dealerPrice',
      label: 'Dealer Price',
      width: '10%',
      sortable: true,
      filterable: false,
      hideable: true,
      valuePath: 'dealerPrice',
      formatter: (value) => value ? `$${value.toFixed(2)}` : '-',
    },
    {
      key: 'inStock',
      label: 'In Stock',
      width: '8%',
      sortable: true,
      filterable: false,
      hideable: false,
      valuePath: 'inStock',
      formatter: (value) => value ? '✓ Yes' : '✗ No',
    },
    {
      key: 'warehouseLocation',
      label: 'Warehouse',
      width: '10%',
      sortable: false,
      filterable: false,
      hideable: true,
      valuePath: 'warehouseLocation',
    },
    {
      key: 'rating',
      label: 'Rating',
      width: '10%',
      sortable: true,
      filterable: false,
      hideable: true,
      valuePath: 'rating',
      formatter: (value) => value ? `${value.toFixed(1)} ⭐` : '-',
    },
  ],

  api: {
    // Direct HTTP mode - External API
    http: {
      method: 'GET',
      endpoint: '/parts/search',
      baseUrl: environment.partsApiBaseUrl,  // External API URL
      headers: {
        'X-API-Key': environment.partsApiKey,  // API Key authentication
        'Accept': 'application/json',
        'X-Client-Version': '1.0.0',
      },
    },

    /**
     * Parameter Mapper
     * Map picker params to external API format
     */
    paramMapper: (params) => {
      return {
        // External API uses different parameter names
        pageNumber: params.page || 1,
        pageSize: params.size || 20,

        // Search query
        query: params.filters?.name || params.filters?.partNumber,

        // Filters
        categoryFilter: params.filters?.category,
        manufacturerFilter: params.filters?.manufacturer,

        // Sorting
        orderBy: params.sortBy || 'partNumber',
        direction: params.sortOrder === 'asc' ? 'ascending' : 'descending',
      };
    },

    /**
     * Response Transformer
     * Transform external API response to picker format
     * Handles deeply nested fields!
     */
    responseTransformer: (response: any) => {
      // Defensive check
      if (!response || !response.items) {
        console.error('[PARTS_PICKER] Invalid API response:', response);
        return {
          results: [],
          total: 0,
          page: 1,
          size: 0,
          totalPages: 0,
        };
      }

      // Transform Elasticsearch documents to picker rows
      const rows: PartsPickerRow[] = response.items.map((item: any) => {
        // Extract top-level fields
        const partNumber = item.sku;
        const name = item.productName;
        const category = item.categoryName;
        const manufacturer = item.manufacturer;

        // DEEPLY NESTED: pricing.retail (2 levels)
        const price = item.pricing?.retail || 0;

        // DEEPLY NESTED: pricing.discounts.dealerDiscount (3 levels)
        const dealerDiscount = item.pricing?.discounts?.dealerDiscount || 0;
        const dealerPrice = price * (1 - dealerDiscount);

        // DEEPLY NESTED: inventory.available (2 levels)
        const inStock = (item.inventory?.available || 0) > 0;

        // DEEPLY NESTED: inventory.warehouses[0].location.city (4 levels!)
        const warehouseLocation =
          item.inventory?.warehouses?.[0]?.location?.city || 'Unknown';

        // DEEPLY NESTED: ratings.average (2 levels)
        const rating = item.ratings?.average || 0;

        return {
          partNumber,
          name,
          category,
          manufacturer,
          price,
          dealerPrice,
          inStock,
          warehouseLocation,
          rating,
          key: partNumber,
        };
      });

      // External API response structure
      return {
        results: rows,
        total: response.pagination?.totalRecords || rows.length,
        page: response.pagination?.currentPage || 1,
        size: response.pagination?.recordsPerPage || rows.length,
        totalPages: response.pagination?.totalPages || 1,
      };
    },
  },

  row: {
    keyGenerator: (row) => row.partNumber,
    keyParser: (key) => ({ partNumber: key, key } as Partial<PartsPickerRow>),
  },

  selection: {
    urlParam: 'selectedParts',

    serializer: (selections) => {
      return selections.map(s => s.partNumber).join(',');
    },

    deserializer: (urlValue) => {
      if (!urlValue) return [];

      return urlValue.split(',').map(partNum => ({
        partNumber: partNum,
        name: '',
        category: '',
        manufacturer: '',
        price: 0,
        dealerPrice: 0,
        inStock: false,
        warehouseLocation: '',
        rating: 0,
        key: partNum,
      } as PartsPickerRow));
    },
  },

  filtering: { filters: {} },  // Server-side filtering
  sorting: { comparators: {} },  // Server-side sorting

  caching: {
    enabled: true,
    ttl: 300000,  // 5 minutes (pricing changes frequently)
  },

  pagination: {
    mode: 'server',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};
```

### Register Parts Picker

**Filename:** `src/app/config/picker-configs.ts`

```typescript
import { MANUFACTURER_MODEL_PICKER_CONFIG } from './manufacturer-model-picker.config';
import { VIN_PICKER_CONFIG } from './vin-picker.config';
import { VIN_BROWSER_CONFIG } from './vin-browser.config';
import { PARTS_PICKER_CONFIG } from './parts-picker.config';  // ← ADD

export const PICKER_CONFIGS = {
  'manufacturer-model': MANUFACTURER_MODEL_PICKER_CONFIG,
  'vin-picker': VIN_PICKER_CONFIG,
  'vin-browser': VIN_BROWSER_CONFIG,
  'parts-picker': PARTS_PICKER_CONFIG,  // ← ADD
};
```

### Environment Configuration

**Filename:** `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,

  // Internal API
  apiBaseUrl: 'http://localhost:3000/api/v1',

  // External Parts API
  partsApiBaseUrl: 'https://parts-supplier.com/api/v2',
  partsApiKey: 'dev-key-12345',
};
```

### Use Parts Picker

**Filename:** `src/app/features/vehicle-builder/vehicle-builder.component.ts`

```typescript
import { Component } from '@angular/core';
import { PickerSelectionEvent } from '../../shared/models/picker-config.model';
import { PartsPickerRow } from '../../config/parts-picker.config';

@Component({
  selector: 'app-vehicle-builder',
  templateUrl: './vehicle-builder.component.html',
})
export class VehicleBuilderComponent {
  selectedParts: PartsPickerRow[] = [];
  totalCost = 0;

  onPartsSelectionChange(event: PickerSelectionEvent<PartsPickerRow>): void {
    console.log('Parts selection changed:', event.selections);

    this.selectedParts = event.selections;

    // Calculate total cost (using dealer pricing)
    this.totalCost = event.selections.reduce(
      (sum, part) => sum + part.dealerPrice,
      0
    );

    console.log(`Total parts cost: $${this.totalCost.toFixed(2)}`);
  }
}
```

**Filename:** `src/app/features/vehicle-builder/vehicle-builder.component.html`

```html
<div class="parts-picker-container">
  <h2>Select Aftermarket Parts</h2>

  <app-base-picker
    [configId]="'parts-picker'"
    (selectionChange)="onPartsSelectionChange($event)"
  >
  </app-base-picker>

  <div class="selection-summary" *ngIf="selectedParts.length > 0">
    <h3>Selected Parts ({{ selectedParts.length }})</h3>
    <p><strong>Total Cost:</strong> ${{ totalCost.toFixed(2) }}</p>
  </div>
</div>
```

---

## Testing Your Picker

### Test Checklist

- [ ] **1. Basic Display**
  - [ ] Picker loads without errors
  - [ ] Data displays correctly
  - [ ] All columns visible
  - [ ] Column headers correct

- [ ] **2. Selection**
  - [ ] Checkboxes appear in first column
  - [ ] Can select individual rows
  - [ ] Selection count updates
  - [ ] Apply button enabled when selections exist

- [ ] **3. URL Persistence**
  - [ ] Click Apply → URL updates with selections
  - [ ] Refresh page → Selections restored
  - [ ] Click Clear → URL parameter removed
  - [ ] Selections cleared from UI

- [ ] **4. Filtering**
  - [ ] Column filters work correctly
  - [ ] Filtered data displays
  - [ ] Can select filtered rows
  - [ ] Clear filters restores all data

- [ ] **5. Sorting**
  - [ ] Click column headers to sort
  - [ ] Sort direction toggles (asc/desc)
  - [ ] Sorted data displays correctly
  - [ ] Selections persist during sorting

- [ ] **6. Pagination**
  - [ ] Page size selector works
  - [ ] Navigate between pages
  - [ ] Selections persist across pages
  - [ ] Page count accurate

- [ ] **7. Pop-out Mode** (if applicable)
  - [ ] Picker opens in pop-out window
  - [ ] Make selections in pop-out
  - [ ] Click Apply in pop-out
  - [ ] Main window URL updates
  - [ ] Selections appear in both windows

- [ ] **8. Error Handling**
  - [ ] API errors display gracefully
  - [ ] Network errors handled
  - [ ] Invalid data handled
  - [ ] No console errors

---

## Troubleshooting

### Issue: "Config not found" Error

**Symptoms:**
- Console error: `Config 'picker-id' not found`
- Picker doesn't render

**Solutions:**
1. Verify `id` in config matches key in `picker-configs.ts`
2. Ensure config is imported in `picker-configs.ts`
3. Check for typos in `configId` input
4. Restart dev server (config changes require rebuild)

---

### Issue: Data Doesn't Load

**Symptoms:**
- Empty table
- Loading spinner indefinitely
- Console errors about API

**Solutions:**

**For Direct HTTP Mode:**
1. Check `baseUrl` in environment file
2. Verify endpoint path is correct
3. Check CORS settings (if external API)
4. Verify API key/token is valid
5. Check network tab for actual response

**For ApiService Mode:**
1. Verify method exists in `api.service.ts`
2. Check method name matches config
3. Verify backend endpoint exists
4. Check backend logs for errors

**Common API Issues:**
```typescript
// ❌ Wrong: Missing baseUrl
http: {
  endpoint: '/parts',  // Will use default baseUrl
}

// ✅ Correct: Explicit baseUrl
http: {
  endpoint: '/parts',
  baseUrl: environment.partsApiBaseUrl,
}
```

---

### Issue: Selections Don't Persist

**Symptoms:**
- Click Apply, URL doesn't update
- Refresh loses selections
- Checkboxes don't restore

**Solutions:**

1. **Check URL Parameter Uniqueness**
```typescript
// ❌ Wrong: Duplicate urlParam
selection: {
  urlParam: 'selectedVins',  // Already used by VIN picker!
}

// ✅ Correct: Unique urlParam
selection: {
  urlParam: 'selectedParts',
}
```

2. **Verify Serializer/Deserializer**
```typescript
// Test your serializer
const testSelections = [
  { partNumber: 'BRK-123', key: 'BRK-123' },
  { partNumber: 'ENG-456', key: 'ENG-456' },
];
const urlValue = serializer(testSelections);
console.log('Serialized:', urlValue);  // Should be: "BRK-123,ENG-456"

// Test your deserializer
const restored = deserializer(urlValue);
console.log('Deserialized:', restored);  // Should restore original structure
```

3. **Check Key Generator**
```typescript
// ❌ Wrong: Non-deterministic key
keyGenerator: (row) => Math.random().toString(),  // Changes every time!

// ✅ Correct: Deterministic key
keyGenerator: (row) => row.partNumber,
```

---

### Issue: Deeply Nested Fields Return Undefined

**Symptoms:**
- Console errors about undefined properties
- Missing data in columns
- `Cannot read property 'X' of undefined`

**Solution: Use Optional Chaining**

```typescript
// ❌ Wrong: Will crash if pricing is undefined
const price = item.pricing.retail;

// ✅ Correct: Safe navigation with fallback
const price = item.pricing?.retail || 0;

// ❌ Wrong: Multiple levels without protection
const city = item.inventory.warehouses[0].location.city;

// ✅ Correct: Optional chaining for deep nesting
const city = item.inventory?.warehouses?.[0]?.location?.city || 'Unknown';
```

**Pro Tip:** Always use `?.` for nested fields and provide fallback values!

---

### Issue: Filters/Sorting Don't Work

**Symptoms:**
- Column filters have no effect
- Sorting doesn't change order
- Server-side features not working

**Solutions:**

**For Client-Side Mode:**
```typescript
// Must define filtering and sorting functions
filtering: {
  filters: {
    name: (row, value) =>
      row.name.toLowerCase().includes(value.toLowerCase()),
  },
},
sorting: {
  comparators: {
    name: (a, b) => a.name.localeCompare(b.name),
    price: (a, b) => a.price - b.price,
  },
},
```

**For Server-Side Mode:**
```typescript
// Must map to API parameters
paramMapper: (params) => ({
  page: params.page,
  size: params.size,
  search: params.filters?.name,      // ← Filter mapping
  sortBy: params.sortBy,              // ← Sort mapping
  sortOrder: params.sortOrder,        // ← Sort direction
}),
```

---

## Advanced Patterns

### Pattern 1: Context-Aware Picker (VIN Picker Style)

**Use Case:** Picker data depends on parent entity (e.g., VINs for specific vehicle)

```typescript
// Configuration
api: {
  paramMapper: (params) => ({
    vehicleId: params.filters.vehicleId,  // From [context] input
    page: params.page,
    size: params.size,
  }),
}

// Usage
<app-base-picker
  [configId]="'context-picker'"
  [context]="{ vehicleId: selectedVehicle.id }"
  (selectionChange)="onSelection($event)"
>
</app-base-picker>
```

---

### Pattern 2: Custom Formatters

**Use Case:** Display formatted values in columns

```typescript
columns: [
  {
    key: 'price',
    label: 'Price',
    formatter: (value) => `$${value.toFixed(2)}`,
  },
  {
    key: 'date',
    label: 'Date',
    formatter: (value) => new Date(value).toLocaleDateString(),
  },
  {
    key: 'percentage',
    label: 'Discount',
    formatter: (value) => `${(value * 100).toFixed(0)}%`,
  },
  {
    key: 'boolean',
    label: 'Available',
    formatter: (value) => value ? '✓ Yes' : '✗ No',
  },
],
```

---

### Pattern 3: Complex Key Serialization

**Use Case:** URL needs multiple fields, not just ID

```typescript
selection: {
  urlParam: 'selectedParts',

  // Serialize: Include category in URL
  serializer: (selections) => {
    return selections.map(s => `${s.partNumber}:${s.category}`).join(',');
  },

  // Deserialize: Parse category from URL
  deserializer: (urlValue) => {
    if (!urlValue) return [];

    return urlValue.split(',').map(combo => {
      const [partNumber, category] = combo.split(':');
      return {
        partNumber,
        category,
        name: '',
        price: 0,
        key: `${category}|${partNumber}`,
      };
    });
  },
},

row: {
  // Key generator must match deserializer output
  keyGenerator: (row) => `${row.category}|${row.partNumber}`,
  keyParser: (key) => {
    const [category, partNumber] = key.split('|');
    return { category, partNumber, key };
  },
},
```

---

### Pattern 4: Dynamic Headers (with Auth Token Service)

**Use Case:** Headers need dynamic values (auth tokens, request IDs)

```typescript
// In auth.service.ts
@Injectable()
export class AuthService {
  getToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

// In picker config
import { AuthService } from '../core/services/auth.service';

// Can't inject services in config file directly
// Instead, use HTTP interceptor (recommended)
// OR pass token via environment variable
```

**Better Approach: HTTP Interceptor**

```typescript
// src/app/core/interceptors/api-auth.interceptor.ts
@Injectable()
export class ApiAuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add auth to external API requests
    if (req.url.includes('parts-supplier.com')) {
      const token = this.auth.getToken();
      req = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
    return next.handle(req);
  }
}
```

---

## Quick Reference

### Minimum Viable Config

```typescript
export const MIN_PICKER: PickerConfig<MinRow> = {
  id: 'min-picker',
  displayName: 'Min Picker',
  columns: [{ key: 'name', label: 'Name', sortable: true }],
  api: {
    http: { method: 'GET', endpoint: '/data' },
    paramMapper: (p) => ({ page: p.page, size: p.size }),
    responseTransformer: (r) => ({
      results: r.data,
      total: r.total,
      page: 1,
      size: 20,
      totalPages: 1,
    }),
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

---

### Common Patterns Cheat Sheet

```typescript
// Simple key
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

// Safe nested field access
const price = item.pricing?.retail || 0;
const city = item.inventory?.warehouses?.[0]?.location?.city || 'Unknown';
const discount = item.pricing?.discounts?.dealerDiscount || 0;
```

---

## Appendices

### Appendix A: Column Configuration Reference

| Property | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `key` | string | ✅ | Column identifier | `'partNumber'` |
| `label` | string | ✅ | Column header | `'Part #'` |
| `width` | string | ❌ | CSS width | `'20%'`, `'150px'` |
| `sortable` | boolean | ❌ | Enable sorting | `true` |
| `filterable` | boolean | ❌ | Show filter input | `true` |
| `filterType` | string | ❌ | Filter type | `'text'`, `'number'`, `'number-range'` |
| `hideable` | boolean | ❌ | Allow hiding | `true` |
| `valuePath` | string | ❌ | Path in row object | `'pricing.retail'` |
| `formatter` | function | ❌ | Format display value | `(v) => '$' + v` |

---

### Appendix B: API Mode Comparison

| Feature | Direct HTTP Mode | ApiService Mode |
|---------|------------------|-----------------|
| **Configuration** | `http: { ... }` | `method: '...'` |
| **ApiService Changes** | ❌ None needed | ✅ Add method |
| **External APIs** | ✅ Excellent | ❌ Not recommended |
| **Custom Headers** | ✅ Easy | ⚠️ Complex |
| **Multiple Base URLs** | ✅ Easy | ❌ Difficult |
| **Recommended For** | New pickers | Legacy pickers |

---

### Appendix C: Pagination Mode Decision Tree

```
Is your dataset < 1000 rows?
├─ YES → Does data change frequently?
│   ├─ YES → Server-side (mode: 'server')
│   └─ NO → Client-side (mode: 'client')
└─ NO → Server-side (mode: 'server')

Is your dataset > 10,000 rows?
└─ YES → Server-side REQUIRED (mode: 'server')
```

---

### Appendix D: Related Documentation

- **[Pickers vs Tables Architecture](../architecture/pickers-vs-tables.md)** - Architectural overview
- **[Multi-API Configuration](./multi-api-picker-configuration.md)** - Multi-API examples
- **[State Management Guide](../state-management-guide.md)** - URL state patterns
- **[BaseDataTable API](../../frontend/src/app/shared/components/base-data-table/README.md)** - Table component
- **[PickerConfig Interface](../../frontend/src/app/shared/models/picker-config.model.ts)** - Complete schema

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-07 | 2.0.0 | Complete rewrite with real-world examples |
| 2025-11-07 | 1.0.0 | Initial guide |

---

**Maintained By:** Development Team
**Last Updated:** 2025-11-07
**Status:** Production Ready

---

## Need Help?

**Check existing pickers for examples:**
- `manufacturer-model-picker.config.ts` - Client-side, simple keys
- `vin-picker.config.ts` - Context-aware, server-side
- `vin-browser.config.ts` - Global data, complex filters
- `parts-picker.config.ts` - External API, nested fields (this guide)

**Common Issues:** See [Troubleshooting](#troubleshooting) section

**Questions?** Check related documentation or ask the team!

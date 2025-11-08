# Multi-API Picker Configuration Guide

**Project:** AUTOS PrimeNG Frontend
**Created:** 2025-11-07
**Purpose:** Demonstrate how to configure pickers that connect to different API sources (internal backend, external APIs, third-party services)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Benefits](#architecture-benefits)
3. [Example Scenario](#example-scenario)
4. [Environment Configuration](#environment-configuration)
5. [Picker Configurations](#picker-configurations)
6. [Registration](#registration)
7. [Implementation Details](#implementation-details)
8. [Usage Examples](#usage-examples)
9. [Comparison Summary](#comparison-summary)

---

## Overview

The AUTOS picker architecture supports connecting to multiple API sources without code changes to the core `BasePickerComponent`. Each picker can:

- Use a different API endpoint (internal or external)
- Use different authentication methods (API keys, bearer tokens, etc.)
- Use different HTTP methods (GET, POST, PUT, etc.)
- Transform different response formats to a common structure
- Cache data independently with different TTLs

**Key Principle:** Configuration over code - all differences are handled in the picker config files.

---

## Architecture Benefits

✅ **No code duplication** - Same `BasePickerComponent` for all pickers
✅ **No ApiService changes needed** - Direct HTTP mode bypasses ApiService
✅ **Different auth methods** - Each API can use different authentication
✅ **Different request/response formats** - `paramMapper` and `responseTransformer` handle conversion
✅ **Mix internal and external APIs** - Seamlessly combine data sources
✅ **Environment-aware** - Different API endpoints for dev/prod
✅ **Independent caching** - Each picker can have its own cache strategy

---

## Example Scenario

We'll create three pickers, each using a completely different API source:

1. **Engine Picker** - Internal AUTOS backend (`/api/v1/engines`)
2. **Parts Picker** - External parts supplier API with API key authentication
3. **Dealership Picker** - External dealership locator API with bearer token authentication

---

## Environment Configuration

**Purpose:** Store API base URLs and credentials in environment files

### Development Environment

**Filename:** `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,

  // Internal API (AUTOS backend)
  apiBaseUrl: 'http://localhost:3000/api/v1',

  // External APIs
  partsApiBaseUrl: 'https://parts-supplier.com/api/v2',
  dealershipApiBaseUrl: 'https://dealer-locator.network/public/api',

  // API Keys (if needed)
  partsApiKey: 'dev-key-12345',
  dealershipApiKey: 'dev-key-67890',
};
```

### Production Environment

**Filename:** `src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,

  // Internal API (proxied by nginx in production)
  apiBaseUrl: '/api/v1',

  // External APIs
  partsApiBaseUrl: 'https://api.parts-supplier.com/v2',
  dealershipApiBaseUrl: 'https://api.dealer-locator.network/v1',

  // API Keys (from secure config)
  partsApiKey: 'prod-key-xxxxx',
  dealershipApiKey: 'prod-key-yyyyy',
};
```

---

## Picker Configurations

### Picker 1: Engine Picker (Internal API)

**Filename:** `src/app/config/engine-picker.config.ts`

```typescript
/**
 * Engine Picker Configuration
 *
 * Data Source: Internal AUTOS Backend
 * Endpoint: /api/v1/engines
 * Authentication: None (internal API)
 * HTTP Method: GET
 * Pagination: Server-side
 */

import { PickerConfig } from '../shared/models/picker-config.model';
import { environment } from '../../environments/environment';

export interface EnginePickerRow {
  engineId: string;
  manufacturer: string;
  displacement: string;
  horsepower: number;
  cylinders: number;
  fuelType: string;
  key: string;
}

export const ENGINE_PICKER_CONFIG: PickerConfig<EnginePickerRow> = {
  id: 'engine-picker',
  displayName: 'Engine Selector',

  columns: [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '25%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'manufacturer',
    },
    {
      key: 'displacement',
      label: 'Displacement',
      width: '20%',
      sortable: true,
      valuePath: 'displacement',
    },
    {
      key: 'horsepower',
      label: 'HP',
      width: '15%',
      sortable: true,
      valuePath: 'horsepower',
    },
    {
      key: 'cylinders',
      label: 'Cylinders',
      width: '15%',
      sortable: true,
      valuePath: 'cylinders',
    },
    {
      key: 'fuelType',
      label: 'Fuel',
      width: '25%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      valuePath: 'fuelType',
    },
  ],

  api: {
    // Direct HTTP mode - Internal API (uses default baseUrl from ApiService)
    http: {
      method: 'GET',
      endpoint: '/engines',
      // No baseUrl specified = uses ApiService's baseUrl (environment.apiBaseUrl)
    },

    /**
     * Map picker parameters to API request parameters
     */
    paramMapper: (params) => ({
      page: params.page || 1,
      size: params.size || 20,
      manufacturer: params.filters?.manufacturer,
      fuelType: params.filters?.fuelType,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }),

    /**
     * Transform API response to picker format
     * Internal API returns standard AUTOS format
     */
    responseTransformer: (response: any) => {
      const rows: EnginePickerRow[] = response.engines.map((engine: any) => ({
        engineId: engine.id,
        manufacturer: engine.make,
        displacement: engine.displacement,
        horsepower: engine.hp,
        cylinders: engine.cylinders,
        fuelType: engine.fuel_type,
        key: engine.id,
      }));

      return {
        results: rows,
        total: response.total,
        page: response.page,
        size: response.size,
        totalPages: response.totalPages,
      };
    },
  },

  row: {
    keyGenerator: (row) => row.engineId,
    keyParser: (key) => ({ engineId: key, key } as Partial<EnginePickerRow>),
  },

  selection: {
    urlParam: 'selectedEngines',
    serializer: (selections) => selections.map(s => s.engineId).join(','),
    deserializer: (urlValue) => {
      if (!urlValue) return [];
      return urlValue.split(',').map(id => ({
        engineId: id,
        manufacturer: '',
        displacement: '',
        horsepower: 0,
        cylinders: 0,
        fuelType: '',
        key: id,
      }));
    },
  },

  filtering: { filters: {} },
  sorting: { comparators: {} },

  caching: {
    enabled: true,
    ttl: 600000,  // 10 minutes (internal data changes occasionally)
  },

  pagination: {
    mode: 'server',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};
```

---

### Picker 2: Parts Picker (External API with API Key)

**Filename:** `src/app/config/parts-picker.config.ts`

```typescript
/**
 * Parts Picker Configuration
 *
 * Data Source: External Parts Supplier API
 * Endpoint: https://parts-supplier.com/api/v2/parts/search
 * Authentication: API Key in X-API-Key header
 * HTTP Method: GET
 * Pagination: Server-side
 */

import { PickerConfig } from '../shared/models/picker-config.model';
import { environment } from '../../environments/environment';

export interface PartsPickerRow {
  partNumber: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  supplier: string;
  key: string;
}

export const PARTS_PICKER_CONFIG: PickerConfig<PartsPickerRow> = {
  id: 'parts-picker',
  displayName: 'Aftermarket Parts Browser',

  columns: [
    {
      key: 'partNumber',
      label: 'Part #',
      width: '15%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'partNumber',
    },
    {
      key: 'name',
      label: 'Name',
      width: '30%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      valuePath: 'name',
    },
    {
      key: 'category',
      label: 'Category',
      width: '20%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      valuePath: 'category',
    },
    {
      key: 'price',
      label: 'Price',
      width: '15%',
      sortable: true,
      valuePath: 'price',
      formatter: (value) => `$${value.toFixed(2)}`,
    },
    {
      key: 'inStock',
      label: 'In Stock',
      width: '10%',
      valuePath: 'inStock',
      formatter: (value) => value ? '✓' : '✗',
    },
    {
      key: 'supplier',
      label: 'Supplier',
      width: '10%',
      valuePath: 'supplier',
    },
  ],

  api: {
    // Direct HTTP mode - External API with custom baseUrl
    http: {
      method: 'GET',
      endpoint: '/parts/search',
      baseUrl: environment.partsApiBaseUrl,  // External API URL!
      headers: {
        'X-API-Key': environment.partsApiKey,  // API Key Authentication
        'Accept': 'application/json',
      },
    },

    /**
     * Map picker parameters to external API format
     * This API uses different parameter names than our internal API
     */
    paramMapper: (params) => ({
      // External API uses different parameter names
      pageNumber: params.page || 1,
      pageSize: params.size || 20,
      query: params.filters?.name || params.filters?.partNumber,
      categoryFilter: params.filters?.category,
      orderBy: params.sortBy,
      direction: params.sortOrder === 'asc' ? 'ascending' : 'descending',
    }),

    /**
     * Transform external API response to picker format
     * This API has a completely different response structure
     */
    responseTransformer: (response: any) => {
      // External API response structure:
      // {
      //   items: [...],
      //   pagination: { totalRecords, currentPage, recordsPerPage, totalPages }
      // }

      const rows: PartsPickerRow[] = response.items.map((item: any) => ({
        partNumber: item.sku,
        name: item.productName,
        category: item.categoryName,
        price: item.pricing.retail,
        inStock: item.inventory.available > 0,
        supplier: item.vendor,
        key: item.sku,
      }));

      return {
        results: rows,
        total: response.pagination.totalRecords,
        page: response.pagination.currentPage,
        size: response.pagination.recordsPerPage,
        totalPages: response.pagination.totalPages,
      };
    },
  },

  row: {
    keyGenerator: (row) => row.partNumber,
    keyParser: (key) => ({ partNumber: key, key } as Partial<PartsPickerRow>),
  },

  selection: {
    urlParam: 'selectedParts',
    serializer: (selections) => selections.map(s => s.partNumber).join(','),
    deserializer: (urlValue) => {
      if (!urlValue) return [];
      return urlValue.split(',').map(partNum => ({
        partNumber: partNum,
        name: '',
        category: '',
        price: 0,
        inStock: false,
        supplier: '',
        key: partNum,
      }));
    },
  },

  filtering: { filters: {} },
  sorting: { comparators: {} },

  caching: {
    enabled: true,
    ttl: 300000,  // 5 minutes (external API, pricing changes frequently)
  },

  pagination: {
    mode: 'server',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};
```

---

### Picker 3: Dealership Picker (External API with Bearer Token + POST)

**Filename:** `src/app/config/dealership-picker.config.ts`

```typescript
/**
 * Dealership Picker Configuration
 *
 * Data Source: External Dealership Locator API
 * Endpoint: https://dealer-locator.network/public/api/v1/dealers
 * Authentication: Bearer token in Authorization header
 * HTTP Method: POST (this API uses POST for search queries)
 * Pagination: Server-side
 */

import { PickerConfig } from '../shared/models/picker-config.model';
import { environment } from '../../environments/environment';

export interface DealershipPickerRow {
  dealerId: string;
  name: string;
  city: string;
  state: string;
  zipCode: string;
  distance?: number;  // If searching by location
  rating: number;
  key: string;
}

export const DEALERSHIP_PICKER_CONFIG: PickerConfig<DealershipPickerRow> = {
  id: 'dealership-picker',
  displayName: 'Dealership Locator',

  columns: [
    {
      key: 'name',
      label: 'Dealership',
      width: '30%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'name',
    },
    {
      key: 'city',
      label: 'City',
      width: '20%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      valuePath: 'city',
    },
    {
      key: 'state',
      label: 'State',
      width: '10%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      valuePath: 'state',
    },
    {
      key: 'zipCode',
      label: 'ZIP',
      width: '15%',
      sortable: true,
      valuePath: 'zipCode',
    },
    {
      key: 'distance',
      label: 'Distance',
      width: '15%',
      sortable: true,
      valuePath: 'distance',
      formatter: (value) => value ? `${value.toFixed(1)} mi` : '-',
    },
    {
      key: 'rating',
      label: 'Rating',
      width: '10%',
      sortable: true,
      valuePath: 'rating',
      formatter: (value) => `${value.toFixed(1)} ⭐`,
    },
  ],

  api: {
    // Direct HTTP mode - Third external API with different auth
    http: {
      method: 'POST',  // This API uses POST for search queries!
      endpoint: '/dealers',
      baseUrl: environment.dealershipApiBaseUrl,  // Different external API!
      headers: {
        'Authorization': `Bearer ${environment.dealershipApiKey}`,  // Bearer Token
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
      },
    },

    /**
     * Map picker parameters to POST body format
     * This API uses POST body instead of query parameters
     */
    paramMapper: (params) => {
      // This API expects a structured POST body
      return {
        pagination: {
          offset: ((params.page || 1) - 1) * (params.size || 20),
          limit: params.size || 20,
        },
        filters: {
          name: params.filters?.name,
          city: params.filters?.city,
          state: params.filters?.state,
          // Optional location-based search (from context)
          ...(params.filters?.latitude && {
            location: {
              lat: params.filters.latitude,
              lng: params.filters.longitude,
              radius: 50,  // miles
            },
          }),
        },
        sort: {
          field: params.sortBy || 'distance',
          order: params.sortOrder || 'asc',
        },
      };
    },

    /**
     * Transform dealership API response to picker format
     * Yet another different response structure
     */
    responseTransformer: (response: any) => {
      // External API response structure:
      // {
      //   dealers: [...],
      //   totalCount: number,
      //   offset: number,
      //   limit: number
      // }

      const rows: DealershipPickerRow[] = response.dealers.map((dealer: any) => ({
        dealerId: dealer.id,
        name: dealer.businessName,
        city: dealer.address.city,
        state: dealer.address.state,
        zipCode: dealer.address.postalCode,
        distance: dealer.distanceFromSearch,
        rating: dealer.customerRating,
        key: dealer.id,
      }));

      return {
        results: rows,
        total: response.totalCount,
        page: Math.floor(response.offset / response.limit) + 1,
        size: response.limit,
        totalPages: Math.ceil(response.totalCount / response.limit),
      };
    },
  },

  row: {
    keyGenerator: (row) => row.dealerId,
    keyParser: (key) => ({ dealerId: key, key } as Partial<DealershipPickerRow>),
  },

  selection: {
    urlParam: 'selectedDealerships',
    serializer: (selections) => selections.map(s => s.dealerId).join(','),
    deserializer: (urlValue) => {
      if (!urlValue) return [];
      return urlValue.split(',').map(id => ({
        dealerId: id,
        name: '',
        city: '',
        state: '',
        zipCode: '',
        rating: 0,
        key: id,
      }));
    },
  },

  filtering: { filters: {} },
  sorting: { comparators: {} },

  caching: {
    enabled: true,
    ttl: 900000,  // 15 minutes (location data changes slowly)
  },

  pagination: {
    mode: 'server',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};
```

---

## Registration

**Filename:** `src/app/config/picker-configs.ts`

```typescript
import { MANUFACTURER_MODEL_PICKER_CONFIG } from './manufacturer-model-picker.config';
import { VIN_PICKER_CONFIG } from './vin-picker.config';
import { VIN_BROWSER_CONFIG } from './vin-browser.config';
import { ENGINE_PICKER_CONFIG } from './engine-picker.config';
import { PARTS_PICKER_CONFIG } from './parts-picker.config';
import { DEALERSHIP_PICKER_CONFIG } from './dealership-picker.config';

/**
 * Central registry of all picker configurations
 *
 * Each picker can use a different API source:
 * - Internal AUTOS backend (default baseUrl)
 * - External APIs (via http.baseUrl)
 * - Third-party services (with custom auth headers)
 */
export const PICKER_CONFIGS = {
  // Internal API pickers (AUTOS backend)
  'manufacturer-model': MANUFACTURER_MODEL_PICKER_CONFIG,
  'vin-picker': VIN_PICKER_CONFIG,
  'vin-browser': VIN_BROWSER_CONFIG,
  'engine-picker': ENGINE_PICKER_CONFIG,  // ← Internal API (no baseUrl override)

  // External API pickers
  'parts-picker': PARTS_PICKER_CONFIG,           // ← External Parts API (custom baseUrl)
  'dealership-picker': DEALERSHIP_PICKER_CONFIG, // ← External Locator API (custom baseUrl + POST)
};
```

---

## Implementation Details

### BasePickerDataSource Handles Multiple API Modes

**Filename:** `src/app/shared/services/base-picker-data-source.ts`

The data source automatically detects which mode to use based on the configuration:

```typescript
export class BasePickerDataSource<T> implements TableDataSource<T> {
  constructor(
    private apiService: ApiService,
    private config: PickerConfig<T>,
    private http: HttpClient
  ) {}

  /**
   * Fetch data using configured API method
   */
  fetch(params: TableQueryParams): Observable<TableResponse<T>> {
    const mappedParams = this.config.api.paramMapper(params);

    // MODE DETECTION: http property vs method property
    if (this.config.api.http) {
      // Direct HTTP mode - use HttpClient directly
      return this.fetchViaHttp(mappedParams);
    } else if (this.config.api.method) {
      // ApiService mode - call method on ApiService
      return this.fetchViaApiService(mappedParams);
    } else {
      throw new Error('[BasePickerDataSource] No API configuration found');
    }
  }

  /**
   * Fetch via direct HTTP request (external APIs)
   */
  private fetchViaHttp(params: any): Observable<TableResponse<T>> {
    const httpConfig = this.config.api.http!;

    // Build full URL
    const baseUrl = httpConfig.baseUrl || this.apiService.baseUrl;
    const url = `${baseUrl}${httpConfig.endpoint}`;

    // Build request options
    const options: any = {};
    if (httpConfig.headers) {
      options.headers = httpConfig.headers;
    }

    // Execute request based on HTTP method
    let request$: Observable<any>;

    if (httpConfig.method === 'GET') {
      // GET: params go in query string
      options.params = params;
      request$ = this.http.get(url, options);

    } else if (httpConfig.method === 'POST') {
      // POST: params go in request body
      request$ = this.http.post(url, params, options);

    } else if (httpConfig.method === 'PUT') {
      // PUT: params go in request body
      request$ = this.http.put(url, params, options);

    } else {
      throw new Error(`[BasePickerDataSource] Unsupported HTTP method: ${httpConfig.method}`);
    }

    // Transform response using configured transformer
    return request$.pipe(
      map(response => this.config.api.responseTransformer(response)),
      catchError(error => {
        console.error('[BasePickerDataSource] HTTP request failed:', error);
        throw error;
      })
    );
  }

  /**
   * Fetch via ApiService method (internal API)
   */
  private fetchViaApiService(params: any): Observable<TableResponse<T>> {
    const methodName = this.config.api.method!;

    // Verify method exists on ApiService
    if (typeof this.apiService[methodName] !== 'function') {
      throw new Error(`[BasePickerDataSource] ApiService method not found: ${methodName}`);
    }

    // Call method and transform response
    return this.apiService[methodName](params).pipe(
      map(response => this.config.api.responseTransformer(response)),
      catchError(error => {
        console.error('[BasePickerDataSource] ApiService request failed:', error);
        throw error;
      })
    );
  }

  /**
   * Get cached data (for client-side pagination)
   */
  getCachedData(): T[] {
    return this.cachedData || [];
  }

  private cachedData: T[] = [];
}
```

---

## Usage Examples

All three pickers use the **exact same component** - only the `configId` changes:

### Example 1: Basic Usage

```html
<!-- Engine Picker (internal API) -->
<app-base-picker
  [configId]="'engine-picker'"
  (selectionChange)="onEngineSelection($event)"
>
</app-base-picker>

<!-- Parts Picker (external parts API with API key) -->
<app-base-picker
  [configId]="'parts-picker'"
  (selectionChange)="onPartsSelection($event)"
>
</app-base-picker>

<!-- Dealership Picker (external location API with bearer token) -->
<app-base-picker
  [configId]="'dealership-picker'"
  (selectionChange)="onDealershipSelection($event)"
>
</app-base-picker>
```

### Example 2: With Context (Location-Based Search)

```html
<!-- Dealership Picker with user's location -->
<app-base-picker
  [configId]="'dealership-picker'"
  [context]="{ latitude: userLatitude, longitude: userLongitude }"
  (selectionChange)="onDealershipSelection($event)"
>
</app-base-picker>
```

### Example 3: Component TypeScript

```typescript
import { Component } from '@angular/core';
import { PickerSelectionEvent } from '../../shared/models/picker-config.model';
import { EnginePickerRow } from '../../config/engine-picker.config';
import { PartsPickerRow } from '../../config/parts-picker.config';
import { DealershipPickerRow } from '../../config/dealership-picker.config';

@Component({
  selector: 'app-vehicle-builder',
  templateUrl: './vehicle-builder.component.html',
  styleUrls: ['./vehicle-builder.component.scss'],
})
export class VehicleBuilderComponent {
  userLatitude = 37.7749;  // San Francisco
  userLongitude = -122.4194;

  onEngineSelection(event: PickerSelectionEvent<EnginePickerRow>): void {
    console.log('Selected engines:', event.selections);
    // Do something with engine selections
  }

  onPartsSelection(event: PickerSelectionEvent<PartsPickerRow>): void {
    console.log('Selected parts:', event.selections);
    // Calculate total parts cost
    const totalCost = event.selections.reduce((sum, part) => sum + part.price, 0);
    console.log('Total parts cost:', totalCost);
  }

  onDealershipSelection(event: PickerSelectionEvent<DealershipPickerRow>): void {
    console.log('Selected dealerships:', event.selections);
    // Show dealerships on map
  }
}
```

---

## Comparison Summary

| Picker | API Source | Base URL | Auth Method | HTTP Method | Response Structure | Cache TTL |
|--------|-----------|----------|-------------|-------------|-------------------|-----------|
| **Engine** | Internal AUTOS | `/api/v1` | None | GET | Standard AUTOS format | 10 min |
| **Parts** | External Parts Supplier | `https://parts-supplier.com/api/v2` | API Key (X-API-Key header) | GET | Custom vendor format | 5 min |
| **Dealership** | External Locator Service | `https://dealer-locator.network/public/api` | Bearer Token (Authorization header) | POST | Location-based format | 15 min |

### Key Differences Handled by Configuration

1. **Base URLs**: Different `http.baseUrl` values
2. **Authentication**: Different `http.headers` for auth
3. **HTTP Methods**: GET vs POST in `http.method`
4. **Request Format**: Different `paramMapper` implementations
5. **Response Format**: Different `responseTransformer` implementations
6. **Caching**: Different `caching.ttl` values

### What Stays the Same

- ✅ Component implementation (`BasePickerComponent`)
- ✅ Template structure
- ✅ Selection logic
- ✅ URL state management
- ✅ Pop-out window support
- ✅ Column management
- ✅ Filtering and sorting

---

## Advanced Patterns

### Pattern 1: Dynamic Headers (with Auth Token)

```typescript
// In picker config
api: {
  http: {
    method: 'GET',
    endpoint: '/secure-data',
    baseUrl: 'https://secure-api.com',
    // Headers can use environment variables or injected services
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,  // Dynamic token
      'X-Request-ID': generateRequestId(),
    },
  },
}
```

### Pattern 2: Request Interceptor (Global Auth)

Instead of hardcoding auth in each config, use Angular HTTP interceptor:

```typescript
// src/app/core/interceptors/api-auth.interceptor.ts
@Injectable()
export class ApiAuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add auth to external API requests
    if (req.url.includes('parts-supplier.com')) {
      req = req.clone({
        setHeaders: {
          'X-API-Key': environment.partsApiKey,
        },
      });
    }

    if (req.url.includes('dealer-locator.network')) {
      req = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${environment.dealershipApiKey}`,
        },
      });
    }

    return next.handle(req);
  }
}
```

### Pattern 3: Error Handling per API

```typescript
// In responseTransformer
responseTransformer: (response: any) => {
  // Handle API-specific error formats
  if (response.error) {
    throw new Error(`Parts API Error: ${response.error.message}`);
  }

  // Transform data
  return {
    results: transformData(response),
    total: response.total,
    // ...
  };
}
```

---

## Related Documentation

- **[Adding a New Picker Guide](./adding-a-new-picker.md)** - Step-by-step picker creation
- **[Pickers vs Tables Architecture](../architecture/pickers-vs-tables.md)** - Understanding picker architecture
- **[PickerConfig Interface](../../frontend/src/app/shared/models/picker-config.model.ts)** - Complete config schema

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-07 | 1.0.0 | Initial guide created |

---

**Maintained By:** Development Team
**Last Updated:** 2025-11-07

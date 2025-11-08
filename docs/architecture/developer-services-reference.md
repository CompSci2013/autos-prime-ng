# Developer Services Reference

**Project:** AUTOS Prime NG
**Created:** 2025-11-08
**Purpose:** Comprehensive reference for all services in the application architecture

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Service Catalog](#service-catalog)
3. [Detailed Service Descriptions](#detailed-service-descriptions)
4. [Service Dependency Graph](#service-dependency-graph)
5. [Service Flow Diagrams](#service-flow-diagrams)
6. [State Management Architecture](#state-management-architecture)
7. [API Call Deduplication](#api-call-deduplication)
8. [Quick Reference](#quick-reference)

---

## Executive Summary

The AUTOS Prime NG application uses a **layered service architecture** with clear separation of concerns:

- **URL Layer** (UrlParamService, RouteStateService) - URL parameter management
- **State Layer** (StateManagementService) - Application state orchestration
- **API Layer** (ApiService, RequestCoordinatorService) - Backend communication
- **Persistence Layer** (TableStatePersistenceService) - localStorage for UI preferences
- **Configuration Layer** (PickerConfigService, BasePickerDataSource) - Dynamic component configuration
- **Communication Layer** (PopOutContextService) - Cross-window messaging
- **Error Layer** (ErrorNotificationService, GlobalErrorHandler) - Error handling and user feedback

**Key Architectural Principles:**

1. **URL as Single Source of Truth** - All shareable state lives in URL query parameters
2. **Request Deduplication** - RequestCoordinatorService prevents duplicate API calls
3. **Configuration-Driven** - Pickers and tables are configured via JSON, not hardcoded
4. **Observable Pattern** - RxJS observables for reactive state management
5. **Separation of Concerns** - Each service has a single, well-defined responsibility

---

## Service Catalog

### Core Services (11 Total)

| Service | Location | Purpose | Injectable |
|---------|----------|---------|-----------|
| **UrlParamService** | `core/services/` | Lightweight URL parameter management without side effects | ✅ `root` |
| **RouteStateService** | `core/services/` | URL query parameter synchronization with SearchFilters conversion | ✅ `root` |
| **StateManagementService** | `core/services/` | Main state orchestrator with URL as single source of truth | ✅ `root` |
| **RequestCoordinatorService** | `core/services/` | Request deduplication, caching, retry logic with exponential backoff | ✅ `root` |
| **ApiService** | `services/` | HTTP client for all backend API endpoints | ✅ `root` |
| **TableStatePersistenceService** | `shared/services/` | localStorage persistence for table column order and visibility | ✅ `root` |
| **PickerConfigService** | `core/services/` | Central registry for picker configurations with validation | ✅ `root` |
| **BasePickerDataSource** | `shared/services/` | Generic data source for pickers with dual-mode API support | ❌ Manual instantiation |
| **PopOutContextService** | `core/services/` | Pop-out window context detection and BroadcastChannel communication | ✅ `root` |
| **ErrorNotificationService** | `core/services/` | User-facing error notifications via PrimeNG toast | ✅ `root` |
| **GlobalErrorHandler** | `core/services/` | Global Angular error handler catching all uncaught errors | ❌ Provided in module |

---

## Detailed Service Descriptions

### 1. UrlParamService

**File:** `frontend/src/app/core/services/url-param.service.ts`
**Lines:** 473
**Injectable:** `providedIn: 'root'`

#### Purpose
Lightweight service for managing URL query parameters **without triggering state management side effects** (e.g., API calls, state updates). Provides type-safe URL parameter operations.

#### Key Features
- Update single or multiple URL parameters
- Read parameter values (with type conversion)
- Watch parameter changes via observables
- Special support for highlight parameters (prefixed with `h_`)
- No coupling to application state or API calls

#### Dependencies
- `Router` (Angular Router)
- `ActivatedRoute` (Angular Router)

#### Important Methods

```typescript
// Update single parameter
updateParam(key: string, value: string | number | boolean | undefined): Promise<boolean>

// Update multiple parameters at once
updateParams(params: Record<string, any>): Promise<boolean>

// Get parameter value
getParam(key: string): string | null
getParamAsNumber(key: string, defaultValue: number): number
getParamAsBoolean(key: string, defaultValue: boolean): boolean

// Watch parameter changes
watchParam(key: string): Observable<string | null>

// Highlight parameter helpers (h_* prefix)
getHighlightParam(key: string): string | null
setHighlightParam(key: string, value: any): Promise<boolean>
clearAllHighlights(): Promise<boolean>
```

#### State Management
- **Stateless** - All state lives in the URL
- No internal cache or memory state
- Changes immediately reflected in browser URL
- Supports browser back/forward navigation

#### When to Use
- Picker components needing URL persistence for selections
- UI components storing preferences in URL (e.g., panel collapse state)
- Any component requiring bookmarkable/shareable state
- When you need URL updates **without** triggering API calls

---

### 2. RouteStateService

**File:** `frontend/src/app/core/services/route-state.service.ts`
**Lines:** 179
**Injectable:** `providedIn: 'root'`

#### Purpose
Handles URL query parameter synchronization with **bidirectional conversion** between URL params and `SearchFilters` model. Provides observable stream of URL parameter changes.

#### Key Features
- BehaviorSubject-based observable for query parameter changes
- Bidirectional conversion: `SearchFilters` ↔ URL params
- Support for manufacturer-model combinations (`modelCombos`)
- Pagination and sorting state in URL
- Filter state in URL (year range, body class, etc.)

#### Dependencies
- `Router` (Angular Router)
- `ActivatedRoute` (Angular Router)

#### Important Methods

```typescript
// Read URL params
getCurrentParams(): Params
getParam(key: string): string | null
watchParam(key: string): Observable<string | null>

// Write URL params
updateParams(params: Params, replaceUrl?: boolean): void
setParams(params: Params, replaceUrl?: boolean): void
removeParam(key: string): void
clearAllParams(): void

// Conversions
filtersToParams(filters: SearchFilters): Params
paramsToFilters(params: Params): SearchFilters
```

#### State Management
- **Observable Stream** - `queryParams$` emits on URL changes
- BehaviorSubject holds current params snapshot
- No internal cache (reads directly from ActivatedRoute)
- Automatically listens to route query param changes

#### Data Flow

```
URL: ?modelCombos=Ford:F-150,Chevrolet:Corvette&page=2&size=20
   ↓ (paramsToFilters)
SearchFilters: {
  modelCombos: [
    { manufacturer: 'Ford', model: 'F-150' },
    { manufacturer: 'Chevrolet', model: 'Corvette' }
  ],
  page: 2,
  size: 20
}
```

#### When to Use
- When you need to convert between URL params and SearchFilters
- When StateManagementService needs to sync state to/from URL
- When you need to observe URL parameter changes

---

### 3. StateManagementService

**File:** `frontend/src/app/core/services/state-management.service.ts`
**Lines:** 781
**Injectable:** `providedIn: 'root'`

#### Purpose
**Main state orchestrator** for the application. Manages all application state with **URL as single source of truth**. Coordinates between RouteStateService, RequestCoordinatorService, and ApiService.

#### Key Features
- URL-driven state (all shareable state in query params)
- Observable-based state distribution (filters$, results$, loading$, error$)
- Automatic API calls on state changes
- Support for ephemeral filters (table column searches not in URL)
- Highlight filters for segmented statistics
- Pop-out window support (disables URL watching in pop-outs)

#### Dependencies
- **RouteStateService** - URL parameter management
- **RequestCoordinatorService** - API call coordination
- **ApiService** - Backend communication
- **Router** - Route detection (main vs pop-out)

#### Important Methods

```typescript
// State updates (trigger URL sync + API call)
updateFilters(filters: Partial<SearchFilters>): void
clearAllFilters(): void
updatePage(page: number): void
updateSort(sort: string, sortDirection: 'asc' | 'desc'): void

// API data fetching
fetchVehicleData(): Observable<VehicleDetailsResponse>
fetchWithEphemeralFilters(ephemeralFilters): Observable<VehicleDetailsResponse>

// State access
getCurrentFilters(): SearchFilters
get currentState(): AppState

// Request management
getVehicleDataLoadingState$(): Observable<RequestState>
getGlobalLoadingState$(): Observable<boolean>
cancelAllRequests(): void
clearCache(key?: string): void

// Pop-out support
getCurrentState(): AppState
syncStateFromExternal(state: Partial<AppState>): void
```

#### State Management

**State Structure:**
```typescript
interface AppState {
  filters: SearchFilters;        // Current filters (from URL)
  results: VehicleResult[];      // Current results (from API)
  loading: boolean;              // Global loading state
  error: string | null;          // Error message
  totalResults: number;          // Total count from API
  statistics?: any;              // Histogram data
  highlights?: HighlightFilters; // Highlight parameters (h_*)
}
```

**Observable Streams:**
- `state$` - Full application state
- `filters$` - Current filters (debounced)
- `results$` - Current results
- `loading$` - Loading state
- `error$` - Error state
- `totalResults$` - Total result count
- `statistics$` - Histogram statistics
- `highlights$` - Highlight filters

**State Flow:**

```
1. User changes filter in UI
   ↓
2. Component calls stateManagement.updateFilters()
   ↓
3. StateManagement updates internal state
   ↓
4. StateManagement calls routeState.syncStateToUrl()
   ↓
5. URL updates (triggers browser navigation)
   ↓
6. StateManagement.watchUrlChanges() detects change
   ↓
7. StateManagement calls fetchVehicleData()
   ↓
8. RequestCoordinator checks cache/deduplicates
   ↓
9. ApiService makes HTTP call
   ↓
10. StateManagement updates state with results
    ↓
11. Components receive new state via observables
```

#### When to Use
- **Always** for vehicle search state management
- When components need current filters or results
- When triggering API calls for vehicle data
- When updating URL-based state (filters, page, sort)

---

### 4. RequestCoordinatorService

**File:** `frontend/src/app/core/services/request-coordinator.service.ts`
**Lines:** 265
**Injectable:** `providedIn: 'root'`

#### Purpose
**Request coordination layer** that prevents duplicate API calls, caches responses, and retries failed requests with exponential backoff.

#### Key Features
- **Deduplication** - Identical in-flight requests share same Observable
- **Caching** - Response caching with configurable TTL
- **Retry Logic** - Exponential backoff retry (RxJS 7+ style)
- **Loading States** - Per-request and global loading observables
- **Request Cancellation** - Cancel all active requests

#### Dependencies
- None (pure RxJS implementation)

#### Important Methods

```typescript
// Execute request with coordination
execute<T>(
  key: string,
  requestFn: () => Observable<T>,
  config?: RequestConfig
): Observable<T>

// Request state observables
getLoadingState$(key: string): Observable<RequestState>
getGlobalLoading$(): Observable<boolean>
isAnyLoading(): boolean

// Cache management
clearCache(key?: string): void
cancelAll(): void
```

#### Request Configuration

```typescript
interface RequestConfig {
  cacheTime?: number;        // Cache duration (ms), 0 = no cache
  deduplication?: boolean;   // Deduplicate identical requests (default: true)
  retryAttempts?: number;    // Retry count (default: 2)
  retryDelay?: number;       // Initial delay (ms) for exponential backoff (default: 1000)
}
```

#### Deduplication Algorithm

```
Request A: key="vehicle-details:xyz", status=PENDING
Request B: key="vehicle-details:xyz", status=NEW

1. Request A starts → Store in activeRequests Map
2. Request B arrives → Check activeRequests Map
3. Key "vehicle-details:xyz" exists → Return same Observable
4. Both subscribers receive same response
5. Request completes → Remove from activeRequests Map
```

#### Caching Algorithm

```
Request: key="vehicle-details:xyz"

1. Check responseCache Map for key
2. If found:
   - Check timestamp vs TTL
   - If valid: Return cached data (no HTTP call)
   - If expired: Delete from cache, proceed to HTTP
3. If not found: Proceed to HTTP call
4. On success: Store in cache with timestamp
```

#### Retry Algorithm

```
Request fails with error:

Attempt 1: Immediate
Attempt 2: Wait 1000ms (retryDelay * 2^0)
Attempt 3: Wait 2000ms (retryDelay * 2^1)
Attempt 4: Wait 4000ms (retryDelay * 2^2)
Final failure: Throw error
```

#### State Management

**Per-Request State:**
```typescript
interface RequestState {
  loading: boolean;          // Is request in progress?
  error: Error | null;       // Last error (if any)
  lastUpdated: number | null; // Timestamp of last successful request
}
```

**Internal State:**
- `activeRequests: Map<string, Observable<any>>` - In-flight requests
- `responseCache: Map<string, CacheEntry>` - Cached responses
- `loadingStates: Map<string, BehaviorSubject<RequestState>>` - Per-request loading states
- `globalLoadingSubject: BehaviorSubject<number>` - Global loading counter

#### When to Use
- **Always** use via StateManagementService (don't call directly)
- StateManagementService wraps all API calls with `requestCoordinator.execute()`
- Automatically handles caching, deduplication, and retry for vehicle data

---

### 5. ApiService

**File:** `frontend/src/app/services/api.service.ts`
**Lines:** 277
**Injectable:** `providedIn: 'root'`

#### Purpose
HTTP client wrapper for all backend API endpoints. Provides type-safe methods for vehicle search, VIN data, and filter options.

#### Key Features
- Type-safe API methods with interfaces
- Automatic query parameter building
- Support for custom `baseUrl` (multi-environment)
- Highlight parameter support (for segmented statistics)
- Filter endpoints for dropdown populations

#### Dependencies
- `HttpClient` (Angular HTTP)

#### API Endpoints

```typescript
// Manufacturer-Model Combinations
getManufacturerModelCombinations(
  page: number,
  size: number,
  search?: string,
  baseUrl?: string
): Observable<ManufacturerModelResponse>

// Vehicle Details (main search)
getVehicleDetails(
  models: string,               // "Ford:F-150,Chevrolet:Corvette"
  page: number,
  size: number,
  filters?: FilterParams,       // Year, body class, etc.
  highlights?: HighlightParams, // h_* parameters for segmented stats
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  baseUrl?: string
): Observable<VehicleDetailsResponse>

// VIN Instances
getVehicleInstances(
  vehicleId: string,
  count: number,
  baseUrl?: string
): Observable<VehicleInstancesResponse>

// VIN Browser
getAllVins(
  page: number,
  size: number,
  filters?: VinFilterParams,
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  baseUrl?: string
): Observable<VinBrowserResponse>

// Filter Options
getFilterOptions(fieldName: string, search?: string, limit?: number): Observable<any>
getDistinctManufacturers(search?: string, limit?: number): Observable<{ manufacturers: string[] }>
getDistinctModels(search?: string, limit?: number): Observable<{ models: string[] }>
getDistinctBodyClasses(): Observable<{ body_classes: string[] }>
getDistinctDataSources(): Observable<{ data_sources: string[] }>
getYearRange(): Observable<{ min: number; max: number }>
```

#### State Management
- **Stateless** - No internal state or caching
- Returns raw Observables from HttpClient
- All state management handled by StateManagementService
- All caching/deduplication handled by RequestCoordinatorService

#### When to Use
- Via StateManagementService (for vehicle data)
- Via BasePickerDataSource (for picker data in ApiService mode)
- Directly from components only for non-cacheable operations

---

### 6. TableStatePersistenceService

**File:** `frontend/src/app/shared/services/table-state-persistence.service.ts`
**Lines:** 109
**Injectable:** `providedIn: 'root'`

#### Purpose
Manages **localStorage persistence** for table UI preferences (column order, visibility, page size). **Not shareable** - preferences are per-browser.

#### Key Features
- Save/load table preferences to localStorage
- Export/import preferences as JSON
- Storage key namespacing (`autos-table-{tableId}-preferences`)
- Error handling for localStorage quota issues

#### Dependencies
- None (uses browser localStorage API)

#### Important Methods

```typescript
// Persistence
savePreferences(tableId: string, preferences: TablePreferences): void
loadPreferences(tableId: string): TablePreferences | null
resetPreferences(tableId: string): void

// Import/Export
exportPreferences(tableId: string): string | null
importPreferences(tableId: string, json: string): boolean
```

#### Table Preferences Structure

```typescript
interface TablePreferences {
  columnOrder: string[];      // Ordered array of column keys
  visibleColumns: string[];   // Array of visible column keys
  pageSize?: number;          // Preferred page size
  lastUpdated?: number;       // Timestamp of last update
}
```

#### State Management
- **localStorage** - Persistent across sessions
- **Per-browser** - Not synced across devices
- **Per-table** - Each table has its own preferences
- **Not in URL** - UI preferences are not shareable

#### Storage Key Format

```
autos-table-manufacturer-model-picker-preferences
autos-table-vehicle-results-preferences
autos-table-vin-browser-preferences
```

#### When to Use
- BaseDataTableComponent for column management
- Any table component needing persistent UI preferences
- **Not for query state** (use URL via StateManagementService instead)

---

### 7. PickerConfigService

**File:** `frontend/src/app/core/services/picker-config.service.ts`
**Lines:** 280
**Injectable:** `providedIn: 'root'`

#### Purpose
**Central registry** for picker configurations. Validates and manages all `PickerConfig` instances used by BasePickerComponent.

#### Key Features
- Configuration registration with validation
- Duplicate ID detection
- Configuration retrieval by ID
- Validates required fields and structure
- Warnings for client-side mode without filtering/sorting

#### Dependencies
- None

#### Important Methods

```typescript
// Registration
registerConfig<T>(config: PickerConfig<T>): void
registerConfigs(configs: PickerConfig<any>[]): void

// Retrieval
getConfig<T>(id: string): PickerConfig<T>
getAllConfigs(): PickerConfig<any>[]
getConfigIds(): string[]
hasConfig(id: string): boolean

// Management
unregisterConfig(id: string): boolean
clearAll(): void
```

#### Configuration Validation

**Required Fields:**
- `id` (string) - Unique identifier
- `displayName` (string) - User-facing name
- `columns` (array) - Column definitions
- `api` (object) - API configuration
  - EITHER `api.method` (string) OR `api.http` (object)
  - `api.responseTransformer` (function)
- `row` (object) - Row configuration
  - `row.keyGenerator` (function)
  - `row.keyParser` (function)
- `selection` (object) - Selection configuration
  - `selection.urlParam` (string)
  - `selection.serializer` (function)
  - `selection.deserializer` (function)
- `pagination` (object) - Pagination configuration
  - `pagination.mode` ('client' | 'server')
  - `pagination.defaultPageSize` (number)
  - `pagination.pageSizeOptions` (array)

**Optional Fields:**
- `api.baseUrl` (string) - Custom API base URL
- `filtering` (object) - Client-side filter functions
- `sorting` (object) - Client-side sort comparators
- `caching` (object) - Cache configuration

#### State Management
- **In-memory registry** - Map of config ID → PickerConfig
- Configurations registered at app startup (app.module.ts)
- Immutable after registration (no dynamic updates)

#### Registration Example

```typescript
// app.module.ts or feature module
constructor(pickerConfigService: PickerConfigService) {
  pickerConfigService.registerConfig(MANUFACTURER_MODEL_PICKER_CONFIG);
  pickerConfigService.registerConfig(ENGINE_PICKER_CONFIG);
  pickerConfigService.registerConfig(PARTS_PICKER_CONFIG);
}
```

#### When to Use
- At app startup to register picker configurations
- In BasePickerComponent to retrieve configuration by ID
- When creating new pickers (validation ensures correctness)

---

### 8. BasePickerDataSource

**File:** `frontend/src/app/shared/services/base-picker-data-source.ts`
**Lines:** 432
**Injectable:** ❌ Manual instantiation (`new BasePickerDataSource(...)`)

#### Purpose
**Generic data source** for picker components implementing `TableDataSource<T>` interface. Supports **dual-mode API calls**: ApiService method invocation (backward compatible) OR direct HTTP calls (plugin architecture).

#### Key Features
- **Dual-mode API support:**
  - **Mode A (ApiService):** Dynamic method invocation on ApiService
  - **Mode B (Direct HTTP):** Direct HTTP calls with custom headers/authentication
- Client-side pagination (load once, filter/sort in memory)
- Server-side pagination (request each page from API)
- Data caching with configurable TTL
- Automatic response transformation
- Support for external APIs (via `baseUrl`)

#### Dependencies
- **ApiService** - For Mode A (ApiService method calls)
- **HttpClient** - For Mode B (direct HTTP calls)
- **PickerConfig<T>** - Configuration object

#### Important Methods

```typescript
// Data fetching
fetch(params: TableQueryParams): Observable<TableResponse<T>>

// Cache management
reset(): void
getCachedData(): T[] | null
```

#### Mode A: ApiService Method Call

```typescript
// Configuration
{
  api: {
    method: 'getManufacturerModelCombinations', // Method name on ApiService
    paramMapper: (params) => ({
      page: params.page,
      size: params.size
    }),
    responseTransformer: (response) => ({
      results: response.data,
      total: response.total,
      ...
    })
  }
}
```

**How it Works:**
1. Check if method exists on ApiService
2. Transform params via `paramMapper`
3. Call `apiService[methodName](...params)`
4. Transform response via `responseTransformer`

#### Mode B: Direct HTTP Call

```typescript
// Configuration
{
  api: {
    http: {
      method: 'GET',
      endpoint: '/api/engines',
      baseUrl: 'https://parts-api.com',  // Optional external API
      headers: {
        'X-API-Key': 'abc123'
      }
    },
    paramMapper: (params) => ({
      page: params.page,
      size: params.size
    }),
    responseTransformer: (response) => ({
      results: response.data,
      total: response.total,
      ...
    })
  }
}
```

**How it Works:**
1. Build URL (baseUrl + endpoint)
2. Transform params via `paramMapper`
3. Build HttpParams from transformed params
4. Execute HTTP request (GET/POST/PUT/DELETE)
5. Transform response via `responseTransformer`

#### Client-Side Pagination

```
1. First fetch() call:
   - Load ALL data from API (page=1, size=1000)
   - Cache data in memory
   - Filter/sort/paginate in memory
   - Return requested page

2. Subsequent fetch() calls:
   - Check if cache is valid (based on TTL)
   - If valid: Use cached data
   - If invalid: Reload from API
   - Filter/sort/paginate in memory
   - Return requested page
```

#### Server-Side Pagination

```
1. Each fetch() call:
   - Request specific page from API
   - API returns only requested page
   - No caching (fresh data each time)
   - Return API response
```

#### State Management
- **Cache:** In-memory cache of full dataset (client-side mode only)
- **Cache TTL:** Configurable time-to-live (0 = cache forever)
- **Loading Flag:** Prevents duplicate requests during data load

#### When to Use
- Instantiated by BasePickerComponent during initialization
- One instance per picker component
- **Don't use directly** - Use via BasePickerComponent

---

### 9. PopOutContextService

**File:** `frontend/src/app/core/services/popout-context.service.ts`
**Lines:** 103
**Injectable:** `providedIn: 'root'`

#### Purpose
Provides **pop-out window context detection** and **BroadcastChannel communication** between main window and pop-out panels.

#### Key Features
- Detect if component is running in pop-out window
- BroadcastChannel-based messaging (cross-window)
- Observable stream of messages from main window
- Zone-aware message handling (ensures Angular change detection)

#### Dependencies
- `NgZone` (Angular zone for change detection)

#### Important Methods

```typescript
// Initialization
initializeAsPopOut(panelId: string): void

// Context detection
isInPopOut(): boolean
getPanelId(): string | undefined

// Communication
sendMessage(message: PopOutMessage): void
messages$: Observable<PopOutMessage>

// Cleanup
destroy(): void
```

#### Message Format

```typescript
interface PopOutMessage {
  type: string;      // Message type (e.g., 'STATE_UPDATE', 'PANEL_READY')
  payload?: any;     // Optional message data
}
```

#### Communication Flow

```
MAIN WINDOW                          POP-OUT WINDOW
─────────────                        ──────────────
StateManagement                      PopOutContext
    │                                     │
    ├─ User changes filter                │
    │                                     │
    ├─ Update state                       │
    │                                     │
    ├─ BroadcastChannel.postMessage()    │
    │     {                               │
    │       type: 'STATE_UPDATE',         │
    │       payload: { filters, results } │
    │     }                               │
    │                                     │
    │    ─────────────────────────────>   │
    │                                     │
    │                                     ├─ onmessage()
    │                                     │
    │                                     ├─ NgZone.run()
    │                                     │
    │                                     ├─ messages$.next()
    │                                     │
    │                                     └─ Component receives update
```

#### State Management
- **BroadcastChannel:** Browser API for cross-window communication
- **Observable Stream:** `messages$` emits all received messages
- **Zone-aware:** All message callbacks run inside Angular zone
- **Channel Naming:** `panel-{panelId}` (e.g., `panel-picker`)

#### When to Use
- PanelPopoutComponent initializes service on pop-out window load
- Components check `isInPopOut()` to determine their mode
- Pop-out components use `sendMessage()` for user actions
- Pop-out components subscribe to `messages$` for state updates

---

### 10. ErrorNotificationService

**File:** `frontend/src/app/core/services/error-notification.service.ts`
**Lines:** 219
**Injectable:** `providedIn: 'root'`

#### Purpose
User-facing **error notification system** using PrimeNG toast messages. Categorizes HTTP errors and prevents duplicate notifications.

#### Key Features
- Error categorization based on HTTP status codes
- Deduplication (3-second window)
- Severity levels (info, warning, error, success)
- Automatic error message formatting
- Network error detection

#### Dependencies
- `MessageService` (PrimeNG)

#### Important Methods

```typescript
// Show notifications
showError(title: string, message: string, duration?: number): void
showWarning(title: string, message: string, duration?: number): void
showInfo(title: string, message: string, duration?: number): void
showSuccess(title: string, message: string, duration?: number): void

// HTTP error handling
handleHttpError(error: any): void
```

#### Error Categorization

| Status Code | Category | Severity | Duration |
|-------------|----------|----------|----------|
| 0 (Network) | Network Error | ERROR | 6000ms |
| 400 | Invalid Request | WARNING | 5000ms |
| 401 | Authentication Required | WARNING | 5000ms |
| 403 | Access Denied | ERROR | 5000ms |
| 404 | Not Found | WARNING | 4000ms |
| 429 | Too Many Requests | WARNING | 6000ms |
| 5xx | Server Error | ERROR | 6000ms |

#### Deduplication Algorithm

```
Error arrives: { status: 404, url: '/api/vehicles/details' }

1. Generate key: "404-/api/vehicles/details"
2. Check recentErrors Map for key
3. If found:
   - Check timestamp (now - lastShown < 3000ms?)
   - If recent: Suppress notification
   - If old: Show notification, update timestamp
4. If not found:
   - Show notification
   - Store in recentErrors Map with current timestamp
5. Cleanup: Remove entries older than 6 seconds
```

#### State Management
- **Deduplication Map:** `recentErrors: Map<string, number>`
- **Cleanup:** Automatic removal of old entries (2x dedupe window)
- **Stateless:** No persistent state across page loads

#### When to Use
- Via GlobalErrorHandler for uncaught errors
- Via HTTP interceptor for API errors (if implemented)
- Directly from components for user feedback (success/info messages)

---

### 11. GlobalErrorHandler

**File:** `frontend/src/app/core/services/global-error-handler.service.ts`
**Lines:** 69
**Injectable:** ❌ Provided in module (`{ provide: ErrorHandler, useClass: GlobalErrorHandler }`)

#### Purpose
**Global Angular error handler** that catches all uncaught errors in the application (component errors, promise rejections, unhandled RxJS errors).

#### Key Features
- Catches all uncaught errors
- Categorizes errors (HTTP, ChunkLoad, generic)
- Prevents application crashes
- User-friendly error notifications
- Detailed console logging for debugging

#### Dependencies
- `ErrorNotificationService` (via Injector to avoid circular dependency)

#### Error Types Handled

| Error Type | User Message | Technical Details |
|------------|--------------|-------------------|
| **HttpErrorResponse** | Already handled by interceptor | Logged to console |
| **ChunkLoadError** | "A new version is available. Please refresh the page." | Webpack lazy-loading failure |
| **Error (generic)** | "An unexpected error occurred. The application is still running..." | Generic JavaScript error |
| **Unknown** | "An unexpected error occurred. Please refresh..." | Non-Error object |

#### State Management
- **Stateless** - No internal state
- Errors logged to console for debugging
- User notifications via ErrorNotificationService
- Does not prevent application from continuing

#### When to Use
- Automatically invoked by Angular framework
- Configured in app.module.ts:

```typescript
providers: [
  { provide: ErrorHandler, useClass: GlobalErrorHandler }
]
```

---

## Service Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE DEPENDENCY GRAPH                      │
└─────────────────────────────────────────────────────────────────┘

LAYER 0: EXTERNAL DEPENDENCIES
────────────────────────────────
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │ Angular      │  │ RxJS         │  │ PrimeNG      │  │ Browser APIs │
 │ Router       │  │              │  │ MessageService│  │ localStorage │
 └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
       │                  │                  │                  │
       └──────────────────┴──────────────────┴──────────────────┘
                                  │
                                  ▼

LAYER 1: FOUNDATION SERVICES (No Service Dependencies)
──────────────────────────────────────────────────────
 ┌─────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐
 │ UrlParamService │  │ RequestCoordinator   │  │ TableStatePersist   │
 │                 │  │ Service              │  │ Service             │
 │ Router          │  │                      │  │                     │
 │ ActivatedRoute  │  │ (Pure RxJS)          │  │ (localStorage)      │
 └─────────────────┘  └──────────────────────┘  └─────────────────────┘

 ┌─────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐
 │ ApiService      │  │ PickerConfigService  │  │ PopOutContext       │
 │                 │  │                      │  │ Service             │
 │ HttpClient      │  │ (In-memory registry) │  │                     │
 │                 │  │                      │  │ NgZone              │
 └─────────────────┘  └──────────────────────┘  └─────────────────────┘
       │                       │
       └───────────────────────┼───────────────────┐
                               │                   │
                               ▼                   ▼

LAYER 2: CONVERSION & COORDINATION SERVICES
────────────────────────────────────────────
 ┌─────────────────────────────────────────────────────────────┐
 │ RouteStateService                                           │
 │                                                             │
 │ DEPENDS ON:                                                 │
 │  • Router                                                   │
 │  • ActivatedRoute                                           │
 │                                                             │
 │ PROVIDES:                                                   │
 │  • SearchFilters ↔ URL params conversion                   │
 │  • Observable query param stream                            │
 └─────────────────────────────────────────────────────────────┘
       │
       │
       ▼

LAYER 3: STATE ORCHESTRATION
─────────────────────────────
 ┌─────────────────────────────────────────────────────────────┐
 │ StateManagementService                                      │
 │                                                             │
 │ DEPENDS ON:                                                 │
 │  • RouteStateService                                        │
 │  • RequestCoordinatorService                                │
 │  • ApiService                                               │
 │  • Router                                                   │
 │                                                             │
 │ PROVIDES:                                                   │
 │  • filters$, results$, loading$, error$                     │
 │  • fetchVehicleData()                                       │
 │  • updateFilters(), updatePage(), updateSort()              │
 └─────────────────────────────────────────────────────────────┘
       │
       │
       ▼

LAYER 4: DATA SOURCES (Manual Instantiation)
─────────────────────────────────────────────
 ┌─────────────────────────────────────────────────────────────┐
 │ BasePickerDataSource<T>                                     │
 │                                                             │
 │ DEPENDS ON:                                                 │
 │  • ApiService                                               │
 │  • HttpClient                                               │
 │  • PickerConfig<T>                                          │
 │                                                             │
 │ PROVIDES:                                                   │
 │  • fetch(params): Observable<TableResponse<T>>              │
 │  • Client-side or server-side pagination                    │
 │  • Dual-mode API calls (ApiService or Direct HTTP)          │
 └─────────────────────────────────────────────────────────────┘

LAYER 5: ERROR HANDLING
────────────────────────
 ┌─────────────────────────────────────────────────────────────┐
 │ ErrorNotificationService                                    │
 │                                                             │
 │ DEPENDS ON:                                                 │
 │  • MessageService (PrimeNG)                                 │
 │                                                             │
 │ PROVIDES:                                                   │
 │  • showError(), showWarning(), showInfo(), showSuccess()    │
 │  • handleHttpError()                                        │
 └─────────────────────────────────────────────────────────────┘
       │
       ▲
       │
 ┌─────────────────────────────────────────────────────────────┐
 │ GlobalErrorHandler                                          │
 │                                                             │
 │ DEPENDS ON:                                                 │
 │  • ErrorNotificationService (via Injector)                  │
 │                                                             │
 │ PROVIDES:                                                   │
 │  • Catches all uncaught errors                              │
 └─────────────────────────────────────────────────────────────┘
```

---

## Service Flow Diagrams

### Diagram 1: Vehicle Search Flow (Main Flow)

```
USER INTERACTION: User selects manufacturer "Ford" in picker
───────────────────────────────────────────────────────────

1. PICKER COMPONENT
   ├─ User clicks "Ford" row
   ├─ Emits selectionChanged event
   └─ Sends to parent component

2. PARENT COMPONENT (DiscoverComponent)
   ├─ Receives selectionChanged event
   ├─ Calls stateManagement.updateFilters({ modelCombos: [...] })
   └─ Continues to StateManagementService

3. STATE MANAGEMENT SERVICE
   ├─ Receives updateFilters({ modelCombos: [...] })
   ├─ Updates internal state (filters)
   ├─ Calls routeState.syncStateToUrl()
   ├─ URL updates: ?modelCombos=Ford:F-150
   ├─ watchUrlChanges() detects change
   ├─ Calls fetchVehicleData()
   └─ Continues to RequestCoordinatorService

4. REQUEST COORDINATOR SERVICE
   ├─ Receives execute(key, requestFn, config)
   ├─ Builds cache key: "vehicle-details:base64(filters)"
   ├─ Checks cache: MISS
   ├─ Checks activeRequests: Not in-flight
   ├─ Calls requestFn() → ApiService.getVehicleDetails()
   ├─ Stores in activeRequests Map
   └─ Continues to ApiService

5. API SERVICE
   ├─ Receives getVehicleDetails(models, page, size, filters)
   ├─ Builds HttpParams: ?models=Ford:F-150&page=1&size=20
   ├─ Calls http.get('/api/vehicles/details', { params })
   └─ Returns Observable<VehicleDetailsResponse>

6. REQUEST COORDINATOR SERVICE (Response)
   ├─ Receives API response
   ├─ Caches response (if cacheTime > 0)
   ├─ Removes from activeRequests Map
   ├─ Emits to subscriber (StateManagementService)
   └─ Updates loading state

7. STATE MANAGEMENT SERVICE (Response)
   ├─ Receives VehicleDetailsResponse
   ├─ Updates state:
   │  ├─ results: [...]
   │  ├─ totalResults: 1247
   │  ├─ loading: false
   │  └─ error: null
   └─ stateSubject.next(newState)

8. OBSERVABLES EMIT
   ├─ filters$ → emits new filters
   ├─ results$ → emits new results
   ├─ totalResults$ → emits 1247
   └─ loading$ → emits false

9. COMPONENTS RECEIVE UPDATES
   ├─ VehicleResultsTableComponent receives results$
   ├─ Updates table display
   └─ User sees Ford vehicles
```

---

### Diagram 2: API Call Deduplication Flow

```
SCENARIO: Two components request same data simultaneously
──────────────────────────────────────────────────────────

TIME: T+0ms
───────────
Component A                    Component B
    │                              │
    ├─ stateManagement.           ├─ stateManagement.
    │  fetchVehicleData()         │  fetchVehicleData()
    │                              │
    └────────┬─────────────────────┘
             │
             ▼
   StateManagementService
             │
             ├─ Builds cache key: "vehicle-details:abc123"
             │
             └────────┬─────────────────────┐
                      │                     │
                      ▼                     ▼
          Request A (T+0ms)      Request B (T+5ms)
                      │                     │
                      │                     │
                      ▼                     │
        RequestCoordinatorService          │
                      │                     │
    ┌─────────────────┴──────────┐         │
    │ execute(key, requestFn)     │         │
    │                             │         │
    │ 1. Check cache: MISS        │         │
    │ 2. Check activeRequests:    │         │
    │    Map is empty             │         │
    │ 3. Call requestFn()         │         │
    │ 4. Store Observable in Map: │         │
    │    activeRequests.set(      │         │
    │      "vehicle-details:abc123",       │
    │      observable$            │         │
    │    )                        │         │
    │ 5. Return observable$       │         │
    └─────────────────┬───────────┘         │
                      │                     │
                      ▼                     ▼
               HTTP Request         RequestCoordinatorService
               (In Progress)                │
                      │         ┌───────────┴────────────┐
                      │         │ execute(key, requestFn) │
                      │         │                          │
                      │         │ 1. Check cache: MISS     │
                      │         │ 2. Check activeRequests: │
                      │         │    FOUND! Key exists     │
                      │         │ 3. Return SAME observable│
                      │         │    (no new HTTP request) │
                      │         └───────────┬──────────────┘
                      │                     │
                      │                     │
                      ▼                     │
               API Response                 │
                      │                     │
                      ├─────────────────────┘
                      │
                      │ (Both subscribers receive same response)
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
    Component A               Component B
    Updates UI                Updates UI
    (Same data)               (Same data)

RESULT:
✅ Only ONE HTTP request made
✅ Both components receive same response
✅ No duplicate API calls
✅ Network bandwidth saved
```

---

### Diagram 3: Picker Data Fetching Flow (Dual-Mode)

```
PICKER COMPONENT INITIALIZATION
────────────────────────────────

1. BasePickerComponent.ngOnInit()
   ├─ Retrieves PickerConfig from PickerConfigService
   ├─ Creates BasePickerDataSource instance:
   │  new BasePickerDataSource(apiService, config, http)
   └─ Calls dataSource.fetch(params)

2. BasePickerDataSource.fetch(params)
   ├─ Checks pagination mode from config
   └─ Branches based on mode:

   ┌─────────────────────────┬─────────────────────────┐
   │ CLIENT-SIDE MODE        │ SERVER-SIDE MODE        │
   └─────────────────────────┴─────────────────────────┘

CLIENT-SIDE MODE:
─────────────────
3a. fetchClientSide(params)
    ├─ Check cache validity
    │  ├─ If valid: Return cached data (filtered/sorted)
    │  └─ If invalid: Continue to API call
    │
    ├─ Set isLoading = true
    ├─ Call callApiMethod(params)
    │
    └─ Branch based on API mode:

    ┌───────────────────────────┬────────────────────────┐
    │ MODE A: ApiService        │ MODE B: Direct HTTP    │
    └───────────────────────────┴────────────────────────┘

MODE A: ApiService Method Call
───────────────────────────────
4a-A. callApiServiceMethod(params)
      ├─ Get method name from config.api.method
      ├─ Check if method exists on ApiService
      ├─ Transform params via config.api.paramMapper
      ├─ Call apiService[methodName](...params)
      ├─ Transform response via config.api.responseTransformer
      └─ Return TableResponse<T>

MODE B: Direct HTTP Call
─────────────────────────
4a-B. makeDirectHttpCall(params)
      ├─ Get HTTP config from config.api.http
      ├─ Build URL (baseUrl + endpoint)
      ├─ Transform params via config.api.paramMapper
      ├─ Build HttpParams from transformed params
      ├─ Add headers from config.api.http.headers
      ├─ Execute http.get/post/put/delete(url, options)
      ├─ Transform response via config.api.responseTransformer
      └─ Return TableResponse<T>

5a. Response Handling (Client-Side)
    ├─ Cache full dataset: cachedData = response.results
    ├─ Store timestamp: lastLoadTime = Date.now()
    ├─ Set isLoading = false
    ├─ Apply client-side filtering (if config.filtering)
    ├─ Apply client-side sorting (if config.sorting)
    ├─ Apply client-side pagination (slice array)
    └─ Return paginated TableResponse<T>

SERVER-SIDE MODE:
─────────────────
3b. fetchServerSide(params)
    ├─ No caching (always fresh data)
    ├─ Call callApiMethod(params) with page/size
    │
    └─ Branch based on API mode:

    ┌───────────────────────────┬────────────────────────┐
    │ MODE A: ApiService        │ MODE B: Direct HTTP    │
    └───────────────────────────┴────────────────────────┘

4b-A. callApiServiceMethod(params)
      (Same as 4a-A, but with page/size in params)

4b-B. makeDirectHttpCall(params)
      (Same as 4a-B, but with page/size in params)

5b. Response Handling (Server-Side)
    ├─ No caching
    ├─ No client-side filtering/sorting
    └─ Return API response as-is

6. BasePickerComponent Receives Data
   ├─ Updates table rows
   ├─ Updates pagination UI
   └─ User sees picker data
```

---

### Diagram 4: Pop-Out Window Communication Flow

```
MAIN WINDOW                           POP-OUT WINDOW
───────────                           ──────────────

1. User clicks "Pop-Out" button
   │
   ├─ WorkshopComponent.popOutPanel('picker')
   │
   └─ window.open('/panel/picker', '_blank')
                │
                └──────────────────────────────────────┐
                                                       │
                                                       ▼
                                            2. PanelPopoutComponent.ngOnInit()
                                               │
                                               ├─ Extract panelId from route params
                                               ├─ Initialize PopOutContextService:
                                               │  popOutContext.initializeAsPopOut('picker')
                                               │
                                               ├─ Create BroadcastChannel('panel-picker')
                                               │
                                               ├─ Send PANEL_READY message
                                               │  channel.postMessage({ type: 'PANEL_READY' })
                                               │
                                               └─────────────────────────┐
                                                                         │
3. Main window receives PANEL_READY ◄────────────────────────────────────┘
   │
   ├─ Send initial state to pop-out
   │  channel.postMessage({
   │    type: 'STATE_UPDATE',
   │    payload: {
   │      filters: currentFilters,
   │      results: currentResults
   │    }
   │  })
   │
   └────────────────────────────────────────────────┐
                                                    │
                                                    ▼
                                         4. Pop-out receives STATE_UPDATE
                                            │
                                            ├─ PopOutContextService.onmessage
                                            ├─ NgZone.run() → Trigger change detection
                                            ├─ messages$.next(message)
                                            │
                                            └─ Component receives message
                                               │
                                               ├─ ManufacturerModelPickerComponent
                                               │  subscribes to popOutContext.messages$
                                               │
                                               └─ Updates component state
                                                  (filters, selections)

5. USER INTERACTION IN POP-OUT
   │
   ├─ User clicks row in picker
   │
   ├─ PickerComponent.onSelectionChange()
   │
   ├─ Check: isInPopOut() → TRUE
   │
   ├─ Send message to main window:
   │  popOutContext.sendMessage({
   │    type: 'SELECTION_CHANGE',
   │    payload: { selections: [...] }
   │  })
   │
   └────────────────────────────────────────────────┐
                                                    │
6. Main window receives SELECTION_CHANGE ◄──────────┘
   │
   ├─ WorkshopComponent.onPopOutMessage()
   │
   ├─ Calls stateManagement.updateFilters({
   │    modelCombos: message.payload.selections
   │  })
   │
   ├─ StateManagement updates URL + triggers API call
   │
   ├─ Receives API response
   │
   └─ Broadcasts STATE_UPDATE to ALL windows:
      channel.postMessage({
        type: 'STATE_UPDATE',
        payload: {
          filters: newFilters,
          results: newResults
        }
      })
      │
      └────────────────────────────────────────────────┐
                                                       │
7. Pop-out receives STATE_UPDATE ◄─────────────────────┘
   │
   ├─ PopOutContextService.onmessage
   ├─ messages$.next(message)
   │
   └─ VehicleResultsTableComponent receives update
      │
      └─ Updates table with new results

RESULT:
✅ Main window owns all state (URL is source of truth)
✅ Pop-out sends user actions to main window
✅ Main window updates state and broadcasts to all windows
✅ All windows stay synchronized
```

---

### Diagram 5: Error Handling Flow

```
ERROR SCENARIO: API call fails with 404 error
──────────────────────────────────────────────

1. Component triggers API call
   ├─ stateManagement.fetchVehicleData()
   └─ requestCoordinator.execute(key, requestFn, config)

2. RequestCoordinatorService
   ├─ Calls apiService.getVehicleDetails()
   └─ HTTP request fails with 404

3. Retry Logic (RequestCoordinatorService)
   ├─ Attempt 1: Immediate (FAIL - 404)
   ├─ Attempt 2: Wait 1000ms (FAIL - 404)
   ├─ Attempt 3: Wait 2000ms (FAIL - 404)
   └─ All attempts exhausted → Throw error

4. Error Propagates to StateManagementService
   ├─ catchError() operator catches error
   ├─ Updates state:
   │  ├─ results: []
   │  ├─ totalResults: 0
   │  ├─ loading: false
   │  └─ error: "No vehicles found matching your criteria."
   │
   └─ Returns throwError() → Error propagates to component

5. Component Error Handler (if subscribed)
   ├─ Component subscribes to fetchVehicleData()
   ├─ Error callback receives error
   └─ Component can handle error (optional)

6. Global Error Handler (if uncaught)
   ├─ Error bubbles to Angular's error handler
   ├─ GlobalErrorHandler.handleError(error)
   │
   └─ Routes based on error type:

   ┌──────────────────────────────────────────────┐
   │ ERROR TYPE ROUTING                           │
   └──────────────────────────────────────────────┘

   A. HttpErrorResponse (404)
      ├─ Already handled by StateManagementService
      ├─ Log to console: "Already handled by interceptor"
      └─ No user notification (already shown by component)

   B. ChunkLoadError (Webpack lazy-loading)
      ├─ errorNotification.showError(
      │    'Application Update',
      │    'A new version is available. Please refresh the page.',
      │    10000
      │  )
      └─ User sees update notification

   C. Generic Error (component error)
      ├─ errorNotification.showError(
      │    'Application Error',
      │    'An unexpected error occurred...',
      │    8000
      │  )
      └─ User sees generic error

7. ErrorNotificationService.handleHttpError(error)
   ├─ Categorize error based on status code
   │  ├─ 0 → Network Error
   │  ├─ 400 → Invalid Request
   │  ├─ 404 → Not Found
   │  ├─ 5xx → Server Error
   │  └─ Other → Unexpected Error
   │
   ├─ Check deduplication:
   │  ├─ Generate key: "404-/api/vehicles/details"
   │  ├─ Check recentErrors Map
   │  ├─ If shown recently (< 3s): Suppress
   │  └─ If not recent: Continue
   │
   └─ Show notification:
      ├─ messageService.add({
      │    severity: 'warn',
      │    summary: 'Not Found',
      │    detail: 'The requested resource was not found.',
      │    life: 4000
      │  })
      │
      └─ User sees toast notification

8. User Sees Notification
   ├─ PrimeNG Toast appears (top-right)
   ├─ Message: "Not Found: The requested resource was not found."
   ├─ Auto-dismisses after 4 seconds
   └─ User can click X to dismiss early

LAYERS OF ERROR HANDLING:
──────────────────────────
Layer 1: RequestCoordinatorService (Retry with exponential backoff)
Layer 2: StateManagementService (Update state with error message)
Layer 3: Component (Optional error handling in subscription)
Layer 4: GlobalErrorHandler (Catch all uncaught errors)
Layer 5: ErrorNotificationService (User-facing notifications)
```

---

## State Management Architecture

### State Layers

The application uses **three distinct state layers**:

| Layer | Storage | Scope | Shareable | Example |
|-------|---------|-------|-----------|---------|
| **URL Query Params** | Browser URL | Session/bookmarkable | ✅ Yes | `?modelCombos=Ford:F-150&page=2` |
| **Component State** | RxJS BehaviorSubject | Component lifecycle | ❌ No | `results: VehicleResult[]` |
| **UI Preferences** | localStorage | Persistent per-browser | ❌ No | `columnOrder: ['manufacturer', 'model']` |

### URL as Single Source of Truth

```
┌─────────────────────────────────────────────────────────────────┐
│                    URL QUERY PARAMETERS                          │
│                  (Single Source of Truth)                        │
└─────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ StateManagement│  │ Components    │  │ Browser Nav   │
│ Service        │  │ (subscribe)   │  │ (back/forward)│
└───────────────┘  └───────────────┘  └───────────────┘
        │
        ├─ filters$ → Current filters from URL
        ├─ results$ → API results based on URL
        └─ loading$ → Loading state

BENEFITS:
✅ Bookmarkable URLs
✅ Shareable search results
✅ Browser back/forward support
✅ No state desynchronization
✅ Automatic state hydration on page load
```

### State Synchronization Flow

```
USER ACTION → URL UPDATE → STATE UPDATE → API CALL → RESULTS UPDATE
─────────────────────────────────────────────────────────────────

1. User selects filter in UI
   │
2. Component calls stateManagement.updateFilters()
   │
3. StateManagement updates internal BehaviorSubject
   │
4. StateManagement syncs to URL via RouteStateService
   │
5. URL updates (browser navigation)
   │
6. StateManagement.watchUrlChanges() detects change
   │
7. StateManagement calls fetchVehicleData()
   │
8. RequestCoordinator checks cache/deduplicates
   │
9. ApiService makes HTTP call
   │
10. StateManagement receives response
    │
11. StateManagement updates BehaviorSubject
    │
12. All subscribed components receive new state via observables
```

### State Persistence Matrix

| Data Type | URL | localStorage | Component State | API |
|-----------|-----|--------------|-----------------|-----|
| **Selected Models** | ✅ `modelCombos` | ❌ | ✅ `selections` | ❌ |
| **Filters (Year, Body Class)** | ✅ `yearMin`, `bodyClass` | ❌ | ✅ `filters` | ❌ |
| **Pagination** | ✅ `page`, `size` | ❌ | ✅ `currentPage` | ❌ |
| **Sorting** | ✅ `sort`, `sortDirection` | ❌ | ✅ `sortState` | ❌ |
| **Search Results** | ❌ | ❌ | ✅ `results` | ✅ Source |
| **Column Order** | ❌ | ✅ `columnOrder` | ✅ `displayedColumns` | ❌ |
| **Column Visibility** | ❌ | ✅ `visibleColumns` | ✅ `hiddenColumns` | ❌ |
| **Panel Collapse** | ✅ `h_panelCollapsed` | ❌ | ✅ `isCollapsed` | ❌ |
| **Highlights** | ✅ `h_yearMin`, `h_yearMax` | ❌ | ✅ `highlights` | ❌ |
| **Ephemeral Filters** | ❌ | ❌ | ✅ `tableFilters` | ❌ |

---

## API Call Deduplication

### Problem

Multiple components requesting same data simultaneously can cause:
- Duplicate HTTP requests to backend
- Increased server load
- Network bandwidth waste
- Inconsistent UI states during loading

### Solution: RequestCoordinatorService

The RequestCoordinatorService implements **in-flight request deduplication** using a request cache keyed by filter state.

### Deduplication Strategy

#### 1. Cache Key Generation

```typescript
// StateManagementService builds deterministic cache key
private buildCacheKey(prefix: string, filters: SearchFilters): string {
  const filterString = JSON.stringify({
    modelCombos: filters.modelCombos?.sort(), // Sort for consistency
    page: filters.page,
    size: filters.size,
    sort: filters.sort,
    sortDirection: filters.sortDirection,
    yearMin: filters.yearMin,
    yearMax: filters.yearMax,
    // ... other filters
  });

  return `${prefix}:${btoa(filterString)}`; // Base64 encode for URL safety
}

// Example cache key:
// "vehicle-details:eyJtb2RlbENvbWJvcyI6W3sibWFudWZhY3R1cmVyIjoiRm9yZCIsIm1vZGVsIjoiRi0xNTAifV0sInBhZ2UiOjEsInNpemUiOjIwfQ=="
```

#### 2. Active Request Tracking

```typescript
// RequestCoordinatorService maintains Map of in-flight requests
private activeRequests = new Map<string, Observable<any>>();

execute<T>(key: string, requestFn: () => Observable<T>): Observable<T> {
  // Check if request already in-flight
  if (this.activeRequests.has(key)) {
    console.log(`[RequestCoordinator] Returning existing request for key: ${key}`);
    return this.activeRequests.get(key)!; // ← Return same Observable
  }

  // Create new request
  const request$ = requestFn().pipe(
    shareReplay(1), // ← Share response among all subscribers
    finalize(() => {
      this.activeRequests.delete(key); // ← Remove when complete
    })
  );

  // Store in activeRequests
  this.activeRequests.set(key, request$);

  return request$;
}
```

#### 3. Response Caching

```typescript
// After successful request, cache response
private responseCache = new Map<string, CacheEntry>();

// On successful response:
if (cacheTime > 0) {
  this.responseCache.set(key, {
    data: response,
    timestamp: Date.now(),
    config: config
  });
}

// Before making new request:
const cached = this.getCachedResponse(key, cacheTime);
if (cached !== null) {
  return of(cached); // ← Return cached data (no HTTP call)
}
```

### Example Scenario

```
TIME: T+0ms
──────────

Component A: stateManagement.fetchVehicleData()
   ↓
   Filters: { modelCombos: ['Ford:F-150'], page: 1, size: 20 }
   ↓
   Cache Key: "vehicle-details:abc123"
   ↓
   RequestCoordinator.execute(key, requestFn)
   ↓
   Check activeRequests Map: EMPTY
   ↓
   Create Observable, store in Map:
   activeRequests.set("vehicle-details:abc123", observable$)
   ↓
   HTTP GET /api/vehicles/details?models=Ford:F-150&page=1&size=20
   ↓
   Request in-flight...

─────────────────────────────────────────────────────────────

TIME: T+5ms (Request still in-flight)
──────────

Component B: stateManagement.fetchVehicleData()
   ↓
   Filters: { modelCombos: ['Ford:F-150'], page: 1, size: 20 }
   ↓
   Cache Key: "vehicle-details:abc123" (SAME AS COMPONENT A)
   ↓
   RequestCoordinator.execute(key, requestFn)
   ↓
   Check activeRequests Map: FOUND!
   ↓
   Return existing Observable (NO NEW HTTP REQUEST)
   ↓
   Both Component A and B subscribe to SAME Observable
   ↓
   Both receive same response when HTTP completes

─────────────────────────────────────────────────────────────

TIME: T+150ms (Response received)
──────────

HTTP Response arrives
   ↓
   Observable emits response
   ↓
   Component A receives response → Updates UI
   Component B receives response → Updates UI
   ↓
   finalize() operator executes
   ↓
   activeRequests.delete("vehicle-details:abc123")
   ↓
   Response cached (if cacheTime > 0):
   responseCache.set("vehicle-details:abc123", { data, timestamp })

─────────────────────────────────────────────────────────────

TIME: T+200ms (Subsequent request)
──────────

Component C: stateManagement.fetchVehicleData()
   ↓
   Filters: { modelCombos: ['Ford:F-150'], page: 1, size: 20 }
   ↓
   Cache Key: "vehicle-details:abc123"
   ↓
   RequestCoordinator.execute(key, requestFn)
   ↓
   Check cache first: FOUND!
   ↓
   Check timestamp: now - timestamp < cacheTime?
   ↓
   Cache valid: Return of(cachedData) (NO HTTP REQUEST)
   ↓
   Component C receives cached response immediately
```

### Deduplication Metrics

| Scenario | Without Deduplication | With Deduplication | Savings |
|----------|------------------------|---------------------|---------|
| 2 components load same page | 2 HTTP requests | 1 HTTP request | 50% |
| 5 components load same filters | 5 HTTP requests | 1 HTTP request | 80% |
| User clicks back/forward 3 times | 3 HTTP requests | 0 HTTP requests (cached) | 100% |

---

## Quick Reference

### Common Service Patterns

#### Pattern 1: Update URL-Based Filters

```typescript
// Component
constructor(private stateManagement: StateManagementService) {}

onFilterChange(newFilters: Partial<SearchFilters>) {
  this.stateManagement.updateFilters(newFilters);
  // ✅ URL updates automatically
  // ✅ API call triggered automatically
  // ✅ All components receive new results via observables
}
```

#### Pattern 2: Subscribe to State Changes

```typescript
// Component
ngOnInit() {
  // Subscribe to filters
  this.stateManagement.filters$.subscribe(filters => {
    console.log('Filters changed:', filters);
  });

  // Subscribe to results
  this.stateManagement.results$.subscribe(results => {
    this.displayResults = results;
  });

  // Subscribe to loading state
  this.stateManagement.loading$.subscribe(loading => {
    this.isLoading = loading;
  });
}
```

#### Pattern 3: Update URL Without API Call

```typescript
// Component
constructor(private urlParamService: UrlParamService) {}

onPanelCollapse(isCollapsed: boolean) {
  // Update URL highlight parameter (no API call)
  this.urlParamService.setHighlightParam('panelCollapsed', isCollapsed);
  // ✅ URL updates: ?h_panelCollapsed=true
  // ✅ No API call triggered (highlight parameters are UI-only)
}
```

#### Pattern 4: Persist Table Preferences

```typescript
// Component
constructor(private tablePersistence: TableStatePersistenceService) {}

onColumnOrderChange(newOrder: string[]) {
  const preferences: TablePreferences = {
    columnOrder: newOrder,
    visibleColumns: this.visibleColumns,
    pageSize: this.pageSize,
    lastUpdated: Date.now()
  };

  this.tablePersistence.savePreferences('vehicle-results', preferences);
  // ✅ Saved to localStorage
  // ✅ Persists across sessions
}

ngOnInit() {
  const preferences = this.tablePersistence.loadPreferences('vehicle-results');
  if (preferences) {
    this.columnOrder = preferences.columnOrder;
    this.visibleColumns = preferences.visibleColumns;
  }
}
```

#### Pattern 5: Create Picker with Configuration

```typescript
// 1. Create configuration file
// config/my-picker.config.ts
export const MY_PICKER_CONFIG: PickerConfig<MyRow> = {
  id: 'my-picker',
  displayName: 'My Picker',
  columns: [
    { key: 'name', label: 'Name', width: '50%', sortable: true }
  ],
  api: {
    http: {
      method: 'GET',
      endpoint: '/api/my-data',
      headers: { 'X-API-Key': environment.apiKey }
    },
    responseTransformer: (response) => ({
      results: response.data,
      total: response.total,
      page: response.page,
      size: response.size,
      totalPages: response.pages
    })
  },
  row: {
    keyGenerator: (row) => row.id,
    keyParser: (key) => ({ id: key })
  },
  selection: {
    urlParam: 'mySelections',
    serializer: (selections) => selections.map(s => s.id).join(','),
    deserializer: (urlValue) => urlValue.split(',').map(id => ({ id }))
  },
  pagination: {
    mode: 'client',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50]
  }
};

// 2. Register configuration
// app.module.ts
constructor(pickerConfigService: PickerConfigService) {
  pickerConfigService.registerConfig(MY_PICKER_CONFIG);
}

// 3. Use in template
// component.html
<app-base-picker [pickerConfigId]="'my-picker'"></app-base-picker>
```

#### Pattern 6: Pop-Out Window Communication

```typescript
// Main Window Component
constructor(private broadcastChannel: BroadcastChannel) {}

ngOnInit() {
  // Listen for messages from pop-out
  this.channel = new BroadcastChannel('panel-picker');
  this.channel.onmessage = (event) => {
    if (event.data.type === 'SELECTION_CHANGE') {
      this.stateManagement.updateFilters({
        modelCombos: event.data.payload.selections
      });
    }
  };
}

// Pop-Out Window Component
constructor(private popOutContext: PopOutContextService) {}

ngOnInit() {
  if (this.popOutContext.isInPopOut()) {
    // Subscribe to state updates from main window
    this.popOutContext.messages$.subscribe(message => {
      if (message.type === 'STATE_UPDATE') {
        this.updateLocalState(message.payload);
      }
    });
  }
}

onUserAction(data: any) {
  if (this.popOutContext.isInPopOut()) {
    // Send action to main window
    this.popOutContext.sendMessage({
      type: 'USER_ACTION',
      payload: data
    });
  }
}
```

---

## Service Responsibilities Summary

| Service | Responsibilities | Does NOT Handle |
|---------|------------------|-----------------|
| **UrlParamService** | URL param CRUD, type conversion, observable streams | State management, API calls |
| **RouteStateService** | URL ↔ SearchFilters conversion, query param observables | API calls, caching |
| **StateManagementService** | State orchestration, URL sync, API coordination | Direct HTTP calls, caching logic |
| **RequestCoordinatorService** | Deduplication, caching, retry logic | State management, URL sync |
| **ApiService** | HTTP calls, query param building | Caching, deduplication, state management |
| **TableStatePersistenceService** | localStorage CRUD for table preferences | URL state, API calls |
| **PickerConfigService** | Configuration registry, validation | Data fetching, state management |
| **BasePickerDataSource** | Picker data fetching, pagination modes | Configuration validation, state sync |
| **PopOutContextService** | Pop-out detection, BroadcastChannel communication | State management, API calls |
| **ErrorNotificationService** | User notifications, error categorization | Error recovery, retry logic |
| **GlobalErrorHandler** | Catch all errors, prevent crashes | Retry logic, state recovery |

---

## Best Practices

### DO ✅

1. **Use StateManagementService for all vehicle data**
   - Automatic caching and deduplication
   - URL sync built-in
   - Observable-based reactive updates

2. **Use UrlParamService for UI-only state**
   - Panel collapse states
   - Highlight parameters
   - Any non-API-triggering state

3. **Use TableStatePersistenceService for UI preferences**
   - Column order and visibility
   - Page size preferences
   - Any non-shareable state

4. **Subscribe to observables in ngOnInit, unsubscribe in ngOnDestroy**
   - Prevent memory leaks
   - Use `takeUntil(destroy$)` pattern

5. **Register all picker configs at app startup**
   - Ensures validation before use
   - Central configuration registry

### DON'T ❌

1. **Don't call ApiService directly for vehicle data**
   - Bypasses caching and deduplication
   - Doesn't update state
   - Use StateManagementService instead

2. **Don't store shareable state in localStorage**
   - Can't be bookmarked or shared
   - Use URL parameters instead

3. **Don't update URL directly in components**
   - Use UrlParamService or StateManagementService
   - Ensures consistent state management

4. **Don't create multiple instances of singleton services**
   - Services are `providedIn: 'root'` for a reason
   - Angular handles dependency injection

5. **Don't mix state layers**
   - URL: Shareable query state
   - localStorage: UI preferences
   - Component: Ephemeral runtime state

---

**END OF DEVELOPER SERVICES REFERENCE**

---

## Document Maintenance

**Last Updated:** 2025-11-08
**Maintainer:** Development Team
**Review Frequency:** Update when new services are added or architectures change

For questions or clarifications, refer to individual service source files or consult the development team.

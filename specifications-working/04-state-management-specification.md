# STATE MANAGEMENT SPECIFICATION
## URL-First Reactive State Architecture
### Branch: experiment/resource-management-service

**Status**: Working Draft - Subject to Refinement
**Date**: 2025-11-15
**Purpose**: Complete specification for the state management system

---

## EXECUTIVE SUMMARY

The application implements a sophisticated **URL-First State Management** architecture where the URL is the single source of truth for application state. This enables bookmarkable deep links, browser back/forward navigation, multi-tab synchronization, and cross-window communication.

**Core Principle**: State flows from URL → Service → Components. Components never directly modify state; they request updates that flow through URL changes.

**Key Services**:
1. **ResourceManagementService<TFilters, TData>** - Generic, domain-agnostic state orchestrator (660 lines)
2. **VehicleResourceManagementService** - Vehicle-specific implementation
3. **UrlStateService** - URL parameter management (434 lines)
4. **FilterUrlMapperService** - Filter ↔ URL serialization
5. **RequestCoordinatorService** - Caching, deduplication, retry (265 lines)

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [ResourceManagementService](#2-resourcemanagementservice)
3. [VehicleResourceManagementService](#3-vehicleresourcemanagementservice)
4. [UrlStateService](#4-urlstateservice)
5. [FilterUrlMapperService](#5-filterurlmapperservice)
6. [RequestCoordinatorService](#6-requestcoordinatorservice)
7. [Adapter Interfaces](#7-adapter-interfaces)
8. [State Flow Diagrams](#8-state-flow-diagrams)
9. [Observable Patterns](#9-observable-patterns)
10. [Pop-Out Window Synchronization](#10-pop-out-window-synchronization)
11. [Error Handling](#11-error-handling)
12. [Implementation Guide](#12-implementation-guide)

---

## 1. ARCHITECTURE OVERVIEW

### URL-First Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER URL                          │
│              /discover?manufacturer=Ford&page=1              │
└──────────────────────────┬──────────────────────────────────┘
                           │ (Single Source of Truth)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    UrlStateService                           │
│         Watches URL, emits changes as Observable             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              ResourceManagementService<T, D>                 │
│  - Watches URL changes                                       │
│  - Parses URL → Filters (via FilterUrlMapper)               │
│  - Fetches data (via ApiAdapter + RequestCoordinator)       │
│  - Updates state (via BehaviorSubject)                      │
│  - Emits observables (filters$, results$, loading$, etc.)   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      COMPONENTS                              │
│  Subscribe to: filters$, results$, loading$, error$          │
│  Call: updateFilters(partial) → triggers URL update          │
└─────────────────────────────────────────────────────────────┘
```

### Service Hierarchy

```
RequestCoordinatorService (Infrastructure Layer)
    ↓ (used by)
ResourceManagementService<TFilters, TData> (Generic Layer)
    ↓ (extended/configured by)
VehicleResourceManagementService (Domain Layer)
    ↓ (injected into)
Components (Presentation Layer)
```

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `resource-management.service.ts` | 660 | Generic state orchestrator |
| `resource-management.types.ts` | 150 | Type definitions |
| `vehicle-resource-management.factory.ts` | 168 | Vehicle service factory |
| `url-state.service.ts` | 434 | URL management |
| `filter-url-mapper.service.ts` | 126 | Filter serialization |
| `request-coordinator.service.ts` | 265 | Request coordination |
| `vehicle-resource-adapters.ts` | 203 | Vehicle adapters |

---

## 2. RESOURCEMANAGEMENTSERVICE

### Generic State Orchestrator

**Location**: `frontend/src/app/core/services/resource-management.service.ts`

**Type Parameters**:
- `TFilters` - Filter object shape (e.g., SearchFilters)
- `TData` - Result object shape (e.g., VehicleResult)

### Configuration Interface

```typescript
interface ResourceManagementConfig<TFilters, TData> {
  // Filter ↔ URL serialization
  filterMapper: FilterUrlMapper<TFilters>;

  // API calls
  apiAdapter: ApiAdapter<TFilters, TData>;

  // Cache key generation
  cacheKeyBuilder: CacheKeyBuilder<TFilters>;

  // Default filter values
  defaultFilters: TFilters;

  // Enable highlight filters (h_* params)
  supportsHighlights: boolean;
}
```

### State Interface

```typescript
interface ResourceState<TFilters, TData> {
  filters: TFilters;              // Current filters
  results: TData[];               // Data results
  totalResults: number;           // Total count (unpaginated)
  loading: boolean;               // Loading state
  error: string | null;           // Error message
  statistics?: any;               // Optional aggregated stats
  highlights?: Partial<TFilters>; // Optional highlight filters
}
```

### Public Observables

```typescript
// Full state
state$: Observable<ResourceState<TFilters, TData>>

// Individual slices (derived from state$)
filters$: Observable<TFilters>
results$: Observable<TData[]>
loading$: Observable<boolean>
error$: Observable<string | null>
totalResults$: Observable<number>
statistics$: Observable<any | null>
highlights$: Observable<Partial<TFilters>>
```

**Implementation**:
```typescript
this.filters$ = this.state$.pipe(
  map(state => state.filters),
  distinctUntilChanged()
);
```

### Public Methods

#### Filter Management

```typescript
updateFilters(partial: Partial<TFilters>): void
```
**Behavior**:
1. Merge partial with current filters
2. Convert to URL params via FilterUrlMapper
3. Update URL via UrlStateService
4. URL change triggers fetchData() automatically

**Example**:
```typescript
stateService.updateFilters({ manufacturer: 'Ford', yearMin: 2020 });
// URL becomes: ?manufacturer=Ford&yearMin=2020&page=1&size=20
```

---

```typescript
clearAllFilters(): void
```
**Behavior**:
1. Reset to defaultFilters
2. Clear URL params except page/size
3. Triggers data refetch

---

```typescript
getCurrentFilters(): TFilters
```
**Returns**: Synchronous snapshot of current filters

---

```typescript
getCurrentState(): ResourceState<TFilters, TData>
```
**Returns**: Synchronous snapshot of complete state

---

#### Highlight Management

```typescript
updateHighlights(partial: Partial<TFilters>): void
```
**Behavior**:
1. Merge partial with current highlights
2. Convert to h_* prefixed URL params
3. Update URL (triggers UI update, not data refetch)

---

```typescript
clearHighlights(): void
```
**Behavior**:
1. Remove all h_* params from URL
2. Triggers UI update

---

#### Data Fetching

```typescript
fetchData(): void
```
**Behavior**:
1. Get current filters from state
2. Build cache key via CacheKeyBuilder
3. Execute request via RequestCoordinator
4. Update state with results/error
5. **Private method** - called automatically by URL watcher

---

#### Pop-Out Synchronization

```typescript
syncStateFromExternal(state: Partial<ResourceState<TFilters, TData>>): void
```
**Purpose**: Update state from external source (BroadcastChannel) without URL changes

**Behavior**:
1. Merge incoming state with current state
2. **Preserve URL-derived highlights** if not explicitly provided
3. Update BehaviorSubject
4. Does NOT trigger URL update (prevents infinite loop)

**Critical**: Used by pop-out windows to receive state from main window

---

#### Loading State

```typescript
getDataLoadingState$(): Observable<boolean>
```
**Returns**: Loading state for main data request

---

```typescript
getGlobalLoadingState$(): Observable<boolean>
```
**Returns**: Loading state for ANY request (data, related data, instances)

---

#### Cache Management

```typescript
clearCache(): void
```
**Behavior**: Invalidates all cached responses for this resource

---

```typescript
cancelAllRequests(): void
```
**Behavior**: Cancels all in-flight requests

---

### Private Methods (Key Internal Logic)

#### URL Watching

```typescript
private watchUrlChanges(): void
```
**Behavior**:
1. Subscribe to ActivatedRoute queryParams
2. On change: Parse URL → Filters → Update state → Fetch data
3. Uses `takeUntil(destroy$)` for cleanup

**Implementation**:
```typescript
this.route.queryParams
  .pipe(
    takeUntil(this.destroy$),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
  )
  .subscribe(params => {
    this.initializeFromUrl();
  });
```

---

#### URL Initialization

```typescript
private initializeFromUrl(): void
```
**Behavior**:
1. Read current URL params
2. Parse to filters via FilterUrlMapper
3. Extract highlights (h_* params)
4. Update state
5. Trigger fetchData()

**Called**:
- On service initialization
- On every URL change

---

#### State Updates

```typescript
private updateState(partial: Partial<ResourceState<TFilters, TData>>): void
```
**Behavior**:
1. Merge partial with current state
2. Emit via BehaviorSubject
3. All observable subscribers receive update

---

### Constructor Logic

```typescript
constructor(
  private route: ActivatedRoute,
  private router: Router,
  private requestCoordinator: RequestCoordinatorService,
  private config: ResourceManagementConfig<TFilters, TData>
) {
  // Initialize state BehaviorSubject
  this.stateSubject = new BehaviorSubject<ResourceState<TFilters, TData>>({
    filters: this.config.defaultFilters,
    results: [],
    totalResults: 0,
    loading: false,
    error: null,
  });

  // Create observable slices
  this.state$ = this.stateSubject.asObservable();
  this.filters$ = this.state$.pipe(map(s => s.filters), distinctUntilChanged());
  // ... etc for other observables

  // URL-FIRST: Both main window and pop-outs watch their own URL
  console.log('[ResourceManagement] Initializing URL watching for:', this.router.url);
  this.initializeFromUrl();
  this.watchUrlChanges();
}
```

**KEY CHANGE in experiment branch**: Pop-out windows now watch their own URL (previously disabled)

---

### OnDestroy Cleanup

```typescript
ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
  this.cancelAllRequests();
}
```

---

## 3. VEHICLERESOURCEMANAGEMENTSERVICE

### Factory Function

**Location**: `frontend/src/app/core/services/vehicle-resource-management.factory.ts`

```typescript
export function createVehicleResourceManagementService(
  route: ActivatedRoute,
  router: Router,
  requestCoordinator: RequestCoordinatorService,
  apiService: ApiService,
  urlState: UrlStateService
): VehicleResourceManagementService {

  // Create adapters
  const filterMapper = new FilterUrlMapperService();
  const apiAdapter = new VehicleApiAdapter(apiService);
  const cacheKeyBuilder = new VehicleCacheKeyBuilder();

  // Configuration
  const config: ResourceManagementConfig<SearchFilters, VehicleResult> = {
    filterMapper,
    apiAdapter,
    cacheKeyBuilder,
    defaultFilters: {
      page: 1,
      size: 20,
    },
    supportsHighlights: true,
  };

  // Create and return service
  return new ResourceManagementService<SearchFilters, VehicleResult>(
    route,
    router,
    requestCoordinator,
    config
  );
}
```

### Provider Configuration

```typescript
// In app.module.ts or feature module
{
  provide: VehicleResourceManagementService,
  useFactory: createVehicleResourceManagementService,
  deps: [
    ActivatedRoute,
    Router,
    RequestCoordinatorService,
    ApiService,
    UrlStateService
  ]
}
```

### Type Alias

```typescript
export type VehicleResourceManagementService =
  ResourceManagementService<SearchFilters, VehicleResult>;
```

---

## 4. URLSTATESERVICE

### Purpose

Generic, reusable service for managing URL query parameters reactively.

**Location**: `frontend/src/app/core/services/url-state.service.ts` (434 lines)

### Read Methods

#### Get Single Parameter

```typescript
getQueryParam(key: string): Observable<string | null>
```
**Returns**: Observable that emits on every URL change

**Example**:
```typescript
urlState.getQueryParam('manufacturer').subscribe(value => {
  console.log('Manufacturer:', value); // "Ford" or null
});
```

---

```typescript
getQueryParamSnapshot(key: string): string | null
```
**Returns**: Synchronous current value

---

#### Get Typed Parameters

```typescript
getQueryParamAsNumber(
  key: string,
  defaultValue?: number
): Observable<number>
```
**Behavior**: Parses string to number, returns default if NaN

---

```typescript
getQueryParamAsBoolean(
  key: string,
  defaultValue: boolean = false
): Observable<boolean>
```
**Parses**: 'true' → true, 'false' → false, others → defaultValue

---

```typescript
getQueryParamAsArray(
  key: string,
  delimiter: string = ','
): Observable<string[]>
```
**Example**: `?colors=red,blue,green` → `['red', 'blue', 'green']`

---

```typescript
getQueryParamAsObject<T>(key: string): Observable<T | null>
```
**Behavior**: Parses JSON-encoded parameter

---

### Write Methods

#### Set/Update Parameters

```typescript
setQueryParams(params: Params): Observable<boolean>
```
**Behavior**:
- **Merges** with existing params
- Preserves params not mentioned
- Returns Observable<boolean> for navigation result

**Example**:
```typescript
// Current URL: ?page=1&size=20
urlState.setQueryParams({ manufacturer: 'Ford' }).subscribe();
// New URL: ?page=1&size=20&manufacturer=Ford
```

---

```typescript
replaceQueryParams(params: Params): Observable<boolean>
```
**Behavior**:
- **Replaces** all params
- Removes params not mentioned

**Example**:
```typescript
// Current URL: ?page=1&size=20&manufacturer=Ford
urlState.replaceQueryParams({ page: '1', size: '20' }).subscribe();
// New URL: ?page=1&size=20 (manufacturer removed)
```

---

#### Array and Object Parameters

```typescript
setQueryParamArray(
  key: string,
  values: string[],
  delimiter: string = ','
): Observable<boolean>
```

---

```typescript
setQueryParamObject<T>(
  key: string,
  value: T
): Observable<boolean>
```
**Behavior**: JSON.stringify(value) → encodeURIComponent

---

#### Clear Parameters

```typescript
clearQueryParam(key: string): Observable<boolean>
```
**Behavior**: Removes single parameter

---

```typescript
clearAllQueryParams(): Observable<boolean>
```
**Behavior**: Removes ALL query parameters

---

### Navigation Methods

#### Navigate with Persistence

```typescript
navigateWithPersistence(
  commands: any[],
  paramsToKeep?: string[]
): Promise<boolean>
```
**Behavior**:
- Navigate to new route
- Keep specified params (or persistent params)
- Useful for navigation that preserves filters

**Example**:
```typescript
// Keep current filters when navigating
urlState.navigateWithPersistence(['/vehicles'], ['manufacturer', 'yearMin']);
```

---

```typescript
navigateWithGlobalPersistence(commands: any[]): Promise<boolean>
```
**Behavior**: Navigate keeping ALL persistent params (set via setPersistentParams)

---

```typescript
setPersistentParams(paramNames: string[]): void
```
**Behavior**: Mark params that should survive navigation

---

### Internal Observables

```typescript
private paramsSubject = new BehaviorSubject<Params>({});
public params$ = this.paramsSubject.asObservable();
```

**Subscription**:
```typescript
this.route.queryParams
  .pipe(takeUntil(this.destroy$))
  .subscribe(params => {
    this.paramsSubject.next(params);
  });
```

---

## 5. FILTERURLMAPPERSERVICE

### Purpose

Bidirectional mapping between SearchFilters and URL query parameters.

**Location**: `frontend/src/app/core/services/filter-url-mapper.service.ts` (126 lines)

### Interface

```typescript
interface FilterUrlMapper<TFilters> {
  filtersToParams(filters: TFilters): Params;
  paramsToFilters(params: Params): TFilters;
}
```

### Implementation

#### Filters → URL Parameters

```typescript
filtersToParams(filters: SearchFilters): Params {
  const params: Params = {};

  // Simple mappings
  if (filters.page !== undefined) params['page'] = String(filters.page);
  if (filters.size !== undefined) params['size'] = String(filters.size);
  if (filters.manufacturer) params['manufacturer'] = filters.manufacturer;
  if (filters.model) params['model'] = filters.model;
  if (filters.yearMin !== undefined) params['yearMin'] = String(filters.yearMin);
  if (filters.yearMax !== undefined) params['yearMax'] = String(filters.yearMax);
  if (filters.bodyClass) params['bodyClass'] = filters.bodyClass;
  if (filters.dataSource) params['dataSource'] = filters.dataSource;

  // Complex: modelCombos array → comma-separated string
  if (filters.modelCombos && filters.modelCombos.length > 0) {
    params['modelCombos'] = filters.modelCombos
      .map(c => `${c.manufacturer}:${c.model}`)
      .join(',');
  }

  // Sorting
  if (filters.sort) params['sort'] = filters.sort;
  if (filters.sortDirection) params['sortDirection'] = filters.sortDirection;

  return params;
}
```

#### URL Parameters → Filters

```typescript
paramsToFilters(params: Params): SearchFilters {
  const filters: SearchFilters = {
    page: parseInt(params['page'], 10) || 1,
    size: parseInt(params['size'], 10) || 20,
  };

  // Simple mappings
  if (params['manufacturer']) filters.manufacturer = params['manufacturer'];
  if (params['model']) filters.model = params['model'];
  if (params['yearMin']) filters.yearMin = parseInt(params['yearMin'], 10);
  if (params['yearMax']) filters.yearMax = parseInt(params['yearMax'], 10);
  if (params['bodyClass']) filters.bodyClass = params['bodyClass'];
  if (params['dataSource']) filters.dataSource = params['dataSource'];

  // Complex: comma-separated string → modelCombos array
  if (params['modelCombos']) {
    try {
      filters.modelCombos = params['modelCombos']
        .split(',')
        .map((combo: string) => {
          const [manufacturer, model] = combo.split(':');
          return { manufacturer, model };
        })
        .filter((c: any) => c.manufacturer && c.model);
    } catch (error) {
      console.warn('Failed to parse modelCombos:', error);
      filters.modelCombos = [];
    }
  }

  // Sorting
  if (params['sort']) filters.sort = params['sort'];
  if (params['sortDirection']) {
    filters.sortDirection = params['sortDirection'] as 'asc' | 'desc';
  }

  return filters;
}
```

### Highlight Handling

Highlights use same structure but with `h_` prefix:

```typescript
// Separate methods for highlights
highlightsToParams(highlights: HighlightFilters): Params {
  const params: Params = {};
  if (highlights.yearMin) params['h_yearMin'] = String(highlights.yearMin);
  if (highlights.yearMax) params['h_yearMax'] = String(highlights.yearMax);
  if (highlights.manufacturer) params['h_manufacturer'] = highlights.manufacturer;
  // ... etc
  return params;
}

paramsToHighlights(params: Params): HighlightFilters {
  const highlights: HighlightFilters = {};
  if (params['h_yearMin']) highlights.yearMin = parseInt(params['h_yearMin'], 10);
  if (params['h_yearMax']) highlights.yearMax = parseInt(params['h_yearMax'], 10);
  if (params['h_manufacturer']) highlights.manufacturer = params['h_manufacturer'];
  // ... etc
  return highlights;
}
```

---

## 6. REQUESTCOORDINATORSERVICE

### Purpose

Coordinate HTTP requests with caching, deduplication, and retry logic.

**Location**: `frontend/src/app/core/services/request-coordinator.service.ts` (265 lines)

### Three-Layer Request Processing

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Response Cache (TTL-based)                     │
│ - Check if cache key exists and not expired             │
│ - Return cached Observable if fresh                     │
└─────────────────────────────────────────────────────────┘
                        ↓ (cache miss)
┌─────────────────────────────────────────────────────────┐
│ Layer 2: In-Flight Request Deduplication                │
│ - Check if same request is currently in-flight          │
│ - Return existing Observable if pending                 │
└─────────────────────────────────────────────────────────┘
                        ↓ (no in-flight)
┌─────────────────────────────────────────────────────────┐
│ Layer 3: HTTP Request with Retry                        │
│ - Execute requestFn()                                    │
│ - Retry on failure (exponential backoff)                │
│ - Cache successful response                             │
│ - Share Observable with all subscribers                 │
└─────────────────────────────────────────────────────────┘
```

### Main Method

```typescript
execute<T>(
  requestKey: string,
  requestFn: () => Observable<T>,
  config?: RequestConfig
): Observable<T>
```

**Parameters**:
- `requestKey` - Unique identifier (from CacheKeyBuilder)
- `requestFn` - Function returning Observable (lazy execution)
- `config` - Optional configuration

**RequestConfig**:
```typescript
interface RequestConfig {
  cacheTTL?: number;        // Cache time-to-live in ms (default: 30000)
  retryAttempts?: number;   // Retry count (default: 3)
  retryDelay?: number;      // Initial retry delay in ms (default: 1000)
  skipCache?: boolean;      // Force bypass cache (default: false)
}
```

**Return**: Observable<T> (shared, cached, deduplicated)

---

### Cache Implementation

```typescript
private cache = new Map<string, CacheEntry<any>>();

interface CacheEntry<T> {
  data: T;              // Cached response
  timestamp: number;    // When cached (Date.now())
  ttl: number;         // Time-to-live in ms
}

// Check cache
private getCachedResponse<T>(key: string): T | null {
  const entry = this.cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    this.cache.delete(key);
    return null;
  }

  return entry.data;
}

// Store in cache
private setCachedResponse<T>(key: string, data: T, ttl: number): void {
  this.cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}
```

---

### Deduplication Implementation

```typescript
private inFlightRequests = new Map<string, Observable<any>>();

// Check if request in-flight
if (this.inFlightRequests.has(requestKey)) {
  console.log('[RequestCoordinator] Returning in-flight request:', requestKey);
  return this.inFlightRequests.get(requestKey)!;
}

// Execute request and share
const request$ = requestFn().pipe(
  retry({
    count: config.retryAttempts || 3,
    delay: (error, retryCount) => {
      const delay = (config.retryDelay || 1000) * Math.pow(2, retryCount - 1);
      return timer(delay);
    }
  }),
  tap(data => {
    // Cache successful response
    this.setCachedResponse(requestKey, data, config.cacheTTL || 30000);
  }),
  finalize(() => {
    // Remove from in-flight on complete/error
    this.inFlightRequests.delete(requestKey);
  }),
  shareReplay(1) // Share with multiple subscribers
);

// Store in-flight request
this.inFlightRequests.set(requestKey, request$);
return request$;
```

---

### Loading State Management

```typescript
private loadingStateSubject = new BehaviorSubject<Map<string, boolean>>(new Map());
public loadingState$ = this.loadingStateSubject.asObservable();

getLoadingState$(requestKey: string): Observable<boolean> {
  return this.loadingState$.pipe(
    map(stateMap => stateMap.get(requestKey) || false),
    distinctUntilChanged()
  );
}

// Global loading (any request loading)
getGlobalLoading$(): Observable<boolean> {
  return this.loadingState$.pipe(
    map(stateMap => Array.from(stateMap.values()).some(loading => loading)),
    distinctUntilChanged()
  );
}
```

---

### Cache Management

```typescript
clearCache(requestKey?: string): void {
  if (requestKey) {
    this.cache.delete(requestKey);
  } else {
    this.cache.clear();
  }
}

invalidateCache(requestKey: string): void {
  this.cache.delete(requestKey);
}
```

---

### Request Cancellation

```typescript
cancelAll(): void {
  this.inFlightRequests.clear();
  // Note: Observable cancellation happens via unsubscribe
}
```

---

## 7. ADAPTER INTERFACES

### FilterUrlMapper Interface

```typescript
interface FilterUrlMapper<TFilters> {
  filtersToParams(filters: TFilters): Params;
  paramsToFilters(params: Params): TFilters;
}
```

**Purpose**: Serialize/deserialize filters to/from URL

**Implementation**: FilterUrlMapperService (see section 5)

---

### ApiAdapter Interface

```typescript
interface ApiAdapter<TFilters, TData> {
  fetchData(
    filters: TFilters,
    highlights?: Partial<TFilters>
  ): Observable<ApiResponse<TData>>;

  fetchRelatedData?(
    filters: TFilters
  ): Observable<any>;

  fetchInstances?(
    id: string,
    count?: number
  ): Observable<any>;
}

interface ApiResponse<TData> {
  results: TData[];
  total: number;
  statistics?: any;
}
```

**Purpose**: Execute API calls

**Implementation**: VehicleApiAdapter

```typescript
class VehicleApiAdapter implements ApiAdapter<SearchFilters, VehicleResult> {
  constructor(private apiService: ApiService) {}

  fetchData(
    filters: SearchFilters,
    highlights?: HighlightFilters
  ): Observable<ApiResponse<VehicleResult>> {

    // Build models parameter
    const models = this.buildModelsParam(filters.modelCombos);

    // Build filter params
    const filterParams = this.buildFilterParams(filters);

    // Call API
    return this.apiService.getVehicleDetails(
      models,
      filters.page || 1,
      filters.size || 20,
      filterParams,
      highlights,
      filters.sort,
      filters.sortDirection
    ).pipe(
      map(response => ({
        results: response.results,
        total: response.total,
        statistics: response.statistics,
      }))
    );
  }

  private buildModelsParam(modelCombos?: ManufacturerModelSelection[]): string {
    if (!modelCombos || modelCombos.length === 0) return '';
    return modelCombos
      .map(c => `${c.manufacturer}:${c.model}`)
      .join(',');
  }

  private buildFilterParams(filters: SearchFilters): any {
    const params: any = {};
    if (filters.manufacturerSearch) params.manufacturerSearch = filters.manufacturerSearch;
    if (filters.modelSearch) params.modelSearch = filters.modelSearch;
    if (filters.manufacturer) params.manufacturer = filters.manufacturer;
    if (filters.model) params.model = filters.model;
    if (filters.yearMin !== undefined) params.yearMin = filters.yearMin;
    if (filters.yearMax !== undefined) params.yearMax = filters.yearMax;
    if (filters.bodyClass) params.bodyClass = filters.bodyClass;
    if (filters.dataSource) params.dataSource = filters.dataSource;
    return params;
  }
}
```

---

### CacheKeyBuilder Interface

```typescript
interface CacheKeyBuilder<TFilters> {
  buildKey(
    prefix: string,
    filters: TFilters,
    highlights?: Partial<TFilters>
  ): string;
}
```

**Purpose**: Generate unique, deterministic cache keys

**Implementation**: VehicleCacheKeyBuilder

```typescript
class VehicleCacheKeyBuilder implements CacheKeyBuilder<SearchFilters> {
  buildKey(
    prefix: string,
    filters: SearchFilters,
    highlights?: HighlightFilters
  ): string {

    // Build key object with sorted modelCombos for consistency
    const keyObj: any = {
      modelCombos: (filters.modelCombos || [])
        .map(c => `${c.manufacturer}:${c.model}`)
        .sort(),
      page: filters.page,
      size: filters.size,
      sort: filters.sort,
      sortDirection: filters.sortDirection,
    };

    // Add defined filter properties
    if (filters.manufacturer) keyObj.manufacturer = filters.manufacturer;
    if (filters.model) keyObj.model = filters.model;
    if (filters.yearMin !== undefined) keyObj.yearMin = filters.yearMin;
    if (filters.yearMax !== undefined) keyObj.yearMax = filters.yearMax;
    if (filters.bodyClass) keyObj.bodyClass = filters.bodyClass;
    if (filters.dataSource) keyObj.dataSource = filters.dataSource;

    // Add search filters
    if (filters.manufacturerSearch) keyObj.manufacturerSearch = filters.manufacturerSearch;
    if (filters.modelSearch) keyObj.modelSearch = filters.modelSearch;
    if (filters.bodyClassSearch) keyObj.bodyClassSearch = filters.bodyClassSearch;
    if (filters.dataSourceSearch) keyObj.dataSourceSearch = filters.dataSourceSearch;

    // Add highlights with h_ prefix
    if (highlights) {
      if (highlights.yearMin !== undefined) keyObj.h_yearMin = highlights.yearMin;
      if (highlights.yearMax !== undefined) keyObj.h_yearMax = highlights.yearMax;
      if (highlights.manufacturer) keyObj.h_manufacturer = highlights.manufacturer;
      if (highlights.modelCombos) keyObj.h_modelCombos = highlights.modelCombos;
      if (highlights.bodyClass) keyObj.h_bodyClass = highlights.bodyClass;
    }

    // Serialize and encode
    const keyString = JSON.stringify(keyObj);
    return `${prefix}:${encodeURIComponent(keyString)}`;
  }
}
```

**Key Properties**:
- Deterministic (same filters → same key)
- Sorted arrays for consistency
- URL-safe encoding
- Includes highlights (separate cache entries)

---

## 8. STATE FLOW DIAGRAMS

### Flow 1: User Updates Filter

```
┌───────────────────────────────────────────────────────────────┐
│ User Action: Clicks "Manufacturer: Ford" in Query Control     │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Component: onFilterAdd({ field: 'manufacturer', value: 'Ford' })│
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Component: stateService.updateFilters({ manufacturer: 'Ford' })│
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ ResourceManagementService.updateFilters()                     │
│ - Merge: { ...currentFilters, manufacturer: 'Ford' }          │
│ - Call: filterMapper.filtersToParams(mergedFilters)           │
│ - Result: { manufacturer: 'Ford', page: '1', size: '20' }     │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ UrlStateService.setQueryParams(params)                        │
│ - router.navigate([], { queryParams, queryParamsHandling })   │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ URL Updates: /discover?manufacturer=Ford&page=1&size=20       │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ ResourceManagementService.watchUrlChanges() detects change    │
│ - route.queryParams emits new params                          │
│ - Calls: initializeFromUrl()                                  │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ ResourceManagementService.initializeFromUrl()                 │
│ - Parse URL → Filters via filterMapper.paramsToFilters()      │
│ - Update state: { ...state, filters, loading: true }          │
│ - Call: fetchData()                                           │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ ResourceManagementService.fetchData()                         │
│ - Build cache key via cacheKeyBuilder.buildKey()              │
│ - Call: requestCoordinator.execute(key, requestFn, config)    │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ RequestCoordinatorService.execute()                           │
│ - Check cache (TTL: 30s)                                      │
│ - Check in-flight requests                                    │
│ - Execute: apiAdapter.fetchData(filters, highlights)          │
│ - Retry on failure (exponential backoff)                      │
│ - Cache successful response                                   │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ ApiAdapter.fetchData()                                        │
│ - Call: apiService.getVehicleDetails(...)                     │
│ - Map response to ApiResponse format                          │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ HTTP GET /api/v1/vehicles/details?manufacturer=Ford&...       │
│ - Backend processes request                                   │
│ - Returns: { results: [...], total: 1200, statistics: {...} } │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ ResourceManagementService.fetchData() receives response       │
│ - Update state: { results, totalResults, loading: false }     │
│ - stateSubject.next(newState)                                 │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Observables emit:                                             │
│ - filters$ emits: { manufacturer: 'Ford', page: 1, size: 20 } │
│ - results$ emits: [VehicleResult[], ...1200 Ford vehicles]    │
│ - loading$ emits: false                                       │
│ - totalResults$ emits: 1200                                   │
│ - statistics$ emits: { byManufacturer: {...}, ... }           │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Components re-render:                                         │
│ - ResultsTableComponent displays 20 Ford vehicles             │
│ - ChartsComponent displays manufacturer distribution          │
│ - QueryControlComponent shows active filter chip              │
└───────────────────────────────────────────────────────────────┘
```

---

### Flow 2: Browser Back Button

```
┌───────────────────────────────────────────────────────────────┐
│ User Action: Clicks browser back button                       │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Browser: Restores previous URL                                │
│ From: /discover?manufacturer=Ford&page=2                      │
│ To:   /discover?manufacturer=Ford&page=1                      │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Angular Router: route.queryParams emits                       │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ ResourceManagementService.watchUrlChanges() detects           │
│ - Calls: initializeFromUrl()                                  │
│ - Parse URL → Filters { manufacturer: 'Ford', page: 1 }       │
│ - Call: fetchData()                                           │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ (Same flow as Filter Update - cache may return page 1 data)   │
└───────────────────────────────────────────────────────────────┘
```

**KEY BENEFIT**: Browser navigation "just works" - no special handling needed

---

### Flow 3: Initial Page Load

```
┌───────────────────────────────────────────────────────────────┐
│ User navigates to: /discover?manufacturer=Tesla&yearMin=2020  │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Angular bootstraps, DiscoverComponent created                 │
│ - Injects: VehicleResourceManagementService                   │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ VehicleResourceManagementService constructor                  │
│ - Calls: initializeFromUrl()                                  │
│ - Parses URL → Filters                                        │
│ - Calls: fetchData()                                          │
│ - Calls: watchUrlChanges() (subscribe to future changes)      │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Component ngOnInit                                            │
│ - Subscribes to: stateService.filters$                        │
│ - Subscribes to: stateService.results$                        │
│ - Subscribes to: stateService.loading$                        │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Initial render with filters: { manufacturer: 'Tesla', ... }   │
│ Loading state: true (data fetching)                           │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Data arrives → Loading: false, Results populated              │
│ UI re-renders with Tesla vehicles                             │
└───────────────────────────────────────────────────────────────┘
```

---

### Flow 4: Pop-Out Window Synchronization

```
┌───────────────────────────────────────────────────────────────┐
│ Main Window: User updates filter (manufacturer: 'BMW')        │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Main Window: stateService.updateFilters({ manufacturer: 'BMW' })│
│ - URL updates: /discover?manufacturer=BMW&page=1              │
│ - Data fetched                                                │
│ - State updated                                               │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Main Window: state$ observable emits new state                │
│ - DiscoverComponent subscribed to state$ for broadcasting     │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Main Window: BroadcastChannel.postMessage()                   │
│ Message: {                                                    │
│   type: 'STATE_UPDATE',                                       │
│   state: { filters: {...}, results: [...], ... }              │
│ }                                                             │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Pop-Out Window: BroadcastChannel.onmessage()                  │
│ - PanelPopoutComponent receives message                       │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Pop-Out Window: stateService.syncStateFromExternal(state)     │
│ - DOES NOT update URL (prevents infinite loop)                │
│ - Merges state with current state                            │
│ - PRESERVES URL-derived highlights if not in incoming state   │
│ - Updates BehaviorSubject                                     │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Pop-Out Window: Observables emit                              │
│ - results$ emits new BMW results                              │
│ - filters$ emits { manufacturer: 'BMW', ... }                 │
│ - Component re-renders with updated data                      │
└───────────────────────────────────────────────────────────────┘
```

**CRITICAL**: Pop-out calls `syncStateFromExternal()` to avoid URL update that would trigger its own `watchUrlChanges()` subscription (infinite loop prevention).

---

## 9. OBSERVABLE PATTERNS

### Subscription in Components

```typescript
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  filters: SearchFilters = {};
  results: VehicleResult[] = [];
  loading: boolean = false;

  constructor(private stateService: VehicleResourceManagementService) {}

  ngOnInit(): void {
    // Subscribe to filters
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        this.filters = filters;
      });

    // Subscribe to results
    this.stateService.results$
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        this.results = results;
      });

    // Subscribe to loading
    this.stateService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterChange(newFilters: Partial<SearchFilters>): void {
    this.stateService.updateFilters(newFilters);
  }
}
```

### Template Usage (Async Pipe)

```html
<!-- Option 1: Subscribe in component -->
<div *ngIf="loading">Loading...</div>
<div *ngFor="let result of results">{{ result.manufacturer }}</div>

<!-- Option 2: Async pipe (recommended) -->
<div *ngIf="stateService.loading$ | async">Loading...</div>
<div *ngFor="let result of stateService.results$ | async">
  {{ result.manufacturer }}
</div>
```

### Observable Composition

```typescript
// Combine multiple observables
combineLatest([
  this.stateService.filters$,
  this.stateService.results$,
  this.stateService.loading$
]).pipe(
  takeUntil(this.destroy$)
).subscribe(([filters, results, loading]) => {
  console.log('State:', { filters, results, loading });
});
```

---

## 10. POP-OUT WINDOW SYNCHRONIZATION

### Main Window Setup

```typescript
export class DiscoverComponent implements OnInit {
  private popoutWindows = new Map<string, PopoutWindowInfo>();

  ngOnInit(): void {
    // Subscribe to state for broadcasting
    this.stateService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.broadcastStateToPopouts(state);
      });
  }

  private broadcastStateToPopouts(state: ResourceState<SearchFilters, VehicleResult>): void {
    this.popoutWindows.forEach((popoutInfo, panelId) => {
      if (popoutInfo.window && !popoutInfo.window.closed) {
        popoutInfo.channel.postMessage({
          type: 'STATE_UPDATE',
          state,
        });
      }
    });
  }

  popOutPanel(panelId: string): void {
    const url = `/panel/discover/${panelId}/...`;
    const popoutWindow = window.open(url, `panel-${panelId}`, '...');
    const channel = new BroadcastChannel(`panel-${panelId}`);

    this.popoutWindows.set(panelId, {
      window: popoutWindow,
      channel,
      checkInterval: setInterval(() => {
        if (popoutWindow.closed) {
          this.onPopoutClosed(panelId);
        }
      }, 500)
    });
  }
}
```

### Pop-Out Window Setup

```typescript
export class PanelPopoutComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private stateService: VehicleResourceManagementService,
    private popOutContext: PopOutContextService
  ) {}

  ngOnInit(): void {
    const panelId = this.route.snapshot.paramMap.get('panelId')!;

    // Initialize pop-out context
    this.popOutContext.initializeAsPopOut(panelId);

    // Subscribe to messages from main window
    this.popOutContext.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        if (message.type === 'STATE_UPDATE') {
          // Sync state WITHOUT updating URL
          this.stateService.syncStateFromExternal(message.state);
        }
      });

    // Send ready message
    this.popOutContext.sendMessage({ type: 'PANEL_READY' });
  }
}
```

### Highlight Preservation (CRITICAL)

```typescript
// In ResourceManagementService.syncStateFromExternal()
public syncStateFromExternal(state: Partial<ResourceState<TFilters, TData>>): void {
  const currentState = this.stateSubject.value;

  // URL-FIRST PROTECTION: Preserve URL-derived highlights
  const preservedHighlights = state.highlights !== undefined
    ? state.highlights
    : currentState.highlights;

  const newState = {
    ...currentState,
    ...state,
    highlights: preservedHighlights, // Always preserve URL highlights
  };

  console.log('🔄 syncStateFromExternal:', {
    incomingHighlights: state.highlights,
    currentHighlights: currentState.highlights,
    preservedHighlights,
  });

  this.stateSubject.next(newState);
  // NOTE: Does NOT update URL (prevents infinite loop)
}
```

**Why This Matters**:
- Pop-out URL: `/panel/...?h_yearMin=2015&h_yearMax=2019`
- Main window sends STATE_UPDATE without highlights
- Without preservation: Pop-out loses URL-derived highlights
- With preservation: Pop-out keeps its URL-derived highlights

---

## 11. ERROR HANDLING

### HTTP Errors

```typescript
// In fetchData() method
this.apiAdapter.fetchData(currentFilters, currentHighlights).pipe(
  catchError((error: HttpErrorResponse) => {
    console.error('[ResourceManagement] fetchData error:', error);

    // Update state with error
    this.updateState({
      loading: false,
      error: `Failed to fetch data: ${error.message}`,
      results: [], // Clear results on error
    });

    // Return empty array to continue stream
    return of({ results: [], total: 0 });
  })
).subscribe(/* ... */);
```

### Error Observable

```typescript
// Components can subscribe to error$
this.stateService.error$
  .pipe(
    takeUntil(this.destroy$),
    filter(error => error !== null)
  )
  .subscribe(error => {
    // Display error to user
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: error,
    });
  });
```

### Request Coordinator Retry

```typescript
// Automatic retry with exponential backoff
execute(requestKey, requestFn, {
  retryAttempts: 3,
  retryDelay: 1000, // 1s, 2s, 4s
}).pipe(
  retry({
    count: 3,
    delay: (error, retryCount) => {
      const delay = 1000 * Math.pow(2, retryCount - 1);
      console.warn(`Retry ${retryCount} in ${delay}ms:`, error);
      return timer(delay);
    }
  })
);
```

---

## 12. IMPLEMENTATION GUIDE

### Step 1: Create Adapters

```typescript
// 1. Filter URL Mapper
class MyFilterMapper implements FilterUrlMapper<MyFilters> {
  filtersToParams(filters: MyFilters): Params { /* ... */ }
  paramsToFilters(params: Params): MyFilters { /* ... */ }
}

// 2. API Adapter
class MyApiAdapter implements ApiAdapter<MyFilters, MyData> {
  fetchData(filters: MyFilters, highlights?: Partial<MyFilters>): Observable<ApiResponse<MyData>> {
    /* ... */
  }
}

// 3. Cache Key Builder
class MyCacheKeyBuilder implements CacheKeyBuilder<MyFilters> {
  buildKey(prefix: string, filters: MyFilters, highlights?: Partial<MyFilters>): string {
    /* ... */
  }
}
```

### Step 2: Create Factory Function

```typescript
export function createMyResourceManagementService(
  route: ActivatedRoute,
  router: Router,
  requestCoordinator: RequestCoordinatorService,
  apiService: ApiService
): MyResourceManagementService {

  const config: ResourceManagementConfig<MyFilters, MyData> = {
    filterMapper: new MyFilterMapper(),
    apiAdapter: new MyApiAdapter(apiService),
    cacheKeyBuilder: new MyCacheKeyBuilder(),
    defaultFilters: { page: 1, size: 20 },
    supportsHighlights: true,
  };

  return new ResourceManagementService<MyFilters, MyData>(
    route,
    router,
    requestCoordinator,
    config
  );
}
```

### Step 3: Provide Service

```typescript
// In module
{
  provide: MyResourceManagementService,
  useFactory: createMyResourceManagementService,
  deps: [ActivatedRoute, Router, RequestCoordinatorService, ApiService]
}

// Type alias
export type MyResourceManagementService =
  ResourceManagementService<MyFilters, MyData>;
```

### Step 4: Use in Components

```typescript
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private stateService: MyResourceManagementService) {}

  ngOnInit(): void {
    // Subscribe to observables
    this.stateService.results$.pipe(takeUntil(this.destroy$))
      .subscribe(results => { /* ... */ });

    this.stateService.loading$.pipe(takeUntil(this.destroy$))
      .subscribe(loading => { /* ... */ });
  }

  updateFilter(field: string, value: any): void {
    this.stateService.updateFilters({ [field]: value });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## SUMMARY

The state management architecture is:

1. **URL-First**: URL is single source of truth
2. **Generic**: Works with any domain via type parameters
3. **Reactive**: RxJS observables throughout
4. **Cached**: 30-second TTL reduces API calls
5. **Deduplicated**: Identical requests share Observable
6. **Resilient**: Automatic retry with exponential backoff
7. **Multi-Window**: BroadcastChannel synchronization
8. **Type-Safe**: Full TypeScript with strict types
9. **Testable**: Each service independently testable
10. **Extensible**: Add domains via adapter implementations

**Total Code**: ~2,500 lines across 7 services + types + adapters

---

**End of Specification**

# ARCHITECTURAL ANALYSIS REPORT
## AUTOS Prime-NG Frontend Application
### Branch: experiment/resource-management-service

**Status**: Working Draft - Subject to Refinement
**Date**: 2025-11-15
**Purpose**: Reverse-engineering the application to create buildable specifications

---

## EXECUTIVE SUMMARY

The **AUTOS Prime-NG Frontend** is an Angular 14 single-page application (SPA) for discovering and filtering automotive vehicle data. It features a sophisticated architecture with URL-driven state management, generic reusable components, configuration-driven pickers, and advanced features like pop-out windows and drag-and-drop panel reordering.

**Primary Business Purpose**: Vehicle Discovery Platform - Browse, filter, search, and analyze automotive vehicle inventory data.

**Technology Stack**:
- Angular 14.2.0
- PrimeNG 14.2.3 (migrated from NG-ZORRO)
- RxJS 7.5.0
- Plotly.js 3.2.0 (charting)
- Angular CDK 14.2.7 (drag-drop)
- TypeScript 4.7.2

**Build Tools**: Angular CLI 14.2.13, Webpack (via CLI), SCSS

---

## 1. PROJECT STRUCTURE

### Overall Folder Organization

```
autos-prime-ng/
├── frontend/src/app/
│   ├── core/                      # Core singleton services (import once)
│   │   ├── services/              # State management, URL coordination, request handling
│   │   ├── interceptors/          # HTTP error interception
│   │   └── navigation/            # Navigation component
│   │
│   ├── features/                  # Feature modules organized by route
│   │   ├── home/                  # Landing page
│   │   ├── discover/              # Main vehicle discovery interface ⭐ PRIMARY FEATURE
│   │   ├── demo/                  # Demo/testing page
│   │   ├── results/               # Vehicle results display
│   │   │   └── results-table/
│   │   ├── filters/               # Query control component
│   │   │   └── query-control/
│   │   └── panel-popout/          # Pop-out window container
│   │
│   ├── shared/                    # Reusable components and services
│   │   ├── components/            # 12 base components (data-table, pickers, charts)
│   │   ├── services/              # Data source adapters, persistence
│   │   ├── data-sources/          # Chart-specific data sources
│   │   └── models/                # Shared interfaces
│   │
│   ├── services/                  # Global services
│   │   └── api.service.ts         # HTTP API client
│   │
│   ├── models/                    # Domain models
│   │   ├── vehicle.model.ts
│   │   ├── vehicle-result.model.ts
│   │   ├── vehicle-statistics.model.ts
│   │   ├── search-filters.model.ts
│   │   └── index.ts
│   │
│   ├── config/                    # Configuration files
│   │   ├── picker-configs.ts      # Aggregated picker configs
│   │   ├── manufacturer-model-picker.config.ts
│   │   ├── dual-checkbox-picker.config.ts
│   │   ├── base-dual-picker.config.ts
│   │   ├── vin-picker.config.ts
│   │   └── vin-browser.config.ts
│   │
│   ├── app.module.ts              # Root module
│   ├── app-routing.module.ts      # Route definitions
│   └── primeng.module.ts          # Centralized PrimeNG imports
│
├── environments/                  # Environment configurations
├── assets/                        # Static assets
└── index.html                     # SPA entry point
```

### Key Metrics

- **20 TypeScript Components**
- **12 Core Services**
- **5 Primary Domain Models**
- **4 Main Routes** + dynamic pop-out routes
- **7 Draggable Panels** in main discovery interface

---

## 2. APPLICATION TYPE & PURPOSE

### Business Purpose

**Vehicle Discovery Platform** enabling users to:

1. **Browse Vehicle Inventory**
   - View manufacturer/model combinations with counts
   - Hierarchical browsing (make → models)
   - Instance-level detail (VINs)

2. **Filter and Search**
   - Multi-faceted filtering: manufacturer, model, year range, body class, data source
   - Two-pattern filtering: exact match (query control) + partial match (table filters)
   - Real-time filter application with URL synchronization

3. **Visualize Statistics**
   - Histogram charts: manufacturer distribution, model distribution, year range, body class
   - Interactive Plotly.js charts with zoom/pan
   - Segmented statistics (total vs highlighted)

4. **Analyze Results**
   - Paginated, sortable, filterable results table
   - Expandable rows showing vehicle instances (VINs)
   - Column management (reorder, hide/show)
   - Export capabilities

5. **Customize Layout**
   - Drag-drop panel reordering
   - Collapsible panels
   - Pop-out panels to separate windows (multi-monitor support)
   - Persistent layout preferences

### User Workflows

#### Discovery Workflow
```
Land on /discover → Browse available vehicles → Select model filters →
View filtered results → Analyze statistics charts → Drill into details
```

#### Query Workflow
```
Open Query Control → Set exact filters (manufacturer, year range, etc.) →
Apply filters → Results update → Set highlights (UI-only) →
Charts show segmented statistics
```

#### Detail Workflow
```
View vehicle in results table → Expand row → View instances (VINs) →
Pop-out chart panel → Analyze on separate monitor
```

#### Customization Workflow
```
Drag panels to reorder → Save layout to localStorage →
Collapse unused panels → Pop-out frequently used panels →
Resume layout on next session
```

---

## 3. MAJOR FEATURES/MODULES

### Feature 1: Home Feature (`/features/home/`)
- Landing page
- Navigation to main discovery interface
- Application introduction

### Feature 2: Discover Feature (`/features/discover/`) ⭐ MAIN PAGE

**7 Collapsible, Draggable, Pop-outable Panels**:

1. **Query Control Panel**
   - Filter builder interface
   - Dropdown filter selection
   - Active filter chips display
   - Clear/reset filters
   - Highlight controls

2. **Model Picker Panel** (Single Select)
   - Configuration-driven picker
   - Manufacturer/model selection
   - Search and filter
   - URL state synchronization

3. **Dual Checkbox Picker Panel** (Hierarchical)
   - Hierarchical manufacturer → models
   - Parent/child checkbox relationships
   - Bulk selection
   - Indeterminate state support

4. **Base Dual Picker Panel**
   - Dual-list interface (available ↔ selected)
   - Move items between lists
   - Bulk operations

5. **VIN Browser Panel**
   - Browse individual vehicle instances
   - VIN-level detail
   - Filterable, sortable

6. **Vehicle Results Table Panel**
   - Paginated results (20 per page default)
   - Sortable columns
   - Filterable columns (text/number)
   - Expandable rows (show instances)
   - Column visibility management
   - Column drag-drop reordering

7. **Interactive Charts Panel**
   - Manufacturer histogram
   - Model histogram
   - Year distribution chart
   - Body class distribution chart
   - Plotly.js interactive charts

**Panel Features**:
- Drag-drop reordering (Angular CDK)
- Collapse/expand per panel
- Pop-out to separate window
- Badge showing active filter count
- Panel order persisted to localStorage

### Feature 3: Results Feature (`/features/results/results-table/`)

**ResultsTableComponent**:
- Generic data table component
- Pagination (client/server-side)
- Multi-column sorting
- Column filtering (partial match)
- Expandable rows
- Column manager integration
- State persistence to localStorage
- OnPush change detection (performance)

### Feature 4: Filters Feature (`/features/filters/query-control/`)

**QueryControlComponent**:
- Filter type dropdown (manufacturer, model, year range, etc.)
- Add filter button
- Active filters displayed as chips
- Remove filter chips
- Clear all filters
- Apply button (triggers search)
- Highlight mode toggle
- Filter count badge

### Feature 5: Panel Pop-Out Feature (`/features/panel-popout/`)

**PanelPopoutComponent**:
- Generic container for popped-out panels
- Route: `/panel/:gridId/:panelId/:type`
- Renders appropriate component based on `type` parameter
- BroadcastChannel synchronization with parent window
- Window close detection
- State restoration on close

### Feature 6: Demo Feature (`/features/demo/`)
- Component demonstration page
- Configuration testing
- Development sandbox

---

## 4. TECHNOLOGY STACK

### Core Framework
- **Angular**: 14.2.0 (September 2022 release)
- **TypeScript**: 4.7.2
- **RxJS**: 7.5.0 (reactive programming, observables)

### UI Components & Styling
- **PrimeNG**: 14.2.3 (50+ components)
  - Components: Table, Button, Checkbox, Dropdown, InputText, Dialog, Toast, Panel, etc.
  - Theme: Lara Light Blue
- **PrimeIcons**: 6.0.1
- **Angular CDK**: 14.2.7 (drag-drop, overlay, virtual scrolling)
- **SCSS**: Component and global styling

### Charting & Visualization
- **Plotly.js**: 3.2.0 (`plotly.js-dist-min`)
  - Interactive histograms
  - Zoom, pan, export capabilities

### Additional Libraries
- **Angular Forms**: 14.2.0 (reactive and template-driven)
- **Angular Router**: 14.2.0
- **Angular Animations**: 14.2.0
- **Angular Common HTTP**: 14.2.0

### Build & Development Tools
- **@angular/cli**: 14.2.13
- **@angular-devkit/build-angular**: 14.2.13
- **Webpack**: Built into Angular CLI
- **SASS compiler**: Built into Angular CLI

### Testing
- **Karma**: 6.4.0 (test runner)
- **Jasmine**: 4.3.0 (testing framework)
- **Playwright**: 1.56.1 (E2E testing)
- **@types/jasmine**: 4.0.0

### Deployment
- **Docker**: Multi-stage builds (Node.js 18 → nginx:alpine)
- **Nginx**: SPA routing configuration
- **Environment configs**: Dev and production API URLs

---

## 5. ARCHITECTURAL PATTERNS

### 5.1 URL-First State Management ⭐ CORE PATTERN

**Principle**: URL is the single source of truth for application state

**Data Flow**:
```
URL Query Parameters
  ↕ (sync)
UrlStateService
  ↕
ResourceManagementService<TFilters, TData>
  ↕
Components (subscribe to observables)
```

**Key Services**:

#### **UrlStateService**
- Manages URL query parameters
- Provides Observable-based API
- Type-safe with QueryParams interface
- Memory leak prevention via takeUntil()

#### **ResourceManagementService<TFilters, TData>** (659 lines)
- Generic, domain-agnostic base class
- Type parameters: TFilters (filter shape), TData (result shape)
- Coordinates URL ↔ State ↔ API
- Manages: filters, results, loading state, statistics, highlights
- Pop-out window awareness
- URL watching (main window and pop-outs)

#### **VehicleResourceManagementService**
- Concrete implementation: ResourceManagementService<SearchFilters, VehicleResult>
- Injectable as root provider
- Backward compatible with legacy StateManagementService

#### **RequestCoordinatorService**
- Request deduplication (prevents duplicate in-flight requests)
- Response caching with configurable TTL (30s for vehicles)
- Retry logic with exponential backoff
- Per-request and global loading state

#### **FilterUrlMapperService**
- Bidirectional filter serialization: SearchFilters ↔ URL params
- Handles complex types (arrays, model combos, highlights)
- Prefix-based naming (`h_` for highlights)
- Type conversions (string ↔ number, arrays)

**Example Data Flow**:
```typescript
// 1. User updates filters
this.stateService.updateFilters({ yearMin: 2020 });

// 2. Automatic chain reaction:
FilterUrlMapperService.filtersToParams({ yearMin: 2020 })
  → UrlStateService.setQueryParams({ yearMin: '2020' })
  → URL updates: /discover?yearMin=2020
  → ResourceManagementService detects URL change
  → RequestCoordinatorService.execute('vehicles', apiCall)
  → ApiService.getVehicleDetails(...)
  → Results returned
  → state$ observable emits new state
  → Components auto-update via subscription
```

**Benefits**:
- Bookmarkable URLs
- Shareable deep links
- Browser back/forward navigation works naturally
- Full state visible in URL bar (debugging)
- SEO-friendly

### 5.2 Smart/Dumb Component Architecture

**Smart (Container) Components**:
- Manage state, orchestrate child components
- Subscribe to observables
- Handle business logic
- Examples:
  - `DiscoverComponent` - Orchestrates 7 panels, manages panel state
  - `ResultsTableComponent` - Manages table state, pagination, sorting
  - `QueryControlComponent` - Manages filter state
  - `PanelPopoutComponent` - Manages pop-out context

**Dumb (Presentation) Components**:
- Pure presentation, driven by @Input/@Output
- No direct service injection (except utilities)
- OnPush change detection
- Examples:
  - `BaseDataTableComponent<T>` - Generic table, type-safe
  - `BasePickerComponent<T>` - Configuration-driven picker
  - `BaseChartComponent` - Data source abstraction
  - `ColumnManagerComponent` - Reusable column manager

### 5.3 Configuration-Driven Architecture ⭐ UNIQUE PATTERN

**PickerConfig System**: Declarative configuration objects define picker behavior

```typescript
interface PickerConfig<T> {
  id: string;                          // Unique identifier
  displayName: string;                 // UI label
  columns: PickerColumnConfig<T>[];   // Column definitions
  api: PickerApiConfig<T>;            // API method or HTTP config
  row: PickerRowConfig<T>;            // Row key generation/parsing
  selection: PickerSelectionConfig;   // URL serialization config
  pagination: PickerPaginationConfig; // Client/server-side pagination
  filtering?: PickerFilteringConfig;  // Optional client-side filtering
  sorting?: PickerSortingConfig;      // Optional sorting
}
```

**Concrete Configurations**:
- `MANUFACTURER_MODEL_PICKER_CONFIG` - Flat make/model list
- `DUAL_CHECKBOX_PICKER_CONFIG` - Hierarchical checkbox tree
- `BASE_DUAL_PICKER_CONFIG` - Dual-list picker
- `VIN_PICKER_CONFIG` - VIN browser
- `VIN_BROWSER_CONFIG` - Alternative VIN UI

**Bootstrap Registration**:
```typescript
// app.module.ts constructor
constructor(pickerConfigService: PickerConfigService) {
  pickerConfigService.registerConfigs(ALL_PICKER_CONFIGS);
}
```

**Benefits**:
1. Single `BasePickerComponent<T>` serves all picker types
2. Add new pickers by creating config files (no new components)
3. Type-safe with generics
4. Runtime validation at registration
5. Centralized picker logic
6. Easy to test (config objects are plain data)

### 5.4 Data Source Adapter Pattern

**Interface**: `TableDataSource<T>`
```typescript
interface TableDataSource<T> {
  fetch(params: TableQueryParams): Observable<TableResponse<T>>;
}
```

**Implementations**:
- `BasePickerDataSource<T>` - Generic picker data source
- `VehicleApiAdapter` - Vehicle-specific API adapter
- Chart data sources (manufacturer, model, year, body class)

**Usage**: Components are decoupled from API implementation. Pass DataSource to BaseDataTableComponent, which calls `fetch()` on pagination/sorting changes.

### 5.5 Service Architecture: Layered Pattern

**Layer 1: HTTP/API Layer**
- `ApiService` - HTTP client, wraps environment.apiUrl
- Methods: `getVehicleDetails()`, `getManufacturerModelCombinations()`, etc.

**Layer 2: Coordination Layer**
- `RequestCoordinatorService` - Caching, deduplication, retry

**Layer 3: State Management Layer**
- `UrlStateService` - URL synchronization
- `FilterUrlMapperService` - Filter serialization
- `ResourceManagementService<TFilters, TData>` - Central orchestrator

**Layer 4: Domain Services**
- `VehicleResourceManagementService` - Vehicle domain
- `PickerConfigService` - Configuration registry
- `PopOutContextService` - Pop-out coordination

**Layer 5: UI Services**
- `TableStatePersistenceService` - localStorage management
- `ErrorNotificationService` - User-facing error messages

### 5.6 Error Handling Architecture

**Centralized Error Handling**:
```
HTTP Error
  ↓
ErrorInterceptor (catches HTTP errors)
  ↓
ErrorNotificationService (formats user-friendly messages)
  ↓
PrimeNG Toast (displays to user)

Uncaught Errors
  ↓
GlobalErrorHandler (fallback)
  ↓
Console logging + tracking services
```

**Features**:
- Duplicate error suppression
- User-friendly error messages
- HTTP status code handling (4xx, 5xx, network errors)
- Logging to console and external services

---

## 6. ROUTING STRUCTURE

### Routes Configuration

```typescript
const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'discover',
    component: DiscoverComponent
  },
  {
    path: 'demo',
    component: DemoComponent
  },
  {
    path: 'panel/:gridId/:panelId/:type',
    component: PanelPopoutComponent
  },
];
```

### Navigation Hierarchy

```
Root Application (/)
│
├── Home (/)
│   └── Landing page, navigation
│
├── Discover (/discover) ⭐ MAIN APPLICATION
│   ├── Query Params: ?page=1&size=20&manufacturer=Ford&yearMin=2020...
│   └── 7 draggable panels
│
├── Demo (/demo)
│   └── Component testing/showcase
│
└── Panel Pop-Out (/panel/:gridId/:panelId/:type)
    ├── Example: /panel/grid-1/panel-5/dual-picker
    ├── Example: /panel/grid-1/panel-3/results-table
    └── Example: /panel/grid-1/panel-7/year-chart
```

### URL Query Parameter Patterns

**Example URL**:
```
/discover?
  page=1&
  size=20&
  sort=manufacturer&
  sortDirection=asc&
  manufacturer=Ford&
  model=F-150&
  yearMin=2020&
  yearMax=2023&
  bodyClass=Pickup&
  dataSource=edmunds&
  modelCombos=Ford:F-150,Chevrolet:Silverado&
  manufacturerSearch=fo&
  modelSearch=f-1&
  h_yearMin=2015&
  h_yearMax=2019&
  h_manufacturer=Ford,Toyota&
  h_modelCombos=Ford:F-150
```

**Parameter Categories**:

| Category | Parameters | Purpose |
|----------|-----------|---------|
| **Pagination** | `page`, `size` | Results pagination |
| **Sorting** | `sort`, `sortDirection` | Column sorting |
| **Query Control Filters** | `manufacturer`, `model`, `yearMin`, `yearMax`, `bodyClass`, `dataSource` | Exact match filtering (changes result count) |
| **Table Filters** | `manufacturerSearch`, `modelSearch`, `bodyClassSearch`, `dataSourceSearch` | Partial match filtering (client-side on displayed results) |
| **Picker Selection** | `modelCombos` | Selected make:model combinations |
| **Highlights** | `h_*` prefix | UI-only visual emphasis (doesn't change result count) |

---

## 7. CORE SERVICES (12 Services)

### 1. ApiService (`/services/api.service.ts`)

**Purpose**: HTTP client for backend API
**Scope**: Root provider
**Base URL**: `environment.apiUrl` = `http://autos.minilab/api/v1`

**Key Methods**:
- `getManufacturerModelCombinations(page, size, search?, baseUrl?)`
- `getVehicleDetails(models, page, size, filters, highlights?, sortBy?, sortOrder?, baseUrl?)`
- `getVehicleInstances(vehicleId, count?, baseUrl?)`
- `getAllVins(page, size, filters, sortBy?, sortOrder?, baseUrl?)`
- `getFilterOptions(fieldName, search?, limit?)`
- `getDistinctManufacturers(search?, limit?)`
- `getDistinctModels(search?, limit?)`
- `getDistinctBodyClasses()`
- `getDistinctDataSources()`
- `getYearRange()`

**Returns**: All methods return `Observable<T>` for reactive consumption

### 2. UrlStateService (`/core/services/url-state.service.ts`)

**Purpose**: Reactive URL query parameter management
**Scope**: Root provider

**Key Methods**:
- `getQueryParam(key: string): Observable<string | null>`
- `getAllQueryParams(): Observable<QueryParams>`
- `setQueryParams(params: QueryParams): void`
- `updateQueryParams(params: Partial<QueryParams>): void`
- `deleteQueryParam(key: string): void`
- `navigateWithPersistence(commands, persistParams): void`

**Pattern**: Observable-based API, auto-updates on route changes

### 3. RequestCoordinatorService (`/core/services/request-coordinator.service.ts`)

**Purpose**: HTTP request coordination (caching, deduplication, retry)
**Scope**: Root provider

**Key Methods**:
- `execute<T>(key, requestFn, config?): Observable<T>`
- `getLoadingState(key): Observable<boolean>`
- `getCachedResponse<T>(key, ttl?): T | null`
- `invalidateCache(key): void`
- `clearCache(): void`
- `retryFailed(key): void`

**Features**:
- In-flight request deduplication
- Response caching with TTL (default 30s)
- Exponential backoff retry
- Per-request loading state

### 4. ResourceManagementService<TFilters, TData> (`/core/services/resource-management.service.ts`)

**Purpose**: Generic, domain-agnostic state management
**Scope**: Not directly injectable (extended by domain services)
**Size**: 659 lines

**Type Parameters**:
- `TFilters` - Shape of filter object (e.g., SearchFilters)
- `TData` - Shape of result objects (e.g., VehicleResult)

**Public Observables**:
- `state$: Observable<ResourceState<TFilters, TData>>`
- `filters$: Observable<TFilters>`
- `results$: Observable<TData[]>`
- `loading$: Observable<boolean>`
- `error$: Observable<string | null>`
- `totalResults$: Observable<number>`
- `statistics$: Observable<any | null>`
- `highlights$: Observable<Partial<TFilters>>`

**Public Methods**:
- `updateFilters(partial: Partial<TFilters>): void`
- `resetFilters(): void`
- `updateHighlights(partial: Partial<TFilters>): void`
- `resetHighlights(): void`
- `syncStateFromExternal(state: Partial<ResourceState<TFilters, TData>>): void`
- `getCurrentState(): ResourceState<TFilters, TData>`

**Configuration Interface**:
```typescript
interface ResourceManagementConfig<TFilters, TData> {
  filterMapper: FilterUrlMapper<TFilters>;
  apiAdapter: ApiAdapter<TFilters, TData>;
  cacheKeyBuilder: CacheKeyBuilder<TFilters>;
  defaultFilters: TFilters;
  supportsHighlights: boolean;
}
```

### 5. VehicleResourceManagementService (`/core/services/vehicle-resource-management.factory.ts`)

**Purpose**: Vehicle domain implementation
**Scope**: Root provider (@Injectable)
**Type**: `ResourceManagementService<SearchFilters, VehicleResult>`

**Factory Function**:
```typescript
export function createVehicleResourceManagementService(
  route: ActivatedRoute,
  router: Router,
  requestCoordinator: RequestCoordinatorService,
  apiService: ApiService,
  urlState: UrlStateService
): VehicleResourceManagementService
```

**Backward Compatibility**: Can replace legacy StateManagementService

### 6. PickerConfigService (`/core/services/picker-config.service.ts`)

**Purpose**: Registry for PickerConfig objects
**Scope**: Root provider

**Key Methods**:
- `registerConfig<T>(config: PickerConfig<T>): void`
- `registerConfigs(configs: PickerConfig<any>[]): void`
- `getConfig<T>(id: string): PickerConfig<T> | undefined`
- `getAllConfigs(): PickerConfig<any>[]`
- `getConfigIds(): string[]`
- `hasConfig(id: string): boolean`
- `unregisterConfig(id: string): void`
- `clearAll(): void`

**Validation**: Validates configuration completeness at registration time

### 7. PopOutContextService (`/core/services/popout-context.service.ts`)

**Purpose**: Pop-out window coordination with parent
**Scope**: Root provider
**Communication**: BroadcastChannel API

**Key Methods**:
- `initializeAsPopOut(panelId: string): void`
- `initializeAsParent(): void`
- `sendMessage(message: PopOutMessage): void`
- `getMessages$(): Observable<PopOutMessage>`
- `closePopOut(): void`
- `isPopOut(): boolean`

**Message Types**:
- `STATE_UPDATE` - Parent → Pop-out state sync
- `CLOSE_POPOUT` - Parent → Pop-out close request
- `POPOUT_READY` - Pop-out → Parent initialization complete

### 8. FilterUrlMapperService (`/core/services/filter-url-mapper.service.ts`)

**Purpose**: SearchFilters ↔ URL parameter serialization
**Scope**: Root provider

**Key Methods**:
- `filtersToParams(filters: SearchFilters): QueryParams`
- `paramsToFilters(params: QueryParams): SearchFilters`
- `highlightsToParams(highlights: HighlightFilters): QueryParams`
- `paramsToHighlights(params: QueryParams): HighlightFilters`

**Handles**:
- Simple fields: `page`, `size`, `manufacturer`
- Complex fields: `modelCombos` (array of objects → comma-delimited string)
- Type conversions: string ↔ number
- Highlight prefix: `h_*` parameters

### 9. UrlParamService (`/core/services/url-param.service.ts`)

**Purpose**: URL parameter encoding/decoding utilities
**Scope**: Root provider

**Key Methods**:
- `encodeArray(arr: any[]): string`
- `decodeArray(str: string): any[]`
- `encodeObject(obj: any): string`
- `decodeObject(str: string): any`
- `encodeModelCombos(combos: ManufacturerModelSelection[]): string`
- `decodeModelCombos(str: string): ManufacturerModelSelection[]`

### 10. ErrorNotificationService (`/core/services/error-notification.service.ts`)

**Purpose**: Display user-facing error messages
**Scope**: Root provider
**Integration**: PrimeNG Toast component

**Key Methods**:
- `handleHttpError(error: HttpErrorResponse): void`
- `handleError(message: string, title?: string): void`
- `showWarning(message: string, title?: string): void`
- `showInfo(message: string, title?: string): void`

### 11. GlobalErrorHandler (`/core/services/global-error-handler.service.ts`)

**Purpose**: Application-level uncaught error handler
**Scope**: Provided as `ErrorHandler` in AppModule
**Provider**:
```typescript
{ provide: ErrorHandler, useClass: GlobalErrorHandler }
```

**Responsibilities**:
- Catch uncaught errors
- Log to console
- Send to tracking services (if configured)

### 12. TableStatePersistenceService (`/shared/services/table-state-persistence.service.ts`)

**Purpose**: Persist table column preferences to localStorage
**Scope**: Root provider

**Key Methods**:
- `saveTableState(tableId: string, state: TableState): void`
- `loadTableState(tableId: string): TableState | null`
- `clearTableState(tableId: string): void`

**TableState Interface**:
```typescript
interface TableState {
  columnOrder: string[];
  hiddenColumns: string[];
}
```

**Storage Key Pattern**: `table_prefs_${tableId}`

---

## 8. DATA MODELS

### Core Domain Models

#### SearchFilters (`/models/search-filters.model.ts`)

```typescript
interface SearchFilters {
  // Text search (global)
  q?: string;

  // Table column filters (partial match, client-side)
  manufacturerSearch?: string;
  modelSearch?: string;
  bodyClassSearch?: string;
  dataSourceSearch?: string;

  // Picker selections (exact match)
  modelCombos?: ManufacturerModelSelection[];  // Array of {manufacturer, model}

  // Pagination
  page?: number;           // 1-indexed
  size?: number;           // Results per page

  // Sorting
  sort?: string;           // Column name
  sortDirection?: 'asc' | 'desc';

  // Query Control filters (exact match, server-side)
  manufacturer?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  bodyClass?: string;
  dataSource?: string;
  vehicleID?: string;
}
```

**Usage**: Represents all possible filtering/pagination/sorting state

#### HighlightFilters (`/models/search-filters.model.ts`)

```typescript
interface HighlightFilters {
  yearMin?: number;
  yearMax?: number;
  manufacturer?: string;
  model?: string;
  modelCombos?: string;        // "Manufacturer:Model,Make:Model" format
  bodyClass?: string;
  stateCode?: string;
  conditionMin?: number;
  conditionMax?: number;
}
```

**Usage**: UI-only filters for visual emphasis (doesn't change result count)
**URL Prefix**: `h_*` (e.g., `h_yearMin=2015`)

#### VehicleResult (`/models/vehicle-result.model.ts`)

```typescript
interface VehicleResult {
  vehicle_id: string;           // Primary key
  manufacturer: string;         // Make
  model: string;                // Model name
  year: number;                 // Year
  body_class?: string;          // Sedan, SUV, Pickup, etc.
  data_source: string;          // edmunds, carfax, etc.
  ingested_at: string;          // ISO 8601 timestamp
  instance_count?: number | null; // Number of VIN instances
}
```

**Usage**: Represents a unique vehicle type (make/model/year/body class)

#### VehicleStatistics (`/models/vehicle-statistics.model.ts`)

```typescript
interface VehicleStatistics {
  byManufacturer: {
    [manufacturer: string]: number
  };

  modelsByManufacturer: {
    [manufacturer: string]: {
      [model: string]: number
    }
  };

  byYearRange: {
    [yearRange: string]: number    // e.g., "2020-2021": 150
  };

  byBodyClass: {
    [bodyClass: string]: number
  };

  totalCount: number;
}
```

**Usage**: Aggregated statistics for chart rendering
**NEW in experiment branch**: Backend now returns statistics in vehicle details response

#### ManufacturerModelSelection (`/models/vehicle.model.ts`)

```typescript
interface ManufacturerModelSelection {
  manufacturer: string;
  model: string;
}
```

**Usage**: Picker selection representation
**URL Format**: `modelCombos=Ford:F-150,Chevrolet:Silverado`

#### VehicleInstance (`/models/vehicle.model.ts`)

```typescript
interface VehicleInstance {
  vin: string;                      // Vehicle Identification Number
  condition_rating: number;         // 1-10 scale
  condition_description: string;    // "Excellent", "Good", etc.
  mileage: number;                  // Odometer reading
  mileage_verified: boolean;        // True if verified
  registered_state: string;         // State code (CA, NY, etc.)
  registration_status: string;      // "Active", "Expired", etc.
  title_status: string;             // "Clean", "Salvage", etc.
  exterior_color: string;           // Color name
  factory_options: string[];        // Array of option codes
  estimated_value: number;          // USD
  matching_numbers: boolean;        // Engine/trans match VIN
  last_service_date: string;        // ISO 8601 date
}
```

**Usage**: Individual vehicle instance (VIN-level detail)
**Relationship**: Multiple instances per VehicleResult

### Shared Component Models

#### TableColumn<T> (`/shared/models/table-column.model.ts`)

```typescript
interface TableColumn<T> {
  key: string;                  // Property name on T
  label: string;                // Display name
  width?: string;               // CSS width (e.g., "150px")
  sortable?: boolean;           // Enable sorting
  filterable?: boolean;         // Enable column filter
  filterType?: 'text' | 'number' | 'select';
  hideable?: boolean;           // Allow hiding column
  hidden?: boolean;             // Initially hidden
  valueFormatter?: (value: any) => string;  // Custom display
}
```

**Usage**: Defines table column behavior in BaseDataTableComponent

#### TableDataSource<T> (`/shared/models/table-data-source.model.ts`)

```typescript
interface TableDataSource<T> {
  fetch(params: TableQueryParams): Observable<TableResponse<T>>;
}

interface TableQueryParams {
  page: number;
  size: number;
  filters?: Record<string, any>;
  sort?: string;
  sortDirection?: 'asc' | 'desc';
}

interface TableResponse<T> {
  results: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
```

**Usage**: Abstraction for data fetching in table components

#### PickerConfig<T> (Complex ~200 lines)

**Purpose**: Declarative configuration for picker behavior

**Key Interfaces**:
```typescript
interface PickerConfig<T> {
  id: string;
  displayName: string;
  columns: PickerColumnConfig<T>[];
  api: PickerApiConfig<T>;
  row: PickerRowConfig<T>;
  selection: PickerSelectionConfig;
  pagination: PickerPaginationConfig;
  filtering?: PickerFilteringConfig;
  sorting?: PickerSortingConfig;
}

interface PickerColumnConfig<T> {
  key: keyof T;
  label: string;
  width?: string;
  sortable?: boolean;
}

interface PickerApiConfig<T> {
  method: 'http' | 'service';
  httpConfig?: {
    url: string;
    method: 'GET' | 'POST';
  };
  serviceMethod?: () => Observable<T[]>;
}

interface PickerRowConfig<T> {
  keyBuilder: (item: T) => string;
  keyParser: (key: string) => Partial<T>;
}

interface PickerSelectionConfig {
  urlParam: string;           // Query param name
  serializer: (items: any[]) => string;
  deserializer: (str: string) => any[];
}

interface PickerPaginationConfig {
  mode: 'client' | 'server';
  pageSize: number;
}
```

**Usage**: Full validation at registration, drives BasePickerComponent behavior

---

## 9. API INTEGRATION

### Backend Communication

**Base URL**: `environment.apiUrl`
- **Development**: `http://autos.minilab/api/v1`
- **Production**: Configured in environment.prod.ts

### REST API Endpoints

#### 1. Manufacturer-Model Combinations

```
GET /api/v1/manufacturer-model-combinations
```

**Query Parameters**:
- `page` (number, required) - 1-indexed page number
- `size` (number, required) - Results per page
- `search` (string, optional) - Search term

**Response**:
```typescript
{
  total: number,
  page: number,
  size: number,
  totalPages: number,
  data: [
    {
      manufacturer: string,
      count: number,
      models: [
        {
          model: string,
          count: number
        }
      ]
    }
  ]
}
```

#### 2. Vehicle Details (Main Search)

```
GET /api/v1/vehicles/details
```

**Query Parameters**:
- `models` (string) - "Make:Model,Make:Model" format (empty = all vehicles)
- `page` (number, required)
- `size` (number, required)
- `manufacturerSearch` (string, optional) - Partial match on manufacturer column
- `modelSearch` (string, optional) - Partial match on model column
- `bodyClassSearch` (string, optional) - Partial match on body class column
- `dataSourceSearch` (string, optional) - Partial match on data source column
- `manufacturer` (string, optional) - Exact match filter
- `model` (string, optional) - Exact match filter
- `yearMin` (number, optional)
- `yearMax` (number, optional)
- `bodyClass` (string, optional) - Exact match filter
- `dataSource` (string, optional) - Exact match filter
- `sortBy` (string, optional) - Column name
- `sortOrder` (string, optional) - 'asc' | 'desc'
- `h_yearMin` (number, optional) - Highlight filter (UI-only)
- `h_yearMax` (number, optional) - Highlight filter (UI-only)
- `h_manufacturer` (string, optional) - Highlight filter (UI-only)
- `h_modelCombos` (string, optional) - Highlight filter (UI-only)
- `h_bodyClass` (string, optional) - Highlight filter (UI-only)

**Response**:
```typescript
{
  total: number,
  page: number,
  size: number,
  totalPages: number,
  query: {
    modelCombos: string[]
  },
  results: VehicleResult[],
  statistics?: VehicleStatistics  // ⭐ NEW: For histogram charts
}
```

**Note**: `statistics` field returns aggregated data for chart rendering. This is a new feature in the experiment branch.

#### 3. Vehicle Instances (VINs)

```
GET /api/v1/vehicles/{id}/instances
```

**Path Parameters**:
- `id` (string, required) - vehicle_id

**Query Parameters**:
- `count` (number, optional, default: 8) - Number of instances to return

**Response**:
```typescript
{
  vehicle_id: string,
  manufacturer: string,
  model: string,
  year: number,
  body_class: string,
  instance_count: number,
  instances: VehicleInstance[]
}
```

#### 4. Filter Options (Dynamic)

```
GET /api/v1/filters/{fieldName}
```

**Path Parameters**:
- `fieldName` - One of: `manufacturers`, `models`, `body-classes`, `data-sources`, `year-range`

**Query Parameters**:
- `search` (string, optional) - Search term
- `limit` (number, optional, default: 1000) - Max results

**Response Formats**:

**Manufacturers**:
```typescript
{ manufacturers: string[] }
```

**Models**:
```typescript
{ models: string[] }
```

**Body Classes**:
```typescript
{ body_classes: string[] }
```

**Data Sources**:
```typescript
{ data_sources: string[] }
```

**Year Range**:
```typescript
{
  min: number,
  max: number
}
```

#### 5. All VINs

```
GET /api/v1/vins
```

**Query Parameters**:
- `page` (number, required)
- `size` (number, required)
- `sortBy` (string, optional, default: 'vin')
- `sortOrder` (string, optional, default: 'asc')
- `manufacturer` (string, optional)
- `model` (string, optional)
- `yearMin` (number, optional)
- `yearMax` (number, optional)
- `bodyClass` (string, optional)
- `mileageMin` (number, optional)
- `mileageMax` (number, optional)
- `valueMin` (number, optional)
- `valueMax` (number, optional)
- `vin` (string, optional) - Partial match
- `conditionDescription` (string, optional)
- `registeredState` (string, optional)
- `exteriorColor` (string, optional)

**Response**:
```typescript
{
  total: number,
  page: number,
  size: number,
  data: VehicleInstance[]
}
```

### HTTP Error Handling

**Error Flow**:
```
HTTP Error (4xx, 5xx, network)
  ↓
ErrorInterceptor
  ↓
ErrorNotificationService
  ↓
PrimeNG Toast (user-facing message)
  ↓
GlobalErrorHandler (fallback)
  ↓
Console logging
```

**Error Code Handling**:
- **4xx (Client Errors)**: Display user-friendly message ("Invalid request")
- **5xx (Server Errors)**: Display server error message
- **Network Errors**: Display connectivity message ("Cannot reach server")

### Request Coordination Features

**Implemented in RequestCoordinatorService**:

1. **Caching**
   - Default TTL: 30 seconds for vehicle data
   - Configurable per request
   - Cache key based on request parameters

2. **Deduplication**
   - Identical in-flight requests return same Observable
   - Prevents redundant API calls
   - Key-based request tracking

3. **Retry Logic**
   - Exponential backoff (1s, 2s, 4s, ...)
   - Configurable max attempts
   - Per-request or global retry

4. **Loading State**
   - Per-request loading observables
   - Global loading state
   - Automatic state management

---

## 10. UNIQUE/NOTABLE FEATURES

### Feature 1: Pop-Out Windows ⭐

**Purpose**: Multi-monitor support - move panels to separate windows

**User Experience**:
1. User clicks "Pop Out" button on any panel
2. Panel opens in new browser window
3. Panel continues to sync state with main window
4. Main window shows "popped out" placeholder
5. User can work with panel on separate monitor
6. Closing pop-out returns panel to main window

**Technical Implementation**:

**Step 1: Open Window**
```typescript
// DiscoverComponent
popOutPanel(panelId: string, panelType: string) {
  const url = `/panel/${this.gridId}/${panelId}/${panelType}?${currentQueryParams}`;
  const features = 'width=800,height=600,left=100,top=100';
  window.open(url, `panel-${panelId}`, features);
  this.poppedOutPanels.add(panelId);
}
```

**Step 2: Pop-Out Component**
```typescript
// PanelPopoutComponent
// Route: /panel/:gridId/:panelId/:type
ngOnInit() {
  this.panelType = this.route.snapshot.paramMap.get('type');
  this.popOutContext.initializeAsPopOut(panelId);

  // Render appropriate component based on type
  // Subscribe to state updates from parent
}
```

**Step 3: State Synchronization**
```typescript
// PopOutContextService (uses BroadcastChannel API)
private channel = new BroadcastChannel('panel-sync');

sendMessage(message: PopOutMessage) {
  this.channel.postMessage(message);
}

getMessages$(): Observable<PopOutMessage> {
  return fromEvent(this.channel, 'message').pipe(
    map(event => event.data)
  );
}
```

**Message Types**:
- `STATE_UPDATE`: Parent → Pop-out (filter changes, result updates)
- `CLOSE_POPOUT`: Parent → Pop-out (user closed panel)
- `POPOUT_READY`: Pop-out → Parent (initialization complete)

**Window Close Detection**:
```typescript
// Periodic health check
setInterval(() => {
  if (popOutWindow.closed) {
    this.poppedOutPanels.delete(panelId);
    this.cdr.markForCheck();
  }
}, 1000);
```

**URL-First Compliance** (NEW in this experiment):
- Pop-out windows now watch their own URL
- State derived from URL parameters
- BroadcastChannel used for coordination only
- Maintains URL as single source of truth

### Feature 2: Drag-Drop Panel Reordering

**Purpose**: Customize dashboard layout

**User Experience**:
1. Hover over panel header → drag handle appears
2. Click and drag panel
3. Drag preview shows panel title
4. Drop placeholder indicates target position
5. Drop panel → layout updates
6. Panel order saved to localStorage
7. Layout restored on next visit

**Technical Implementation**:

**Template** (DiscoverComponent):
```html
<div cdkDropList (cdkDropListDropped)="onPanelDrop($event)">
  <div *ngFor="let panel of panels"
       cdkDrag
       [cdkDragData]="panel">

    <div cdkDragHandle class="drag-handle">
      <i class="pi pi-bars"></i>
    </div>

    <!-- Panel content -->
  </div>
</div>
```

**Drop Handler**:
```typescript
onPanelDrop(event: CdkDragDrop<any>) {
  moveItemInArray(this.panels, event.previousIndex, event.currentIndex);
  this.savePanelOrder();
}

savePanelOrder() {
  const order = this.panels.map(p => p.id);
  localStorage.setItem('discover-panel-order', JSON.stringify(order));
}
```

**Restoration**:
```typescript
ngOnInit() {
  const saved = localStorage.getItem('discover-panel-order');
  if (saved) {
    const order = JSON.parse(saved);
    this.panels = this.sortByOrder(this.panels, order);
  }
}
```

**7 Reorderable Panels**:
1. Query Control
2. Model Picker
3. Dual Checkbox Picker
4. Base Dual Picker
5. VIN Browser
6. Vehicle Results Table
7. Interactive Charts

### Feature 3: Highlight Filters (UI-Only) ⭐ UNIQUE

**Purpose**: Visual emphasis without changing result count

**Concept**:
- **Regular Filters**: Change which results are returned (fewer results)
- **Highlight Filters**: Same results, but visual emphasis on subset

**Use Case Example**:
```
Query: Show me all Ford vehicles (5,000 results)
Highlight: Emphasize Ford vehicles from 2015-2019 (2,000 vehicles)

Results Table: Shows all 5,000 Ford vehicles
Charts: Show both distributions:
  - Total: All 5,000 vehicles
  - Highlighted: Subset of 2,000 vehicles (different color)
```

**URL Pattern**:
```
/discover?
  manufacturer=Ford              # Regular filter (exact match)
  &h_yearMin=2015                # Highlight filter (UI-only)
  &h_yearMax=2019                # Highlight filter (UI-only)
```

**Backend Support**:
- Highlight parameters sent to API
- Backend returns same results
- Backend returns TWO sets of statistics:
  - Total statistics (all results)
  - Highlighted statistics (subset matching h_* filters)

**Chart Rendering**:
```typescript
// Year chart shows both:
- Blue bars: All Ford vehicles by year
- Orange bars: Highlighted subset (2015-2019)
```

**Implementation**:
```typescript
// FilterUrlMapperService
highlightsToParams(highlights: HighlightFilters): QueryParams {
  const params: QueryParams = {};
  if (highlights.yearMin) params['h_yearMin'] = String(highlights.yearMin);
  if (highlights.yearMax) params['h_yearMax'] = String(highlights.yearMax);
  // ... etc
  return params;
}
```

### Feature 4: Configuration-Driven Pickers ⭐ ARCHITECTURAL INNOVATION

**Purpose**: Define picker behavior declaratively, eliminate boilerplate

**Benefits**:
1. **Single Component**: One `BasePickerComponent<T>` serves all pickers
2. **No Duplication**: Column definitions, API calls, selection logic in config
3. **Type Safety**: Generic `PickerConfig<T>` with compile-time checking
4. **Extensibility**: New pickers = new config file (no new components)
5. **Testability**: Config objects are plain data (easy to test)
6. **Validation**: Runtime validation at registration

**Example Configuration**:

```typescript
// manufacturer-model-picker.config.ts
export const MANUFACTURER_MODEL_PICKER_CONFIG: PickerConfig<ManufacturerModelCombo> = {
  id: 'manufacturer-model-picker',
  displayName: 'Manufacturer-Model Picker',

  columns: [
    { key: 'manufacturer', label: 'Manufacturer', width: '200px', sortable: true },
    { key: 'model', label: 'Model', width: '200px', sortable: true },
    { key: 'count', label: 'Count', width: '100px', sortable: true }
  ],

  api: {
    method: 'service',
    serviceMethod: (apiService, page, size, search) =>
      apiService.getManufacturerModelCombinations(page, size, search)
  },

  row: {
    keyBuilder: (item) => `${item.manufacturer}:${item.model}`,
    keyParser: (key) => {
      const [manufacturer, model] = key.split(':');
      return { manufacturer, model };
    }
  },

  selection: {
    urlParam: 'modelCombos',
    serializer: (items) => items.map(i => `${i.manufacturer}:${i.model}`).join(','),
    deserializer: (str) => str.split(',').map(s => {
      const [manufacturer, model] = s.split(':');
      return { manufacturer, model };
    })
  },

  pagination: {
    mode: 'server',
    pageSize: 20
  },

  filtering: {
    enabled: true,
    mode: 'client'
  },

  sorting: {
    enabled: true,
    defaultSort: 'manufacturer',
    defaultDirection: 'asc'
  }
};
```

**Registration** (app.module.ts):
```typescript
constructor(pickerConfigService: PickerConfigService) {
  pickerConfigService.registerConfigs([
    MANUFACTURER_MODEL_PICKER_CONFIG,
    DUAL_CHECKBOX_PICKER_CONFIG,
    BASE_DUAL_PICKER_CONFIG,
    VIN_PICKER_CONFIG,
    VIN_BROWSER_CONFIG
  ]);
}
```

**Usage** (component):
```typescript
// Just pass config ID!
<app-base-picker [configId]="'manufacturer-model-picker'"></app-base-picker>
```

**BasePickerComponent** handles:
- API calls (via config.api)
- Pagination (via config.pagination)
- Sorting (via config.sorting)
- Filtering (via config.filtering)
- Selection (via config.selection)
- URL synchronization (via config.selection.urlParam)

### Feature 5: Generic Reusable Base Components ⭐

#### BaseDataTableComponent<T>

**Type-Safe Generic Table**:
```typescript
@Component({
  selector: 'app-base-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush  // Performance
})
export class BaseDataTableComponent<T> {
  @Input() dataSource!: TableDataSource<T>;
  @Input() columns!: TableColumn<T>[];
  @Input() expandable: boolean = false;
  @Input() selectable: boolean = false;
  @Output() rowExpand = new EventEmitter<T>();
}
```

**Features**:
- Works with any data type `T`
- OnPush change detection (performance)
- Sortable columns (click header)
- Filterable columns (input in header)
- Expandable rows (nested detail)
- Column management (reorder, hide/show)
- State persistence (localStorage)
- Virtual scrolling support (CDK)

**Usage**:
```typescript
// Works with VehicleResult
<app-base-data-table
  [dataSource]="vehicleDataSource"
  [columns]="vehicleColumns"
  [expandable]="true"
  (rowExpand)="onVehicleExpand($event)">
</app-base-data-table>

// Works with VehicleInstance
<app-base-data-table
  [dataSource]="vinDataSource"
  [columns]="vinColumns">
</app-base-data-table>
```

#### BasePickerComponent<T>

**Configuration-Driven Picker**:
```typescript
@Component({
  selector: 'app-base-picker',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasePickerComponent<T> {
  @Input() configId!: string;  // Look up config from registry
  @Input() multiSelect: boolean = true;
  @Output() selectionChange = new EventEmitter<T[]>();
}
```

**Features**:
- Configuration-driven (no hardcoded logic)
- Client-side or server-side pagination
- Dynamic API integration
- URL state hydration
- Pop-out window awareness
- Search/filter support

#### BaseChartComponent

**Data Source Abstraction**:
```typescript
@Component({
  selector: 'app-base-chart'
})
export class BaseChartComponent {
  @Input() dataSource!: ChartDataSource;
  @Input() chartType: 'bar' | 'line' | 'pie';
  @Input() title: string;
}
```

**Features**:
- Generic rendering
- Plotly.js integration
- Highlight support (segmented statistics)
- Interactive (zoom, pan, export)

### Feature 6: Column Management

**ColumnManagerComponent**:

**Features**:
- Drag-drop column reordering (Angular CDK)
- Show/hide columns (checkboxes)
- Reset to defaults
- Persist to localStorage

**UI**:
```
Column Manager [Dialog]
┌────────────────────────┐
│ ☐ Manufacturer      ⋮  │ ← Drag handle
│ ☑ Model             ⋮  │
│ ☑ Year              ⋮  │
│ ☐ Body Class        ⋮  │
│ ☑ Data Source       ⋮  │
│                        │
│ [Reset] [Apply] [Cancel]
└────────────────────────┘
```

**Persistence**:
```typescript
// Saved to: localStorage['table_prefs_vehicles']
{
  columnOrder: ['model', 'year', 'manufacturer', 'data_source'],
  hiddenColumns: ['manufacturer', 'body_class']
}
```

**Integration**:
```typescript
<app-column-manager
  [tableId]="'vehicles'"
  [columns]="columns"
  (columnsChange)="onColumnsChange($event)">
</app-column-manager>
```

### Feature 7: Multi-Filter Pattern ⭐ SOPHISTICATED

**Two-Pattern Filtering System**:

#### Pattern 1: Table Column Filters (Partial Match, Client-Side)

**Purpose**: Filter displayed results without changing total count

**Parameters**:
- `manufacturerSearch` - Partial match on manufacturer column
- `modelSearch` - Partial match on model column
- `bodyClassSearch` - Partial match on body class column
- `dataSourceSearch` - Partial match on data source column

**Behavior**:
```
Total Results: 5,000 vehicles
manufacturerSearch="for" → Shows rows containing "for" (Ford, etc.)
Filtered Results: 1,200 vehicles displayed
Total Count: Still 5,000 (not affected)
```

**Implementation**: Client-side filtering on displayed page only

#### Pattern 2: Query Control Filters (Exact Match, Server-Side)

**Purpose**: Change which results are returned from API

**Parameters**:
- `manufacturer` - Exact match (e.g., "Ford")
- `model` - Exact match (e.g., "F-150")
- `yearMin` / `yearMax` - Range filter
- `bodyClass` - Exact match (e.g., "Pickup")
- `dataSource` - Exact match (e.g., "edmunds")

**Behavior**:
```
manufacturer="Ford" → API returns only Ford vehicles
Total Results: 1,200 vehicles (changed from 5,000)
```

**Implementation**: Server-side filtering before pagination

#### Combined Usage:

```
Step 1: Query Control Filter
  manufacturer="Ford"
  → API returns 1,200 Ford vehicles

Step 2: Table Column Filter
  modelSearch="f-1"
  → Display only rows containing "f-1" (F-150, etc.)
  → Shows 200 vehicles
  → Total count still 1,200

Step 3: Highlight Filter
  h_yearMin=2015, h_yearMax=2019
  → Same 200 vehicles displayed
  → Charts show segmented statistics (total vs highlighted)
```

**URL Example**:
```
/discover?
  manufacturer=Ford              # Query control (exact, server-side)
  &modelSearch=f-1               # Table filter (partial, client-side)
  &h_yearMin=2015                # Highlight (UI-only)
  &h_yearMax=2019
```

### Feature 8: URL-Driven State Management ⭐ CORE ARCHITECTURE

**Benefits**:

1. **Bookmarkable URLs**
   ```
   Bookmark: /discover?manufacturer=Ford&yearMin=2020
   → Returns to exact filtered state
   ```

2. **Shareable Deep Links**
   ```
   User A shares: /discover?modelCombos=Ford:F-150,Chevrolet:Silverado
   User B opens → Same results, same filters
   ```

3. **Browser Back/Forward Navigation**
   ```
   User changes filter → URL updates
   User clicks Back → Previous filter state restored
   User clicks Forward → Next filter state restored
   ```

4. **SEO-Friendly**
   ```
   Search engines can index filtered pages
   /discover?manufacturer=Tesla&bodyClass=Sedan
   ```

5. **Debugging**
   ```
   Full application state visible in URL bar
   Copy URL → Paste in bug report
   Developer can reproduce exact state
   ```

**Trade-offs**:
- Long URLs with many filters
- URL encoding/decoding overhead
- Parameter naming conventions required
- Query param limits (browser-dependent, ~2000 chars)

**Implementation**:
```typescript
// Automatic synchronization
User changes filter
  → ResourceManagementService.updateFilters()
  → FilterUrlMapperService.filtersToParams()
  → UrlStateService.setQueryParams()
  → Router.navigate([], { queryParams })
  → URL bar updates
  → RouteStateService.queryParams$ emits
  → ResourceManagementService.initializeFromUrl()
  → API call with new filters
  → Results updated
  → Components re-render
```

### Feature 9: Statistics & Histograms

**VehicleStatistics Data Structure**:
```typescript
{
  byManufacturer: {
    "Ford": 1200,
    "Chevrolet": 950,
    "Toyota": 800
  },

  modelsByManufacturer: {
    "Ford": {
      "F-150": 300,
      "Mustang": 200,
      "Explorer": 150
    }
  },

  byYearRange: {
    "2020-2021": 500,
    "2021-2022": 450,
    "2022-2023": 400
  },

  byBodyClass: {
    "Pickup": 600,
    "SUV": 500,
    "Sedan": 400
  },

  totalCount: 5000
}
```

**Chart Components**:

1. **ManufacturerChartComponent**
   - Horizontal bar chart
   - Top manufacturers by count
   - Interactive (click to filter)

2. **ModelsChartComponent**
   - Nested bar chart
   - Models grouped by manufacturer
   - Expandable manufacturer groups

3. **YearChartComponent**
   - Histogram
   - Year range distribution
   - Highlight support (segmented bars)

4. **BodyClassChartComponent**
   - Pie chart or bar chart
   - Body class distribution
   - Click to filter

**Charting Library**: Plotly.js
- Interactive (zoom, pan, reset)
- Export to PNG
- Tooltip on hover
- Click events

**Highlight Support** (NEW):
```typescript
// Chart receives TWO data series:
{
  total: { "2020": 500, "2021": 450, "2022": 400 },
  highlighted: { "2020": 100, "2021": 90, "2022": 80 }
}

// Renders as:
- Blue bars: Total distribution
- Orange bars: Highlighted subset (overlaid or side-by-side)
```

---

## 11. BUILD & DEPLOYMENT

### Build Configuration

**Output Directory**: `dist/autos/`

**angular.json Highlights**:
```json
{
  "projects": {
    "autos": {
      "architect": {
        "build": {
          "options": {
            "outputPath": "dist/autos",
            "index": "src/index.html",
            "main": "src/main.ts",
            "styles": [
              "node_modules/primeng/resources/themes/lara-light-blue/theme.css",
              "node_modules/primeng/resources/primeng.min.css",
              "node_modules/primeicons/primeicons.css",
              "src/styles.scss"
            ],
            "budgets": [
              {
                "type": "initial",
                "maximumWarning": "5mb",
                "maximumError": "10mb"
              }
            ]
          }
        }
      }
    }
  }
}
```

### Development Server

```bash
# Start development server
npm start                  # ng serve
ng serve --open           # Auto-open browser at http://localhost:4200
ng serve --poll 2000      # File watching in VM environments

# With specific host/port
ng serve --host 0.0.0.0 --port 4200
```

### Production Build

```bash
# Production build
npm run build              # ng build --configuration production

# Build with stats (bundle analysis)
ng build --stats-json
npx webpack-bundle-analyzer dist/autos/stats.json
```

**Production Optimizations**:
- Tree-shaking (Webpack)
- Minification (Terser)
- AOT compilation (Ahead-of-Time)
- Source maps disabled
- Output hashing (cache busting)
- CSS extraction and minification

### Docker Deployment

**Multi-Stage Dockerfile**:

```dockerfile
# Stage 1: Build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist/autos /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Configuration** (SPA routing):

```nginx
server {
  listen 80;
  server_name localhost;
  root /usr/share/nginx/html;
  index index.html;

  # SPA routing: all routes → index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;

  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

**Docker Commands**:
```bash
# Build image
docker build -t autos-frontend .

# Run container
docker run -p 80:80 autos-frontend

# Docker Compose (if backend included)
docker-compose up
```

---

## 12. TESTING STRATEGY

### Unit Testing

**Framework**: Jasmine + Karma

**Test Organization**:
```
src/app/
├── core/services/*.service.spec.ts
├── features/*/components/*.component.spec.ts
├── shared/components/*.component.spec.ts
└── models/*.model.spec.ts
```

**Mocks**:
```
src/app/shared/components/base-data-table/
├── mocks/
│   ├── mock-data-source.ts
│   └── mock-table-columns.ts
└── tests/
    └── base-data-table.component.spec.ts
```

**Run Tests**:
```bash
# Single run
npm test                                    # Karma single run
ng test                                     # Watch mode

# With coverage
ng test --code-coverage                    # Coverage report in coverage/

# Specific browser
ng test --browsers=Chrome --watch=true
ng test --browsers=ChromeHeadless          # CI environment
```

**Coverage Configuration** (`karma.conf.js`):
```javascript
coverageReporter: {
  dir: require('path').join(__dirname, './coverage/autos'),
  subdir: '.',
  reporters: [
    { type: 'html' },
    { type: 'text-summary' },
    { type: 'lcovonly' }
  ]
}
```

### E2E Testing

**Framework**: Playwright 1.56.1

**Configuration** (`playwright.config.ts`):
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
```

**Run E2E Tests**:
```bash
# Run all tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run in headed mode (show browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Specific test file
npx playwright test e2e/discover.spec.ts

# Generate code
npx playwright codegen http://localhost:4200
```

**Test Organization**:
```
e2e/
├── discover.spec.ts          # Main discovery page tests
├── filters.spec.ts           # Filter functionality tests
├── popout.spec.ts            # Pop-out window tests
└── navigation.spec.ts        # Routing tests
```

---

## 13. CODE ORGANIZATION & CONVENTIONS

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| **Component** | `*.component.ts` | `base-data-table.component.ts` |
| **Template** | `*.component.html` | `base-data-table.component.html` |
| **Styles** | `*.component.scss` | `base-data-table.component.scss` |
| **Service** | `*.service.ts` | `api.service.ts` |
| **Model** | `*.model.ts` | `vehicle.model.ts` |
| **Module** | `*.module.ts` | `app.module.ts` |
| **Config** | `*.config.ts` | `manufacturer-model-picker.config.ts` |
| **Spec** | `*.spec.ts` | `api.service.spec.ts` |

### Import Organization

**Standard Order**:
```typescript
// 1. Angular core/common
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// 2. Angular modules
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// 3. Third-party libraries
import { Observable } from 'rxjs';
import { map, filter, takeUntil } from 'rxjs/operators';
import { TableModule } from 'primeng/table';

// 4. App services
import { ApiService } from '@/services/api.service';
import { StateManagementService } from '@/core/services/state-management.service';

// 5. App models
import { VehicleResult } from '@/models/vehicle-result.model';
import { SearchFilters } from '@/models/search-filters.model';

// 6. Relative imports
import { BaseDataTableComponent } from '../base-data-table/base-data-table.component';
```

### Naming Conventions

**Classes**: PascalCase
```typescript
class ApiService { }
class BaseDataTableComponent { }
```

**Files**: kebab-case
```typescript
api.service.ts
base-data-table.component.ts
```

**Variables/Properties**: camelCase
```typescript
let vehicleData: VehicleResult[];
private isLoading: boolean;
```

**Constants**: UPPER_SNAKE_CASE
```typescript
const DEFAULT_PAGE_SIZE = 20;
const MAX_RETRY_ATTEMPTS = 3;
```

**Private Members**: Prefix with `private` or `#`
```typescript
private destroy$ = new Subject<void>();
#internalCache = new Map();
```

**Observables**: Suffix with `$`
```typescript
results$: Observable<VehicleResult[]>;
loading$: Observable<boolean>;
```

**Interfaces**: PascalCase (no `I` prefix)
```typescript
interface SearchFilters { }
interface TableColumn<T> { }
```

### Module Organization

**CoreModule Pattern**:
```typescript
// Import once in AppModule
// Contains singleton services
@NgModule({
  providers: [
    ApiService,
    UrlStateService,
    RequestCoordinatorService,
    // ... other singletons
  ]
})
export class CoreModule {
  // Prevent re-import
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import only in AppModule');
    }
  }
}
```

**SharedModule Pattern**:
```typescript
// Import in multiple feature modules
// Contains reusable components/pipes/directives
@NgModule({
  declarations: [
    BaseDataTableComponent,
    BasePickerComponent,
    ColumnManagerComponent
  ],
  exports: [
    BaseDataTableComponent,
    BasePickerComponent,
    ColumnManagerComponent,
    CommonModule,
    FormsModule
  ]
})
export class SharedModule { }
```

### Component Patterns

**OnInit + OnDestroy (Memory Leak Prevention)**:
```typescript
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.service.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // Handle data
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**OnPush Change Detection**:
```typescript
@Component({
  selector: 'app-my-component',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyComponent {
  constructor(private cdr: ChangeDetectorRef) {}

  updateState() {
    // Mutation
    this.cdr.markForCheck();  // Trigger change detection
  }
}
```

---

## 14. KNOWN ISSUES & TECHNICAL DEBT

### 1. Legacy StateManagementService

**Status**: Being replaced by ResourceManagementService

**Evidence**:
- Comments in code: "EXPERIMENT: Swap StateManagementService with VehicleResourceManagementService"
- `defunct-state-management.service.ts` file exists
- Gradual migration underway

**Impact**:
- Some components still use old service
- Dual patterns exist temporarily
- Migration incomplete

### 2. NG-ZORRO to PrimeNG Migration

**Status**: Partially complete

**Evidence**:
- `CLAUDE.md` references NG-ZORRO architecture (outdated)
- App now primarily uses PrimeNG
- Some legacy code may reference old patterns
- `primeng.module.ts` centralizes imports

**Impact**:
- Documentation out of sync
- Potential unused imports
- Style inconsistencies

### 3. Test Compilation Issues

**Evidence**:
- `TEST-COMPILATION-ERRORS.md` exists
- `TEST-FAILURE-ANALYSIS.md` exists

**Impact**:
- CI/CD pipeline may be affected
- Test coverage may be incomplete
- Some tests may be skipped

### 4. Unused/Legacy Components

**Potential Candidates**:
- `StaticParabolaChartComponent` - May be unused
- `defunct-state-management.service.ts` - Legacy service
- `plotly-histogram.component.ts` - May be replaced by new chart components

**Impact**:
- Bundle size larger than necessary
- Maintenance burden
- Potential confusion

### 5. Pop-Out Window URL Watching (FIXED in this branch)

**Previous Issue**: Pop-out windows disabled URL watching

**Fix**: experiment/resource-management-service branch enables URL watching for pop-outs

**Status**: ✅ RESOLVED in this branch

---

## 15. PERFORMANCE CHARACTERISTICS

### Optimization Features

1. **OnPush Change Detection**
   - `BaseDataTableComponent`: OnPush
   - `BasePickerComponent`: OnPush
   - Reduces change detection cycles
   - Manual `markForCheck()` when needed

2. **Virtual Scrolling** (CDK)
   - Available for large lists
   - Renders only visible items
   - Smooth scrolling performance

3. **Request Caching**
   - 30-second TTL for vehicle data
   - Prevents redundant API calls
   - Configurable per request

4. **Request Deduplication**
   - Identical in-flight requests share Observable
   - Reduces server load
   - Improves response time

5. **Lazy Loading** (Potential)
   - Angular routing supports lazy loading
   - Not yet implemented
   - Future optimization opportunity

6. **AOT Compilation**
   - Default in production build
   - Faster rendering
   - Smaller bundle size

### Bundle Size Targets

**Budget Configuration**:
```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "5mb",
      "maximumError": "10mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "10kb",
      "maximumError": "20kb"
    }
  ]
}
```

**Vendor Bundle Estimates**:
- PrimeNG: ~500KB
- RxJS: ~200KB
- Angular: ~2MB
- Plotly.js: ~1MB
- Total vendor: ~3.7MB

### Data Table Performance

**Pagination**:
- Default: 20 results per page
- Reduces DOM nodes
- Faster rendering

**Column Filtering**:
- Client-side (on displayed rows only)
- Debounced 300ms
- No API calls

**Sorting**:
- Server-side (re-fetch data)
- Debounced 300ms
- Cached response

**Column Manager**:
- Drag-drop uses CDK (optimized)
- Persisted to localStorage (fast access)

---

## 16. SECURITY CONSIDERATIONS

### Implemented Security Features

1. **HTTP Error Interception**
   - `ErrorInterceptor` prevents sensitive error details leaking to user
   - User-friendly messages instead of stack traces

2. **Environment Variables**
   - API URL configurable per environment
   - No hardcoded endpoints in code

3. **No Hardcoded Credentials**
   - All authentication via environment config
   - No API keys in codebase

4. **XSS Protection**
   - Angular's built-in sanitization
   - Templates auto-escape user input

5. **CSRF Protection**
   - HTTP POST (if used) should include CSRF token
   - Token management via interceptor

### Security Recommendations

1. **Content Security Policy (CSP)**
   - Add CSP headers to nginx.conf
   - Restrict script sources
   - Prevent inline scripts

2. **Authentication Interceptor**
   - Add JWT token to requests (if auth required)
   - Refresh token logic
   - Logout on 401

3. **Rate Limiting**
   - Frontend rate limiting in RequestCoordinator
   - Prevent abuse
   - Throttle requests

4. **Input Validation**
   - Validate all user inputs
   - Sanitize before API calls
   - Schema validation

5. **API Response Validation**
   - Validate response schemas
   - Prevent injection attacks
   - Type guards for runtime checks

---

## 17. SCALABILITY & EXTENSIBILITY

### Adding New Features

#### 1. Add New Picker

**Steps**:
1. Create config file: `config/new-picker.config.ts`
2. Define `PickerConfig<T>` object
3. Register in `config/picker-configs.ts`
4. Use in template: `<app-base-picker [configId]="'new-picker'"></app-base-picker>`

**No new components needed!**

#### 2. Add New Filter Type

**Steps**:
1. Update `SearchFilters` interface in `models/search-filters.model.ts`
2. Add URL mapping in `FilterUrlMapperService`
3. Update `QueryControlComponent` to display new filter
4. Backend must support new filter parameter

#### 3. Add New Chart

**Steps**:
1. Create chart component extending `BaseChartComponent`
2. Create data source implementing `ChartDataSource`
3. Add to `DiscoverComponent` panels
4. Register in panel routing

#### 4. Add New Page

**Steps**:
1. Create feature folder in `features/`
2. Create component
3. Add route to `app-routing.module.ts`
4. Add navigation link

#### 5. Add New Service

**Steps**:
1. Create service in `core/services/` or `shared/services/`
2. Add `@Injectable({ providedIn: 'root' })`
3. Export from `index.ts`
4. Inject where needed

### Scaling Considerations

#### Large Result Sets

**Current**: Pagination (20 per page)

**Optimization Options**:
1. **Virtual Scrolling**
   - CDK virtual scroll
   - Render only visible items
   - Handle 10,000+ items

2. **Infinite Scroll**
   - Replace pagination
   - Append results on scroll
   - Better UX for exploration

3. **Server-Side Rendering**
   - SSR for initial load
   - Hydrate on client
   - Faster perceived performance

#### Many Pickers

**Current**: All pickers loaded eagerly

**Optimization Options**:
1. **Lazy Load Configs**
   - Load picker configs on demand
   - Reduce initial bundle size

2. **Longer Cache TTL**
   - Cache picker data longer (currently 0)
   - Reduce API calls

3. **Shared Data Source**
   - Multiple pickers share same data source
   - Reduce memory usage

#### Complex Filtering

**Current**: Simple filter chips

**Enhancement Options**:
1. **Advanced Filter Builder**
   - Nested AND/OR logic
   - Custom filter expressions
   - Save filter presets

2. **Saved Filters**
   - User-defined filter sets
   - Quick access to common filters
   - Share filters with team

3. **Filter Templates**
   - Pre-defined filter combinations
   - Industry-specific templates

#### Real-Time Updates

**Current**: Manual refresh

**Enhancement Options**:
1. **WebSocket Integration**
   - Real-time data updates
   - Push notifications
   - Live statistics

2. **Server-Sent Events**
   - Simpler than WebSocket
   - One-way updates
   - Auto-refresh on change

3. **Polling**
   - Periodic API calls
   - Configurable interval
   - Detect changes

---

## 18. MIGRATION PATH (NG-ZORRO → PrimeNG)

**Status**: In progress on experiment branch

### Completed

1. ✅ PrimeNG installed and configured
2. ✅ Core components migrated (Table, Button, Dropdown, etc.)
3. ✅ Theme applied (Lara Light Blue)
4. ✅ Icons migrated (PrimeIcons)

### Remaining

1. ⚠️ Update all component templates to use PrimeNG components
2. ⚠️ Remove NG-ZORRO dependencies from package.json
3. ⚠️ Update CLAUDE.md documentation
4. ⚠️ Remove unused NG-ZORRO imports
5. ⚠️ Test all UI functionality

### Migration Strategy

**Phase 1: Parallel Operation**
- Both libraries coexist
- Gradual component migration
- Feature parity maintained

**Phase 2: Complete Migration**
- All components use PrimeNG
- NG-ZORRO dependencies removed
- Documentation updated

**Phase 3: Cleanup**
- Remove unused code
- Optimize bundle size
- Update tests

---

## 19. SUMMARY TABLE

| Aspect | Value |
|--------|-------|
| **Framework** | Angular 14.2.0 |
| **UI Library** | PrimeNG 14.2.3 |
| **State Management** | URL-first (ResourceManagementService) |
| **HTTP Client** | Angular HttpClient + ApiService |
| **Components** | 20 TypeScript components |
| **Services** | 12 core services |
| **Models** | 5 primary domain models |
| **Routes** | 4 main routes + dynamic pop-out routes |
| **Change Detection** | OnPush (performance optimized) |
| **Build Tool** | Angular CLI 14.2.13 |
| **Package Manager** | npm (package-lock.json) |
| **Testing** | Karma + Jasmine + Playwright |
| **Styling** | SCSS (PrimeNG Lara Light Blue theme) |
| **Deployment** | Docker (multi-stage build) |
| **Data Flow** | Unidirectional (URL → State → Components) |
| **Charting** | Plotly.js 3.2.0 |
| **Drag-Drop** | Angular CDK 14.2.7 |
| **Architecture** | Smart/Dumb components, Configuration-driven |

---

## 20. CONCLUSIONS

The **AUTOS Prime-NG Frontend** is a sophisticated, well-architected Angular application demonstrating **enterprise-grade patterns**:

### Key Strengths

1. **URL-First State Management** ⭐
   - Single source of truth
   - Bookmarkable, shareable deep links
   - Natural browser navigation

2. **Generic Reusable Components** ⭐
   - Type-safe with generics
   - `BaseDataTableComponent<T>` works with any data
   - Eliminates boilerplate

3. **Configuration-Driven Architecture** ⭐
   - Declarative picker configs
   - Add pickers without new components
   - Runtime validation

4. **Cross-Window Coordination** ⭐
   - Pop-out panels to separate windows
   - BroadcastChannel synchronization
   - Multi-monitor support

5. **Advanced Data Operations**
   - Two-pattern filtering (exact + partial)
   - Highlight filters (UI-only emphasis)
   - Sortable, filterable, expandable tables

6. **Professional Error Handling**
   - Centralized interceptors
   - User-friendly notifications
   - Global fallback handler

7. **Performance Optimization**
   - OnPush change detection
   - Request caching and deduplication
   - Virtual scrolling support

8. **Separation of Concerns**
   - Clear service layers
   - Smart/dumb component pattern
   - Domain models separate from UI

### Current Status

**Active Migration**:
- NG-ZORRO → PrimeNG (in progress)
- StateManagementService → ResourceManagementService (experiment branch)

**Branch**: `experiment/resource-management-service`
- New generic state management
- URL-first compliance for pop-outs
- Backward compatibility maintained

### Use Cases

This application serves as a **reference implementation** for:
- URL-driven state management
- Generic, type-safe components
- Configuration-driven architecture
- Multi-window coordination
- Advanced filtering and data visualization
- Enterprise Angular best practices

---

**Document Status**: Working Draft
**Next Steps**: Create detailed component-by-component specifications
**Refinement**: Pending further analysis and user feedback

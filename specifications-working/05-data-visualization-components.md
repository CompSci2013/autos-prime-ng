# DATA VISUALIZATION COMPONENTS SPECIFICATION
## Tables, Charts, and Pickers
### Branch: experiment/resource-management-service

**Status**: Working Draft - Subject to Refinement
**Date**: 2025-11-15
**Purpose**: Complete specification for data visualization components

---

## EXECUTIVE SUMMARY

The application's data visualization system uses a **composition pattern** with reusable base components and pluggable data sources. This enables type-safe, configuration-driven tables and charts that work seamlessly in both normal and pop-out window modes.

**Key Components**:
1. **BaseDataTableComponent<T>** - Generic table with sorting, filtering, pagination
2. **ColumnManagerComponent** - Drag-drop column management
3. **BaseChartComponent** - Reusable Plotly.js container
4. **Chart Data Sources** - Manufacturer, Models, Year, BodyClass
5. **BasePicker** Component - Configuration-driven selection tables

---

## 1. BASEDATATABLECOMPONENT<T>

### Overview

**Location**: `shared/components/base-data-table/`
**Purpose**: Generic, reusable data table with enterprise features
**Type Parameter**: `T` - Row data type (enables type-safe columns)

### Key Features

- ✅ **Server-side & client-side pagination**
- ✅ **Column sorting** (server or client-side)
- ✅ **Column filtering** (text, number, select, range)
- ✅ **Expandable rows** with custom templates
- ✅ **Column management** (reorder, hide/show)
- ✅ **State persistence** (localStorage)
- ✅ **OnPush change detection** (high performance)
- ✅ **Responsive design** with virtual scrolling support

### Inputs & Outputs

**Inputs**:
```typescript
@Input() tableId: string;                    // Required: For localStorage
@Input() columns: TableColumn<T>[];          // Required: Column defs
@Input() dataSource?: TableDataSource<T>;    // Server-side mode
@Input() data?: T[];                         // Client-side mode
@Input() totalCount?: number;                // Total records
@Input() maxTableHeight: string = '1200px';
@Input() queryParams: TableQueryParams = {page:1, size:20};
@Input() expandable: boolean = false;
@Input() showColumnManagement: boolean = true;
@Input() loading: boolean = false;
```

**Outputs**:
```typescript
@Output() queryParamsChange = new EventEmitter<TableQueryParams>();
@Output() dataLoaded = new EventEmitter<void>();
@Output() rowExpand = new EventEmitter<T>();
@Output() rowCollapse = new EventEmitter<T>();
```

### TableColumn<T> Interface

```typescript
interface TableColumn<T = any> {
  key: string;                    // Property name
  label: string;                  // Header text
  sortable: boolean;              // Server-side sort
  clientSideSort?: boolean;       // Client-side sort
  filterable: boolean;            // Show filter input
  filterType?: 'text' | 'number' | 'select' | 'number-range';
  filterOptions?: {label: string; value: any}[];
  rangeConfig?: {
    min: number;
    max: number;
    step?: number;
    marks?: {[key: number]: string};
  };
  hideable: boolean;              // Can hide via column manager
  width?: string;                 // CSS width
  visible?: boolean;              // Currently visible
  order?: number;                 // Display order
  dependencies?: string[];        // Must show these if visible
  formatter?: (value: any, row: T) => string | number;
  align?: 'left' | 'center' | 'right';
}
```

### Data Source Pattern

```typescript
interface TableDataSource<T> {
  fetch(params: TableQueryParams): Observable<TableResponse<T>>;
}

interface TableQueryParams {
  page: number;         // 1-indexed
  size: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: {[key: string]: any};
}

interface TableResponse<T> {
  results: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
```

### Two Operating Modes

**Client-Side Mode**:
- Parent provides `data` input with all records
- Component handles pagination/sorting/filtering in memory
- Emits `queryParamsChange` for URL updates
- Use case: Pre-fetched datasets, picker tables

**Server-Side Mode**:
- Parent provides `dataSource` implementation
- Component calls `dataSource.fetch()` on param changes
- Backend handles pagination/sorting/filtering
- Use case: Large datasets, search results

### Filtering Types

**Text Filter**:
```html
<input type="text"
  [value]="filters[column.key]"
  (input)="onFilterChange(column.key, $event.target.value)"/>
```

**Number Filter**:
```html
<p-inputNumber
  [(ngModel)]="filters[column.key]"
  (ngModelChange)="onFilterChange(column.key, $event)"/>
```

**Select Filter**:
```html
<p-dropdown
  [(ngModel)]="filters[column.key]"
  (ngModelChange)="onFilterChange(column.key, $event)"
  [options]="column.filterOptions"/>
```

**Range Filter**:
```html
<div class="range-filter">
  <p-inputNumber placeholder="Min" [(ngModel)]="filters[column.key+'Min']"/>
  <span>-</span>
  <p-inputNumber placeholder="Max" [(ngModel)]="filters[column.key+'Max']"/>
</div>
```

**Debouncing**: 400ms delay to avoid excessive requests

### Row Expansion

```typescript
// Enable expansion
expandable = true;

// Expansion state tracking
expandedRowSet = new Set<any>();
expandedRowsMap: {[key: string]: boolean} = {};

// Expansion template (content projection)
<ng-template #expansionTemplate let-row="row">
  <div>Expanded content for: {{row.id}}</div>
</ng-template>
```

**Methods**:
- `toggleRowExpansion(row: T)`
- `expandAllRows()`
- `collapseAllRows()`

### Column Management Integration

```typescript
// Show column manager button
showColumnManagement = true;

// Column manager component
<app-column-manager
  [(visible)]="columnManagerVisible"
  [columns]="columns"
  (columnsChange)="onColumnsChange()">
</app-column-manager>
```

### State Persistence

**Saved to localStorage**:
```typescript
interface TablePreferences {
  columnOrder: string[];      // Ordered keys
  visibleColumns: string[];   // Visible keys
  pageSize: number;
  lastUpdated: number;
}
```

**Key**: `table_prefs_${tableId}`

**Methods**:
- `loadPreferences()` - On init
- `savePreferences()` - After changes
- `resetColumns()` - Restore defaults

### Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

**Manual triggers**:
```typescript
this.cdr.markForCheck();    // Mark for check
this.cdr.detectChanges();   // Immediate detect
```

---

## 2. COLUMNMANAGERCOMPONENT

### Overview

**Location**: `shared/components/column-manager/`
**Purpose**: Sidebar for managing column visibility and order
**UI**: PrimeNG PickList with drag-drop

### Features

- **Drag-Drop Reordering**: Move columns within visible list
- **Show/Hide**: Move between hidden ↔ visible lists
- **Required Columns**: Cannot hide columns with `hideable: false`
- **Dependencies**: Auto-show dependent columns
- **Search**: Filter columns by name
- **Statistics**: Show total/visible/hidden counts

### Inputs & Outputs

```typescript
@Input() visible: boolean = false;    // Sidebar visibility
@Input() columns: TableColumn[];      // Column definitions

@Output() visibleChange = new EventEmitter<boolean>();
@Output() columnsChange = new EventEmitter<void>();
```

### State

```typescript
sourceColumns: ColumnItem[] = [];    // Hidden columns
targetColumns: ColumnItem[] = [];    // Visible columns
searchText: string = '';

interface ColumnItem {
  key: string;
  title: string;
  description: string;    // "Sortable, Filterable, Required"
  disabled: boolean;      // Can't hide required columns
}
```

### Actions

**Apply**: Update column visibility/order, emit `columnsChange`, close sidebar
**Reset**: Restore default visibility, re-initialize lists
**Cancel**: Close without saving

---

## 3. CHART COMPONENTS ARCHITECTURE

### Composition Pattern

```
BaseChartComponent (Plotly.js container)
  ↓ (uses)
ChartDataSource (abstract transformer)
  ↓ (implemented by)
[ManufacturerChartDataSource, ModelsChartDataSource, YearChartDataSource, BodyClassChartDataSource]
  ↓ (wrapped by)
[ManufacturerChartComponent, ModelsChartComponent, YearChartComponent, BodyClassChartComponent]
```

### BaseChartComponent

**Location**: `shared/components/base-chart/`
**Purpose**: Reusable Plotly.js chart container

**Inputs**:
```typescript
@Input() dataSource!: ChartDataSource;
@Input() statistics: VehicleStatistics | null = null;
@Input() highlights: HighlightFilters = {};
@Input() selectedValue: string | null = null;
```

**Output**:
```typescript
@Output() chartClick = new EventEmitter<{
  value: string;
  isHighlightMode: boolean;
}>();
```

**Features**:
- **Highlight Mode**: Hold 'h' key to enable highlight mode
- **Resize Handling**: Window resize → `Plotly.Plots.resize()`
- **Pop-Out Support**: Extra resize with delay for layout
- **Click Routing**: Forward clicks to parent component

**Highlight Mode**:
```typescript
@HostListener('document:keydown.h')
onHighlightKeyDown(): void {
  this.isHighlightModeActive = true;
}

@HostListener('document:keyup.h')
onHighlightKeyUp(): void {
  this.isHighlightModeActive = false;
}
```

### ChartDataSource Abstract Class

```typescript
abstract class ChartDataSource {
  abstract transform(
    statistics: VehicleStatistics | null,
    highlights: HighlightFilters,
    selectedValue: string | null,
    containerWidth: number
  ): ChartData | null;

  abstract getTitle(): string;
  abstract handleClick(event: any): string | null;
}

interface ChartData {
  traces: Plotly.Data[];
  layout: Partial<Plotly.Layout>;
  clickData?: any;
}
```

**Benefits**:
- Data transformation abstraction
- Testable in isolation
- Type-safe data flow
- Reusable across chart types

### Concrete Chart Components

All follow same pattern:

```typescript
@Component({
  selector: 'app-manufacturer-chart',  // or models, year, bodyclass
  template: `
    <app-base-chart
      [dataSource]="dataSource"
      [statistics]="statistics"
      [highlights]="highlights"
      [selectedValue]="selectedValue"
      (chartClick)="onChartClick($event)">
    </app-base-chart>
  `
})
export class ManufacturerChartComponent {
  dataSource = new ManufacturerChartDataSource();
  statistics: VehicleStatistics | null = null;
  highlights: HighlightFilters = {};
  selectedValue: string | null = null;

  constructor(
    private stateService: VehicleResourceManagementService,
    private urlParamService: UrlParamService,
    private popOutContext: PopOutContextService
  ) {}

  ngOnInit(): void {
    // Subscribe to statistics$, highlights$
    this.stateService.statistics$.subscribe(stats => {
      this.statistics = stats;
    });

    this.stateService.highlights$.subscribe(highlights => {
      this.highlights = highlights;
    });
  }

  onChartClick(event: {value: string, isHighlightMode: boolean}): void {
    if (event.isHighlightMode) {
      // Set highlight parameter
      this.urlParamService.setHighlightParam('manufacturer', event.value);
    } else {
      if (this.popOutContext.isInPopOut()) {
        // Send to main window
        this.popOutContext.sendMessage({
          type: 'set-manufacturer-filter',
          payload: {manufacturer: event.value}
        });
      } else {
        // Update directly
        this.stateService.updateFilters({manufacturer: event.value});
      }
    }
  }
}
```

### Chart Types

#### ManufacturerChartComponent

**Data**: `statistics.byManufacturer`
**Format**: Legacy `{name: count}` or Segmented `{name: {total, highlighted}}`
**Chart Type**: Horizontal bar chart (top 20)
**Click**: Set `manufacturer` filter or highlight

#### ModelsChartComponent

**Data**: `statistics.modelsByManufacturer`
**Filters**: By selected manufacturer
**Chart Type**: Bar chart (top 20 models)
**Click**: Set `modelCombos` filter or highlight

#### YearChartComponent

**Data**: `statistics.byYearRange`
**Chart Type**: Bar chart with linear x-axis
**Ticks**: Every 5 years
**Click**: Single year → both yearMin/Max, Box select → range

#### BodyClassChartComponent

**Data**: `statistics.byBodyClass`
**Chart Type**: Bar chart (top 15)
**Click**: Set `bodyClass` filter or highlight

### PlotlyHistogramComponent (Legacy)

**Location**: `shared/components/plotly-histogram/`
**Size**: 970 lines
**Purpose**: Combined 4-chart dashboard (older pattern)

**Key Differences**:
- Does NOT use composition pattern
- Direct Plotly.js calls
- All 4 charts in one component
- Highlight mode support
- Pop-out aware

**Note**: Newer charts use BaseChartComponent + DataSource pattern. This is kept for backward compatibility.

---

## 4. DATA SOURCE IMPLEMENTATIONS

### BasePickerDataSource<T>

**Location**: `shared/services/base-picker-data-source.ts`
**Purpose**: Generic picker table data source

**Features**:
- **Client-side pagination**: Fetch all once, paginate in memory
- **Server-side pagination**: Request each page
- **Dynamic API calls**: Call any ApiService method
- **Direct HTTP**: Make custom HTTP requests
- **Caching**: Cache full dataset with TTL
- **Parameter mapping**: Transform query params
- **Response transformation**: Normalize API responses

**Modes**:

**Mode A: ApiService Method**
```typescript
config.api.method = 'getAllVins';
// Calls: apiService.getAllVins(...)
```

**Mode B: Direct HTTP**
```typescript
config.api.http = {
  method: 'GET',
  endpoint: '/engines',
  headers: {'X-API-Key': 'secret'}
};
```

**Caching**:
```typescript
config.caching = {
  enabled: true,
  ttl: 5 * 60 * 1000  // 5 minutes
};
```

**Client-Side Flow**:
```
1. Check cache validity
2. If valid: filter/sort/paginate in memory
3. If invalid: fetch all from API
4. Cache entire dataset
5. Return requested page
```

**Server-Side Flow**:
```
1. Send page request to API
2. Return response (already paginated)
```

### Chart Data Sources

Each chart has dedicated data source:
- `ManufacturerChartDataSource`
- `ModelsChartDataSource`
- `YearChartDataSource`
- `BodyClassChartDataSource`

**Common Pattern**:
```typescript
transform(
  statistics: VehicleStatistics | null,
  highlights: HighlightFilters,
  selectedValue: string | null,
  containerWidth: number
): ChartData | null {
  if (!statistics) return null;

  // Extract data from statistics
  const data = this.extractData(statistics);

  // Apply highlights (segmented bars)
  const traces = this.createTraces(data, highlights);

  // Create layout (title, axes, colors)
  const layout = this.createLayout(containerWidth);

  return { traces, layout };
}
```

---

## 5. PICKER CONFIGURATION SYSTEM

### PickerConfig<T>

**Location**: `shared/models/picker-config.model.ts`
**Purpose**: Configuration-driven picker tables

```typescript
interface PickerConfig<T = any> {
  id: string;
  displayName: string;
  columns: PickerColumnConfig<T>[];
  api: PickerApiConfig<T>;
  row: PickerRowConfig<T>;
  selection: PickerSelectionConfig<T>;
  pagination: PickerPaginationConfig;
  filtering?: PickerFilterConfig<T>;
  sorting?: PickerSortingConfig<T>;
  caching?: PickerCachingConfig;
}
```

### Key Sub-Interfaces

**PickerColumnConfig<T>** (extends TableColumn<T>):
```typescript
interface PickerColumnConfig<T> {
  key: string;
  valuePath?: string | string[] | ((row: any) => any);
  // Supports: 'vin', 'registration.state', ['vehicle', 'year']
  // ...other TableColumn properties
}
```

**PickerRowConfig<T>**:
```typescript
interface PickerRowConfig<T> {
  keyGenerator: (row: T) => string;
  keyParser: (key: string) => Partial<T>;
}
```

**PickerSelectionConfig<T>**:
```typescript
interface PickerSelectionConfig<T> {
  urlParam: string;
  serializer: (selections: T[]) => string;
  deserializer: (urlValue: string) => T[];
  keyGenerator?: (item: T) => string;
  keyParser?: (key: string) => Partial<T>;
}
```

### Examples

**Simple VIN Picker**:
```typescript
{
  id: 'vin-picker',
  row: {
    keyGenerator: (row) => row.vin,
    keyParser: (key) => ({vin: key})
  },
  selection: {
    urlParam: 'selectedVins',
    serializer: (items) => items.map(i => i.vin).join(','),
    deserializer: (url) => url.split(',').map(vin => ({vin}))
  }
}
```

**Composite Manufacturer-Model Picker**:
```typescript
{
  id: 'manufacturer-model-picker',
  row: {
    keyGenerator: (row) => `${row.manufacturer}|${row.model}`,
    keyParser: (key) => {
      const [m, mo] = key.split('|');
      return {manufacturer: m, model: mo};
    }
  },
  selection: {
    urlParam: 'modelCombos',
    serializer: (items) =>
      items.map(i => `${i.manufacturer}:${i.model}`).join(','),
    deserializer: (url) => url.split(',').map(pair => {
      const [m, mo] = pair.split(':');
      return {manufacturer: m, model: mo};
    })
  }
}
```

---

## 6. OBSERVABLE PATTERNS

### Server-Side Table Flow

```
User changes page/sort/filter
  ↓
onTableQueryChange(params)
  ↓
tableQueryParams updated
  ↓
fetchData() called
  ↓
dataSource.fetch(params)
  ↓
HTTP request
  ↓
Response received
  ↓
tableData = response.results
  ↓
cdr.markForCheck()
  ↓
View updates
```

### Chart Rendering Flow

```
BaseChartComponent input changes
  ↓
ngOnChanges()
  ↓
renderChart()
  ↓
dataSource.transform(...)
  ↓
chartData = {traces, layout}
  ↓
Plotly.react(el, traces, layout, config)
  ↓
Chart rendered
  ↓
Click handlers attached
```

### Highlight Mode Flow

```
User presses 'h' key
  ↓
isHighlightModeActive = true
  ↓
User clicks chart element
  ↓
chartClick.emit({value, isHighlightMode: true})
  ↓
Parent sets h_* URL param
  ↓
Components subscribed to highlights$
  ↓
Receive new highlights
  ↓
Charts re-render with highlights
```

---

## 7. POP-OUT WINDOW SUPPORT

### Detection

```typescript
if (this.popOutContext.isInPopOut()) {
  // In pop-out window
  this.popOutContext.sendMessage({...});
} else {
  // In main window
  this.stateService.updateFilters({...});
}
```

### Chart in Pop-Out

**Normal Mode**: Charts informational (no action)
**Pop-Out Mode**: Charts send messages to main window

```typescript
onChartClick(event): void {
  if (event.isHighlightMode) {
    // Always works (URL-based)
    this.urlParamService.setHighlightParam(...);
  } else if (this.popOutContext.isInPopOut()) {
    // Send to main window
    this.popOutContext.sendMessage({
      type: 'set-manufacturer-filter',
      payload: {manufacturer: event.value}
    });
  } else {
    // Update directly
    this.stateService.updateFilters(...);
  }
}
```

### Picker in Pop-Out

```typescript
onApply(): void {
  if (this.popOutContext.isInPopOut()) {
    this.popOutContext.sendMessage({
      type: 'PICKER_SELECTION_CHANGE',
      payload: {configId, urlParam, urlValue}
    });
  } else {
    this.urlParamService.updateParam(urlParam, urlValue);
  }
}
```

---

## 8. SUMMARY MATRIX

| Component | Generic | Inputs | Outputs | State | Key Feature |
|-----------|---------|--------|---------|-------|-------------|
| BaseDataTable | ✅ `<T>` | data/dataSource, columns | queryParamsChange | localStorage + URL | Server/client mode |
| ColumnManager | ❌ | columns, visible | columnsChange | localStorage | Drag-drop |
| BaseChart | ❌ | dataSource, statistics | chartClick | URL | Composition |
| ManufacturerChart | ❌ | (via BaseChart) | (via BaseChart) | State → URL | Top 20 bars |
| YearChart | ❌ | (via BaseChart) | (via BaseChart) | State → URL | Range select |
| BodyClassChart | ❌ | (via BaseChart) | (via BaseChart) | State → URL | Multi-select |
| PlotlyHistogram | ❌ | (subscriptions) | (direct) | State | Legacy (970 lines) |
| BasePicker | ✅ `<T>` | configId | selectionChange | URL hydration | Config-driven |

---

## 9. DESIGN PATTERNS

1. **Composition Over Inheritance** - BaseChart + DataSource
2. **Configuration-Driven** - PickerConfig specifies behavior
3. **Observable/Reactive** - RxJS throughout
4. **OnPush Change Detection** - Performance optimization
5. **Generic Type Safety** - `BaseDataTableComponent<T>`
6. **URL-First** - URL as source of truth
7. **Pop-Out Awareness** - `isInPopOut()` conditional behavior

---

## 10. IMPLEMENTATION CHECKLIST

When creating new visualization component:

- [ ] Define data type `T` (if generic)
- [ ] Create `TableColumn<T>` or `ChartDataSource`
- [ ] Implement data transformation logic
- [ ] Add sorting/filtering support
- [ ] Handle expandable rows (if table)
- [ ] Integrate column management (if table)
- [ ] Implement state persistence
- [ ] Add OnPush change detection
- [ ] Handle pop-out mode
- [ ] Add highlight mode (if chart)
- [ ] Write unit tests
- [ ] Document usage examples

---

**End of Specification**

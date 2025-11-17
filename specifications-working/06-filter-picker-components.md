# FILTER & PICKER COMPONENTS SPECIFICATION
## QueryControlComponent, BasePicker, and Specialized Pickers
### Branch: experiment/resource-management-service

**Status**: Working Draft
**Date**: 2025-11-15

---

## OVERVIEW

The application uses two primary patterns for user input:
1. **Query Control**: Dialog-based filter creation (manufacturer, model, year, body class, data source)
2. **Pickers**: Table-based selection interfaces (manufacturer-model combos, VINs)

Both integrate with the URL-first state management system.

---

## 1. QUERYCONTROLCOMPONENT

### Location
`frontend/src/app/features/filters/query-control/`

### Purpose
Central filter management panel with dialog-based filter creation

### Features

**Filter Types Supported**:
- Manufacturer (multiselect with server-side search)
- Model (multiselect with server-side search)
- Year (range slider with min/max)
- Body Class (multiselect with client-side search)
- Data Source (multiselect with client-side search)

**UI Components**:
- Filter type dropdown
- Add Filter button
- Active filter chips display
- Clear All button
- Highlight controls

### Outputs

```typescript
@Output() filterAdd = new EventEmitter<QueryFilter>();
@Output() filterRemove = new EventEmitter<{
  field: string;
  updates: Partial<SearchFilters>;
}>();
@Output() highlightRemove = new EventEmitter<string>();
@Output() clearHighlights = new EventEmitter<void>();
```

### Filter Dialogs

Each filter type opens a dedicated dialog:

**Manufacturer Dialog**:
- PrimeNG MultiSelect
- Server-side search (ApiService.getDistinctManufacturers)
- Comma-separated value for multiple selections
- Auto-focus search input

**Model Dialog**:
- PrimeNG MultiSelect
- Server-side search (ApiService.getDistinctModels)
- Dependent on manufacturer selection

**Year Dialog**:
- PrimeNG Slider (range mode)
- Min/max from ApiService.getYearRange()
- Default range: [yearMin, yearMax]

**Body Class Dialog**:
- PrimeNG MultiSelect
- Client-side search
- Options from ApiService.getDistinctBodyClasses()

**Data Source Dialog**:
- PrimeNG MultiSelect
- Client-side search
- Options from ApiService.getDistinctDataSources()

### Filter Application Flow

```
User selects filter type
  ↓
User clicks "Add Filter"
  ↓
Dialog opens with filter-specific UI
  ↓
User makes selection
  ↓
User clicks Apply
  ↓
filterAdd.emit({type, field, value/values})
  ↓
Parent (Discover) calls stateService.updateFilters()
  ↓
URL updates
  ↓
Data refetches
```

### Active Filters Display

```html
<div class="active-filters">
  <div *ngFor="let filter of activeFilters" class="filter-chip">
    <span class="filter-label">{{filter.label}}: {{filter.displayValue}}</span>
    <button (click)="onRemoveFilter(filter)">
      <i class="pi pi-times"></i>
    </button>
  </div>
</div>
```

**Filter Chip Format**:
- `Manufacturer: Ford, Chevrolet`
- `Year: 2015 - 2020`
- `Body Class: Sedan, SUV`

### Highlight Mode

```typescript
highlightMode: boolean = false;  // Toggle for highlight vs filter mode

// When highlightMode = true:
// - Sets h_* URL parameters instead of base filters
// - Doesn't trigger data refetch
// - Only updates chart visualizations
```

---

## 2. BASEPICKERCOMPONENT

### Location
`frontend/src/app/shared/components/base-picker/`

### Purpose
Configuration-driven selection table for complex objects

### Generic Type

```typescript
export class BasePickerComponent<T> implements OnInit, OnDestroy
```

### Inputs

```typescript
@Input() configId!: string;              // Required: Config ID to load
@Input() config?: PickerConfig<T>;       // Optional: Direct config
@Input() externalFilters?: SearchFilters;// Optional: Auto-select matching rows
```

### Outputs

```typescript
@Output() selectionChange = new EventEmitter<PickerSelectionEvent<T>>();

interface PickerSelectionEvent<T> {
  pickerId: string;
  selections: T[];
  selectedKeys: string[];
}
```

### Architecture

```
PickerConfigService
  ↓ (loads config by ID)
BasePickerComponent
  ├─ Creates BasePickerDataSource
  ├─ Configures BaseDataTableComponent
  ├─ Manages selection state (Set<string>)
  ├─ Hydrates from URL
  └─ Emits selection changes
```

### Selection State

```typescript
selectedRows = new Set<string>();       // Efficient O(1) lookups
selectedItemsDisplay: string[] = [];     // For UI display
pendingHydration: string[] = [];         // Keys from URL (before data loads)
dataLoaded: boolean = false;             // Track data arrival
```

### URL Hydration Flow

```
URL: ?modelCombos=Ford:F-150,Chevrolet:Silverado
  ↓
subscribeToUrlState() detects change
  ↓
deserializer() → [{manufacturer: 'Ford', model: 'F-150'}, ...]
  ↓
keyGenerator() → ['Ford|F-150', 'Chevrolet|Silverado']
  ↓
pendingHydration = keys
  ↓
Data loads (onDataLoaded)
  ↓
hydrateSelections() adds keys to selectedRows
  ↓
Checkboxes render as checked
```

### Selection Change Flow

```
User checks row checkbox
  ↓
onRowSelectionChange(row, checked)
  ↓
selectedRows.add(key) or .delete(key)
  ↓
updateSelectedItemsDisplay() (cache labels)
  ↓
cdr.markForCheck()
  ↓
User clicks Apply
  ↓
onApply()
  ↓
serializer() → "Ford:F-150,Chevrolet:Silverado"
  ↓
if pop-out: sendMessage('PICKER_SELECTION_CHANGE')
else: urlParamService.updateParam()
  ↓
URL updated
  ↓
Parent receives URL change
  ↓
Parent calls updateFilters()
```

### External Filters (Auto-Selection)

```typescript
@Input() externalFilters?: SearchFilters;

applyExternalFilters(): void {
  // Only works in client-side mode
  // Auto-select rows matching manufacturer/model from Query Control
  // URL selections take precedence
}
```

**Use Case**: User sets manufacturer="Ford" in Query Control → Picker auto-selects all Ford models

### Pop-Out Mode

```typescript
if (this.popOutContext.isInPopOut()) {
  // Apply sends message to main window
  this.popOutContext.sendMessage({
    type: 'PICKER_SELECTION_CHANGE',
    payload: {configId, urlParam, urlValue}
  });
} else {
  // Apply updates URL directly
  this.urlParamService.updateParam(urlParam, urlValue);
}
```

---

## 3. DUALCHECKBOXPICKERCOMPONENT

### Location
`frontend/src/app/shared/components/dual-checkbox-picker/`

### Purpose
Hierarchical manufacturer → models picker with tri-state checkboxes

### Features

**Tri-State Parent Checkboxes** (Manufacturers):
- ☐ Unchecked: No models selected
- ☑ Checked: All models selected
- ⊡ Indeterminate: Some models selected

**Binary Child Checkboxes** (Models):
- ☐ Unchecked
- ☑ Checked

**Bulk Selection**:
- Click manufacturer checkbox → Select/deselect all models

### Data Structure

```typescript
interface ManufacturerModelRow {
  manufacturer: string;
  model: string;
  count: number;
  key: string;  // "manufacturer|model"
}

// Grouped display
interface ManufacturerGroup {
  manufacturer: string;
  totalCount: number;
  models: {model: string; count: number}[];
  expanded: boolean;
}
```

### Selection State

```typescript
selectedRows = new Set<string>();       // Set of "manufacturer|model" keys
selectedItems: SelectedItem[] = [];      // For display
```

### Parent Checkbox Logic

```typescript
getManufacturerCheckState(manufacturer: string): {
  checked: boolean;
  indeterminate: boolean;
} {
  const models = this.getModelsForManufacturer(manufacturer);
  const selectedCount = models.filter(m =>
    this.selectedRows.has(`${manufacturer}|${m.model}`)
  ).length;

  if (selectedCount === 0) {
    return {checked: false, indeterminate: false};
  } else if (selectedCount === models.length) {
    return {checked: true, indeterminate: false};
  } else {
    return {checked: false, indeterminate: true};
  }
}
```

### Bulk Selection

```typescript
onManufacturerCheckboxChange(manufacturer: string, checked: boolean): void {
  const models = this.getModelsForManufacturer(manufacturer);

  if (checked) {
    // Select all models
    models.forEach(m => {
      this.selectedRows.add(`${manufacturer}|${m.model}`);
    });
  } else {
    // Deselect all models
    models.forEach(m => {
      this.selectedRows.delete(`${manufacturer}|${m.model}`);
    });
  }

  this.updateSelectedItemsDisplay();
}
```

---

## 4. BASEDUALPICKERCOMPONENT

### Location
`frontend/src/app/shared/components/base-dual-picker/`

### Purpose
Experimental configuration-driven parent-child picker using BaseDataTableComponent

### Key Differences from DualCheckboxPicker

- ✅ Uses `BaseDataTableComponent` internally
- ✅ Gets sorting/filtering/column management automatically
- ✅ Configuration-driven (PickerConfig)
- ✅ Transforms flat data into grouped rows

### Configuration

```typescript
// base-dual-picker.config.ts
export const BASE_DUAL_PICKER_CONFIG: PickerConfig<ManufacturerModelRow> = {
  id: 'manufacturer-model-base-dual',
  displayName: 'Make/Model Picker (Experimental)',
  columns: [
    {key: 'manufacturer', label: 'Manufacturer', sortable: true},
    {key: 'model', label: 'Model', sortable: true},
    {key: 'count', label: 'Count', sortable: true}
  ],
  api: {
    method: 'getManufacturerModelCombinations',
    responseTransformer: (response) => ({
      results: flattenManufacturerModelData(response.data),
      total: countTotalRows(response.data),
      ...
    })
  },
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
  },
  pagination: {
    mode: 'client',
    defaultPageSize: 20
  }
};
```

**Pattern**: Shows how proper configuration eliminates custom picker code

---

## 5. PICKER CONFIGURATION EXAMPLES

### Simple VIN Picker

```typescript
{
  id: 'vin-picker',
  displayName: 'VIN Picker',
  columns: [
    {key: 'vin', label: 'VIN', sortable: true, filterable: true},
    {key: 'manufacturer', label: 'Manufacturer'},
    {key: 'model', label: 'Model'},
    {key: 'year', label: 'Year', sortable: true}
  ],
  api: {
    method: 'getAllVins',
    responseTransformer: (response) => ({
      results: response.data,
      total: response.total,
      page: response.page,
      size: response.size,
      totalPages: response.totalPages
    })
  },
  row: {
    keyGenerator: (row) => row.vin,
    keyParser: (key) => ({vin: key})
  },
  selection: {
    urlParam: 'selectedVins',
    serializer: (items) => items.map(i => i.vin).join(','),
    deserializer: (url) => url.split(',').map(vin => ({vin}))
  },
  pagination: {
    mode: 'server',
    defaultPageSize: 20
  }
}
```

### Complex Manufacturer-Model Picker

```typescript
{
  id: 'manufacturer-model',
  displayName: 'Manufacturer-Model Picker',
  columns: [
    {key: 'manufacturer', label: 'Manufacturer', sortable: true},
    {key: 'model', label: 'Model', sortable: true},
    {key: 'count', label: 'Count', sortable: true, align: 'right'}
  ],
  api: {
    method: 'getManufacturerModelCombinations',
    paramMapper: (params) => ({
      page: params.page,
      size: params.size,
      search: params.filters?.search
    }),
    responseTransformer: (response) => ({
      results: flattenData(response.data),
      total: response.total,
      page: response.page,
      size: response.size,
      totalPages: response.totalPages
    })
  },
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
    }),
    keyGenerator: (item) => `${item.manufacturer}|${item.model}`,
    keyParser: (key) => {
      const [m, mo] = key.split('|');
      return {manufacturer: m, model: mo};
    }
  },
  pagination: {
    mode: 'client',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  },
  caching: {
    enabled: true,
    ttl: 5 * 60 * 1000  // 5 minutes
  }
}
```

---

## 6. INTEGRATION PATTERNS

### Query Control + Picker Integration

**Scenario**: User sets manufacturer="Ford" in Query Control

```
QueryControlComponent
  ↓ (filterAdd event)
DiscoverComponent
  ↓ (updateFilters)
stateService.updateFilters({manufacturer: 'Ford'})
  ↓
URL: /discover?manufacturer=Ford
  ↓
BasePicker receives externalFilters={manufacturer: 'Ford'}
  ↓
applyExternalFilters() auto-selects Ford models
  ↓
User sees Ford models pre-selected in picker
```

### Picker + Results Integration

```
User selects Ford:F-150 in picker
  ↓
Apply clicked
  ↓
URL: ?modelCombos=Ford:F-150
  ↓
stateService.filters$ emits {modelCombos: [{...}]}
  ↓
ResultsTableComponent receives new filters
  ↓
Data refetched with modelCombos filter
  ↓
Only F-150 vehicles displayed
```

---

## 7. BEST PRACTICES

### Creating New Pickers

1. **Define Data Type** `T` for rows
2. **Create PickerConfig** with all required fields
3. **Implement keyGenerator/keyParser** for unique row identification
4. **Implement serializer/deserializer** for URL persistence
5. **Choose pagination mode** (client vs server)
6. **Configure caching** if appropriate
7. **Register config** in PickerConfigService
8. **Use in template**: `<app-base-picker [configId]="'my-picker'"></app-base-picker>`

### Filter Dialog Best Practices

1. **Auto-focus** search input on dialog open
2. **Debounce** server-side search (300ms)
3. **Show loading** state during search
4. **Clear button** to reset filter
5. **Keyboard shortcuts** (Enter to apply, Esc to cancel)
6. **Validation** before allowing apply

---

## SUMMARY

The filter and picker system provides:

- ✅ **Dialog-based filtering** via QueryControlComponent
- ✅ **Table-based selection** via BasePicker
- ✅ **Hierarchical selection** via DualCheckboxPicker
- ✅ **Configuration-driven** pickers (no custom code needed)
- ✅ **URL-first** state management
- ✅ **Pop-out window** support
- ✅ **External filter** integration
- ✅ **Type-safe** selection handling

**End of Specification**

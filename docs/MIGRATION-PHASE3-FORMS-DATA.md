# Migration Phase 3: Forms & Data Components

**Status:** IN PROGRESS
**Started:** 2025-11-06
**Target Components:** nz-input, nz-input-number, nz-checkbox, nz-select, nz-table, nz-spin, nz-drawer, nz-transfer

---

## Overview

Phase 3 focuses on migrating form inputs, data tables, and loading indicators from NG-ZORRO to PrimeNG. These components are core to the application's data entry and display functionality.

**Total Components to Migrate:** 55 occurrences across 5 files

---

## Component Inventory

### 1. nz-input / nz-input-group → p-inputText / p-inputGroup
**Priority:** HIGH (22 occurrences - most prevalent)

| File | Count | Context |
|------|-------|---------|
| query-control.component.html | 15 | Search filters, manufacturer/model inputs |
| base-data-table.component.html | 7 | Column filter inputs |
| **TOTAL** | **22** | |

**Migration Pattern:**
```html
<!-- Before: NG-ZORRO -->
<nz-input-group [nzPrefix]="prefixIconSearch">
  <input type="text" nz-input placeholder="Search manufacturers..." [(ngModel)]="searchText" />
</nz-input-group>
<ng-template #prefixIconSearch>
  <i class="pi pi-search"></i>
</ng-template>

<!-- After: PrimeNG -->
<span class="p-input-icon-left">
  <i class="pi pi-search"></i>
  <input type="text" pInputText placeholder="Search manufacturers..." [(ngModel)]="searchText" />
</span>
```

### 2. nz-spin → p-progressSpinner
**Priority:** HIGH (10 occurrences - loading states)

| File | Count | Context |
|------|-------|---------|
| query-control.component.html | 8 | Filter loading states |
| results-table.component.html | 2 | Table data loading |
| **TOTAL** | **10** | |

**Migration Pattern:**
```html
<!-- Before: NG-ZORRO -->
<nz-spin [nzSpinning]="isLoading" nzSize="small">
  <!-- Content -->
</nz-spin>

<!-- After: PrimeNG -->
<p-progressSpinner *ngIf="isLoading" styleClass="p-spinner-sm"></p-progressSpinner>
<div *ngIf="!isLoading">
  <!-- Content -->
</div>
```

### 3. nz-input-number → p-inputNumber
**Priority:** MEDIUM (6 occurrences - numeric inputs)

| File | Count | Context |
|------|-------|---------|
| base-data-table.component.html | 6 | Page size, numeric filters |
| **TOTAL** | **6** | |

**Migration Pattern:**
```html
<!-- Before: NG-ZORRO -->
<nz-input-number
  [(ngModel)]="pageSize"
  [nzMin]="10"
  [nzMax]="100"
  [nzStep]="10"
></nz-input-number>

<!-- After: PrimeNG -->
<p-inputNumber
  [(ngModel)]="pageSize"
  [min]="10"
  [max]="100"
  [step]="10"
  [showButtons]="true"
></p-inputNumber>
```

### 4. nz-checkbox → p-checkbox
**Priority:** MEDIUM (5 occurrences - selection controls)

| File | Count | Context |
|------|-------|---------|
| query-control.component.html | 4 | Filter checkboxes |
| base-picker.component.html | 1 | Row selection |
| **TOTAL** | **5** | |

**Migration Pattern:**
```html
<!-- Before: NG-ZORRO -->
<label nz-checkbox [(ngModel)]="isSelected">
  Label text
</label>

<!-- After: PrimeNG -->
<p-checkbox
  [(ngModel)]="isSelected"
  [binary]="true"
  label="Label text"
></p-checkbox>
```

### 5. nz-table → p-table
**Priority:** COMPLEX (4 occurrences - data tables)

| File | Count | Context |
|------|-------|---------|
| base-data-table.component.html | 2 | Main data table, pagination |
| results-table.component.html | 2 | Results display |
| **TOTAL** | **4** | |

**Migration Pattern:**
```html
<!-- Before: NG-ZORRO -->
<nz-table
  [nzData]="dataSource"
  [nzPageSize]="pageSize"
  [nzFrontPagination]="false"
  [nzLoading]="isLoading"
>
  <thead>
    <tr>
      <th *ngFor="let col of columns">{{ col.title }}</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let row of dataSource">
      <td *ngFor="let col of columns">{{ row[col.key] }}</td>
    </tr>
  </tbody>
</nz-table>

<!-- After: PrimeNG -->
<p-table
  [value]="dataSource"
  [rows]="pageSize"
  [lazy]="true"
  [loading]="isLoading"
  [totalRecords]="totalRecords"
  (onLazyLoad)="loadData($event)"
>
  <ng-template pTemplate="header">
    <tr>
      <th *ngFor="let col of columns">{{ col.title }}</th>
    </tr>
  </ng-template>
  <ng-template pTemplate="body" let-row>
    <tr>
      <td *ngFor="let col of columns">{{ row[col.key] }}</td>
    </tr>
  </ng-template>
</p-table>
```

**⚠️ COMPLEXITY NOTE:** p-table has different lazy loading API than nz-table. Will require changes to BaseDataTableComponent logic.

### 6. nz-select → p-dropdown
**Priority:** MEDIUM (4 occurrences - dropdowns)

| File | Count | Context |
|------|-------|---------|
| base-data-table.component.html | 2 | Filter dropdowns |
| query-control.component.html | 2 | Filter selectors |
| **TOTAL** | **4** | |

**Migration Pattern:**
```html
<!-- Before: NG-ZORRO -->
<nz-select
  [(ngModel)]="selectedValue"
  nzPlaceHolder="Select option"
>
  <nz-option *ngFor="let option of options" [nzValue]="option.value" [nzLabel]="option.label"></nz-option>
</nz-select>

<!-- After: PrimeNG -->
<p-dropdown
  [(ngModel)]="selectedValue"
  [options]="options"
  placeholder="Select option"
  optionLabel="label"
  optionValue="value"
></p-dropdown>
```

### 7. nz-drawer + nz-transfer → p-sidebar + p-pickList
**Priority:** COMPLEX (4 occurrences - column manager)

| File | Count | Context |
|------|-------|---------|
| column-manager.component.html | 4 | Column visibility manager (drawer + transfer) |
| **TOTAL** | **4** | |

**Migration Pattern:**
```html
<!-- Before: NG-ZORRO -->
<nz-drawer
  [nzVisible]="visible"
  [nzWidth]="700"
  nzTitle="Manage Columns"
  (nzOnClose)="onClose()"
>
  <nz-transfer
    [nzDataSource]="transferData"
    [nzTitles]="['Hidden', 'Visible']"
    (nzChange)="onChange($event)"
  ></nz-transfer>
</nz-drawer>

<!-- After: PrimeNG -->
<p-sidebar
  [(visible)]="visible"
  position="right"
  [style]="{width: '700px'}"
  (onHide)="onClose()"
>
  <ng-template pTemplate="header">
    <h3>Manage Columns</h3>
  </ng-template>
  <p-pickList
    [source]="hiddenColumns"
    [target]="visibleColumns"
    sourceHeader="Hidden Columns"
    targetHeader="Visible Columns"
    (onMoveToTarget)="onColumnsChanged($event)"
    (onMoveToSource)="onColumnsChanged($event)"
  >
    <ng-template let-column pTemplate="item">
      <div>{{ column.title }}</div>
    </ng-template>
  </p-pickList>
</p-sidebar>
```

**⚠️ COMPLEXITY NOTE:** nz-transfer and p-pickList have very different data models. Will require refactor of ColumnManagerComponent logic.

---

## Migration Priority & Strategy

### Phase 3A: Simple Form Controls (Steps 1-4)
**Target:** 43 occurrences | **Risk:** LOW | **Impact:** HIGH

1. **Step 1:** Migrate nz-input → p-inputText (22 occurrences)
   - Start with query-control.component.html (15)
   - Then base-data-table.component.html (7)
   - Test: All search/filter inputs work

2. **Step 2:** Migrate nz-spin → p-progressSpinner (10 occurrences)
   - query-control.component.html (8)
   - results-table.component.html (2)
   - Test: Loading states display correctly

3. **Step 3:** Migrate nz-input-number → p-inputNumber (6 occurrences)
   - base-data-table.component.html (6)
   - Test: Numeric inputs with min/max work

4. **Step 4:** Migrate nz-checkbox → p-checkbox (5 occurrences)
   - query-control.component.html (4)
   - base-picker.component.html (1)
   - Test: Checkbox selections persist

### Phase 3B: Dropdowns (Step 5)
**Target:** 4 occurrences | **Risk:** MEDIUM | **Impact:** MEDIUM

5. **Step 5:** Migrate nz-select → p-dropdown (4 occurrences)
   - base-data-table.component.html (2)
   - query-control.component.html (2)
   - **Challenge:** p-dropdown uses [options] array instead of nz-option children
   - **Solution:** Convert option templates to options array in component TS

### Phase 3C: Complex Components (Steps 6-7)
**Target:** 8 occurrences | **Risk:** HIGH | **Impact:** CRITICAL

6. **Step 6:** Migrate nz-table → p-table (4 occurrences)
   - **⚠️ HIGH COMPLEXITY** - Core table functionality
   - Start with results-table.component.html (simpler, no column reordering)
   - Then base-data-table.component.html (complex, has drag-drop columns)
   - **Challenge:** Different lazy loading API
   - **Solution:** Refactor BaseDataTableComponent to use (onLazyLoad) event

7. **Step 7:** Migrate nz-drawer + nz-transfer → p-sidebar + p-pickList (4 occurrences)
   - **⚠️ HIGH COMPLEXITY** - Different data model
   - column-manager.component.html
   - **Challenge:** nz-transfer uses single array with direction property, p-pickList uses source/target arrays
   - **Solution:** Refactor ColumnManagerComponent to maintain separate arrays

---

## PrimeNG Module Requirements

Add to [primeng.module.ts](../frontend/src/app/primeng.module.ts):

```typescript
// Forms
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';

// Data
import { TableModule } from 'primeng/table';
import { PickListModule } from 'primeng/picklist';

// Layout
import { SidebarModule } from 'primeng/sidebar';

// Feedback
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@NgModule({
  imports: [
    // ... existing modules
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    DropdownModule,
    TableModule,
    PickListModule,
    SidebarModule,
    ProgressSpinnerModule,
  ],
  exports: [
    // ... existing modules
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    DropdownModule,
    TableModule,
    PickListModule,
    SidebarModule,
    ProgressSpinnerModule,
  ]
})
```

Also add to [shared.module.ts](../frontend/src/app/shared/shared.module.ts) since BaseDataTableComponent and ColumnManagerComponent need these.

---

## Testing Strategy

### Unit Tests
- **Input Controls:** Verify two-way binding with [(ngModel)]
- **Dropdowns:** Verify option selection and change events
- **Checkboxes:** Verify binary mode and label display
- **Spinners:** Verify conditional display based on loading state
- **Tables:** Verify lazy loading, pagination, sorting
- **PickList:** Verify source/target array synchronization

### Integration Tests
- **Query Control:** All filters work (search, dropdowns, checkboxes, number inputs)
- **Base Data Table:** Sorting, filtering, pagination, column reordering
- **Column Manager:** Show/hide columns, transfer between lists
- **Results Table:** Data display, loading states, row expansion

### Visual Regression Tests
- Compare screenshots before/after migration
- Verify luna-pink theme applied correctly
- Verify spacing/alignment maintained

---

## Known Challenges

### 1. nz-table → p-table Lazy Loading
**Problem:** NG-ZORRO uses `[nzFrontPagination]="false"` with manual data loading. PrimeNG uses `(onLazyLoad)` event.

**Solution:**
```typescript
// Before (NG-ZORRO)
loadData() {
  this.isLoading = true;
  this.dataSource = [];
  this.api.getData(this.queryParams).subscribe(result => {
    this.dataSource = result.data;
    this.totalRecords = result.total;
    this.isLoading = false;
  });
}

// After (PrimeNG)
onLazyLoad(event: LazyLoadEvent) {
  this.isLoading = true;
  const queryParams = {
    page: (event.first / event.rows) + 1,
    size: event.rows,
    sortBy: event.sortField,
    sortOrder: event.sortOrder === 1 ? 'asc' : 'desc'
  };
  this.api.getData(queryParams).subscribe(result => {
    this.dataSource = result.data;
    this.totalRecords = result.total;
    this.isLoading = false;
  });
}
```

### 2. nz-select → p-dropdown Options Array
**Problem:** NG-ZORRO uses child `<nz-option>` elements. PrimeNG uses `[options]` array binding.

**Solution:**
```typescript
// Before (template)
<nz-select [(ngModel)]="selectedSize">
  <nz-option [nzValue]="10" nzLabel="10 per page"></nz-option>
  <nz-option [nzValue]="20" nzLabel="20 per page"></nz-option>
  <nz-option [nzValue]="50" nzLabel="50 per page"></nz-option>
</nz-select>

// After (component)
pageSizeOptions = [
  { label: '10 per page', value: 10 },
  { label: '20 per page', value: 20 },
  { label: '50 per page', value: 50 }
];

// After (template)
<p-dropdown
  [(ngModel)]="selectedSize"
  [options]="pageSizeOptions"
  optionLabel="label"
  optionValue="value"
></p-dropdown>
```

### 3. nz-transfer → p-pickList Data Model
**Problem:** NG-ZORRO transfer uses single array with `direction` property. PrimeNG pickList uses separate source/target arrays.

**Current (nz-transfer):**
```typescript
transferData = [
  { key: 'col1', title: 'Column 1', direction: 'left' },   // hidden
  { key: 'col2', title: 'Column 2', direction: 'right' },  // visible
];
```

**New (p-pickList):**
```typescript
hiddenColumns = [
  { key: 'col1', title: 'Column 1' }
];
visibleColumns = [
  { key: 'col2', title: 'Column 2' }
];
```

**Refactor Required:** ColumnManagerComponent initialization and change handling logic.

---

## Progress Tracking

### Phase 3A: Simple Form Controls
- [x] Step 1: nz-input → p-inputText (6 occurrences) ✅ COMPLETE
  - [x] query-control.component.html (5 inputs: string dialog + 4 search inputs)
  - [x] base-data-table.component.html (1 text filter input)
- [x] Step 2: nz-spin → p-progressSpinner (10 occurrences) ✅ COMPLETE
  - [x] query-control.component.html (4 loading wrappers: manufacturer, model, body class, data source)
  - [x] results-table.component.html (1 VIN instances loader)
- [ ] Step 3: nz-input-number → p-inputNumber (6 occurrences)
  - [ ] base-data-table.component.html (6)
- [ ] Step 4: nz-checkbox → p-checkbox (5 occurrences)
  - [ ] query-control.component.html (4)
  - [ ] base-picker.component.html (1)

### Phase 3B: Dropdowns
- [ ] Step 5: nz-select → p-dropdown (4 occurrences)
  - [ ] base-data-table.component.html (2)
  - [ ] query-control.component.html (2)

### Phase 3C: Complex Components
- [ ] Step 6: nz-table → p-table (4 occurrences)
  - [ ] results-table.component.html (2)
  - [ ] base-data-table.component.html (2)
- [ ] Step 7: nz-drawer + nz-transfer → p-sidebar + p-pickList (4 occurrences)
  - [ ] column-manager.component.html (4)

---

## Next Steps

1. Add required PrimeNG modules to primeng.module.ts and shared.module.ts
2. Start Phase 3A with nz-input migration (highest occurrence count)
3. Test each component thoroughly before moving to next
4. Create snapshot commits after each step for rollback safety
5. Update this document with actual patterns encountered during migration

---

**Last Updated:** 2025-11-06
**Document Version:** 1.0.0

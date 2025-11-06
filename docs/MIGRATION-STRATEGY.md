# NG-ZORRO to PrimeNG Migration Strategy

**Project:** AUTOS-PrimeNG
**Created:** 2025-11-06
**Status:** IN PROGRESS
**Angular Version:** 14.2.0
**Source UI:** NG-ZORRO v14.3.0
**Target UI:** PrimeNG v14.2.3

---

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Component Mapping](#component-mapping)
3. [Migration Phases](#migration-phases)
4. [Installation & Configuration](#installation--configuration)
5. [Migration Patterns](#migration-patterns)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Progress Tracking](#progress-tracking)

---

## Migration Overview

### Goals

1. **Replace NG-ZORRO with PrimeNG** while maintaining all functionality
2. **Preserve state management architecture** (URL-driven, RouteStateService)
3. **Maintain component composition patterns** (BaseDataTable, etc.)
4. **Zero regression** in user experience and features

### Approach

**Incremental Migration:**
- Both libraries will coexist during migration
- Migrate component-by-component, starting with simplest
- Test thoroughly before moving to next component
- No breaking changes to state management or data flow

### Success Criteria

- ✅ All NG-ZORRO components replaced with PrimeNG equivalents
- ✅ All features working identically (search, filters, VIN generation, etc.)
- ✅ Table customization preserved (column reorder, visibility, sort, pagination)
- ✅ Workshop grid layout functioning
- ✅ Panel pop-out feature working
- ✅ All unit tests passing
- ✅ No visual regressions
- ✅ ng-zorro-antd dependency removed from package.json

---

## Component Mapping

### Data Display Components

| NG-ZORRO | PrimeNG | Priority | Complexity | Notes |
|----------|---------|----------|------------|-------|
| `nz-table` | `p-table` | HIGH | Complex | Core component, many features |
| `nz-card` | `p-card` | MEDIUM | Simple | Layout component |
| `nz-collapse` | `p-accordion` | MEDIUM | Simple | Workshop panels |
| `nz-list` | `p-dataview` | LOW | Medium | Alternative display |
| `nz-descriptions` | `p-fieldset` | LOW | Simple | Detail views |

### Form Components

| NG-ZORRO | PrimeNG | Priority | Complexity | Notes |
|----------|---------|----------|------------|-------|
| `nz-form` | PrimeNG form setup | MEDIUM | Medium | Form structure |
| `nz-input` | `p-inputText` | MEDIUM | Simple | Text inputs |
| `nz-select` | `p-dropdown` | MEDIUM | Medium | Dropdowns/selects |
| `nz-checkbox` | `p-checkbox` | LOW | Simple | Checkboxes |
| `nz-radio` | `p-radioButton` | LOW | Simple | Radio buttons |
| `nz-date-picker` | `p-calendar` | LOW | Medium | Date selection |

### Navigation Components

| NG-ZORRO | PrimeNG | Priority | Complexity | Notes |
|----------|---------|----------|------------|-------|
| `nz-menu` | `p-menu` / `p-menubar` | MEDIUM | Medium | Navigation |
| `nz-breadcrumb` | `p-breadcrumb` | LOW | Simple | Breadcrumbs |
| `nz-tabs` | `p-tabView` | LOW | Simple | Tab navigation |

### Feedback Components

| NG-ZORRO | PrimeNG | Priority | Complexity | Notes |
|----------|---------|----------|------------|-------|
| `nz-modal` | `p-dialog` | HIGH | Medium | Dialogs/modals |
| `nz-message` | `p-toast` | MEDIUM | Simple | Notifications |
| `nz-spin` | `p-progressSpinner` | MEDIUM | Simple | Loading indicators |
| `nz-alert` | `p-message` | LOW | Simple | Alert messages |

### Other Components

| NG-ZORRO | PrimeNG | Priority | Complexity | Notes |
|----------|---------|----------|------------|-------|
| `nz-button` | `p-button` | HIGH | Simple | Buttons |
| `nz-icon` | PrimeIcons | HIGH | Simple | Icons (different approach) |
| `nz-pagination` | `p-paginator` | HIGH | Simple | Integrated in p-table |
| `nz-divider` | `p-divider` | LOW | Simple | Dividers |
| `nz-tooltip` | `pTooltip` | LOW | Simple | Tooltips |

---

## Migration Phases

### Phase 1: Setup & Foundation (Current)

**Status:** ✅ IN PROGRESS

**Tasks:**
- [x] Install PrimeNG 14.2.3 and primeicons
- [x] Configure angular.json with PrimeNG styles
- [x] Create migration strategy document
- [ ] Configure PrimeNG module imports
- [ ] Set up theme customization (if needed)
- [ ] Create migration pattern examples

**Deliverable:** PrimeNG installed and configured, ready for component migration

---

### Phase 2: Simple Components (Week 1)

**Status:** ⏸️ NOT STARTED

**Target Components:**
1. **Buttons** (`nz-button` → `p-button`)
   - Replace all button instances
   - Test button variants (primary, default, danger, etc.)

2. **Icons** (NG-ZORRO icons → PrimeIcons)
   - Map icon names to PrimeIcons equivalents
   - Update all icon usages

3. **Cards** (`nz-card` → `p-card`)
   - Migrate card layouts
   - Preserve styling

4. **Dividers** (`nz-divider` → `p-divider`)
   - Simple replacement

**Testing:**
- Visual regression testing
- Functionality verification
- Browser compatibility

**Deliverable:** All simple components migrated and tested

---

### Phase 3: Form Components (Week 2)

**Status:** ⏸️ NOT STARTED

**Target Components:**
1. **Form Structure** (`nz-form` → PrimeNG form setup)
   - Update form templates
   - Preserve validation logic

2. **Text Inputs** (`nz-input` → `p-inputText`)
   - Replace input fields
   - Test with FormControl binding

3. **Dropdowns** (`nz-select` → `p-dropdown`)
   - Replace select components
   - Test with options binding

4. **Checkboxes/Radios** (`nz-checkbox`, `nz-radio` → `p-checkbox`, `p-radioButton`)
   - Simple replacements

**Testing:**
- Form validation testing
- Data binding verification
- Reactive forms testing

**Deliverable:** All form components migrated, forms fully functional

---

### Phase 4: Tables (Week 3-4) - CRITICAL

**Status:** ⏸️ NOT STARTED

**Target Component:** `nz-table` → `p-table`

This is the MOST COMPLEX migration due to:
- Custom BaseDataTableComponent architecture
- Column reordering (CDK drag-drop)
- Column visibility management
- Client-side and server-side sorting
- Pagination with URL state sync
- Expandable rows (VIN instances)
- Column resizing
- Custom cell templates

**Approach:**
1. **Analyze BaseDataTableComponent** architecture
   - Current implementation uses ng-template slots
   - State management via TableStatePersistenceService
   - URL-driven query parameters

2. **Create PrimeNG adapter** for BaseDataTableComponent
   - Keep composition pattern
   - Replace nz-table with p-table in template
   - Preserve all interfaces (TableColumn, TableDataSource, etc.)

3. **Migrate features incrementally:**
   - [x] Basic table rendering
   - [ ] Column definitions
   - [ ] Sorting (client-side and server-side)
   - [ ] Pagination
   - [ ] Column reordering (PrimeNG column reorder or keep CDK)
   - [ ] Column visibility toggle
   - [ ] Expandable rows
   - [ ] Custom cell templates
   - [ ] Loading states

4. **Test exhaustively:**
   - ManufacturerModelTablePickerComponent
   - VehicleResultsTableComponent
   - ResultsTableComponent (Workshop)

**Key Considerations:**
- PrimeNG p-table has different API than nz-table
- Column reordering: PrimeNG has built-in `[reorderableColumns]="true"`
- Column visibility: May need custom implementation or p-multiSelect
- Sorting: PrimeNG supports `[sortField]` and custom sort functions
- Pagination: PrimeNG has built-in `[paginator]="true"` with `[rows]` and `[totalRecords]`

**Deliverable:** All table components migrated, all features preserved, no regressions

---

### Phase 5: Navigation & Layout (Week 5)

**Status:** ⏸️ NOT STARTED

**Target Components:**
1. **Navigation Menu** (`nz-menu` → `p-menubar` or `p-menu`)
   - Migrate navigation component
   - Preserve routing

2. **Collapse/Accordion** (`nz-collapse` → `p-accordion`)
   - Workshop panel collapse states
   - Test state persistence

3. **Breadcrumbs** (`nz-breadcrumb` → `p-breadcrumb`) - if used
   - Simple replacement

**Testing:**
- Navigation flow testing
- Routing verification
- Layout responsiveness

**Deliverable:** Navigation and layout components migrated

---

### Phase 6: Modals & Feedback (Week 6)

**Status:** ⏸️ NOT STARTED

**Target Components:**
1. **Dialogs** (`nz-modal` → `p-dialog`)
   - Migrate modal dialogs
   - Test dynamic content

2. **Notifications** (`nz-message` → `p-toast`)
   - Replace notification service
   - Test message types (success, error, warning, info)

3. **Loading Indicators** (`nz-spin` → `p-progressSpinner`)
   - Replace loading overlays

4. **Alerts** (`nz-alert` → `p-message`)
   - Simple replacements

**Testing:**
- User feedback testing
- Accessibility testing

**Deliverable:** All feedback components migrated

---

### Phase 7: Cleanup & Optimization (Week 7)

**Status:** ⏸️ NOT STARTED

**Tasks:**
1. **Remove NG-ZORRO dependency**
   - Remove `ng-zorro-antd` from package.json
   - Remove NG-ZORRO styles from angular.json
   - Remove NzModules from app imports

2. **Theme optimization**
   - Customize PrimeNG theme if needed
   - Ensure consistent styling

3. **Performance testing**
   - Bundle size analysis
   - Load time comparison
   - Runtime performance

4. **Documentation update**
   - Update CLAUDE.md
   - Update component documentation
   - Create PrimeNG component usage guide

**Testing:**
- Full regression testing
- Performance benchmarking
- Accessibility audit

**Deliverable:** NG-ZORRO completely removed, application fully migrated to PrimeNG

---

## Installation & Configuration

### Dependencies Installed

**package.json:**
```json
{
  "dependencies": {
    "primeng": "^14.2.3",
    "primeicons": "^6.0.1"
  }
}
```

**angular.json styles:**
```json
"styles": [
  "node_modules/ng-zorro-antd/ng-zorro-antd.min.css",  // Remove in Phase 7
  "node_modules/primeng/resources/themes/lara-light-blue/theme.css",
  "node_modules/primeng/resources/primeng.min.css",
  "node_modules/primeicons/primeicons.css",
  "src/styles.scss"
]
```

### Module Configuration

**app.module.ts (to be updated):**

Import PrimeNG modules as needed:

```typescript
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { AccordionModule } from 'primeng/accordion';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
// ... more as needed

@NgModule({
  imports: [
    // ... existing imports
    ButtonModule,
    TableModule,
    CardModule,
    AccordionModule,
    DialogModule,
    ToastModule,
    InputTextModule,
    DropdownModule,
    // ... more PrimeNG modules
  ]
})
```

**Recommendation:** Create a `primeng.module.ts` to centralize all PrimeNG imports:

```typescript
// src/app/primeng.module.ts
import { NgModule } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
// ... all other PrimeNG modules

const PRIMENG_MODULES = [
  ButtonModule,
  TableModule,
  // ... all others
];

@NgModule({
  imports: PRIMENG_MODULES,
  exports: PRIMENG_MODULES
})
export class PrimeNgModule {}
```

Then import `PrimeNgModule` in `app.module.ts`.

---

## Migration Patterns

### Pattern 1: Simple Component Replacement

**Before (NG-ZORRO):**
```html
<button nz-button nzType="primary" (click)="handleClick()">
  <i nz-icon nzType="plus"></i>
  Add Vehicle
</button>
```

**After (PrimeNG):**
```html
<p-button
  label="Add Vehicle"
  icon="pi pi-plus"
  (onClick)="handleClick()"
  styleClass="p-button-primary">
</p-button>
```

**TypeScript:** No changes needed (just event handler)

---

### Pattern 2: Form Input Replacement

**Before (NG-ZORRO):**
```html
<nz-form-item>
  <nz-form-label>VIN</nz-form-label>
  <nz-form-control>
    <input nz-input [(ngModel)]="vin" placeholder="Enter VIN" />
  </nz-form-control>
</nz-form-item>
```

**After (PrimeNG):**
```html
<div class="p-field">
  <label for="vin">VIN</label>
  <input
    id="vin"
    type="text"
    pInputText
    [(ngModel)]="vin"
    placeholder="Enter VIN" />
</div>
```

**TypeScript:** No changes needed

---

### Pattern 3: Table with Custom Features (Complex)

**Before (NG-ZORRO with BaseDataTableComponent):**
```html
<nz-table
  #table
  [nzData]="dataSource.data$ | async"
  [nzLoading]="dataSource.loading$ | async"
  [nzTotal]="dataSource.total$ | async"
  [nzPageIndex]="currentPage"
  [nzPageSize]="pageSize"
  (nzPageIndexChange)="onPageChange($event)"
  cdkDropList
  (cdkDropListDropped)="onColumnDrop($event)">

  <thead>
    <tr>
      <th *ngFor="let col of visibleColumns"
          [nzSortFn]="col.sortable ? true : null"
          (nzSortOrderChange)="onSortChange(col, $event)"
          cdkDrag>
        {{ col.label }}
      </th>
    </tr>
  </thead>

  <tbody>
    <tr *ngFor="let row of table.data">
      <td *ngFor="let col of visibleColumns">
        <ng-container *ngTemplateOutlet="col.template; context: { row: row }">
        </ng-container>
      </td>
    </tr>
  </tbody>
</nz-table>
```

**After (PrimeNG with BaseDataTableComponent):**
```html
<p-table
  #table
  [value]="dataSource.data$ | async"
  [loading]="dataSource.loading$ | async"
  [totalRecords]="dataSource.total$ | async"
  [first]="(currentPage - 1) * pageSize"
  [rows]="pageSize"
  [paginator]="true"
  (onPage)="onPageChange($event)"
  [reorderableColumns]="true"
  (onColReorder)="onColumnReorder($event)">

  <ng-template pTemplate="header">
    <tr>
      <th *ngFor="let col of visibleColumns"
          [pSortableColumn]="col.sortable ? col.key : null"
          [pReorderableColumn]="true">
        {{ col.label }}
        <p-sortIcon *ngIf="col.sortable" [field]="col.key"></p-sortIcon>
      </th>
    </tr>
  </ng-template>

  <ng-template pTemplate="body" let-row>
    <tr>
      <td *ngFor="let col of visibleColumns">
        <ng-container *ngTemplateOutlet="col.template; context: { row: row }">
        </ng-container>
      </td>
    </tr>
  </ng-template>
</p-table>
```

**TypeScript changes:**
```typescript
// Before
import { NzTableComponent } from 'ng-zorro-antd/table';
@ViewChild('table') table: NzTableComponent;

// After
import { Table } from 'primeng/table';
@ViewChild('table') table: Table;

// Pagination event handler change
// Before
onPageChange(page: number) {
  this.currentPage = page;
  this.fetchData();
}

// After
onPageChange(event: any) {
  this.currentPage = (event.first / event.rows) + 1;
  this.pageSize = event.rows;
  this.fetchData();
}
```

---

### Pattern 4: Modal/Dialog

**Before (NG-ZORRO):**
```typescript
// Component
import { NzModalService } from 'ng-zorro-antd/modal';

constructor(private modal: NzModalService) {}

showModal() {
  this.modal.create({
    nzTitle: 'Confirm Action',
    nzContent: 'Are you sure?',
    nzOnOk: () => this.handleConfirm()
  });
}
```

**After (PrimeNG):**
```typescript
// Component
displayModal: boolean = false;

showModal() {
  this.displayModal = true;
}

handleConfirm() {
  // confirmation logic
  this.displayModal = false;
}
```

```html
<p-dialog
  header="Confirm Action"
  [(visible)]="displayModal"
  [modal]="true"
  [style]="{width: '450px'}">

  <p>Are you sure?</p>

  <ng-template pTemplate="footer">
    <p-button
      label="Cancel"
      icon="pi pi-times"
      (onClick)="displayModal=false"
      styleClass="p-button-text">
    </p-button>
    <p-button
      label="Confirm"
      icon="pi pi-check"
      (onClick)="handleConfirm()">
    </p-button>
  </ng-template>
</p-dialog>
```

---

## Testing Strategy

### Unit Testing

**For each migrated component:**
1. **Template rendering** - Verify component renders correctly
2. **Data binding** - Test input/output bindings
3. **Event handling** - Test user interactions
4. **State management** - Verify state updates correctly

**Example test (button):**
```typescript
describe('ButtonComponent (PrimeNG)', () => {
  it('should render button with correct label', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentInstance.label = 'Test Button';
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Test Button');
  });

  it('should emit click event', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    let clicked = false;
    fixture.componentInstance.onClick.subscribe(() => clicked = true);

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(clicked).toBe(true);
  });
});
```

### Integration Testing

**For complex features:**
1. **Table operations** - Sort, filter, paginate, reorder columns
2. **Form submission** - Validate, submit, error handling
3. **Navigation flow** - Route transitions, state preservation
4. **Workshop grid** - Panel drag/drop, collapse/expand, pop-out

### Visual Regression Testing

**Tools:** Consider using tools like:
- Percy.io
- Chromatic
- BackstopJS

**Process:**
1. Capture screenshots of NG-ZORRO components (baseline)
2. Migrate to PrimeNG
3. Capture new screenshots
4. Compare for visual differences
5. Approve intentional changes, fix regressions

### End-to-End Testing

**Critical user flows:**
1. **Vehicle search flow:**
   - Select manufacturer/model
   - Apply filters
   - View results
   - Expand VIN instances
   - Navigate pages

2. **Workshop flow:**
   - Drag panels
   - Collapse panels
   - Pop out panels
   - Restore layout

3. **Table customization:**
   - Reorder columns
   - Toggle column visibility
   - Sort by column
   - Filter results

---

## Rollback Plan

### If Migration Fails

**Option 1: Per-component rollback**
- Each component migration is isolated
- Can revert individual component changes
- Keep NG-ZORRO for remaining components

**Option 2: Full rollback**
- Git revert to pre-migration state
- Remove PrimeNG dependencies
- Redeploy NG-ZORRO version

### Git Strategy

**Branch structure:**
```
main (NG-ZORRO)
  └── feature/primeng-migration
        ├── feature/primeng-setup (Phase 1)
        ├── feature/primeng-simple-components (Phase 2)
        ├── feature/primeng-forms (Phase 3)
        ├── feature/primeng-tables (Phase 4)
        ├── feature/primeng-navigation (Phase 5)
        ├── feature/primeng-modals (Phase 6)
        └── feature/primeng-cleanup (Phase 7)
```

**Merge strategy:**
- Each phase gets reviewed and tested before merging
- Phase branch merges into feature/primeng-migration
- Final merge to main only after ALL phases complete and tested

---

## Progress Tracking

### Phase 1: Setup & Foundation ✅ IN PROGRESS

- [x] Install PrimeNG 14.2.3
- [x] Install primeicons 6.0.1
- [x] Configure angular.json styles
- [x] Create migration strategy document
- [ ] Configure app.module.ts with PrimeNG modules
- [ ] Create primeng.module.ts
- [ ] Test PrimeNG components render

### Phase 2: Simple Components ⏸️ NOT STARTED

- [ ] Migrate buttons (nz-button → p-button)
- [ ] Migrate icons (NG-ZORRO icons → PrimeIcons)
- [ ] Migrate cards (nz-card → p-card)
- [ ] Migrate dividers (nz-divider → p-divider)
- [ ] Test all simple components

### Phase 3: Form Components ⏸️ NOT STARTED

- [ ] Migrate form structure (nz-form → PrimeNG setup)
- [ ] Migrate text inputs (nz-input → p-inputText)
- [ ] Migrate dropdowns (nz-select → p-dropdown)
- [ ] Migrate checkboxes (nz-checkbox → p-checkbox)
- [ ] Migrate radios (nz-radio → p-radioButton)
- [ ] Test all forms

### Phase 4: Tables ⏸️ NOT STARTED

- [ ] Analyze BaseDataTableComponent architecture
- [ ] Create PrimeNG table adapter
- [ ] Migrate basic table rendering
- [ ] Migrate sorting (client + server)
- [ ] Migrate pagination
- [ ] Migrate column reordering
- [ ] Migrate column visibility
- [ ] Migrate expandable rows
- [ ] Migrate custom templates
- [ ] Test ManufacturerModelTablePickerComponent
- [ ] Test VehicleResultsTableComponent
- [ ] Test ResultsTableComponent

### Phase 5: Navigation & Layout ⏸️ NOT STARTED

- [ ] Migrate navigation menu (nz-menu → p-menubar)
- [ ] Migrate collapse/accordion (nz-collapse → p-accordion)
- [ ] Test navigation flow
- [ ] Test Workshop panel collapse

### Phase 6: Modals & Feedback ⏸️ NOT STARTED

- [ ] Migrate dialogs (nz-modal → p-dialog)
- [ ] Migrate notifications (nz-message → p-toast)
- [ ] Migrate loading indicators (nz-spin → p-progressSpinner)
- [ ] Migrate alerts (nz-alert → p-message)
- [ ] Test all feedback mechanisms

### Phase 7: Cleanup ⏸️ NOT STARTED

- [ ] Remove ng-zorro-antd from package.json
- [ ] Remove NG-ZORRO styles from angular.json
- [ ] Remove NzModules from imports
- [ ] Theme optimization
- [ ] Performance testing
- [ ] Bundle size analysis
- [ ] Documentation update
- [ ] Full regression testing

---

## Notes & Decisions

### 2025-11-06

- **Decision:** Use PrimeNG 14.2.3 (latest compatible with Angular 14.2.0)
- **Decision:** Use lara-light-blue theme (modern, clean)
- **Decision:** Keep both libraries during migration for safety
- **Decision:** Start with simple components to establish patterns
- **Decision:** Tables (Phase 4) are CRITICAL - allocate 2 weeks
- **Decision:** Preserve BaseDataTableComponent architecture - too valuable to rewrite

---

**Last Updated:** 2025-11-06
**Next Update:** After Phase 1 completion

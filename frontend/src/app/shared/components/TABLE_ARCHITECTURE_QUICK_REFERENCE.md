# Table Component Architecture - Quick Reference

## AUTOS-PRIME-NG: Two-Component Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    ResultsTableComponent                     │
│                    (Parent/Container)                        │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
             ▼                          ▼
    ┌────────────────────┐    ┌──────────────────┐
    │  BaseDataTable     │    │ ColumnManager    │
    ├────────────────────┤    ├──────────────────┤
    │ - Pagination       │    │ - Visibility     │
    │ - Sorting          │    │ - Reordering     │
    │ - Filtering        │    │ - Dependencies   │
    │ - Row expansion    │    │ - Reset default  │
    │ - Data fetching    │    │ - Search columns │
    │ - Column order     │    │                  │
    │ - Persistence      │    │ PrimeNG PickList │
    │ - PrimeNG p-table  │    │ (Drag-drop UI)   │
    └────────────────────┘    └──────────────────┘
```

### File Sizes
- BaseDataTable: 1,062 lines (TS) + 233 lines (HTML) = 1,295 total
- ColumnManager: 219 lines (TS) + 84 lines (HTML) = 303 total
- Total: ~1,600 lines of code

### Key Characteristics
- Separation of Concerns (SoC)
- Single Responsibility Principle
- Rich feature set
- Production-proven
- Comprehensive documentation

---

## VDP: Single-Component Approach

```
┌────────────────────────────────────────────┐
│      Picker/Table Using Component          │
│           (Parent/Container)               │
└────────────┬─────────────────────────────┘
             │
             ▼
    ┌────────────────────────┐
    │   BaseTable (Config)   │
    ├────────────────────────┤
    │ - Simple mode          │
    │ - Hierarchical Single  │  Single component handles:
    │ - Hierarchical Dual    │  - All rendering modes
    │                        │  - Selection logic
    │ Features:              │  - Filtering (client-only)
    │ - Selection (tri-state)│  - Sorting (client-only)
    │ - Expansion (static)   │  - Pagination (basic)
    │ - Parent-child groups  │  - No persistence
    │ - Hierarchical help.   │  - No drag-drop
    │                        │
    │ PrimeNG p-table        │
    │ + Custom HTML tables   │
    └────────────────────────┘
```

### File Sizes
- BaseTable: 630 lines (TS) + 219 lines (HTML) = 849 total
- Total: ~850 lines of code

### Key Characteristics
- Configuration-driven design
- All-in-one component
- Specialized for selection use cases
- Simpler mental model
- Limited feature set

---

## Feature Comparison at a Glance

### Data Handling
| Feature | autos-prime-ng | vdp |
|---------|---|---|
| Server-side fetch | ✅ Yes (dataSource) | ❌ No |
| Pre-fetched data | ✅ Yes (data input) | ✅ Yes (config.data) |
| URL-first state | ✅ Yes | ❌ No |
| API integration | ✅ TableDataSource | ❌ Stubbed |

### User Interactions
| Feature | autos-prime-ng | vdp |
|---------|---|---|
| Column drag-drop | ✅ Yes | ❌ No |
| Column visibility | ✅ User-managed | ⚠️ Config-only |
| Persistence | ✅ localStorage | ❌ No |
| Sorting | ✅ Server/Client | ⚠️ Client-only |
| Filtering | ✅ Server/Client | ⚠️ Client-only |

### Selection
| Feature | autos-prime-ng | vdp |
|---------|---|---|
| Basic checkboxes | ✅ Yes | ✅ Yes |
| Hierarchical | ❌ No | ✅ Yes |
| Tri-state | ❌ No | ✅ Yes |
| Parent-child logic | ❌ No | ✅ Built-in |

### Extensibility
| Feature | autos-prime-ng | vdp |
|---------|---|---|
| Custom cell templates | ✅ @ContentChild | ❌ No |
| Custom expansion | ✅ @ContentChild | ❌ No |
| Multiple modes | ⚠️ Via @Inputs | ✅ Via config |
| Plugin system | ✅ TableDataSource | ❌ No |

---

## When to Use Each

### Use autos-prime-ng BaseDataTable when:
- Building general-purpose data tables
- Need server-side support (pagination, sorting, filtering)
- Want user to control column visibility/order
- Need to persist user preferences
- Building result tables with expandable rows
- Custom cell/expansion rendering needed
- Need to integrate with backend APIs

### Use vdp BaseTable when:
- Building picker/selector tables (selection-focused)
- Need hierarchical parent-child selection
- Tri-state checkbox behavior required
- Static data only (no server integration)
- Configuration-driven rendering is acceptable
- Simplicity is priority
- Selection state is critical

---

## Migration Path

### If adding autos-prime-ng to vdp:

**Step 1: Copy Components (30 min)**
```
/autos-prime-ng/frontend/src/app/shared/components/
  ├── base-data-table/  → vdp/frontend/src/app/shared/components/
  ├── column-manager/   → vdp/frontend/src/app/shared/components/
  ├── models/table-column.model.ts → vdp/frontend/src/app/shared/models/
  └── services/table-state-persistence.service.ts → vdp/frontend/src/app/shared/services/
```

**Step 2: Install Dependencies (10 min)**
```bash
npm install @angular/cdk primeng
```

**Step 3: Define Columns (30 min)**
```typescript
columns: TableColumn<Vehicle>[] = [
  { key: 'id', label: 'ID', sortable: true, filterable: true, hideable: false },
  { key: 'name', label: 'Name', sortable: true, filterable: true, hideable: true },
  // ...
];
```

**Step 4: Use Component (15 min)**
```html
<app-base-data-table
  [tableId]="'my-table'"
  [columns]="columns"
  [data]="data"
  [totalCount]="total"
  (queryParamsChange)="onQueryChange($event)">
</app-base-data-table>
```

**Total: 1-2 hours**

---

## Code Examples

### autos-prime-ng: Server-side Data Table
```typescript
// Component
@Component({...})
export class VehicleTableComponent {
  columns: TableColumn<Vehicle>[] = [
    { key: 'manufacturer', label: 'Make', sortable: true, filterable: true, hideable: false },
    { key: 'model', label: 'Model', sortable: true, filterable: true, hideable: false },
  ];
  
  constructor(private vehicleDataSource: VehicleDataSource) {}
}
```

```html
<!-- Template -->
<app-base-data-table
  [tableId]="'vehicles'"
  [columns]="columns"
  [dataSource]="vehicleDataSource"
  [expandable]="true"
  (rowExpand)="loadVehicleDetails($event)">
  
  <ng-template #cellTemplate let-column="column" let-row="row">
    <p-chip *ngSwitchCase="'status'">{{ row.status }}</p-chip>
  </ng-template>
  
  <ng-template #expansionTemplate let-row="row">
    <div class="details">{{ row.details }}</div>
  </ng-template>
</app-base-data-table>
```

### vdp: Picker Table with Selection
```typescript
// Component
@Component({...})
export class VehiclePickerComponent {
  config: TableConfig = {
    columns: [...],
    data: vehicles,
    selection: {
      enabled: true,
      hierarchical: {
        enabled: true,
        parentKey: 'manufacturer',
        childKey: 'model',
      },
      displayMode: 'dual',
      applyButton: { enabled: true, text: 'Select' }
    }
  };
}
```

```html
<!-- Template -->
<app-base-table
  [config]="config"
  (selectionApply)="applySelection($event)">
</app-base-table>
```

---

## Architecture Decision Matrix

```
┌─────────────────────┬──────────────┬──────────────────┐
│ Requirement         │ autos-prime  │ vdp              │
├─────────────────────┼──────────────┼──────────────────┤
│ Server APIs         │ ✅ Required  │ ⚠️ Would need    │
│ Scalability         │ ✅ High      │ ⚠️ Medium        │
│ Feature richness    │ ✅ High      │ ⚠️ Low           │
│ Learning curve      │ ⚠️ Medium    │ ✅ Low           │
│ Setup time          │ ⚠️ 2-3 hours │ ✅ 30 minutes    │
│ Picker tables       │ ✅ Works     │ ✅ Optimal       │
│ Data tables         │ ✅ Optimal   │ ⚠️ Limited       │
│ Code maintainability│ ✅ Good      │ ✅ Better        │
│ Bundle size         │ ⚠️ +20KB     │ ✅ +10KB         │
│ Customization       │ ✅ Easy      │ ⚠️ Limited       │
└─────────────────────┴──────────────┴──────────────────┘
```

---

## Recommended for VDP

**Best Practice: Hybrid Approach**

1. Keep vdp BaseTable for selection-heavy pickers
2. Adopt autos-prime-ng BaseDataTable for data tables
3. Clear naming convention to avoid confusion:
   - Pickers: `<app-base-table [config]="...">`
   - Tables: `<app-base-data-table [tableId]="...">`

**Benefits:**
- Each component does one thing well
- Developers know which to use by name
- Scalable as features grow
- Future-proof

---

## Key Files

### autos-prime-ng
- Main: `/shared/components/base-data-table/base-data-table.component.ts` (1,062 lines)
- Manager: `/shared/components/column-manager/column-manager.component.ts` (219 lines)
- Docs: `base-data-table-usage-guide.md` (1,546 lines!)
- Models: `/shared/models/table-column.model.ts`
- Service: `/shared/services/table-state-persistence.service.ts`

### vdp
- Main: `/shared/components/base-table/base-table.component.ts` (630 lines)
- Template: `/shared/components/base-table/base-table.component.html` (219 lines)
- Models: `/shared/models/table-config.model.ts`
- Selection: `/shared/models/selection-state.model.ts`

---

**For detailed analysis, see: TABLE_ARCHITECTURE_ANALYSIS.md**

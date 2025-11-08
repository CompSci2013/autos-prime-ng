# Model Picker Checkbox Behavior Documentation (PrimeNG)

**Reference:** autos@018c55ed6193808cff70f506617ec9902e1ab31e (NG-ZORRO implementation)
**Target:** autos-prime-ng (PrimeNG migration)
**Component:** `BasePickerComponent` (to be enhanced with dual checkbox pattern)
**UI Library:** PrimeNG

---

## Overview

The Model Picker uses a **parent-child checkbox pattern** where:
- **Manufacturer checkbox (parent)**: Controls all models for that manufacturer
- **Model checkbox (child)**: Controls individual model selection

This creates a tri-state checkbox system for the parent and binary state for children.

**Migration Note:** This document adapts the NG-ZORRO `TablePickerComponent` pattern for PrimeNG implementation in `BasePickerComponent`.

---

## Checkbox States

### Manufacturer Checkbox (Parent) - 3 States

| State | Visual | Condition | Meaning |
|-------|--------|-----------|---------|
| **Unchecked** | ☐ | No models selected for this manufacturer | None of this manufacturer's models are selected |
| **Indeterminate** | ☑ (partial) | Some (but not all) models selected | At least 1 model selected, but not all models for this manufacturer |
| **Checked** | ☑ (full) | All models selected for this manufacturer | Every model for this manufacturer is selected |

### Model Checkbox (Child) - 2 States

| State | Visual | Condition | Meaning |
|-------|--------|-----------|---------|
| **Unchecked** | ☐ | Model key not in `selectedRows` Set | This specific model is not selected |
| **Checked** | ☑ | Model key exists in `selectedRows` Set | This specific model is selected |

---

## Behavior Rules

### Rule 1: Manufacturer Checkbox Click

**Action:** User clicks manufacturer checkbox

**Effect:** Toggles ALL models for that manufacturer

| Current State | Click Effect | Result State | Models Affected |
|---------------|--------------|--------------|-----------------|
| Unchecked ☐ | Click → Check | Checked ☑ | ALL models for manufacturer are ADDED to selection |
| Indeterminate ☑ (partial) | Click → Check | Checked ☑ | ALL models for manufacturer are ADDED to selection |
| Checked ☑ (full) | Click → Uncheck | Unchecked ☐ | ALL models for manufacturer are REMOVED from selection |

**Implementation:**
```typescript
onManufacturerCheckboxChange(manufacturer: string, event: any): void {
  const checked = event.checked;  // PrimeNG onChange event
  const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);

  manufacturerRows.forEach((row) => {
    if (checked) {
      this.selectedRows.add(row.key);  // Add ALL models
    } else {
      this.selectedRows.delete(row.key);  // Remove ALL models
    }
  });

  this.updateSelectedItemsDisplay();
}
```

### Rule 2: Model Checkbox Click

**Action:** User clicks model checkbox

**Effect:** Toggles ONLY that specific model, updates parent checkbox state automatically

| Current State | Click Effect | Result State | Parent Checkbox Impact |
|---------------|--------------|--------------|----------------------|
| Unchecked ☐ | Click → Check | Checked ☑ | Parent may change: Unchecked → Indeterminate OR Indeterminate → Checked |
| Checked ☑ | Click → Uncheck | Unchecked ☐ | Parent may change: Checked → Indeterminate OR Indeterminate → Unchecked |

**Implementation:**
```typescript
onModelCheckboxChange(manufacturer: string, model: string, event: any): void {
  const checked = event.checked;  // PrimeNG onChange event
  const key = `${manufacturer}|${model}`;

  if (checked) {
    this.selectedRows.add(key);  // Add ONLY this model
  } else {
    this.selectedRows.delete(key);  // Remove ONLY this model
  }

  this.updateSelectedItemsDisplay();
}
```

### Rule 3: Parent State Calculation (Automatic)

**Trigger:** After ANY selection change (manufacturer or model click)

**Algorithm:**

```typescript
getManufacturerCheckboxState(manufacturer: string): {
  checked: boolean;
  indeterminate: boolean;
} {
  const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);
  const checkedCount = manufacturerRows.filter(row => this.selectedRows.has(row.key)).length;

  if (checkedCount === 0) {
    return { checked: false, indeterminate: false };  // Unchecked
  }
  if (checkedCount === manufacturerRows.length) {
    return { checked: true, indeterminate: false };   // Fully checked
  }
  return { checked: false, indeterminate: true };     // Indeterminate (some but not all)
}
```

**PrimeNG Note:** Unlike NG-ZORRO's string-based state (`'checked' | 'indeterminate' | 'unchecked'`), PrimeNG uses separate boolean properties for `checked` and `indeterminate`.

---

## Scenario Table: Example with Brammo (5 models)

**Brammo Models:**
1. Street Bikes
2. Dual Sport
3. Scooter
4. Touring
5. Urban

### Scenario Progression

| Scenario | Action | Brammo Checkbox | Selected Models | Count | State |
|----------|--------|----------------|-----------------|-------|-------|
| **1. Initial State** | (none) | ☐ Unchecked | (none) | 0/5 | All unchecked |
| **2. Click Brammo checkbox** | Manufacturer checkbox clicked | ☑ Checked | Street Bikes, Dual Sport, Scooter, Touring, Urban | 5/5 | All checked |
| **3. Uncheck Street Bikes** | Model checkbox clicked | ☑ Indeterminate | Dual Sport, Scooter, Touring, Urban | 4/5 | Partial selection |
| **4. Check Buick → Century** | Different manufacturer model | ☑ Indeterminate | Brammo: 4 models<br>Buick: Century | 5 total | Mixed manufacturers |
| **5. Click Brammo checkbox** | Manufacturer checkbox clicked (was indeterminate) | ☑ Checked | Street Bikes, Dual Sport, Scooter, Touring, Urban<br>Buick: Century | 6 total | Brammo: all selected |
| **6. Click Brammo checkbox again** | Manufacturer checkbox clicked (was checked) | ☐ Unchecked | Buick: Century | 1 total | Brammo: none selected |

---

## Multi-Manufacturer Scenarios

### Scenario A: Select All Brammo, Then Add One Buick Model

| Step | Action | Brammo State | Buick State | Total Selected |
|------|--------|--------------|-------------|----------------|
| 1 | Initial | ☐ (0/5) | ☐ (0/N) | 0 |
| 2 | Click Brammo checkbox | ☑ (5/5) | ☐ (0/N) | 5 |
| 3 | Click Buick → Century checkbox | ☑ (5/5) | ☑ (1/N) | 6 |

### Scenario B: Partial Brammo, Partial Buick

| Step | Action | Brammo State | Buick State | Total Selected |
|------|--------|--------------|-------------|----------------|
| 1 | Check Brammo → Scooter | ☑ (1/5) Indeterminate | ☐ (0/N) | 1 |
| 2 | Check Brammo → Touring | ☑ (2/5) Indeterminate | ☐ (0/N) | 2 |
| 3 | Check Buick → Century | ☑ (2/5) Indeterminate | ☑ (1/N) Indeterminate | 3 |
| 4 | Check Buick → Cascada | ☑ (2/5) Indeterminate | ☑ (2/N) Indeterminate | 4 |

### Scenario C: Deselection from Full State

| Step | Action | Brammo State | Buick State | Total Selected |
|------|--------|--------------|-------------|----------------|
| 1 | Click Brammo checkbox | ☑ (5/5) Checked | ☐ (0/N) | 5 |
| 2 | Click Buick checkbox | ☑ (5/5) Checked | ☑ (N/N) Checked | 5 + N |
| 3 | Uncheck Brammo → Urban | ☑ (4/5) Indeterminate | ☑ (N/N) Checked | 4 + N |
| 4 | Click Brammo checkbox (was indeterminate) | ☑ (5/5) Checked | ☑ (N/N) Checked | 5 + N |
| 5 | Click Brammo checkbox (was checked) | ☐ (0/5) Unchecked | ☑ (N/N) Checked | N |

---

## Edge Cases

### Edge Case 1: Single Model Manufacturer

**Manufacturer:** Affordable Aluminum (1 model: "Affordable Aluminum")

| Action | Checkbox State | Behavior |
|--------|----------------|----------|
| Click manufacturer checkbox | ☑ Checked | Immediately goes from Unchecked → Checked (never indeterminate) |
| Click model checkbox | ☑ Checked | Same effect as clicking manufacturer checkbox |
| Uncheck either checkbox | ☐ Unchecked | Both checkboxes uncheck simultaneously |

**Why no indeterminate?** Indeterminate requires "some but not all" - impossible with 1 model.

### Edge Case 2: Clicking Indeterminate Manufacturer Checkbox

**Current State:** Brammo has 2/5 models selected (indeterminate)

**Action:** Click Brammo manufacturer checkbox

**Result:** Checks ALL remaining models (treats indeterminate as unchecked for click purposes)

**PrimeNG Implementation:**
```typescript
// Template binding:
<p-checkbox
  [binary]="true"
  [ngModel]="getManufacturerCheckboxState(row.manufacturer).checked"
  [indeterminate]="getManufacturerCheckboxState(row.manufacturer).indeterminate"
  (onChange)="onManufacturerCheckboxChange(row.manufacturer, $event)">
</p-checkbox>

// When indeterminate, ngModel = false
// Clicking calls onManufacturerCheckboxChange(manufacturer, {checked: true})
// Which ADDS all models
```

### Edge Case 3: All Models Deselected via Individual Clicks

**Scenario:** Brammo was fully selected (5/5), user unchecks each model individually

| Step | Action | Brammo State |
|------|--------|--------------|
| 1 | All selected | ☑ (5/5) Checked |
| 2 | Uncheck Street Bikes | ☑ (4/5) Indeterminate |
| 3 | Uncheck Dual Sport | ☑ (3/5) Indeterminate |
| 4 | Uncheck Scooter | ☑ (2/5) Indeterminate |
| 5 | Uncheck Touring | ☑ (1/5) Indeterminate |
| 6 | Uncheck Urban | ☐ (0/5) Unchecked |

**Result:** Manufacturer checkbox automatically transitions Indeterminate → Unchecked when last model is deselected.

---

## Visual Patterns from Screenshots

### Screenshot 1: Empty State
```
┌─────────────────┬──────────────┐
│ Manufacturer    │ Model        │
├─────────────────┼──────────────┤
│ ☐ Brammo        │ ☐ Street ... │
│ ☐ Brammo        │ ☐ Dual Sport │
│ ☐ Brammo        │ ☐ Scooter    │
│ ☐ Brammo        │ ☐ Touring    │
│ ☐ Brammo        │ ☐ Urban      │
│ ☐ Buick         │ ☐ Allure     │
│ ☐ Buick         │ ☐ Cascada    │
└─────────────────┴──────────────┘
```

### Screenshot 2: All Brammo Selected
```
┌─────────────────┬──────────────┐
│ Manufacturer    │ Model        │
├─────────────────┼──────────────┤
│ ☑ Brammo        │ ☑ Street ... │
│ ☑ Brammo        │ ☑ Dual Sport │
│ ☑ Brammo        │ ☑ Scooter    │
│ ☑ Brammo        │ ☑ Touring    │
│ ☑ Brammo        │ ☑ Urban      │
│ ☐ Buick         │ ☐ Allure     │
│ ☐ Buick         │ ☐ Cascada    │
└─────────────────┴──────────────┘

Selected: 5 models
```

### Screenshot 3: Partial Brammo + One Buick
```
┌─────────────────┬──────────────┐
│ Manufacturer    │ Model        │
├─────────────────┼──────────────┤
│ ☑ Brammo        │ ☑ Dual Sport │  (Indeterminate: 4/5)
│ ☑ Brammo        │ ☑ Scooter    │
│ ☑ Brammo        │ ☑ Touring    │
│ ☑ Brammo        │ ☑ Urban      │
│ ☑ Buick         │ ☑ Century    │  (Indeterminate: 1/N)
│ ☐ Buick         │ ☐ Cascada    │
└─────────────────┴──────────────┘

Selected: 5 models (4 Brammo + 1 Buick)
```

---

## Key Design Principles

### 1. Parent Dominance Pattern
- Clicking parent checkbox ALWAYS affects ALL children
- Parent state is DERIVED from children (not stored separately)
- Children can affect parent state indirectly

### 2. Indeterminate Behavior
- Indeterminate is a VISUAL state, not a selection state
- Clicking indeterminate checkbox treats it as "unchecked" → selects all
- Indeterminate cannot be set manually, only calculated

### 3. Selection Storage
- Uses `Set<string>` for O(1) lookup performance
- Keys are `"manufacturer|model"` (e.g., `"Brammo|Scooter"`)
- No separate parent/child tracking - all are individual selections

### 4. State Calculation (Derived, Not Stored)
```typescript
// Manufacturer state is CALCULATED on every render
getManufacturerCheckboxState(manufacturer): { checked: boolean; indeterminate: boolean } {
  // Count selected children for this manufacturer
  // Return object with checked and indeterminate flags
}
```

---

## Implementation Details

### Data Structure

```typescript
// Selection storage
selectedRows = new Set<string>();

// Example contents after selecting Brammo models:
// Set {
//   "Brammo|Street Bikes",
//   "Brammo|Dual Sport",
//   "Brammo|Scooter",
//   "Brammo|Touring",
//   "Brammo|Urban"
// }
```

### Performance Characteristics

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Check if model selected | O(1) | `selectedRows.has(key)` - Set lookup |
| Add model | O(1) | `selectedRows.add(key)` - Set insertion |
| Remove model | O(1) | `selectedRows.delete(key)` - Set deletion |
| Calculate parent state | O(N) | N = models for that manufacturer |
| Get all selected items | O(M) | M = total selected models (for rendering chips) |

---

## PrimeNG Template Implementation

### Manufacturer Column with Tri-State Checkbox

```html
<ng-template pTemplate="body" let-row>
  <tr>
    <!-- Manufacturer column with tri-state checkbox -->
    <td>
      <p-checkbox
        [binary]="true"
        [ngModel]="getManufacturerCheckboxState(row.manufacturer).checked"
        [indeterminate]="getManufacturerCheckboxState(row.manufacturer).indeterminate"
        (onChange)="onManufacturerCheckboxChange(row.manufacturer, $event)"
        [label]="row.manufacturer">
      </p-checkbox>
    </td>

    <!-- Model column with binary checkbox -->
    <td>
      <p-checkbox
        [binary]="true"
        [ngModel]="isRowSelected(row)"
        (onChange)="onModelCheckboxChange(row.manufacturer, row.model, $event)"
        [label]="row.model">
      </p-checkbox>
    </td>
  </tr>
</ng-template>
```

### PrimeNG vs NG-ZORRO API Mapping

| Feature | NG-ZORRO | PrimeNG |
|---------|----------|---------|
| **Component** | `<label nz-checkbox>` | `<p-checkbox>` |
| **Binary mode** | Default | `[binary]="true"` |
| **Checked state** | `[nzChecked]="value"` | `[ngModel]="value"` or `[(ngModel)]="value"` |
| **Indeterminate** | `[nzIndeterminate]="value"` | `[indeterminate]="value"` |
| **Change event** | `(nzCheckedChange)="handler($event)"` | `(onChange)="handler($event)"` |
| **Event payload** | `boolean` (true/false) | `{checked: boolean, originalEvent: Event}` |
| **Label text** | Text inside label | `[label]="text"` attribute |
| **Disabled** | `[nzDisabled]="value"` | `[disabled]="value"` |

---

## Migration Notes: NG-ZORRO to PrimeNG

**autos (commit 018c55e):** Uses NG-ZORRO `TablePickerComponent` with dual checkboxes
**autos-prime-ng (current):** Uses PrimeNG `BasePickerComponent` with single selection column

### Key Differences

| Feature | NG-ZORRO TablePickerComponent | PrimeNG BasePickerComponent |
|---------|-------------------------------|------------------------------|
| **Checkbox Columns** | 2 (Manufacturer + Model) | 1 (Selection column) |
| **Parent Checkbox** | ✅ Tri-state (unchecked/indeterminate/checked) | ❌ Not implemented (yet) |
| **Bulk Selection** | ✅ Click manufacturer to select all models | ❌ Individual selection only |
| **Selection Pattern** | Parent-child relationship | Flat individual selection |
| **Use Case** | Quick bulk manufacturer selection | Precise individual model selection |

### Why the Dual Checkbox Pattern is Powerful

1. **Efficiency:** Select all Ford models with one click vs. 20+ individual clicks
2. **Visual Feedback:** Indeterminate state shows partial manufacturer selection at a glance
3. **Flexibility:** Can toggle entire manufacturer or cherry-pick individual models
4. **Intuitive:** Matches familiar UI patterns (file system checkboxes, email selection)

---

## Implementation Guide for BasePickerComponent

### Step 1: Add Manufacturer Column Checkbox

**Component TypeScript:**
```typescript
getManufacturerCheckboxState(manufacturer: string): {
  checked: boolean;
  indeterminate: boolean;
} {
  const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);
  const checkedCount = manufacturerRows.filter(row =>
    this.selectedRows.has(row.key)
  ).length;

  if (checkedCount === 0) {
    return { checked: false, indeterminate: false };
  }
  if (checkedCount === manufacturerRows.length) {
    return { checked: true, indeterminate: false };
  }
  return { checked: false, indeterminate: true };
}

getAllRowsForManufacturer(manufacturer: string): any[] {
  return this.tableData.filter(row => row.manufacturer === manufacturer);
}
```

### Step 2: Add Event Handlers

**Manufacturer Toggle:**
```typescript
onManufacturerCheckboxChange(manufacturer: string, event: any): void {
  const checked = event.checked;
  const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);

  manufacturerRows.forEach((row) => {
    const key = `${row.manufacturer}|${row.model}`;
    if (checked) {
      this.selectedRows.add(key);
    } else {
      this.selectedRows.delete(key);
    }
  });

  this.updateSelectedItemsDisplay();
}
```

**Model Toggle:**
```typescript
onModelCheckboxChange(manufacturer: string, model: string, event: any): void {
  const checked = event.checked;
  const key = `${manufacturer}|${model}`;

  if (checked) {
    this.selectedRows.add(key);
  } else {
    this.selectedRows.delete(key);
  }

  this.updateSelectedItemsDisplay();
}
```

### Step 3: Update Template

**Add manufacturer checkbox column to p-table:**
```html
<p-table [value]="tableData">
  <ng-template pTemplate="header">
    <tr>
      <th>Manufacturer</th>
      <th>Model</th>
      <!-- other columns -->
    </tr>
  </ng-template>

  <ng-template pTemplate="body" let-row>
    <tr>
      <td>
        <p-checkbox
          [binary]="true"
          [ngModel]="getManufacturerCheckboxState(row.manufacturer).checked"
          [indeterminate]="getManufacturerCheckboxState(row.manufacturer).indeterminate"
          (onChange)="onManufacturerCheckboxChange(row.manufacturer, $event)"
          [label]="row.manufacturer">
        </p-checkbox>
      </td>

      <td>
        <p-checkbox
          [binary]="true"
          [ngModel]="isRowSelected(row)"
          (onChange)="onModelCheckboxChange(row.manufacturer, row.model, $event)"
          [label]="row.model">
        </p-checkbox>
      </td>

      <!-- other columns -->
    </tr>
  </ng-template>
</p-table>
```

### Step 4: Styling (Optional)

**PrimeNG Indeterminate State CSS:**
```scss
// PrimeNG applies .p-checkbox-indeterminate automatically
// Customize if needed:
::ng-deep .p-checkbox-indeterminate .p-checkbox-box {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

::ng-deep .p-checkbox-indeterminate .p-checkbox-box .p-checkbox-icon {
  // PrimeNG uses a minus icon by default for indeterminate
  // Customize icon if needed
}
```

---

## Testing Checklist

### Basic Functionality
- [ ] Click unchecked manufacturer → all models selected
- [ ] Click checked manufacturer → all models deselected
- [ ] Click indeterminate manufacturer → all models selected
- [ ] Click individual model → only that model toggles
- [ ] Parent state updates correctly after model toggle

### Multi-Manufacturer
- [ ] Select all Brammo, verify Buick unchanged
- [ ] Select partial Brammo, partial Buick → both indeterminate
- [ ] Deselect full manufacturer → other manufacturers unchanged

### Edge Cases
- [ ] Single-model manufacturer never shows indeterminate
- [ ] Deselecting last model → parent transitions to unchecked
- [ ] Rapid clicking doesn't cause state inconsistency

### Visual Feedback
- [ ] Indeterminate state shows partial fill or minus icon
- [ ] Checked state shows checkmark
- [ ] Unchecked state shows empty box
- [ ] Selection count updates immediately

### Performance
- [ ] Large datasets (1000+ rows) render smoothly
- [ ] Parent state calculation doesn't cause lag
- [ ] Selection Set operations remain O(1)

---

## PrimeNG Component API Reference

### p-checkbox Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `binary` | boolean | false | When present, checkbox only has two states (checked/unchecked) |
| `ngModel` | any | null | Value binding (two-way with `[(ngModel)]`) |
| `indeterminate` | boolean | false | When present, displays indeterminate state |
| `disabled` | boolean | false | When present, checkbox cannot be interacted with |
| `label` | string | null | Label text for the checkbox |
| `name` | string | null | Name of the checkbox input element |
| `tabindex` | number | null | Index for tab order |

### p-checkbox Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `onChange` | `event.checked`: boolean<br>`event.originalEvent`: Event | Callback to invoke when checkbox value changes |

### p-checkbox Styling

| Class | Description |
|-------|-------------|
| `.p-checkbox` | Container element |
| `.p-checkbox-box` | Checkbox box element |
| `.p-checkbox-icon` | Icon element inside checkbox |
| `.p-checkbox-checked` | Applied when checked |
| `.p-checkbox-indeterminate` | Applied when indeterminate |
| `.p-checkbox-disabled` | Applied when disabled |
| `.p-checkbox-label` | Label element |

---

**Document Created:** 2025-11-08
**Author:** Claude Code
**Purpose:** Document parent-child checkbox pattern for PrimeNG migration in autos-prime-ng BasePickerComponent
**Migration From:** NG-ZORRO TablePickerComponent (autos@018c55e)
**Migration To:** PrimeNG BasePickerComponent (autos-prime-ng)


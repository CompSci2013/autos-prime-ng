# Model Picker Checkbox Behavior Documentation

**Reference Commit:** `018c55ed6193808cff70f506617ec9902e1ab31e` (autos)
**Component:** `TablePickerComponent`
**File:** `frontend/src/app/features/picker/table-picker/table-picker.component.ts`

---

## Overview

The Model Picker uses a **parent-child checkbox pattern** where:
- **Manufacturer checkbox (parent)**: Controls all models for that manufacturer
- **Model checkbox (child)**: Controls individual model selection

This creates a tri-state checkbox system for the parent and binary state for children.

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

**Code:** `onManufacturerCheckboxChange()` (lines 206-232)
```typescript
onManufacturerCheckboxChange(manufacturer: string, checked: boolean): void {
  const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);

  manufacturerRows.forEach((row) => {
    if (checked) {
      this.selectedRows.add(row.key);  // Add ALL models
    } else {
      this.selectedRows.delete(row.key);  // Remove ALL models
    }
  });
}
```

### Rule 2: Model Checkbox Click

**Action:** User clicks model checkbox

**Effect:** Toggles ONLY that specific model, updates parent checkbox state automatically

| Current State | Click Effect | Result State | Parent Checkbox Impact |
|---------------|--------------|--------------|----------------------|
| Unchecked ☐ | Click → Check | Checked ☑ | Parent may change: Unchecked → Indeterminate OR Indeterminate → Checked |
| Checked ☑ | Click → Uncheck | Unchecked ☐ | Parent may change: Checked → Indeterminate OR Indeterminate → Unchecked |

**Code:** `onModelCheckboxChange()` (lines 238-263)
```typescript
onModelCheckboxChange(manufacturer: string, model: string, checked: boolean): void {
  const key = `${manufacturer}|${model}`;

  if (checked) {
    this.selectedRows.add(key);  // Add ONLY this model
  } else {
    this.selectedRows.delete(key);  // Remove ONLY this model
  }
}
```

### Rule 3: Parent State Calculation (Automatic)

**Trigger:** After ANY selection change (manufacturer or model click)

**Algorithm:** `getManufacturerCheckboxState()` (lines 175-190)

```typescript
getManufacturerCheckboxState(manufacturer: string): 'checked' | 'indeterminate' | 'unchecked' {
  const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);
  const checkedCount = manufacturerRows.filter(row => this.selectedRows.has(row.key)).length;

  if (checkedCount === 0) return 'unchecked';
  if (checkedCount === manufacturerRows.length) return 'checked';
  return 'indeterminate';  // Some but not all
}
```

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

**Code Logic:**
```typescript
// Template binding (line 23):
[nzChecked]="getManufacturerCheckboxState($any(row).manufacturer) === 'checked'"

// When indeterminate or unchecked, nzChecked = false
// Clicking calls onManufacturerCheckboxChange(manufacturer, true)
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
getManufacturerCheckboxState(manufacturer) {
  // Count selected children for this manufacturer
  // Return: 'unchecked' | 'indeterminate' | 'checked'
}
```

---

## Implementation Details

### Data Structure

```typescript
// Selection storage (lines 79)
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

## Migration Notes: Table Picker vs Base Picker

**autos (commit 018c55e):** Uses `TablePickerComponent` with dual checkboxes
**autos-prime-ng (current):** Uses `BasePickerComponent` with single selection column

### Key Differences

| Feature | TablePickerComponent | BasePickerComponent |
|---------|---------------------|---------------------|
| **Checkbox Columns** | 2 (Manufacturer + Model) | 1 (Selection column) |
| **Parent Checkbox** | ✅ Tri-state (unchecked/indeterminate/checked) | ❌ Not implemented |
| **Bulk Selection** | ✅ Click manufacturer to select all models | ❌ Individual selection only |
| **Selection Pattern** | Parent-child relationship | Flat individual selection |
| **Use Case** | Quick bulk manufacturer selection | Precise individual model selection |

### Why the Dual Checkbox Pattern is Powerful

1. **Efficiency:** Select all Ford models with one click vs. 20+ individual clicks
2. **Visual Feedback:** Indeterminate state shows partial manufacturer selection at a glance
3. **Flexibility:** Can toggle entire manufacturer or cherry-pick individual models
4. **Intuitive:** Matches familiar UI patterns (file system checkboxes, email selection)

---

## Recommendations for BasePickerComponent Enhancement

If implementing dual checkbox pattern in BasePickerComponent:

1. **Add Manufacturer Column Checkbox**
   - Calculate tri-state based on selected models
   - Implement `onManufacturerCheckboxChange()` logic

2. **Update Selection Model**
   - Continue using `Set<string>` for performance
   - Key format: `"manufacturer|model"`

3. **State Calculation**
   - Derive parent state from children (don't store separately)
   - Use `getManufacturerCheckboxState()` pattern

4. **Visual Consistency**
   - Use indeterminate checkbox styling (partial fill or dash)
   - NG-ZORRO: `nzIndeterminate` attribute
   - PrimeNG: `p-checkbox-indeterminate` class

---

**Document Created:** 2025-11-08
**Author:** Claude Code
**Purpose:** Document parent-child checkbox pattern for Model Picker component migration reference


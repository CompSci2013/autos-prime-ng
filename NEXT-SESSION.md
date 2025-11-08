# Panel Popout State Synchronization - Session Findings

## Date: 2025-11-08

## Current Status: PARTIALLY WORKING

### What's Working ✅

1. **Main Window → Popout Communication:**
   - Centralized broadcast pattern implemented in DiscoverComponent
   - Single `subscribeToStateBroadcast()` subscription broadcasts to all popouts
   - STATE_UPDATE messages successfully sent to popouts
   - Popouts receiving and processing STATE_UPDATE messages

2. **Popout → Main Window Communication:**
   - PICKER_SELECTION_CHANGE messages sent from popout
   - Main window correctly receives and processes messages
   - modelCombos parsing fixed (URL string → object array)
   - Main window state updates correctly
   - Results table updates correctly (shows 3 results)
   - Query Control shows correct filter chips

3. **MOVE Semantics:**
   - Panels removed from main page when popped out
   - Gray placeholder shown correctly
   - Panels restored when popout closes

### Critical Bug Found 🐛

**Popout picker selection state is NOT persisted after Apply button is clicked**

**Evidence from Screenshot:**
- Main window: "Active Filters: 3 model(s) selected" ✅
- Main window results: Shows 3 vehicles ✅
- Popout window: "0 items selected" ❌ (Should show 3)
- Popout picker: No rows selected/highlighted ❌

**Evidence from Console Logs:**

```
// Popout window BEFORE Apply:
[BasePickerComponent] Row selection changed. Total selected: 3

// Popout clicks Apply:
[BasePickerComponent] Apply clicked
[BasePickerComponent] Selected rows (keys): (3) ['Affordable Aluminum|...', ...]
[PopOutContext] Sending message: PICKER_SELECTION_CHANGE

// Popout receives STATE_UPDATE back:
[PanelPopout] Received message: STATE_UPDATE
[StateManagement] syncStateFromExternal: {..., newFilters: {modelCombos: Array(3)}}
[BasePickerComponent] externalFilters changed: {modelCombos: Array(3)}
[BasePickerComponent] No external filters to apply  ← ❌ PROBLEM!
```

### Root Cause Analysis

**BasePickerComponent is NOT re-hydrating selection state from externalFilters when in popout mode**

**The Flow:**
1. User selects 3 items in popout picker ✅
2. Clicks Apply ✅
3. Popout sends PICKER_SELECTION_CHANGE to main window ✅
4. Main window updates state (modelCombos: [3 items]) ✅
5. Main window broadcasts STATE_UPDATE back to popout ✅
6. Popout receives STATE_UPDATE ✅
7. Popout calls `syncStateFromExternal()` ✅
8. Popout updates `externalFilters` ✅
9. BasePickerComponent receives `externalFilters` change ✅
10. **BasePickerComponent logs "No external filters to apply"** ❌
11. **Picker selection state is NOT restored** ❌

### Why This Happens

Looking at BasePickerComponent logic:
- When Apply is clicked, component emits selection change
- Component may clear its own selection state
- When externalFilters come back from main window, component checks:
  - If in popout mode AND externalFilters changed
  - Logs "No external filters to apply"
  - Does NOT call hydration logic to restore selection

### The Fix Needed

**File:** `/home/odin/projects/autos-prime-ng/frontend/src/app/shared/components/base-picker/base-picker.component.ts`

**Location:** `ngOnChanges()` method and/or `externalFilters` change handler

**Required Behavior:**
1. When `externalFilters` change AND component is in popout mode
2. AND filters contain `modelCombos` (or relevant URL param)
3. Component should hydrate its selection state from externalFilters
4. This restores visual selection in the picker table

**Current Code Issue:**
The component likely has logic that says "don't hydrate from externalFilters if in popout mode" to prevent circular updates. But this prevents the NECESSARY hydration after user clicks Apply.

**Solution Approach:**
Add a flag or timestamp to distinguish between:
- **External filter change from main window** (should NOT trigger re-emit)
- **External filter change reflecting THIS popout's own Apply action** (SHOULD hydrate selection)

OR use a simpler approach:
- Always hydrate selection from externalFilters in popout mode
- Use a debounce or flag to prevent circular emissions
- Ensure hydration doesn't trigger another PICKER_SELECTION_CHANGE message

### Testing Scenario

1. Open Discover page
2. Pop out Model Picker
3. Select 3 models in popout
4. Click Apply
5. **Expected:** Popout picker shows "3 items selected" and rows remain highlighted
6. **Actual:** Popout picker shows "0 items selected" and no rows highlighted
7. Main window correctly shows 3 results and "3 model(s) selected"

### Code Locations

**Files to investigate:**
- `/home/odin/projects/autos-prime-ng/frontend/src/app/shared/components/base-picker/base-picker.component.ts`
  - `ngOnChanges()` method
  - `externalFilters` @Input handler
  - Hydration logic (likely around line 200-300)
  - Apply button handler (emits selection change)

**Relevant logs to add:**
```typescript
console.log('[BasePickerComponent] externalFilters changed:', externalFilters);
console.log('[BasePickerComponent] Should hydrate?', this.isPopOutMode, hasModelCombos);
console.log('[BasePickerComponent] Current selection:', this.selectedRowKeys);
console.log('[BasePickerComponent] Hydrating selection from externalFilters');
```

### Architecture Context

**Panel Popout Architecture:**
- Main window owns ALL state (URL is single source of truth)
- Popouts are "dumb receivers" that display state via BroadcastChannel
- When popout makes changes, it sends message to main window
- Main window updates state and broadcasts back to ALL popouts
- Popouts sync their state from broadcast (including the one that sent the change)

**This is CORRECT architecture** - the issue is just missing hydration logic in BasePickerComponent

### Next Steps

1. Read BasePickerComponent source code
2. Find where externalFilters change is handled
3. Identify why "No external filters to apply" is logged
4. Add logic to hydrate selection state from externalFilters when in popout mode
5. Ensure hydration doesn't trigger circular PICKER_SELECTION_CHANGE emissions
6. Test: Select items → Apply → Verify selection persists in popout

### Related Commits

- `4937c50` - Refactor popout state broadcasting to centralized pattern
- `4112075` - Fix modelCombos parsing: Convert URL string to object array
- `17d2709` - Fix popout message handler: Parse modelCombos string to array
- `e7309c6` - Fix Discover page popouts: Handle PICKER_SELECTION_CHANGE message type

### Success Criteria

When fixed:
- ✅ User selects items in popout picker
- ✅ User clicks Apply
- ✅ Main window shows correct results
- ✅ **Popout picker shows correct selection count**
- ✅ **Popout picker rows remain highlighted**
- ✅ Closing and re-opening popout shows correct selection (from URL state)

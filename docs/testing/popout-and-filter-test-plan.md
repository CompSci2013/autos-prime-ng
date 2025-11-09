# Pop-Out Window and Filter State Test Plan

**Document Version:** 1.0
**Created:** 2025-11-09
**Related Bug:** [popout-filter-clear-stale-results.md](../bugs/popout-filter-clear-stale-results.md)
**Scope:** Pop-out windows, filters, highlights, state synchronization

---

## Test Execution Notes

**Test Environment:**
- Frontend: http://192.168.0.244:4201/discover
- Backend: v1.6.4
- Browser: Chrome/Firefox latest stable

**Pre-Test Checklist:**
- [ ] Clear browser cache and localStorage
- [ ] Verify backend is running and healthy (`/api/health`)
- [ ] Verify Elasticsearch has 4,880 total vehicle records
- [ ] Open browser console for error monitoring
- [ ] Set console filter to show all log levels

**Terminology:**
- **Main Window:** The primary `/discover` page
- **Pop-Out:** A separate browser window containing a popped-out panel
- **Popped-In:** Panel displayed within main window (not popped out)
- **Filter:** Data filtering (affects API results) - URL params without `h_` prefix
- **Highlight:** UI-only emphasis (doesn't affect API results) - URL params with `h_` prefix

**Tier Classifications:**
- **Tier 1 (Critical Path):** Essential functionality, blocking issues, critical user flows - must pass before release
- **Tier 2 (Important):** Important features, common use cases - should pass for production quality
- **Tier 3 (Edge Cases):** Edge cases, rare scenarios, nice-to-have coverage - can be deferred

**Test Frameworks:**
- **Playwright:** End-to-end tests with multi-window support, UI interactions, full user flows
- **Karma/Jasmine:** Unit/integration tests for isolated component logic and services

---

## Test Categories

1. **Basic Filter Operations** (Tests 001-020)
2. **Pop-Out Window Lifecycle** (Tests 021-040)
3. **Filter + Pop-Out Interactions** (Tests 041-065)
4. **Highlight Mode Operations** (Tests 066-090)
5. **Multi-Window Synchronization** (Tests 091-115)
6. **URL State Persistence** (Tests 116-130)
7. **Error and Edge Cases** (Tests 131-150)

---

## Category 1: Basic Filter Operations (No Pop-Outs)

### Test 001: Add Single Manufacturer Filter
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state, no filters applied
**User Actions:**
1. Navigate to `/discover`
2. Open Query Control panel (if collapsed)
3. Click "Add Filter" button
4. Select "Manufacturer" from filter type dropdown
5. Select "Ford" from manufacturer dropdown
6. Click "Apply" or press Enter

**Expected Behavior:**
- URL updates to `?manufacturer=Ford`
- Results table shows only Ford vehicles (~1,200 results)
- Results table header shows count: "~1,200 results"
- Pagination updates to reflect filtered count
- Interactive Charts update to show Ford-only statistics
- Query Control shows filter chip: "Manufacturer: Ford"

---

### Test 002: Add Multiple Filters (Manufacturer + Body Class)
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state, no filters applied
**User Actions:**
1. Navigate to `/discover`
2. Add filter: Manufacturer = "Ford"
3. Add filter: Body Class = "Sedan"

**Expected Behavior:**
- URL updates to `?manufacturer=Ford&bodyClass=Sedan`
- Results table shows only Ford Sedans (~230 results)
- Results table header shows count: "~230 results"
- Interactive Charts show statistics for Ford Sedans only
- Query Control shows two filter chips:
  - "Manufacturer: Ford"
  - "Body Class: Sedan"

---

### Test 003: Clear Single Filter (Keep Others)
**Priority:** High
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Two filters applied (Manufacturer=Ford, BodyClass=Sedan)
**User Actions:**
1. Start with URL: `?manufacturer=Ford&bodyClass=Sedan`
2. Click X button on "Manufacturer: Ford" chip in Query Control

**Expected Behavior:**
- URL updates to `?bodyClass=Sedan`
- Results table shows all Sedans (~3,500 results)
- Results table count updates accordingly
- Interactive Charts show all Sedan statistics (all manufacturers)
- Query Control shows only "Body Class: Sedan" chip
- No console errors

---

### Test 004: Clear All Filters
**Priority:** Critical (Related to main bug)
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Two filters applied (Manufacturer=Ford, BodyClass=Sedan)
**User Actions:**
1. Start with URL: `?manufacturer=Ford&bodyClass=Sedan` showing ~230 results
2. Click "Clear Filters" button in Query Control

**Expected Behavior:**
- URL updates to base `/discover` (no query params)
- Results table shows all vehicles (4,880 results)
- Results table header: "4,880 results"
- Pagination: "Showing 1 to 10 of 4880 entries"
- Interactive Charts show statistics for all data
- Query Control shows no filter chips
- No console errors

---

### Test 005: Modify Existing Filter
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** One filter applied (Manufacturer=Ford)
**User Actions:**
1. Start with URL: `?manufacturer=Ford`
2. Click edit icon on "Manufacturer: Ford" chip
3. Change manufacturer to "Chevrolet"
4. Click "Apply"

**Expected Behavior:**
- URL updates to `?manufacturer=Chevrolet`
- Results table shows only Chevrolet vehicles
- Count updates accordingly
- Interactive Charts update to show Chevrolet statistics
- Query Control chip updates to "Manufacturer: Chevrolet"

---

### Test 006: Add Year Range Filter
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Add filter: Year Min = 1965
3. Add filter: Year Max = 1970

**Expected Behavior:**
- URL updates to `?yearMin=1965&yearMax=1970`
- Results table shows only 1965-1970 vehicles
- Count updates accordingly
- Interactive Charts show statistics for year range
- Query Control shows "Year: 1965-1970" chip

---

### Test 007: Add Page Size Parameter
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Change page size dropdown from 10 to 50

**Expected Behavior:**
- URL updates to `?page=1&size=50`
- Results table shows 50 results per page
- Pagination updates: "Showing 1 to 50 of 4880 entries"
- Page size persists on filter changes

---

### Test 008: Sort by Column
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Click "Year" column header to sort ascending

**Expected Behavior:**
- URL updates to `?sort=year&sortDirection=asc`
- Results table sorts by year ascending (oldest first)
- Column header shows ascending arrow indicator
- Sort persists on filter changes

---

### Test 009: Filter + Sort + Pagination
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Add filter: Manufacturer = "Ford"
3. Sort by Year ascending
4. Navigate to page 2

**Expected Behavior:**
- URL: `?manufacturer=Ford&sort=year&sortDirection=asc&page=2&size=10`
- Results table shows page 2 of sorted Ford results
- All parameters persist together
- Pagination shows "Showing 11 to 20 of ~1200 entries"

---

### Test 010: Clear Filters Resets Pagination
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Filters applied, on page 5
**User Actions:**
1. Start with URL: `?manufacturer=Ford&page=5&size=10`
2. Click "Clear Filters" button

**Expected Behavior:**
- URL updates to `?page=1&size=10` (page resets to 1)
- Results table shows page 1 of all results
- Pagination resets to start

---

### Test 011: Add Filter via Picker Component
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Expand "Make/Model Picker" panel
3. Check "Ford" → "F-150" checkbox
4. Check "Chevrolet" → "Corvette" checkbox

**Expected Behavior:**
- URL updates to `?modelCombos=Ford:F-150,Chevrolet:Corvette`
- Results table shows only F-150 and Corvette vehicles
- Count updates accordingly
- Interactive Charts show statistics for selected models
- Picker shows 2 selections

---

### Test 012: Clear Selection in Picker
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Two model combos selected
**User Actions:**
1. Start with Ford F-150 and Chevrolet Corvette selected
2. Click "Clear All" button in picker

**Expected Behavior:**
- URL updates to base URL (modelCombos removed)
- Results table shows all vehicles
- Picker shows no selections
- Count: 4,880 results

---

### Test 013: Add Filter via Query Control, Then Modify via Picker
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Add filter via Query Control: Manufacturer = "Ford"
2. Then check "Ford" → "F-150" in picker

**Expected Behavior:**
- URL transitions from `?manufacturer=Ford` to `?modelCombos=Ford:F-150`
- Results table shows only Ford F-150 (more specific than just Ford)
- Query Control chip updates to reflect model combo
- Count updates accordingly

---

### Test 014: Browser Back Button After Filter Add
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover` (clean state)
2. Add filter: Manufacturer = "Ford"
3. Observe filtered results
4. Click browser back button

**Expected Behavior:**
- URL returns to base `/discover`
- Results table returns to showing all 4,880 vehicles
- Filter chip disappears from Query Control
- No console errors
- No duplicate API calls

---

### Test 015: Browser Forward Button After Back
**Priority:** Medium
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Following Test 014
**User Actions:**
1. After clicking back (now at base URL)
2. Click browser forward button

**Expected Behavior:**
- URL returns to `?manufacturer=Ford`
- Results table returns to showing Ford vehicles
- Filter chip reappears in Query Control
- State fully restored

---

### Test 016: Refresh Page with Filters Applied
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Filters applied
**User Actions:**
1. Start with URL: `?manufacturer=Ford&bodyClass=Sedan`
2. Press F5 or click browser refresh button

**Expected Behavior:**
- Page reloads
- URL parameters preserved: `?manufacturer=Ford&bodyClass=Sedan`
- Results table shows filtered data (230 results)
- Filter chips appear in Query Control
- Interactive Charts show filtered statistics
- No data loss

---

### Test 017: Direct URL Navigation with Filters
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean browser (new tab)
**User Actions:**
1. Open new browser tab
2. Navigate directly to: `http://192.168.0.244:4201/discover?manufacturer=Ford&bodyClass=Sedan`

**Expected Behavior:**
- Page loads with filters applied
- Results table shows Ford Sedans (230 results)
- Filter chips appear in Query Control
- Interactive Charts show filtered statistics
- All components hydrate correctly from URL

---

### Test 018: Add Multiple Values to Same Filter Type
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Add filter: Body Class = "Sedan"
3. Add filter: Body Class = "Coupe" (if multi-select supported)

**Expected Behavior:**
- URL updates to `?bodyClass=Sedan,Coupe` (comma-separated)
- Results table shows Sedans OR Coupes
- Query Control shows single chip: "Body Class: Sedan, Coupe"
- Count includes both body classes

---

### Test 019: Invalid Filter Value in URL
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate directly to: `http://192.168.0.244:4201/discover?manufacturer=InvalidManufacturerXYZ`

**Expected Behavior:**
- Page loads without errors
- Results table shows 0 results (or empty state message)
- Filter chip shows "Manufacturer: InvalidManufacturerXYZ"
- User can clear invalid filter
- No console errors (graceful handling)

---

### Test 020: Special Characters in Filter Values
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate directly to: `http://192.168.0.244:4201/discover?manufacturer=Eagle%20Ford%20Tanks%20%26%20Trailers%20LLC`

**Expected Behavior:**
- URL parameters correctly encoded/decoded
- Results table shows vehicles from that manufacturer
- Filter chip displays correct name with special characters
- No encoding/decoding errors

---

## Category 2: Pop-Out Window Lifecycle

### Test 021: Pop Out Results Table
**Priority:** Critical
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state, no filters
**User Actions:**
1. Navigate to `/discover`
2. Click "Pop Out" button on Vehicle Results panel

**Expected Behavior:**
- New browser window opens
- Pop-out window displays Results table with all 4,880 vehicles
- Main window shows Results panel removed (MOVE semantics)
- Pop-out window title: "Vehicle Results"
- Pop-out URL: `http://192.168.0.244:4201/popout/vehicle-results`
- Console log: "Pop-out panel vehicle-results is ready"

---

### Test 022: Pop Out Interactive Charts
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state, no filters
**User Actions:**
1. Navigate to `/discover`
2. Click "Pop Out" button on Interactive Charts panel

**Expected Behavior:**
- New browser window opens
- Pop-out window displays all 4 charts
- Main window shows Charts panel removed
- Charts render correctly in pop-out
- Pop-out receives initial state via BroadcastChannel

---

### Test 023: Close Pop-Out Window (Manual Close)
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. Click X button on pop-out window (browser window close)

**Expected Behavior:**
- Pop-out window closes
- Main window restores Results table panel (MOVE semantics)
- Results table appears in original location in main window
- Results table shows correct data (no data loss)
- Console log: "Pop-out window for vehicle-results closed, restoring panel"

---

### Test 024: Close Pop-Out via "Pop In" Button
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. Click "Pop In" button in pop-out window

**Expected Behavior:**
- Same as Test 023 (manual close)
- Panel restored to main window
- No data loss
- Clean state transition

---

### Test 025: Pop Out Multiple Panels Simultaneously
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Pop out Results table
3. Pop out Interactive Charts

**Expected Behavior:**
- Two separate pop-out windows open
- Main window shows both panels removed
- Both pop-outs display correct content
- Both pop-outs receive state updates independently
- localStorage tracks both popped-out panels

---

### Test 026: Close One Pop-Out, Keep Other Open
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Two panels popped out (Results + Charts)
**User Actions:**
1. Start with Results and Charts popped out
2. Close Results pop-out window

**Expected Behavior:**
- Results panel restored to main window
- Charts pop-out remains open and functional
- Main window and Charts pop-out stay synchronized
- No interference between panels

---

### Test 027: Refresh Main Window with Pop-Out Open
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. Press F5 on main window

**Expected Behavior:**
- Main window reloads
- localStorage remembers popped-out state
- Main window shows Results panel as removed (still popped out)
- Pop-out window continues to function
- State sync resumes after main window reload
- BroadcastChannel reconnects

---

### Test 028: Refresh Pop-Out Window
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. Press F5 on pop-out window

**Expected Behavior:**
- Pop-out window reloads
- Pop-out requests current state from main window
- Main window sends state via BroadcastChannel
- Pop-out displays current filtered/highlighted data
- No data loss

---

### Test 029: Close Main Window with Pop-Out Open
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. Close main window (browser tab close)

**Expected Behavior:**
- Main window closes
- Pop-out window remains open but becomes orphaned
- Pop-out displays last known state
- Pop-out shows warning/message about lost connection (optional)
- No crashes or errors

---

### Test 030: Reopen Main Window After Close
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Following Test 029 (orphaned pop-out)
**User Actions:**
1. After closing main window
2. Open new browser tab
3. Navigate to `/discover`

**Expected Behavior:**
- New main window loads
- Orphaned pop-out does NOT reconnect (new BroadcastChannel ID)
- New main window shows clean state (localStorage may differ per session)
- User must close orphaned pop-out and pop-out again

---

### Test 031: Pop Out, Change Window Size
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. Resize pop-out window (drag corners)
3. Observe table responsiveness

**Expected Behavior:**
- Table adjusts to new window size
- Columns resize responsively
- Pagination remains functional
- No layout breaks

---

### Test 032: Pop Out, Minimize Window
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. Minimize pop-out window
3. Add filter in main window
4. Restore pop-out window

**Expected Behavior:**
- Pop-out receives state updates while minimized
- On restore, pop-out shows updated filtered data
- No missed updates

---

### Test 033: Pop Out to Secondary Monitor
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Multi-monitor setup, Results table popped out
**User Actions:**
1. Pop out Results table
2. Drag pop-out window to secondary monitor
3. Add filter in main window (on primary monitor)

**Expected Behavior:**
- Pop-out works on secondary monitor
- State sync works across monitors
- Pop-out updates when filters applied
- No performance issues

---

### Test 034: Pop Out, Close Main Window, Reopen, Pop In
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. Close main window
3. Reopen main window (new tab)
4. Close pop-out window (attempt pop-in)

**Expected Behavior:**
- Pop-out closes (orphaned, no main window to pop into)
- New main window doesn't receive panel
- User must manually re-access results in new main window
- No crashes

---

### Test 035: Pop Out Same Panel Twice (Error Case)
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Pop out Results table
3. Attempt to pop out Results table again (button should be disabled)

**Expected Behavior:**
- Second pop-out attempt prevented
- UI shows "Pop Out" button disabled or hidden
- Only one pop-out window per panel allowed
- No duplicate pop-outs created

---

### Test 036: localStorage Persistence of Pop-Out State
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean localStorage
**User Actions:**
1. Navigate to `/discover`
2. Pop out Results table
3. Close browser completely
4. Reopen browser
5. Navigate to `/discover`

**Expected Behavior:**
- Main window loads
- localStorage remembers popped-out state
- Main window shows Results panel as removed
- Pop-out window does NOT automatically reopen (user must pop-out again)
- State consistent

---

### Test 037: Pop Out, Clear localStorage, Refresh
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. Open DevTools → Application → Local Storage
3. Clear localStorage
4. Refresh main window

**Expected Behavior:**
- Main window reloads without popped-out state knowledge
- Main window shows Results panel (no longer knows it's popped out)
- Pop-out window becomes orphaned
- No crashes
- User sees duplicate panels (one in main, one in pop-out)

---

### Test 038: Pop Out with Filters Already Applied
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Filters applied (Manufacturer=Ford)
**User Actions:**
1. Start with URL: `?manufacturer=Ford` showing ~1,200 results
2. Pop out Results table

**Expected Behavior:**
- Pop-out window opens showing Ford vehicles only
- Pop-out count: ~1,200 results
- Pop-out receives current filter state via BroadcastChannel
- Filters persist in pop-out

---

### Test 039: Pop Out, Then Apply Filter
**Priority:** Critical (Main Bug Scenario)
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover` (no filters)
2. Pop out Results table
3. In main window, add filter: Manufacturer = "Ford"

**Expected Behavior:**
- Main window URL: `?manufacturer=Ford`
- Main window shows filtered results (if visible)
- Pop-out window receives STATE_UPDATE message
- Pop-out window shows Ford vehicles only
- Pop-out count updates to ~1,200 results
- Console log: "Pop-out received STATE_UPDATE"

---

### Test 040: Pop Out, Then Clear Filters (Main Bug Test)
**Priority:** CRITICAL (Primary Bug Case)
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Filters applied, Results table popped out
**User Actions:**
1. Apply filters: Manufacturer=Ford, BodyClass=Sedan (~230 results)
2. Pop out Results table (shows 230 results)
3. In main window, click "Clear Filters" button

**Expected Behavior:**
- Main window URL: base `/discover` (no filter params)
- Pop-out window receives STATE_UPDATE message with empty filters
- Pop-out window refreshes data from API with no filters
- Pop-out window shows all 4,880 vehicles
- Pop-out count: "4,880 results"
- Pagination: "Showing 1 to 10 of 4880 entries"
- No console errors

**KNOWN BUG:** Pop-out remains stuck at 230 results (see bug report)

---

## Category 3: Filter + Pop-Out Interactions

### Test 041: Add Filter Before Pop-Out
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Add filter: Manufacturer = "Ford"
3. Verify results show ~1,200 Ford vehicles
4. Pop out Results table

**Expected Behavior:**
- Pop-out opens with Ford vehicles only
- Pop-out count: ~1,200 results
- Pop-out synchronized with main window state

---

### Test 042: Add Filter After Pop-Out
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Pop out Results table (shows all 4,880)
3. In main window, add filter: Manufacturer = "Ford"

**Expected Behavior:**
- Main window applies filter
- Pop-out receives STATE_UPDATE
- Pop-out shows Ford vehicles only (~1,200)
- Pop-out count updates

---

### Test 043: Modify Filter with Pop-Out Open
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Filter applied, Results table popped out
**User Actions:**
1. Start with Manufacturer=Ford filter, Results popped out
2. In main window, modify filter to Manufacturer=Chevrolet

**Expected Behavior:**
- Main window URL: `?manufacturer=Chevrolet`
- Pop-out receives STATE_UPDATE
- Pop-out switches to showing Chevrolet vehicles
- Pop-out count updates accordingly

---

### Test 044: Add Second Filter with Pop-Out Open
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** One filter applied, Results table popped out
**User Actions:**
1. Start with Manufacturer=Ford, Results popped out (~1,200)
2. In main window, add filter: BodyClass=Sedan

**Expected Behavior:**
- Main window URL: `?manufacturer=Ford&bodyClass=Sedan`
- Pop-out receives STATE_UPDATE
- Pop-out shows Ford Sedans only (~230)
- Pop-out count updates

---

### Test 045: Remove One Filter (Keep Others) with Pop-Out Open
**Priority:** High
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Two filters applied, Results table popped out
**User Actions:**
1. Start with Manufacturer=Ford & BodyClass=Sedan, Results popped out (~230)
2. In main window, remove Manufacturer filter (click X on chip)

**Expected Behavior:**
- Main window URL: `?bodyClass=Sedan`
- Pop-out receives STATE_UPDATE
- Pop-out shows all Sedans (~3,500 from all manufacturers)
- Pop-out count updates

---

### Test 046: Clear All Filters with Pop-Out Open (Repeated Bug Test)
**Priority:** CRITICAL
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Multiple filters applied, Results table popped out
**User Actions:**
1. Start with Manufacturer=Ford & BodyClass=Sedan (~230)
2. Pop out Results table
3. In main window, click "Clear Filters"

**Expected Behavior:**
- Main window URL: base `/discover`
- Pop-out receives STATE_UPDATE with empty filters
- Pop-out shows all 4,880 vehicles
- Pop-out count: "4,880 results"

**KNOWN BUG:** Pop-out stuck at 230 results

---

### Test 047: Apply Filter, Pop Out, Close Pop-Out, Clear Filter
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Apply filter: Manufacturer=Ford
2. Pop out Results table
3. Close pop-out (pop-in)
4. In main window, clear filter

**Expected Behavior:**
- Results panel returns to main window (step 3)
- Filter cleared in main window (step 4)
- Main window shows all 4,880 vehicles
- No stuck filters

---

### Test 048: Clear Filter, Then Pop Out
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Filters applied
**User Actions:**
1. Apply filter: Manufacturer=Ford
2. Clear filter (back to all 4,880)
3. Pop out Results table

**Expected Behavior:**
- Pop-out opens showing all 4,880 vehicles
- Pop-out receives correct unfiltered state
- No residual filter state

---

### Test 049: Rapid Filter Changes with Pop-Out Open
**Priority:** Medium
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. In main window, rapidly apply multiple filters:
   - Add Manufacturer=Ford (wait 500ms)
   - Add BodyClass=Sedan (wait 500ms)
   - Remove Manufacturer (wait 500ms)
   - Add Manufacturer=Chevrolet (wait 500ms)
   - Clear all filters

**Expected Behavior:**
- Pop-out receives all STATE_UPDATE messages in order
- Pop-out updates after each filter change
- No race conditions
- Final state: all 4,880 vehicles
- No console errors

---

### Test 050: Filter with Picker, Then Pop Out
**Priority:** Medium
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Use picker to select: Ford F-150, Chevrolet Corvette
3. Verify results show only those models
4. Pop out Results table

**Expected Behavior:**
- Pop-out shows selected models only
- Pop-out receives model combo state
- Picker selections synchronized

---

### Test 051: Pop Out, Then Use Picker in Main Window
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Pop out Results table
3. In main window, use picker to select: Ford F-150

**Expected Behavior:**
- Main window URL: `?modelCombos=Ford:F-150`
- Pop-out receives STATE_UPDATE
- Pop-out shows only Ford F-150 vehicles
- Pop-out count updates

---

### Test 052: Clear Picker Selection with Pop-Out Open
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Model combos selected, Results table popped out
**User Actions:**
1. Start with Ford F-150 selected, Results popped out
2. In main window, click "Clear All" in picker

**Expected Behavior:**
- Main window URL: base `/discover`
- Pop-out receives STATE_UPDATE
- Pop-out shows all 4,880 vehicles
- Picker shows no selections

---

### Test 053: Sort Column with Pop-Out Open
**Priority:** Medium
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. In main window (or pop-out), click Year column header to sort

**Expected Behavior:**
- URL updates with sort parameters
- Both windows show sorted results
- Sort state synchronized
- Sorting works in both windows

---

### Test 054: Change Page Size with Pop-Out Open
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. In pop-out, change page size from 10 to 50

**Expected Behavior:**
- Pop-out shows 50 results per page
- Main window (if Results visible) shows same page size
- URL updates: `?size=50`
- Page size synchronized

---

### Test 055: Navigate Pages with Pop-Out Open
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Results table popped out
**User Actions:**
1. Pop out Results table
2. In pop-out, navigate to page 3

**Expected Behavior:**
- Pop-out shows page 3
- URL updates: `?page=3`
- Pagination state synchronized
- Main window aware of page change

---

### Test 056: Filter, Pop Out Charts, Verify Chart Updates
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Pop out Interactive Charts
3. In main window, add filter: Manufacturer=Ford

**Expected Behavior:**
- Main window URL: `?manufacturer=Ford`
- Pop-out charts receive STATE_UPDATE
- All 4 charts update to show Ford-only statistics:
  - Manufacturers chart: Only Ford bar visible
  - Models chart: Only Ford models shown
  - Year chart: Ford year distribution
  - Body Class chart: Ford body class distribution

---

### Test 057: Clear Filter, Pop Out Charts, Verify Full Stats
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Filters applied, Charts popped out
**User Actions:**
1. Start with Manufacturer=Ford & BodyClass=Sedan
2. Pop out Interactive Charts (shows filtered stats)
3. In main window, clear all filters

**Expected Behavior:**
- Main window URL: base `/discover`
- Pop-out charts receive STATE_UPDATE
- All 4 charts update to show full dataset statistics
- Manufacturers chart shows all manufacturers
- Year chart shows full year range distribution
- Body Class chart shows all body classes

**LIKELY BUG:** Charts may remain stuck on filtered stats

---

### Test 058: Pop Out Both Results and Charts, Apply Filter
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Navigate to `/discover`
2. Pop out Results table
3. Pop out Interactive Charts
4. In main window, add filter: Manufacturer=Ford

**Expected Behavior:**
- Both pop-outs receive STATE_UPDATE
- Results pop-out shows Ford vehicles only
- Charts pop-out shows Ford statistics only
- Both windows synchronized

---

### Test 059: Pop Out Both Results and Charts, Clear Filters
**Priority:** CRITICAL
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Filters applied, both panels popped out
**User Actions:**
1. Start with Manufacturer=Ford & BodyClass=Sedan (~230)
2. Pop out Results table
3. Pop out Interactive Charts
4. In main window, clear all filters

**Expected Behavior:**
- Both pop-outs receive STATE_UPDATE
- Results shows all 4,880 vehicles
- Charts show full dataset statistics
- Both windows synchronized

**LIKELY BUG:** Both pop-outs stuck on filtered data

---

### Test 060: Filter Before Pop-Out, Then Clear After Pop-Out
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Add filter: Manufacturer=Ford
2. Pop out Results table (shows Ford vehicles)
3. Verify pop-out shows ~1,200 Ford results
4. In main window, clear filter

**Expected Behavior:**
- Pop-out updates to show all 4,880 vehicles
- No stale data in pop-out

---

### Test 061: Browser Back Button with Pop-Out Open (Filter History)
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean state, Results table popped out
**User Actions:**
1. Navigate to `/discover` (clean)
2. Pop out Results table
3. Add filter: Manufacturer=Ford (URL: `?manufacturer=Ford`)
4. Add filter: BodyClass=Sedan (URL: `?manufacturer=Ford&bodyClass=Sedan`)
5. Click browser back button

**Expected Behavior:**
- URL returns to `?manufacturer=Ford`
- Pop-out receives STATE_UPDATE
- Pop-out shows Ford vehicles only (~1,200, not ~230)
- State rolls back correctly

---

### Test 062: Browser Forward Button with Pop-Out Open
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Following Test 061
**User Actions:**
1. After clicking back (now at `?manufacturer=Ford`)
2. Click browser forward button

**Expected Behavior:**
- URL returns to `?manufacturer=Ford&bodyClass=Sedan`
- Pop-out receives STATE_UPDATE
- Pop-out shows Ford Sedans (~230)
- State rolls forward correctly

---

### Test 063: Refresh Page with Filters and Pop-Out Open
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Filters applied, Results table popped out
**User Actions:**
1. Start with `?manufacturer=Ford&bodyClass=Sedan`, Results popped out
2. Press F5 on main window

**Expected Behavior:**
- Main window reloads
- URL preserved: `?manufacturer=Ford&bodyClass=Sedan`
- Pop-out continues to display filtered results
- BroadcastChannel reconnects after reload
- Pop-out receives fresh state from reloaded main window

---

### Test 064: Direct URL Navigation with Filters, Then Pop Out
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean browser
**User Actions:**
1. Navigate directly to: `?manufacturer=Ford&bodyClass=Sedan`
2. Wait for page load and data fetch
3. Pop out Results table

**Expected Behavior:**
- Page loads with filters applied
- Results show ~230 Ford Sedans
- Pop-out opens showing same filtered data
- Pop-out receives correct initial state

---

### Test 065: Clear Filter via URL Edit, Pop-Out Open
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Filters applied, Results table popped out
**User Actions:**
1. Start with `?manufacturer=Ford&bodyClass=Sedan`, Results popped out
2. Manually edit URL in address bar to remove parameters (back to base URL)
3. Press Enter

**Expected Behavior:**
- Main window navigates to base URL
- Pop-out receives STATE_UPDATE
- Pop-out shows all 4,880 vehicles
- State synchronized via URL change

---

## Category 4: Highlight Mode Operations

### Test 066: Enable Highlight Mode, Click Chart
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state, no filters or highlights
**User Actions:**
1. Navigate to `/discover`
2. Enable highlight mode checkbox in Interactive Charts
3. Click "Ford" bar in Manufacturers chart

**Expected Behavior:**
- URL updates to `?h_manufacturer=Ford`
- All charts apply highlight styling to Ford data
- No API call triggered (highlight is UI-only)
- Query Control shows highlight chip: "Highlight Manufacturer: Ford" (magenta color)
- Results table does NOT filter (still shows all 4,880)

---

### Test 067: Highlight Mode, Box-Select Multiple Manufacturers
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Highlight mode enabled
**User Actions:**
1. Enable highlight mode
2. Box-select "Ford" and "Chevrolet" in Manufacturers chart

**Expected Behavior:**
- URL updates to `?h_manufacturer=Ford,Chevrolet`
- Both Ford and Chevrolet highlighted in all charts
- Query Control shows "Highlight Manufacturer: Ford, Chevrolet"
- Results table still shows all 4,880 vehicles

---

### Test 068: Highlight Body Class, Verify Multiple Charts Highlight
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Highlight mode enabled
**User Actions:**
1. Enable highlight mode
2. Click "Sedan" bar in Body Class chart

**Expected Behavior:**
- URL updates to `?h_bodyClass=Sedan`
- Body Class chart highlights Sedan bar
- Year chart highlights years with Sedans
- Manufacturers chart highlights manufacturers making Sedans
- Query Control shows "Highlight Body Class: Sedan"

---

### Test 069: Highlight Year Range (Single Year)
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Highlight mode enabled
**User Actions:**
1. Enable highlight mode
2. Click "1970" bar in Year chart

**Expected Behavior:**
- URL updates to `?h_yearMin=1970&h_yearMax=1970`
- Year chart highlights 1970 bar
- Other charts highlight data from 1970
- Query Control shows "Highlight Year: 1970"

---

### Test 070: Highlight Year Range (Box-Select Multiple Years)
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Highlight mode enabled
**User Actions:**
1. Enable highlight mode
2. Box-select years 1965-1970 in Year chart

**Expected Behavior:**
- URL updates to `?h_yearMin=1965&h_yearMax=1970`
- Year chart highlights 1965-1970 bars
- Other charts highlight data from that year range
- Query Control shows "Highlight Year: 1965-1970"

---

### Test 071: Highlight Model Combos
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Highlight mode enabled, manufacturer selected
**User Actions:**
1. Enable highlight mode
2. Click "Ford" in Manufacturers chart (selects Ford for Models chart)
3. Click "Ford F-150" in Models chart

**Expected Behavior:**
- URL updates to `?h_modelCombos=Ford:F-150`
- Models chart highlights "Ford F-150" bar
- Other charts highlight Ford F-150 data
- Query Control shows "Highlight Models: Ford F-150"

---

### Test 072: Clear Single Highlight (Keep Others)
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Multiple highlights applied
**User Actions:**
1. Apply highlights: h_manufacturer=Ford, h_bodyClass=Sedan
2. Click X on "Highlight Manufacturer: Ford" chip in Query Control

**Expected Behavior:**
- URL updates to `?h_bodyClass=Sedan`
- Manufacturer highlight removed from charts
- Body Class highlight remains
- Query Control shows only Body Class highlight chip

---

### Test 073: Clear All Highlights
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Multiple highlights applied
**User Actions:**
1. Apply highlights: h_manufacturer=Ford, h_bodyClass=Sedan, h_yearMin=1965, h_yearMax=1970
2. Click "Clear Filters" button (should clear both filters and highlights)

**Expected Behavior:**
- URL updates to base `/discover`
- All highlights removed from charts
- Charts return to normal styling (no emphasis)
- Query Control shows no highlight chips
- Results table still shows all 4,880 vehicles

---

### Test 074: Highlight + Filter Same Dimension
**Priority:** Medium
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Add filter: Manufacturer=Ford (results filtered to Ford only)
2. Enable highlight mode
3. Click "Chevrolet" in Manufacturers chart (attempt to highlight)

**Expected Behavior:**
- URL: `?manufacturer=Ford&h_manufacturer=Chevrolet`
- Results table shows only Ford vehicles (filter applied)
- Charts show Ford data, with Chevrolet highlighting attempted (may show no highlight if no Chevrolet data in filtered set)
- Both filter and highlight coexist

---

### Test 075: Highlight Year Range, Then Filter Same Range
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Highlight mode enabled
**User Actions:**
1. Highlight: h_yearMin=1965, h_yearMax=1970
2. Disable highlight mode
3. Add filter: yearMin=1965, yearMax=1970

**Expected Behavior:**
- URL: `?yearMin=1965&yearMax=1970` (filter replaces highlight)
- Results table filtered to 1965-1970 vehicles
- Charts show only 1965-1970 data (no highlight emphasis, data filtered)

---

### Test 076: Pop Out Charts, Enable Highlight Mode in Pop-Out
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Charts popped out
**User Actions:**
1. Pop out Interactive Charts
2. In pop-out, enable highlight mode checkbox
3. In pop-out, click "Ford" in Manufacturers chart

**Expected Behavior:**
- Pop-out sends HIGHLIGHT_MANUFACTURER message to main window
- Main window URL updates: `?h_manufacturer=Ford`
- Main window broadcasts STATE_UPDATE to pop-out
- Pop-out charts highlight Ford data
- Main window charts (if visible) also highlight Ford

---

### Test 077: Pop Out Charts, Highlight in Main Window
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Charts popped out, highlight mode enabled in main window
**User Actions:**
1. Pop out Interactive Charts
2. In main window, enable highlight mode (if charts visible elsewhere)
3. Manually set URL: `?h_manufacturer=Ford`

**Expected Behavior:**
- Pop-out receives STATE_UPDATE with highlight parameters
- Pop-out charts highlight Ford data
- Synchronization works main → pop-out

---

### Test 078: Pop Out Charts, Highlight in Pop-Out, Clear in Main
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Charts popped out, highlight applied
**User Actions:**
1. Pop out Interactive Charts
2. Apply highlight: h_manufacturer=Ford (via pop-out)
3. In main window, click "Clear Filters" (clears highlights too)

**Expected Behavior:**
- Main window URL: base `/discover`
- Pop-out receives STATE_UPDATE with no highlights
- Pop-out charts remove highlighting
- Charts return to normal styling

---

### Test 079: Highlight, Pop Out Charts, Then Clear Highlight
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Highlights applied
**User Actions:**
1. Apply highlight: h_manufacturer=Ford
2. Pop out Interactive Charts (charts show Ford highlighted)
3. In main window, clear highlights (via URL or chip removal)

**Expected Behavior:**
- Main window URL: base `/discover`
- Pop-out receives STATE_UPDATE
- Pop-out charts remove Ford highlighting
- Charts return to normal styling

---

### Test 080: Box-Select in Pop-Out Chart (Highlight Mode)
**Priority:** High
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Charts popped out, highlight mode enabled
**User Actions:**
1. Pop out Interactive Charts
2. Enable highlight mode in pop-out
3. Box-select "Coupe" and "Pickup" in Body Class chart

**Expected Behavior:**
- Pop-out sends HIGHLIGHT_BODY_CLASS message: "Coupe,Pickup"
- Main window URL: `?h_bodyClass=Coupe,Pickup`
- Pop-out receives STATE_UPDATE
- Pop-out charts highlight both body classes
- Main window synchronized

---

### Test 081: Highlight in Normal Window, Then Pop Out
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Enable highlight mode
2. Highlight: h_manufacturer=Ford
3. Pop out Interactive Charts

**Expected Behavior:**
- Pop-out opens with Ford already highlighted
- Pop-out receives initial state with highlight parameters
- Pop-out charts display Ford emphasis

---

### Test 082: Pop Out Charts, Rapid Highlight Changes
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Charts popped out, highlight mode enabled
**User Actions:**
1. Pop out Interactive Charts
2. Rapidly apply highlights (500ms between each):
   - Click "Ford"
   - Click "Chevrolet"
   - Box-select "Ford" and "Dodge"
   - Clear all

**Expected Behavior:**
- All highlight changes sent to main window
- Main window URL updates for each change
- Pop-out receives all STATE_UPDATE messages
- Pop-out charts update for each highlight
- No race conditions
- No console errors

---

### Test 083: Highlight + Filter + Pop-Out Combined
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Add filter: Manufacturer=Ford
2. Enable highlight mode
3. Highlight: h_bodyClass=Sedan
4. Pop out Results table
5. Pop out Interactive Charts

**Expected Behavior:**
- URL: `?manufacturer=Ford&h_bodyClass=Sedan`
- Results pop-out shows Ford vehicles only (filtered)
- Charts pop-out shows Ford data with Sedan emphasis
- Both pop-outs synchronized with complex state

---

### Test 084: Highlight Mode Toggle with Pop-Out Open
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Charts popped out, highlights applied
**User Actions:**
1. Apply highlight: h_manufacturer=Ford
2. Pop out Interactive Charts
3. Disable highlight mode checkbox in pop-out
4. Click "Chevrolet" in Manufacturers chart

**Expected Behavior:**
- With highlight mode disabled, click does nothing (no highlight)
- Existing Ford highlight remains in URL
- Charts still show Ford highlighted
- Disabling mode only prevents new highlights, doesn't clear existing

---

### Test 085: Clear Highlight via Chip with Pop-Out Open
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Charts popped out, highlights applied
**User Actions:**
1. Apply highlight: h_manufacturer=Ford, h_bodyClass=Sedan
2. Pop out Interactive Charts
3. In main window Query Control, click X on "Highlight Manufacturer: Ford"

**Expected Behavior:**
- URL: `?h_bodyClass=Sedan`
- Pop-out receives STATE_UPDATE
- Pop-out charts remove Ford highlighting
- Body Class highlight remains

---

### Test 086: Highlight Model Combos in Pop-Out
**Priority:** Medium
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Charts popped out, highlight mode enabled
**User Actions:**
1. Pop out Interactive Charts
2. Enable highlight mode
3. Click "Ford" to select manufacturer for Models chart
4. Click "Ford F-150" in Models chart

**Expected Behavior:**
- Pop-out sends HIGHLIGHT_MODEL_COMBOS: "Ford:F-150"
- Main window URL: `?h_modelCombos=Ford:F-150`
- Pop-out receives STATE_UPDATE
- Pop-out Models chart highlights "Ford F-150"

---

### Test 087: Box-Select Year Range in Pop-Out (Highlight Mode)
**Priority:** Medium
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Charts popped out, highlight mode enabled
**User Actions:**
1. Pop out Interactive Charts
2. Enable highlight mode
3. Box-select years 1965-1970 in Year chart

**Expected Behavior:**
- Pop-out sends HIGHLIGHT_YEAR_RANGE: {yearMin: 1965, yearMax: 1970}
- Main window URL: `?h_yearMin=1965&h_yearMax=1970`
- Pop-out receives STATE_UPDATE
- Pop-out Year chart highlights 1965-1970 bars

---

### Test 088: Highlight, Refresh Page, Verify Persistence
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Highlights applied
**User Actions:**
1. Apply highlight: h_manufacturer=Ford, h_bodyClass=Sedan
2. Press F5 (refresh page)

**Expected Behavior:**
- Page reloads
- URL preserved: `?h_manufacturer=Ford&h_bodyClass=Sedan`
- Charts re-render with highlights applied
- Query Control shows highlight chips
- State fully restored

---

### Test 089: Highlight, Browser Back Button
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Highlight applied
**User Actions:**
1. Navigate to `/discover` (clean)
2. Apply highlight: h_manufacturer=Ford
3. Apply highlight: h_bodyClass=Sedan (URL: `?h_manufacturer=Ford&h_bodyClass=Sedan`)
4. Click browser back button

**Expected Behavior:**
- URL returns to `?h_manufacturer=Ford`
- Charts remove Body Class highlighting
- Manufacturer highlighting remains
- Query Control updates to show only Manufacturer chip

---

### Test 090: Direct URL with Highlights, Then Pop Out
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean browser
**User Actions:**
1. Navigate directly to: `?h_manufacturer=Ford&h_bodyClass=Sedan`
2. Wait for page load
3. Pop out Interactive Charts

**Expected Behavior:**
- Page loads with highlights applied
- Charts show Ford and Sedan highlighted
- Pop-out opens with highlights already applied
- Pop-out receives correct initial state

---

## Category 5: Multi-Window Synchronization

### Test 091: Two Pop-Outs, Add Filter in Main Window
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Both Results and Charts popped out
**User Actions:**
1. Pop out Results table
2. Pop out Interactive Charts
3. In main window, add filter: Manufacturer=Ford

**Expected Behavior:**
- Both pop-outs receive STATE_UPDATE message
- Results pop-out shows Ford vehicles only
- Charts pop-out shows Ford statistics only
- Both pop-outs synchronized with main window

---

### Test 092: Two Pop-Outs, Clear Filters in Main Window
**Priority:** CRITICAL
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Filters applied, both pop-outs open
**User Actions:**
1. Apply filter: Manufacturer=Ford, BodyClass=Sedan
2. Pop out Results table
3. Pop out Interactive Charts
4. In main window, click "Clear Filters"

**Expected Behavior:**
- Both pop-outs receive STATE_UPDATE
- Results shows all 4,880 vehicles
- Charts show full dataset statistics
- Both synchronized

**KNOWN BUG:** Both likely stuck on filtered data

---

### Test 093: Two Pop-Outs, Modify Filter in Main Window
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Filter applied, both pop-outs open
**User Actions:**
1. Apply filter: Manufacturer=Ford
2. Pop out Results and Charts
3. Modify filter to Manufacturer=Chevrolet

**Expected Behavior:**
- Both pop-outs receive STATE_UPDATE
- Results switches to Chevrolet vehicles
- Charts switch to Chevrolet statistics
- Both synchronized

---

### Test 094: Two Pop-Outs, Apply Highlight in One Pop-Out
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Both pop-outs open, highlight mode enabled
**User Actions:**
1. Pop out Results table
2. Pop out Interactive Charts
3. In Charts pop-out, enable highlight mode
4. In Charts pop-out, click "Ford"

**Expected Behavior:**
- Charts pop-out sends HIGHLIGHT_MANUFACTURER to main window
- Main window URL: `?h_manufacturer=Ford`
- Main window broadcasts to both pop-outs
- Charts pop-out highlights Ford
- Results pop-out (if chart visible) also highlights Ford

---

### Test 095: Three Pop-Outs (Hypothetical), Synchronize All
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Hypothetical: Support for 3+ pop-outs
**User Actions:**
1. Pop out Results table
2. Pop out Interactive Charts
3. Pop out Query Control (if supported)
4. Add filter in any window

**Expected Behavior:**
- All three pop-outs receive STATE_UPDATE
- All three pop-outs synchronized
- BroadcastChannel scales to multiple windows

---

### Test 096: Pop Out Results, Close Results, Pop Out Charts, Synchronize
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Pop out Results table
2. Close Results pop-out (pop-in)
3. Pop out Interactive Charts
4. Add filter: Manufacturer=Ford

**Expected Behavior:**
- Charts pop-out receives STATE_UPDATE
- Charts show Ford statistics
- Main window Results panel (now popped-in) shows Ford vehicles
- All synchronized

---

### Test 097: Pop Out, Open Second Main Window Tab
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Results popped out from first tab
**User Actions:**
1. In first tab, pop out Results table
2. Open new browser tab
3. Navigate to `/discover` in second tab
4. Add filter in second tab

**Expected Behavior:**
- Second tab is independent (separate BroadcastChannel namespace)
- Pop-out from first tab does NOT sync with second tab
- Each main window has its own pop-out ecosystem
- No cross-tab interference

---

### Test 098: Pop Out, Duplicate Tab
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Results popped out
**User Actions:**
1. Pop out Results table
2. Duplicate main window tab (Ctrl+Shift+T or right-click → Duplicate)
3. Observe duplicated tab

**Expected Behavior:**
- Duplicated tab shows clean state (pop-out state doesn't duplicate)
- Original pop-out remains associated with original tab only
- Duplicated tab can pop-out its own instances

---

### Test 099: Pop Out Both Panels, Close Main Window, Reopen
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Both pop-outs open
**User Actions:**
1. Pop out Results and Charts
2. Close main window tab
3. Reopen main window (new tab, navigate to `/discover`)

**Expected Behavior:**
- New main window loads clean state
- Old pop-outs orphaned (no longer connected)
- New main window doesn't recognize old pop-outs
- User must close old pop-outs and create new ones

---

### Test 100: Pop Out, Main Window Crashes, Reopen
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Pop-out open
**User Actions:**
1. Pop out Results table
2. Simulate main window crash (close DevTools forcefully, or kill browser process)
3. Reopen browser and navigate to `/discover`

**Expected Behavior:**
- New main window loads
- Old pop-out orphaned
- localStorage may remember popped-out state (panel hidden in main window)
- User must close orphaned pop-out and pop-out again

---

### Test 101: Multiple Pop-Outs, Refresh One Pop-Out
**Priority:** Low
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Results and Charts both popped out
**User Actions:**
1. Pop out Results and Charts
2. Press F5 on Results pop-out window

**Expected Behavior:**
- Results pop-out reloads
- Results pop-out sends PANEL_READY message
- Main window sends current state to Results pop-out
- Results pop-out displays current data
- Charts pop-out unaffected

---

### Test 102: Multiple Pop-Outs, Refresh Main Window
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Results and Charts both popped out
**User Actions:**
1. Pop out Results and Charts
2. Press F5 on main window

**Expected Behavior:**
- Main window reloads
- Both pop-outs wait for main window to reconnect
- Main window establishes new BroadcastChannel connections
- Both pop-outs send PANEL_READY messages
- Main window sends current state to both pop-outs
- All three windows synchronized

---

### Test 103: Pop Out, Apply Filter, Close Pop-Out, Open Pop-Out Again
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Filter applied
**User Actions:**
1. Apply filter: Manufacturer=Ford
2. Pop out Results table (shows Ford vehicles)
3. Close Results pop-out (pop-in)
4. Pop out Results table again

**Expected Behavior:**
- Second pop-out opens with Ford filter already applied
- Pop-out shows Ford vehicles (~1,200)
- State preserved through close/reopen cycle

---

### Test 104: Pop Out Charts, Pop Out Results, Close Charts, Clear Filter
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Filters applied, both pop-outs open
**User Actions:**
1. Apply filter: Manufacturer=Ford
2. Pop out Interactive Charts
3. Pop out Results table
4. Close Charts pop-out (pop-in)
5. In main window, clear filter

**Expected Behavior:**
- Results pop-out receives STATE_UPDATE
- Results pop-out shows all 4,880 vehicles
- Main window Charts panel (now popped-in) shows full statistics
- Partial pop-out scenario works correctly

---

### Test 105: Pop Out, Change URL Manually, Observe Pop-Out Update
**Priority:** Low
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Results popped out
**User Actions:**
1. Pop out Results table (showing all 4,880)
2. Manually edit URL in main window address bar to: `?manufacturer=Ford`
3. Press Enter

**Expected Behavior:**
- Main window navigates to new URL
- StateManagementService hydrates from new URL
- Pop-out receives STATE_UPDATE
- Pop-out shows Ford vehicles only
- Manual URL edit triggers full state cycle

---

## Category 6: URL State Persistence

### Test 106: Bookmark with Filters and Highlights
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Complex state applied
**User Actions:**
1. Apply filter: Manufacturer=Ford, BodyClass=Sedan
2. Apply highlight: h_yearMin=1965, h_yearMax=1970
3. Sort by Year ascending
4. Navigate to page 2
5. Bookmark page (Ctrl+D)
6. Close browser
7. Reopen browser and navigate to bookmark

**Expected Behavior:**
- Page loads with full state restored:
  - Filters applied (Ford Sedans)
  - Highlights applied (1965-1970 emphasis)
  - Sort applied (Year ascending)
  - Page 2 displayed
- All components hydrate correctly from URL
- Results show page 2 of sorted, filtered data
- Charts show filtered data with highlights

---

### Test 107: Share URL with Filters Applied
**Priority:** High
**Tier:** 1 (Critical Path)
**Framework:** Playwright
**Preconditions:** Filters applied
**User Actions:**
1. Apply filter: Manufacturer=Ford, BodyClass=Sedan
2. Copy URL from address bar
3. Open new incognito window
4. Paste URL and navigate

**Expected Behavior:**
- New window loads with filters applied
- Results show Ford Sedans (~230)
- Query Control shows filter chips
- Charts show filtered statistics
- No localStorage dependency for filter state

---

### Test 108: Share URL with Highlights Applied
**Priority:** Medium
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Highlights applied
**User Actions:**
1. Apply highlight: h_manufacturer=Ford, h_bodyClass=Sedan
2. Copy URL
3. Send URL to another user (simulate)
4. Other user opens URL

**Expected Behavior:**
- Page loads with highlights applied
- Charts show Ford and Sedan highlighted
- Query Control shows highlight chips
- No API filtering (still shows all 4,880)
- Highlights are shareable

---

### Test 109: URL Encoding of Special Characters
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Special character in filter value
**User Actions:**
1. Apply filter: Manufacturer = "Eagle Ford Tanks & Trailers LLC"
2. Observe URL encoding
3. Refresh page
4. Share URL

**Expected Behavior:**
- URL properly encodes: `?manufacturer=Eagle%20Ford%20Tanks%20%26%20Trailers%20LLC`
- Refresh decodes correctly
- Shared URL works in other browsers
- Filter chip displays correct name (no encoding artifacts)

---

### Test 110: Very Long URL (Many Filters)
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Apply many filters:
   - Manufacturer=Ford
   - BodyClass=Sedan
   - YearMin=1965
   - YearMax=1970
   - DataSource=NHTSA
2. Apply many highlights:
   - h_manufacturer=Chevrolet,Dodge
   - h_bodyClass=Coupe,Pickup
3. Add sort, pagination parameters
4. Observe URL length

**Expected Behavior:**
- URL may be very long but still functional
- Browser supports URL (< 2000 characters typically safe)
- All parameters preserved
- Page loads correctly with all state

---

### Test 111: Clear URL Completely, Navigate
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Complex state applied
**User Actions:**
1. Apply filters, highlights, sort, pagination
2. Edit URL to base: `http://192.168.0.244:4201/discover`
3. Press Enter

**Expected Behavior:**
- Page navigates to clean state
- All filters, highlights cleared
- Results show all 4,880 vehicles
- Charts show full statistics
- Query Control shows no chips

---

### Test 112: URL with Invalid Parameters
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean browser
**User Actions:**
1. Navigate to: `?invalidParam=foo&manufacturer=Ford&anotherInvalid=bar`

**Expected Behavior:**
- Page loads
- Valid parameter (manufacturer=Ford) applied
- Invalid parameters ignored gracefully
- Results show Ford vehicles
- No console errors for invalid params

---

### Test 113: URL with Conflicting Parameters
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean browser
**User Actions:**
1. Navigate to: `?yearMin=1970&yearMax=1960` (min > max, invalid)

**Expected Behavior:**
- Page loads
- Either:
  - Parameters corrected (swapped)
  - Or: Query ignored, show all results
- No crashes
- User-friendly error message (optional)

---

### Test 114: URL State Overrides localStorage
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** localStorage has saved preferences
**User Actions:**
1. Set page size to 50 in localStorage
2. Navigate to: `?size=20`

**Expected Behavior:**
- URL parameter takes precedence
- Page size: 20 (from URL)
- localStorage not applied for URL-controlled state

---

### Test 115: Preserve URL State Through App Navigation
**Priority:** Low
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Filters applied on /discover
**User Actions:**
1. Apply filter: Manufacturer=Ford on /discover
2. Navigate to /workshop (or other route)
3. Click browser back button to return to /discover

**Expected Behavior:**
- Return to /discover with filters preserved
- URL: `?manufacturer=Ford`
- Results show Ford vehicles
- State preserved through route navigation

---

## Category 7: Error and Edge Cases

### Test 116: Pop Out with No Data (Empty State)
**Priority:** Low
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Filter that returns 0 results
**User Actions:**
1. Apply filter: Manufacturer=InvalidManufacturerXYZ (0 results)
2. Pop out Results table

**Expected Behavior:**
- Pop-out opens showing empty state message
- No crashes
- Pop-out displays "No results found" or similar
- Clearing filter in main window updates pop-out to show data

---

### Test 117: Pop Out, API Error in Main Window
**Priority:** Low
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Pop-out open, simulate API failure
**User Actions:**
1. Pop out Results table
2. In main window, add filter
3. Simulate API error (backend down, network error)

**Expected Behavior:**
- Main window displays error message
- Pop-out receives STATE_UPDATE with error state
- Pop-out displays error message or loading state
- No crashes in pop-out

---

### Test 118: Pop Out, Disconnect Network
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Pop-out open
**User Actions:**
1. Pop out Results table
2. Disconnect network (airplane mode or DevTools offline)
3. Add filter in main window

**Expected Behavior:**
- Main window attempts API call, fails
- Pop-out receives STATE_UPDATE with loading state
- Pop-out shows loading indicator or cached data
- Reconnect network, state syncs

---

### Test 119: Pop Out, Close Main Window Immediately
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Pop-out open
**User Actions:**
1. Pop out Results table
2. Immediately close main window (within 1 second)

**Expected Behavior:**
- Pop-out orphaned
- Pop-out displays last known state
- No crashes
- Pop-out shows warning about lost connection (optional)

---

### Test 120: Pop Out, Add 100 Filters Rapidly
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Pop-out open
**User Actions:**
1. Pop out Results table
2. Rapidly add 100 filters (script or automation)

**Expected Behavior:**
- Pop-out receives all STATE_UPDATE messages
- BroadcastChannel handles high message volume
- Pop-out updates (may lag but eventually syncs)
- No memory leaks
- No crashes

---

### Test 121: Pop Out, Resize to Minimum Window Size
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Pop-out open
**User Actions:**
1. Pop out Results table
2. Resize window to very small size (e.g., 300x300 pixels)

**Expected Behavior:**
- Table adjusts responsively
- Columns may collapse or stack
- Pagination remains functional
- No layout breaks or overlapping content

---

### Test 122: Pop Out, Zoom In/Out
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Pop-out open
**User Actions:**
1. Pop out Results table
2. Zoom in (Ctrl++) to 200%
3. Zoom out (Ctrl+-) to 50%

**Expected Behavior:**
- Table scales with zoom level
- Pagination, buttons remain functional
- No layout breaks
- Text remains readable

---

### Test 123: Pop Out, Change Browser Language
**Priority:** Low (if i18n supported)
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Pop-out open, i18n supported
**User Actions:**
1. Pop out Results table
2. Change browser language settings
3. Refresh pop-out

**Expected Behavior:**
- Pop-out displays in new language
- Translations applied correctly
- No missing translations (fallback to English)

---

### Test 124: Pop Out with Ad Blocker Enabled
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Ad blocker browser extension installed
**User Actions:**
1. Enable ad blocker
2. Navigate to `/discover`
3. Pop out Results table

**Expected Behavior:**
- Pop-out opens normally
- No interference from ad blocker
- If ad blocker blocks BroadcastChannel (unlikely), show warning

---

### Test 125: Pop Out, Open Many Tabs in Main Window
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Pop-out open
**User Actions:**
1. Pop out Results table
2. Open 50 browser tabs in main window (stress test)
3. Add filter in main window

**Expected Behavior:**
- Pop-out still receives STATE_UPDATE
- BroadcastChannel unaffected by other tabs
- Pop-out updates correctly
- No performance degradation

---

### Test 126: Pop Out, Developer Tools Open
**Priority:** Low
**Tier:** 2 (Important)
**Framework:** Playwright
**Preconditions:** Pop-out open
**User Actions:**
1. Pop out Results table
2. Open DevTools in pop-out window (F12)
3. Add filter in main window
4. Observe console logs and network traffic

**Expected Behavior:**
- Console shows STATE_UPDATE message received
- Network tab shows API call triggered by state update
- No errors in console
- Debugging functionality works

---

### Test 127: Pop Out, Clear Browser Cache Mid-Session
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Pop-out open
**User Actions:**
1. Pop out Results table
2. Open DevTools → Application → Clear storage
3. Clear cache (keep localStorage)
4. Add filter in main window

**Expected Behavior:**
- Pop-out still receives STATE_UPDATE
- Cache clear doesn't affect BroadcastChannel
- Pop-out updates correctly

---

### Test 128: Pop Out, Block BroadcastChannel (Hypothetical)
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Hypothetical: BroadcastChannel blocked by policy
**User Actions:**
1. Simulate BroadcastChannel API unavailable
2. Attempt to pop out Results table

**Expected Behavior:**
- Application detects BroadcastChannel unavailable
- Show error message: "Pop-out requires BroadcastChannel API"
- Disable pop-out buttons
- Graceful degradation (app still works without pop-outs)

---

### Test 129: Pop Out, Extremely Slow Network (3G)
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Pop-out open, simulated slow network
**User Actions:**
1. Pop out Results table
2. Throttle network to 3G speed (DevTools)
3. Add filter in main window (triggers API call)

**Expected Behavior:**
- Main window shows loading indicator
- Pop-out receives STATE_UPDATE with loading state
- Pop-out shows loading indicator
- API call completes (slowly)
- Pop-out updates with new data
- No timeouts (or graceful timeout handling)

---

### Test 130: Pop Out, Rapid Open/Close Cycles
**Priority:** Low
**Tier:** 3 (Edge Cases)
**Framework:** Playwright
**Preconditions:** Clean state
**User Actions:**
1. Pop out Results table
2. Immediately close pop-out (pop-in)
3. Immediately pop out again
4. Repeat 10 times rapidly

**Expected Behavior:**
- Each cycle completes cleanly
- No memory leaks
- No zombie BroadcastChannels
- Final state: pop-out open and functional

---

## Test Execution Summary

**Total Tests Defined:** 130

**Priority Breakdown:**
- Critical: 5 tests (Tests 004, 040, 046, 059, 092)
- High: 45 tests
- Medium: 55 tests
- Low: 25 tests

**Tier Breakdown:**
- Tier 1 (Critical Path): 35 tests
- Tier 2 (Important): 46 tests
- Tier 3 (Edge Cases): 49 tests

**Framework Breakdown:**
- Playwright (E2E): 130 tests (100%)
- Karma/Jasmine (Unit): 0 tests (0%)

**Tier Classification Examples:**

**Tier 1 (Critical Path) - 35 tests:**
- Test 001: Add Single Manufacturer Filter (basic functionality)
- Test 004: Clear All Filters (main bug scenario)
- Test 021: Pop Out Results Table (core feature)
- Test 040: Pop Out, Then Clear Filters (primary bug case)
- Test 046: Clear All Filters with Pop-Out Open (critical bug variant)
- Test 059: Pop Out Both Results and Charts, Clear Filters (multi-window bug)
- Test 066: Enable Highlight Mode, Click Chart (highlight feature)
- Test 092: Two Pop-Outs, Clear Filters (synchronization bug)

**Tier 2 (Important) - 46 tests:**
- Test 003: Clear Single Filter (common operation)
- Test 024: Close Pop-Out via "Pop In" Button (important UX)
- Test 045: Remove One Filter with Pop-Out Open (filter management)
- Test 072: Clear Single Highlight (highlight management)
- Test 106: Bookmark with Filters and Highlights (URL persistence)

**Tier 3 (Edge Cases) - 49 tests:**
- Test 007: Add Page Size Parameter (UI preference)
- Test 029: Close Main Window with Pop-Out Open (orphaned pop-out)
- Test 082: Pop Out Charts, Rapid Highlight Changes (stress test)
- Test 120: Pop Out, Add 100 Filters Rapidly (performance test)
- Test 129: Pop Out, Extremely Slow Network (network resilience)

**Category Breakdown:**
- Basic Filter Operations: 20 tests
- Pop-Out Window Lifecycle: 20 tests
- Filter + Pop-Out Interactions: 25 tests
- Highlight Mode Operations: 25 tests
- Multi-Window Synchronization: 15 tests
- URL State Persistence: 10 tests
- Error and Edge Cases: 15 tests

**Critical Bug-Related Tests:**
- Test 040: Pop Out, Then Clear Filters (Primary Bug)
- Test 046: Clear All Filters with Pop-Out Open (Repeated Bug Test)
- Test 057: Clear Filter, Pop Out Charts, Verify Full Stats
- Test 059: Pop Out Both Results and Charts, Clear Filters
- Test 092: Two Pop-Outs, Clear Filters in Main Window

**Recommended Test Execution Order:**

**By Priority (Original):**
1. Run all Critical priority tests first (5 tests)
2. Run all High priority tests (45 tests)
3. Run Medium priority tests for comprehensive coverage (55 tests)
4. Run Low priority tests for edge case coverage (25 tests)

**By Tier (Recommended for CI/CD):**
1. **Tier 1 (Critical Path):** 35 tests - Must pass for release
   - Run first in CI/CD pipeline (estimated 5-10 minutes)
   - Block deployment if any fail
   - Include all critical bug scenarios (Tests 004, 040, 046, 059, 092)
   - Cover essential user flows and blocking issues
2. **Tier 2 (Important):** 46 tests - Should pass for production quality
   - Run after Tier 1 passes (estimated 10-15 minutes)
   - Flag failures but don't block if low risk
   - Include all common use cases and important features
   - Can run in parallel with Tier 1 for faster CI
3. **Tier 3 (Edge Cases):** 49 tests - Can be deferred for post-release
   - Run in extended test suite (estimated 15-20 minutes)
   - Document failures as known limitations
   - Include stress tests, edge cases, and unusual scenarios
   - Run nightly or pre-release only

**Automation Potential:**
- Tests 001-020 (Basic Filters): High (straightforward DOM interaction)
- Tests 021-040 (Pop-Out Lifecycle): Medium (requires window management)
- Tests 041-065 (Filter + Pop-Out): Medium (multi-window coordination)
- Tests 066-090 (Highlight Mode): High (DOM interaction + URL checks)
- Tests 091-105 (Multi-Window Sync): Low (complex multi-window state)
- Tests 106-115 (URL Persistence): High (URL manipulation + checks)
- Tests 116-130 (Error/Edge Cases): Low (requires network simulation, browser control)

---

**End of Test Plan**

**Document Status:** Complete
**Last Updated:** 2025-11-09
**Next Steps:** Prioritize Critical and High priority tests, execute manually, automate where feasible

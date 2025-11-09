# Discover Page - Manual Test Plan

**Document Version:** 1.0
**Created:** 2025-11-08
**Application:** AUTOS Prime NG
**Component:** Discover Page (`/discover`)
**Purpose:** Comprehensive manual testing for panel functionality, state management, and pop-out features

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Phase 1: Panels Not Popped Out](#phase-1-panels-not-popped-out)
3. [Phase 2: Panels Popped Out](#phase-2-panels-popped-out)
4. [Cross-Phase Integration Tests](#cross-phase-integration-tests)
5. [Test Execution Checklist](#test-execution-checklist)
6. [Bug Reporting Template](#bug-reporting-template)

---

## Test Environment Setup

### Prerequisites

- **Browser:** Chrome/Firefox/Safari (latest version)
- **URL:** `http://autos.minilab/discover`
- **Clean State:** Clear localStorage before each test session
  ```javascript
  // Run in browser console
  localStorage.clear();
  location.reload();
  ```
- **Network:** Backend API accessible at `http://autos.minilab/api`
- **Display:** Minimum 1920x1080 resolution (for multi-monitor tests in Phase 2)

### Test Data Setup

- Backend should have populated Elasticsearch index (`autos-unified`)
- Minimum 100,000 vehicle records
- Multiple manufacturers (Ford, Chevrolet, Toyota, etc.)
- Multiple models per manufacturer

---

## Phase 1: Panels Not Popped Out

### Test Suite 1.1: Initial Page Load

#### TC-1.1.1: Default Panel Layout
**Objective:** Verify default panel configuration on first load

**Steps:**
1. Clear localStorage
2. Navigate to `/discover`
3. Observe panel layout

**Expected Results:**
- ✅ Page title "Vehicle Discovery" displays in red (#f44336)
- ✅ Panels appear in default order:
  1. Query Control (expanded)
  2. Make/Model Picker (collapsed)
  3. Vehicle Results (expanded)
  4. Interactive Charts (expanded)
- ✅ Panel headers are shorter (0.6rem vertical padding)
- ✅ Panel spacing is tighter (8px between panels)
- ✅ All buttons are thinner (reduced padding)

**Pass Criteria:** All panels render correctly with proper styling

---

#### TC-1.1.2: Panel Header Styling
**Objective:** Verify panel header visual design

**Steps:**
1. Inspect each panel header
2. Hover over panel headers
3. Check popout button visibility

**Expected Results:**
- ✅ Panel headers have white background
- ✅ Left border is red (4px solid #f44336)
- ✅ Panel titles are bold and dark (#212121)
- ✅ Popout button (window-maximize icon) is hidden by default
- ✅ Popout button appears on header hover
- ✅ Popout button icon is red (#f44336) and 40% larger (1.4rem)
- ✅ Popout button hover changes to light red background (#ffebee)

**Pass Criteria:** All styling matches red theme specifications

---

#### TC-1.1.3: Button Styling
**Objective:** Verify all buttons have reduced padding

**Steps:**
1. Inspect "Clear All" button
2. Inspect "Reset Panel Order" button
3. Check buttons in table toolbars
4. Verify small buttons (`.p-button-sm`)

**Expected Results:**
- ✅ Regular buttons: 0.4rem × 0.8rem padding
- ✅ Small buttons: 0.3rem × 0.6rem padding
- ✅ Buttons appear visually thinner
- ✅ Primary buttons are red (#d32f2f)
- ✅ Secondary buttons have gray border with red hover

**Pass Criteria:** All buttons display with reduced padding

---

### Test Suite 1.2: Panel Interaction

#### TC-1.2.1: Panel Collapse/Expand
**Objective:** Verify panel toggle functionality

**Steps:**
1. Click collapse icon on "Query Control" panel header
2. Observe panel collapse animation
3. Click collapse icon again
4. Observe panel expand animation
5. Repeat for all panels

**Expected Results:**
- ✅ Panel content collapses smoothly
- ✅ Panel header remains visible
- ✅ Collapse icon rotates to indicate state
- ✅ Panel expands smoothly
- ✅ Content is fully visible after expansion

**Pass Criteria:** All panels collapse/expand without errors

---

#### TC-1.2.2: Panel Drag-and-Drop Reordering
**Objective:** Verify panel reordering via drag-and-drop

**Steps:**
1. Hover over left edge of any panel
2. Observe drag handle appearance
3. Click and hold drag handle (6-dots icon)
4. Drag panel to new position
5. Observe drop placeholder
6. Release mouse button
7. Verify panel order changed

**Expected Results:**
- ✅ Drag handle appears on hover (at left: -45px position)
- ✅ Drag handle shows 6 vertical dots icon
- ✅ Cursor changes to "move" on hover
- ✅ Panel lifts with shadow during drag
- ✅ Red dashed placeholder shows drop location
- ✅ Panel inserts at drop position
- ✅ Other panels shift to accommodate

**Pass Criteria:** Panels can be freely reordered

---

#### TC-1.2.3: Panel State Persistence
**Objective:** Verify panel order and collapse state persist

**Steps:**
1. Reorder panels to custom order
2. Collapse "Vehicle Results" panel
3. Expand "Make/Model Picker" panel
4. Refresh page (F5)
5. Observe panel state

**Expected Results:**
- ✅ Panel order matches pre-refresh state
- ✅ "Vehicle Results" remains collapsed
- ✅ "Make/Model Picker" remains expanded
- ✅ localStorage contains `discover-panel-order` key
- ✅ State survives browser restart

**Pass Criteria:** Panel state persists across page loads

---

#### TC-1.2.4: Reset Panel Order
**Objective:** Verify "Reset Panel Order" button

**Steps:**
1. Reorder panels to custom order
2. Click "Reset Panel Order" button
3. Observe panel layout

**Expected Results:**
- ✅ Panels return to default order
- ✅ Collapsed states reset to defaults
- ✅ No page reload required
- ✅ localStorage updated

**Pass Criteria:** Panels reset to default configuration

---

### Test Suite 1.3: Query Control Panel

#### TC-1.3.1: Add Filter - Manufacturer
**Objective:** Test manufacturer filter addition

**Steps:**
1. Expand "Query Control" panel
2. Select "Manufacturer" from dropdown
3. Enter "Ford" in value field
4. Click "Add Filter"

**Expected Results:**
- ✅ Filter chip appears showing "Manufacturer: Ford"
- ✅ URL updates with `manufacturer=Ford`
- ✅ Active Filters counter updates
- ✅ Vehicle Results table updates with Ford vehicles

**Pass Criteria:** Filter applies and updates results

---

#### TC-1.3.2: Add Filter - Year Range
**Objective:** Test year range filter

**Steps:**
1. Select "Year" from dropdown
2. Enter min year: 2015
3. Enter max year: 2020
4. Click "Add Filter"

**Expected Results:**
- ✅ Filter chip shows "Year: 2015 - 2020"
- ✅ URL updates with `yearMin=2015&yearMax=2020`
- ✅ Results show only vehicles 2015-2020

**Pass Criteria:** Range filter applies correctly

---

#### TC-1.3.3: Remove Individual Filter
**Objective:** Test filter removal

**Steps:**
1. Add manufacturer filter (Ford)
2. Add year range filter (2015-2020)
3. Click X on manufacturer filter chip
4. Observe results update

**Expected Results:**
- ✅ Manufacturer filter chip removed
- ✅ URL parameter `manufacturer` removed
- ✅ Year filter remains active
- ✅ Results update to show all manufacturers (2015-2020)

**Pass Criteria:** Individual filter removes correctly

---

#### TC-1.3.4: Clear All Filters
**Objective:** Test "Clear All" button

**Steps:**
1. Add multiple filters (manufacturer, year, body class)
2. Click "Clear All" button in page header
3. Observe UI reset

**Expected Results:**
- ✅ All filter chips disappear
- ✅ URL clears all query parameters
- ✅ Active Filters counter shows 0
- ✅ Results show all vehicles

**Pass Criteria:** All filters clear simultaneously

---

### Test Suite 1.4: Make/Model Picker Panel

#### TC-1.4.1: Select Manufacturer-Model Combination
**Objective:** Test model selection

**Steps:**
1. Expand "Make/Model Picker" panel
2. Check checkbox for "Ford" → "F-150"
3. Check checkbox for "Chevrolet" → "Corvette"
4. Observe selection summary

**Expected Results:**
- ✅ Selection count shows "2 selected"
- ✅ Red selection chips appear: "Ford: F-150", "Chevrolet: Corvette"
- ✅ URL updates: `modelCombos=Ford:F-150,Chevrolet:Corvette`
- ✅ Vehicle Results table filters to selected models

**Pass Criteria:** Model selection updates results

---

#### TC-1.4.2: Unselect Model
**Objective:** Test model deselection

**Steps:**
1. Select "Ford: F-150"
2. Uncheck "Ford: F-150" checkbox
3. Observe selection update

**Expected Results:**
- ✅ Selection count decrements
- ✅ "Ford: F-150" chip removed
- ✅ URL updates to remove model
- ✅ Results update

**Pass Criteria:** Deselection works correctly

---

#### TC-1.4.3: Clear Picker
**Objective:** Test "Clear" button in picker

**Steps:**
1. Select multiple models
2. Click "Clear" button in picker header
3. Observe UI reset

**Expected Results:**
- ✅ All checkboxes unchecked
- ✅ Selection count shows 0
- ✅ Selection chips disappear
- ✅ URL parameter `modelCombos` removed

**Pass Criteria:** Picker clears all selections

---

### Test Suite 1.5: Vehicle Results Panel

#### TC-1.5.1: Table Display
**Objective:** Verify results table rendering

**Steps:**
1. Select model combinations to trigger results
2. Observe table rendering

**Expected Results:**
- ✅ Table displays with columns: Manufacturer, Model, Year, Body Class, VIN Count
- ✅ Table toolbar shows result count
- ✅ Pagination controls visible
- ✅ Table cells have 8px padding (reduced)
- ✅ Table headers have 8px padding (reduced)

**Pass Criteria:** Table renders correctly with tighter spacing

---

#### TC-1.5.2: Column Sorting
**Objective:** Test column sort functionality

**Steps:**
1. Click "Manufacturer" column header
2. Observe sort indicator (ascending)
3. Click "Manufacturer" again
4. Observe sort indicator (descending)
5. Repeat for other columns

**Expected Results:**
- ✅ Data sorts alphabetically (ascending)
- ✅ Sort icon shows up arrow
- ✅ Data sorts reverse (descending)
- ✅ Sort icon shows down arrow
- ✅ URL updates with `sortBy` and `sortOrder` params

**Pass Criteria:** All columns sort correctly

---

#### TC-1.5.3: VIN Instance Expansion
**Objective:** Test VIN count expansion

**Steps:**
1. Click chevron icon on any row
2. Observe expansion panel
3. Verify VIN instances displayed
4. Click chevron again to collapse

**Expected Results:**
- ✅ Row expands smoothly
- ✅ VIN instances load and display
- ✅ Each VIN shows: VIN number, state, color, estimated value
- ✅ Row collapses smoothly

**Pass Criteria:** VIN expansion works correctly

---

#### TC-1.5.4: Pagination
**Objective:** Test table pagination

**Steps:**
1. Ensure results have 20+ vehicles
2. Click "Next" button
3. Observe page 2 results
4. Change page size to 50
5. Observe results update

**Expected Results:**
- ✅ Page 2 loads correctly
- ✅ URL updates with `page=2`
- ✅ Page size changes to 50
- ✅ URL updates with `size=50`
- ✅ Result count updates

**Pass Criteria:** Pagination navigates correctly

---

#### TC-1.5.5: Column Visibility
**Objective:** Test column show/hide

**Steps:**
1. Click "Columns" button in table toolbar
2. Uncheck "Body Class" column
3. Click "Apply"
4. Observe table update
5. Open column manager again
6. Re-check "Body Class"

**Expected Results:**
- ✅ Column manager drawer opens
- ✅ "Body Class" column disappears from table
- ✅ Setting persists in localStorage
- ✅ Column reappears when re-checked

**Pass Criteria:** Column visibility toggles work

---

#### TC-1.5.6: Column Reordering
**Objective:** Test column drag-and-drop

**Steps:**
1. Open column manager
2. Drag "Year" column to first position
3. Click "Apply"
4. Observe table column order

**Expected Results:**
- ✅ Column order changes in table
- ✅ Order persists in localStorage
- ✅ Order survives page refresh

**Pass Criteria:** Columns reorder correctly

---

### Test Suite 1.6: Interactive Charts Panel

#### TC-1.6.1: Chart Rendering
**Objective:** Verify Plotly histograms render

**Steps:**
1. Expand "Interactive Charts" panel
2. Select model combinations to populate data
3. Observe chart rendering

**Expected Results:**
- ✅ Title "Distribution Analysis" displays
- ✅ Four charts render in 2×2 grid
- ✅ Charts show: Year, Body Class, Manufacturer, Data Source distributions
- ✅ Charts have interactive hover tooltips
- ✅ Chart gap is 12px (reduced)
- ✅ Container padding is 12px (reduced)

**Pass Criteria:** All charts render with correct data

---

#### TC-1.6.2: Chart Interactivity
**Objective:** Test Plotly interactive features

**Steps:**
1. Hover over bar in Year distribution chart
2. Click and drag to zoom
3. Double-click to reset zoom
4. Test zoom controls (modebar)

**Expected Results:**
- ✅ Tooltip shows count for hovered bar
- ✅ Zoom box appears during drag
- ✅ Chart zooms to selection
- ✅ Double-click resets to original view
- ✅ Modebar buttons work (zoom, pan, reset)

**Pass Criteria:** Chart interactivity works

---

### Test Suite 1.7: State Synchronization

#### TC-1.7.1: Filter → Picker Sync
**Objective:** Verify filter updates reflect in picker

**Steps:**
1. Add manufacturer filter via Query Control: "Ford"
2. Observe Make/Model Picker panel

**Expected Results:**
- ✅ Picker table filters to show only Ford models
- ✅ Parent checkbox for "Ford" shows if all models selected
- ✅ URL state drives both components

**Pass Criteria:** Components stay synchronized

---

#### TC-1.7.2: Picker → Results Sync
**Objective:** Verify picker updates reflect in results

**Steps:**
1. Select "Ford: F-150" in picker
2. Observe Vehicle Results table

**Expected Results:**
- ✅ Results immediately filter to Ford F-150
- ✅ No duplicate API calls (check Network tab)
- ✅ URL updates with modelCombos

**Pass Criteria:** Picker drives results table

---

#### TC-1.7.3: URL Direct Entry
**Objective:** Test deep linking via URL

**Steps:**
1. Navigate to: `/discover?modelCombos=Ford:F-150,Chevrolet:Corvette&yearMin=2015&yearMax=2020`
2. Observe page hydration

**Expected Results:**
- ✅ Picker shows Ford F-150 and Chevy Corvette selected
- ✅ Query Control shows year range filter
- ✅ Results show filtered vehicles
- ✅ Charts show filtered distributions

**Pass Criteria:** URL params fully hydrate state

---

#### TC-1.7.4: Browser Back/Forward
**Objective:** Test browser navigation

**Steps:**
1. Select "Ford: F-150"
2. Click browser Back button
3. Observe state revert
4. Click Forward button
5. Observe state restore

**Expected Results:**
- ✅ State reverts to previous filter
- ✅ All panels update correctly
- ✅ Forward restores selection
- ✅ No duplicate API calls

**Pass Criteria:** Browser navigation works correctly

---

### Test Suite 1.8: Responsive Design

#### TC-1.8.1: Mobile View (768px)
**Objective:** Test mobile breakpoint

**Steps:**
1. Resize browser to 768px width
2. Observe panel layout
3. Test all interactions

**Expected Results:**
- ✅ Panels stack vertically
- ✅ Tables show horizontal scroll
- ✅ Charts stack to 1 column
- ✅ All functionality works

**Pass Criteria:** Mobile view displays correctly

---

#### TC-1.8.2: Tablet View (1024px)
**Objective:** Test tablet breakpoint

**Steps:**
1. Resize browser to 1024px width
2. Observe layout adjustments

**Expected Results:**
- ✅ Panels remain stacked
- ✅ Charts show 2 columns
- ✅ Tables display without horizontal scroll

**Pass Criteria:** Tablet view displays correctly

---

## Phase 2: Panels Popped Out

### Test Suite 2.1: Pop-Out Window Opening

#### TC-2.1.1: Single Panel Pop-Out
**Objective:** Verify single panel pop-out

**Steps:**
1. Hover over "Query Control" panel header
2. Click pop-out button (window-maximize icon)
3. Observe pop-out window

**Expected Results:**
- ✅ New window opens at 1200×800px
- ✅ Window title shows panel name
- ✅ Panel content renders in pop-out
- ✅ Main page shows placeholder: "Query Control - This panel is currently open in a separate window"
- ✅ Placeholder has external-link icon

**Pass Criteria:** Pop-out opens correctly with MOVE semantics

---

#### TC-2.1.2: Multiple Panels Popped Out
**Objective:** Test multiple simultaneous pop-outs

**Steps:**
1. Pop out "Query Control"
2. Pop out "Make/Model Picker"
3. Pop out "Vehicle Results"
4. Observe main page

**Expected Results:**
- ✅ Three separate windows open
- ✅ Main page shows three placeholders
- ✅ Each window is independent
- ✅ All windows communicate with main page

**Pass Criteria:** Multiple pop-outs work simultaneously

---

#### TC-2.1.3: Pop-Out Window Features
**Objective:** Verify window characteristics

**Steps:**
1. Pop out any panel
2. Inspect window features
3. Test window controls

**Expected Results:**
- ✅ Window is resizable
- ✅ Window has scrollbars (if content overflows)
- ✅ No menubar
- ✅ No toolbar
- ✅ No location bar
- ✅ Window position: left=100, top=100

**Pass Criteria:** Window features match specification

---

### Test Suite 2.2: Panel Restoration

#### TC-2.2.1: Close Pop-Out Window
**Objective:** Test panel restoration on close

**Steps:**
1. Pop out "Query Control" panel
2. Close pop-out window (X button)
3. Observe main page

**Expected Results:**
- ✅ Placeholder disappears from main page
- ✅ Panel reappears in original position
- ✅ Panel state (collapsed/expanded) preserved
- ✅ Panel content fully functional
- ✅ No data loss

**Pass Criteria:** Panel restores correctly

---

#### TC-2.2.2: Multiple Close Restoration
**Objective:** Test multiple panel restoration

**Steps:**
1. Pop out three panels
2. Close pop-outs in different order
3. Observe main page after each close

**Expected Results:**
- ✅ Each panel restores to correct position
- ✅ Panel order preserved
- ✅ All panels remain functional

**Pass Criteria:** All panels restore correctly

---

### Test Suite 2.3: State Synchronization (Main → Pop-Out)

#### TC-2.3.1: Filter Update (Main → Pop-Out)
**Objective:** Test state broadcast to pop-out

**Steps:**
1. Pop out "Vehicle Results" panel
2. On main page, select "Ford: F-150" in picker
3. Observe pop-out window

**Expected Results:**
- ✅ Pop-out results table updates immediately
- ✅ Results filter to Ford F-150
- ✅ No page refresh in pop-out
- ✅ BroadcastChannel logs in console

**Pass Criteria:** Main page state broadcasts to pop-out

---

#### TC-2.3.2: Multiple Filter Updates
**Objective:** Test continuous state sync

**Steps:**
1. Pop out "Vehicle Results"
2. On main page, add/remove multiple filters rapidly:
   - Add manufacturer: Ford
   - Add year range: 2015-2020
   - Remove manufacturer
   - Add body class: Pickup

**Expected Results:**
- ✅ Pop-out updates after each change
- ✅ No race conditions
- ✅ Final state matches main page
- ✅ No errors in console

**Pass Criteria:** Continuous sync works without errors

---

#### TC-2.3.3: Chart Data Update
**Objective:** Test chart updates in pop-out

**Steps:**
1. Pop out "Interactive Charts"
2. On main page, change model selection
3. Observe charts in pop-out

**Expected Results:**
- ✅ Charts re-render with new data
- ✅ Distributions update correctly
- ✅ Chart titles remain correct

**Pass Criteria:** Charts sync correctly

---

### Test Suite 2.4: State Synchronization (Pop-Out → Main)

#### TC-2.4.1: Picker Selection (Pop-Out → Main)
**Objective:** Test selection from popped-out picker

**Steps:**
1. Pop out "Make/Model Picker"
2. In pop-out window, select "Ford: F-150"
3. Observe main page

**Expected Results:**
- ✅ Main page URL updates: `modelCombos=Ford:F-150`
- ✅ Main page "Vehicle Results" table updates
- ✅ Main page "Interactive Charts" update
- ✅ Selection chips appear on main page

**Pass Criteria:** Pop-out selection updates main page

---

#### TC-2.4.2: Filter Addition (Pop-Out → Main)
**Objective:** Test filter from popped-out Query Control

**Steps:**
1. Pop out "Query Control"
2. In pop-out, add manufacturer filter: "Chevrolet"
3. Observe main page

**Expected Results:**
- ✅ Main page URL updates: `manufacturer=Chevrolet`
- ✅ Main page results filter
- ✅ Main page charts update
- ✅ Filter chip appears on main page

**Pass Criteria:** Pop-out filter updates main page

---

#### TC-2.4.3: Clear Action (Pop-Out → Main)
**Objective:** Test clear from pop-out

**Steps:**
1. Select multiple models on main page
2. Pop out "Make/Model Picker"
3. In pop-out, click "Clear" button
4. Observe main page

**Expected Results:**
- ✅ Main page URL clears `modelCombos`
- ✅ Main page results reset
- ✅ Main page selection chips disappear
- ✅ All pop-outs reflect cleared state

**Pass Criteria:** Clear action broadcasts correctly

---

### Test Suite 2.5: Bidirectional Synchronization

#### TC-2.5.1: Simultaneous Updates
**Objective:** Test bidirectional sync

**Steps:**
1. Pop out "Make/Model Picker"
2. Pop out "Vehicle Results"
3. In pop-out picker, select "Ford: F-150"
4. On main page, add year filter: 2015-2020
5. In pop-out picker, add "Chevrolet: Corvette"
6. Observe all windows

**Expected Results:**
- ✅ All windows show Ford F-150 + Chevy Corvette
- ✅ All windows show year filter 2015-2020
- ✅ Results table (pop-out) shows filtered vehicles
- ✅ No conflicts or race conditions
- ✅ URL is source of truth

**Pass Criteria:** Bidirectional sync works flawlessly

---

#### TC-2.5.2: Multiple Pop-Outs Sync
**Objective:** Test sync across multiple pop-outs

**Steps:**
1. Pop out all four panels
2. In Query Control pop-out, add manufacturer: Ford
3. Observe other three pop-outs

**Expected Results:**
- ✅ Picker pop-out filters to Ford models
- ✅ Results pop-out shows Ford vehicles
- ✅ Charts pop-out shows Ford distributions
- ✅ Main page updates correctly

**Pass Criteria:** All pop-outs stay synchronized

---

### Test Suite 2.6: Edge Cases and Error Handling

#### TC-2.6.1: Pop-Up Blocker
**Objective:** Test blocked pop-up handling

**Steps:**
1. Enable pop-up blocker in browser
2. Click pop-out button
3. Observe error handling

**Expected Results:**
- ✅ Console error: "Failed to open pop-out window. Check if popups are blocked."
- ✅ Panel remains on main page
- ✅ No crash or freeze
- ✅ User can retry after allowing pop-ups

**Pass Criteria:** Graceful error handling

---

#### TC-2.6.2: Rapid Pop-Out/Close
**Objective:** Test stress conditions

**Steps:**
1. Rapidly pop out panel (5 times)
2. Rapidly close pop-out (5 times)
3. Repeat for 10 cycles
4. Observe stability

**Expected Results:**
- ✅ No memory leaks
- ✅ No orphaned windows
- ✅ No BroadcastChannel errors
- ✅ Panel restores correctly

**Pass Criteria:** System remains stable

---

#### TC-2.6.3: Browser Refresh with Pop-Outs Open
**Objective:** Test page refresh behavior

**Steps:**
1. Pop out "Vehicle Results"
2. On main page, press F5 (refresh)
3. Observe pop-out window

**Expected Results:**
- ✅ Pop-out window remains open
- ✅ Pop-out loses connection (expected)
- ✅ Main page renders correctly
- ✅ Pop-out can be manually closed and re-opened

**Pass Criteria:** Refresh doesn't crash pop-outs

---

#### TC-2.6.4: Pop-Out Window Refresh
**Objective:** Test pop-out window refresh

**Steps:**
1. Pop out any panel
2. In pop-out window, press F5
3. Observe behavior

**Expected Results:**
- ✅ Pop-out shows "Panel not found" or similar error
- ✅ Main page unaffected
- ✅ User can close pop-out manually
- ✅ Panel restores on close

**Pass Criteria:** Pop-out refresh handled gracefully

---

#### TC-2.6.5: Network Interruption
**Objective:** Test offline scenario

**Steps:**
1. Pop out "Vehicle Results"
2. Disconnect network
3. On main page, change filters
4. Observe pop-out

**Expected Results:**
- ✅ BroadcastChannel still works (local)
- ✅ Pop-out updates state
- ✅ API errors handled gracefully
- ✅ Data shows stale results or loading state

**Pass Criteria:** System handles network errors

---

### Test Suite 2.7: Multi-Monitor Scenarios

#### TC-2.7.1: Dual Monitor Layout
**Objective:** Test multi-monitor workflow

**Steps:**
1. Drag browser to monitor 1
2. Pop out "Make/Model Picker"
3. Drag pop-out to monitor 2
4. Pop out "Vehicle Results"
5. Drag to monitor 2 below picker
6. Use multi-monitor setup for work

**Expected Results:**
- ✅ Pop-outs position on secondary monitor
- ✅ State sync works across monitors
- ✅ User can work efficiently with split view
- ✅ All windows remain responsive

**Pass Criteria:** Multi-monitor workflow functional

---

#### TC-2.7.2: Window Positioning Persistence
**Objective:** Test window position memory

**Steps:**
1. Pop out panel
2. Resize and reposition window
3. Close pop-out
4. Pop out same panel again

**Expected Results:**
- ✅ New pop-out opens at default position (100, 100)
- ✅ Default size (1200×800)
- ✅ (Note: Position persistence not implemented)

**Pass Criteria:** Windows open predictably

---

### Test Suite 2.8: Performance and Stability

#### TC-2.8.1: Large Dataset Performance
**Objective:** Test performance with 100k+ records

**Steps:**
1. Select all manufacturers (no filters)
2. Pop out "Vehicle Results"
3. Observe load time and responsiveness

**Expected Results:**
- ✅ Results load within 3 seconds
- ✅ Pagination limits results to 20/50/100
- ✅ Pop-out remains responsive
- ✅ No browser lag or freeze

**Pass Criteria:** Performance acceptable

---

#### TC-2.8.2: Memory Leak Test
**Objective:** Test for memory leaks

**Steps:**
1. Open browser DevTools → Memory
2. Pop out all panels
3. Close all pop-outs
4. Repeat 10 times
5. Take heap snapshot
6. Analyze for leaks

**Expected Results:**
- ✅ Memory usage returns to baseline
- ✅ No retained BroadcastChannel objects
- ✅ No orphaned event listeners
- ✅ Heap snapshot shows clean state

**Pass Criteria:** No memory leaks detected

---

## Cross-Phase Integration Tests

### Test Suite 3.1: Hybrid Workflows

#### TC-3.1.1: Mixed Main/Pop-Out Workflow
**Objective:** Test realistic user workflow

**Scenario:**
User wants to compare different model combinations while keeping charts visible.

**Steps:**
1. Pop out "Interactive Charts" to secondary monitor
2. On main page, select "Ford: F-150"
3. Observe charts update
4. On main page, change to "Chevrolet: Corvette"
5. Compare chart changes
6. Add year filter on main page
7. Observe chart updates

**Expected Results:**
- ✅ Charts update in real-time as main page changes
- ✅ User can see visual comparisons easily
- ✅ No lag between filter change and chart update

**Pass Criteria:** Workflow feels natural and efficient

---

#### TC-3.1.2: Data Export Workflow
**Objective:** Test pop-out for data export

**Steps:**
1. Select specific models on main page
2. Pop out "Vehicle Results"
3. On pop-out, click "Export" button
4. Download CSV
5. Continue working on main page

**Expected Results:**
- ✅ Export works from pop-out
- ✅ Main page unaffected during export
- ✅ CSV contains correct filtered data

**Pass Criteria:** Export from pop-out works

---

### Test Suite 3.2: State Consistency

#### TC-3.2.1: URL State Consistency
**Objective:** Verify URL as single source of truth

**Steps:**
1. Pop out "Make/Model Picker"
2. Copy main page URL
3. In pop-out, select models
4. Paste URL in new tab
5. Compare all three windows

**Expected Results:**
- ✅ All windows show identical state
- ✅ URL reflects all selections
- ✅ No state divergence

**Pass Criteria:** URL state is authoritative

---

#### TC-3.2.2: Conflict Resolution
**Objective:** Test simultaneous conflicting updates

**Steps:**
1. Pop out "Query Control"
2. On main page, add manufacturer: Ford
3. Simultaneously in pop-out, add manufacturer: Chevrolet
4. Observe final state

**Expected Results:**
- ✅ Last update wins (expected behavior)
- ✅ No errors or crashes
- ✅ State consistent across windows
- ✅ URL shows final state

**Pass Criteria:** Conflicts resolve gracefully

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Backend API running and accessible
- [ ] Elasticsearch index populated
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] localStorage cleared
- [ ] Screen recording started (optional)

### Phase 1 Execution
- [ ] Test Suite 1.1: Initial Page Load (4 tests)
- [ ] Test Suite 1.2: Panel Interaction (4 tests)
- [ ] Test Suite 1.3: Query Control Panel (4 tests)
- [ ] Test Suite 1.4: Make/Model Picker Panel (3 tests)
- [ ] Test Suite 1.5: Vehicle Results Panel (6 tests)
- [ ] Test Suite 1.6: Interactive Charts Panel (2 tests)
- [ ] Test Suite 1.7: State Synchronization (4 tests)
- [ ] Test Suite 1.8: Responsive Design (2 tests)

**Phase 1 Total:** 29 test cases

### Phase 2 Execution
- [ ] Test Suite 2.1: Pop-Out Window Opening (3 tests)
- [ ] Test Suite 2.2: Panel Restoration (2 tests)
- [ ] Test Suite 2.3: State Sync Main → Pop-Out (3 tests)
- [ ] Test Suite 2.4: State Sync Pop-Out → Main (3 tests)
- [ ] Test Suite 2.5: Bidirectional Synchronization (2 tests)
- [ ] Test Suite 2.6: Edge Cases and Error Handling (5 tests)
- [ ] Test Suite 2.7: Multi-Monitor Scenarios (2 tests)
- [ ] Test Suite 2.8: Performance and Stability (2 tests)

**Phase 2 Total:** 22 test cases

### Cross-Phase Execution
- [ ] Test Suite 3.1: Hybrid Workflows (2 tests)
- [ ] Test Suite 3.2: State Consistency (2 tests)

**Cross-Phase Total:** 4 test cases

### Post-Test Activities
- [ ] Document all failures with screenshots
- [ ] File bug reports for critical issues
- [ ] Update test plan with new edge cases discovered
- [ ] Archive test results with timestamp

---

## Bug Reporting Template

### Bug Report Format

**Bug ID:** BUG-YYYY-MM-DD-###
**Severity:** Critical / High / Medium / Low
**Test Case:** TC-X.X.X
**Phase:** 1 / 2 / Cross-Phase

**Summary:**
[One-line description of the issue]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Environment:**
- Browser: [Chrome 120.0.6099.129 / Firefox 121.0]
- OS: [Windows 11 / macOS 14.2 / Linux]
- Screen Resolution: [1920×1080]
- Backend Version: [v1.6.2]
- Frontend Version: [prod-v1.1.3]

**Console Errors:**
```
[Paste console errors here]
```

**Screenshots:**
[Attach screenshots or screen recording]

**Additional Notes:**
[Any other relevant information]

---

## Test Results Summary Template

### Test Execution Report

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Browser + OS]
**Frontend Version:** prod-v1.1.3
**Backend Version:** v1.6.2

**Phase 1 Results:**
- Total Test Cases: 29
- Passed: __
- Failed: __
- Blocked: __
- Pass Rate: __%

**Phase 2 Results:**
- Total Test Cases: 22
- Passed: __
- Failed: __
- Blocked: __
- Pass Rate: __%

**Cross-Phase Results:**
- Total Test Cases: 4
- Passed: __
- Failed: __
- Blocked: __
- Pass Rate: __%

**Overall:**
- Total Test Cases: 55
- Passed: __
- Failed: __
- Blocked: __
- **Overall Pass Rate: __%**

**Critical Issues Found:** __
**High Priority Issues:** __
**Medium Priority Issues:** __
**Low Priority Issues:** __

**Recommendation:**
- [ ] Ready for Production
- [ ] Ready with Minor Issues
- [ ] Needs Major Fixes
- [ ] Not Ready for Production

**Sign-Off:**
- QA Lead: ________________ Date: ________
- Dev Lead: ________________ Date: ________

---

**END OF TEST PLAN**

**Document Control:**
- **Version:** 1.0
- **Last Updated:** 2025-11-08
- **Next Review:** After Phase 1 execution
- **Owner:** QA Team

# Bug Report: Pop-Out Results Table Shows Stale Data After Filter Clear

**Issue ID:** TBD
**Reported By:** QA Team
**Date Reported:** 2025-11-09
**Status:** 🔴 Open
**Priority:** High
**Severity:** Major
**Component:** Results Table, Pop-Out Windows
**Version:** Frontend prod-v1.1.3, Backend v1.6.4

---

## Summary

When the Vehicle Results table is popped out to a separate window and filters are cleared, the results table continues to display stale filtered data (230 results) instead of refreshing to show the full unfiltered dataset (4,880 results). The Interactive Charts panel also remains stuck showing statistics for the filtered subset.

---

## Steps to Reproduce

1. Navigate to `/discover` page (http://192.168.0.244:4201/discover)
2. Apply filters using Query Control:
   - Select a manufacturer (e.g., "Ford")
   - Select a body class (e.g., "Sedan")
3. Observe results table shows ~230 filtered results
4. Click "Pop Out" button on Vehicle Results panel
5. Results table opens in new window, still showing 230 results ✅ (correct)
6. In the **main window**, clear filters using "Clear Filters" button in Query Control
7. **BUG:** Results table in pop-out window remains showing 230 results
8. **BUG:** Interactive Charts panel (popped-in) also shows statistics for 230 results

---

## Expected Behavior

**When filters are cleared:**
1. Main window URL should update to remove filter parameters (e.g., `?manufacturer=Ford&bodyClass=Sedan` → base URL)
2. State update should broadcast to all pop-out windows via BroadcastChannel
3. Pop-out Results table should receive `STATE_UPDATE` message
4. Pop-out Results table should re-fetch data with no filters
5. Pop-out Results table should display all 4,880 results
6. Interactive Charts should display statistics for all 4,880 results
7. Pagination should show "Showing 1 to 10 of 4880 entries" (or current page size)

---

## Actual Behavior

**After clearing filters:**
1. ✅ Main window URL updates correctly (filters removed)
2. ❓ State update broadcast status unknown
3. ❌ Pop-out Results table does NOT receive update or does not react to it
4. ❌ Pop-out Results table continues showing 230 filtered results
5. ❌ Interactive Charts panel continues showing statistics for 230 results
6. ❌ Pagination still shows "230 results" instead of "4880 results"
7. ⚠️ No visible error messages or console warnings observed

**Visual Evidence:**
- Results table header: "230 results" (should be "4880 results")
- Pagination: "Showing 1 to 10 of 10000 entries" (inconsistent)
- Charts show filtered statistics (Ford + Sedan only)

---

## Environment

**Frontend:**
- Version: prod-v1.1.3
- Angular: 14.2.0
- Browser: [Not specified, likely Chrome/Firefox]
- URL: http://192.168.0.244:4201/discover

**Backend:**
- Version: v1.6.4
- API Endpoint: http://autos-prime-ng.minilab/api

**Deployment:**
- Cluster: Halo Labs K3s
- Namespace: autos-prime-ng
- Node: Thor (192.168.0.244)

---

## Impact Analysis

### User Impact
- **Severity:** High
- **Frequency:** Every time filters are cleared with pop-out window open
- **Workaround:** Close pop-out window, clear filters, then pop-out again

### Business Impact
- Users see incorrect data in pop-out windows after filter changes
- Loss of trust in multi-window feature
- Potential for incorrect analysis based on stale data
- Workaround is cumbersome and defeats purpose of persistent pop-outs

### Technical Impact
- Suggests state synchronization issue between main window and pop-outs
- May affect other pop-out message types (not just filter clear)
- Could indicate broader BroadcastChannel communication problem

---

## Potential Root Causes

### Hypothesis 1: Filter Clear Not Broadcasting State Update
**Likelihood:** High

The filter clear operation might not trigger a state broadcast to pop-out windows.

**Check:**
```typescript
// query-control.component.ts - onClearAll() method
onClearAll(): void {
  this.stateService.resetFilters(); // Does this broadcast?
}

// state-management.service.ts - resetFilters() method
resetFilters(): void {
  this.currentFilters = {};
  this.syncStateToUrl(); // Updates URL
  // Does it emit to stateSubject? ← CHECK THIS
}
```

**Expected flow:**
1. Clear filters button clicked
2. `stateService.resetFilters()` called
3. URL cleared of filter parameters
4. `stateSubject.next()` emits new state
5. Discover component broadcasts via BroadcastChannel

**Possible issue:** `resetFilters()` updates URL but doesn't emit to Observable.

---

### Hypothesis 2: Pop-Out Not Subscribed to Filter Clear Messages
**Likelihood:** Medium

Pop-out Results table might not be listening for filter clear events.

**Check:**
```typescript
// results-table.component.ts (in pop-out context)
ngOnInit(): void {
  if (this.popOutContext.isInPopOut()) {
    this.popOutContext.onMessage().subscribe((message) => {
      if (message.type === 'STATE_UPDATE') {
        // Does this handle filter clear? ← CHECK THIS
        // Does it re-fetch data? ← CHECK THIS
      }
    });
  }
}
```

**Expected behavior:** `STATE_UPDATE` message should trigger data refresh regardless of whether filters were added, changed, or cleared.

**Possible issue:** Results table only updates charts/statistics but doesn't re-fetch vehicle data.

---

### Hypothesis 3: Cached Request Not Invalidated
**Likelihood:** Medium

RequestCoordinatorService might be serving cached response for old filter state.

**Check:**
```typescript
// request-coordinator.service.ts
private getCacheKey(filters: any): string {
  return JSON.stringify(filters); // Does empty object match no-filter state?
}
```

**Possible issue:** Cache key for `{}` (empty filters) doesn't match cache key for no filters, or cache isn't invalidated when filters cleared.

---

### Hypothesis 4: Main Window Not Broadcasting on Filter Clear
**Likelihood:** High

Discover component's state broadcast subscription might not trigger on filter clear.

**Check:**
```typescript
// discover.component.ts
private subscribeToStateBroadcast(): void {
  this.stateService.filters$
    .pipe(takeUntil(this.destroy$))
    .subscribe((state) => {
      // Is this being called when filters cleared? ← CHECK THIS
      console.log('Broadcasting state to pop-outs:', state);

      this.popoutWindows.forEach((popoutInfo) => {
        popoutInfo.channel.postMessage({
          type: 'STATE_UPDATE',
          state: state
        });
      });
    });
}
```

**Expected behavior:** Subscription should fire on every state change, including filter clear.

**Possible issue:** `filters$` Observable not emitting when filters reset to empty state.

---

## Affected Components

### Frontend Components
1. **Query Control Component** (`query-control.component.ts`)
   - Clear filters button handler
   - May not trigger proper state update

2. **State Management Service** (`state-management.service.ts`)
   - `resetFilters()` method
   - May not emit to Observable subscribers

3. **Discover Component** (`discover.component.ts`)
   - State broadcast logic
   - May not broadcast on filter clear

4. **Results Table Component** (`results-table.component.ts`)
   - Pop-out state update handler
   - May not re-fetch data on state update

5. **Request Coordinator Service** (`request-coordinator.service.ts`)
   - Cache invalidation logic
   - May serve stale cached responses

### Backend Components
- No backend changes suspected (API likely returns correct data if called)

---

## Diagnostic Steps

### Step 1: Enable Console Logging
Add debug logging to trace state flow:

```typescript
// query-control.component.ts
onClearAll(): void {
  console.log('[QueryControl] 🔴 CLEAR ALL FILTERS CLICKED');
  this.stateService.resetFilters();
}

// state-management.service.ts
resetFilters(): void {
  console.log('[StateManagement] 🔴 RESET FILTERS CALLED');
  this.currentFilters = {};
  this.syncStateToUrl();
  console.log('[StateManagement] 🔴 EMITTING STATE:', this.getCurrentState());
  this.stateSubject.next(this.getCurrentState()); // Check if this exists
}

// discover.component.ts
private subscribeToStateBroadcast(): void {
  this.stateService.filters$
    .pipe(takeUntil(this.destroy$))
    .subscribe((state) => {
      console.log('[Discover] 🔴 STATE CHANGE DETECTED, broadcasting to pop-outs:', state);
      // ... broadcast logic
    });
}

// results-table.component.ts (in pop-out)
this.popOutContext.onMessage().subscribe((message) => {
  console.log('[ResultsTable-PopOut] 🔴 MESSAGE RECEIVED:', message);
  if (message.type === 'STATE_UPDATE') {
    console.log('[ResultsTable-PopOut] 🔴 APPLYING STATE UPDATE:', message.state);
    // ... update logic
  }
});
```

**Expected log sequence:**
1. `[QueryControl] 🔴 CLEAR ALL FILTERS CLICKED`
2. `[StateManagement] 🔴 RESET FILTERS CALLED`
3. `[StateManagement] 🔴 EMITTING STATE: { filters: {}, ... }`
4. `[Discover] 🔴 STATE CHANGE DETECTED, broadcasting to pop-outs: { filters: {}, ... }`
5. `[ResultsTable-PopOut] 🔴 MESSAGE RECEIVED: { type: 'STATE_UPDATE', state: {...} }`
6. `[ResultsTable-PopOut] 🔴 APPLYING STATE UPDATE: { filters: {}, ... }`

### Step 2: Check BroadcastChannel Activity
Use browser DevTools to monitor BroadcastChannel messages:

```javascript
// Run in main window console
const testChannel = new BroadcastChannel('panel-vehicle-results');
testChannel.onmessage = (event) => {
  console.log('📡 BroadcastChannel message:', event.data);
};
```

**Expected:** Should see `STATE_UPDATE` message when filters cleared.

### Step 3: Verify API Calls
Check Network tab for API requests after filter clear:

**Expected requests:**
1. `GET /api/search/vehicle-details?page=1&size=20` (no filter params)
2. `GET /api/search/statistics` (no filter params)

**If missing:** Pop-out not making API calls after filter clear.

### Step 4: Test Other Filter Operations
Try different filter operations to isolate issue:

**Test Cases:**
1. Add filter → Pop-out table → Modify filter → Check update ✅/❌
2. Add filter → Pop-out table → Add another filter → Check update ✅/❌
3. Add filter → Pop-out table → Remove one filter → Check update ✅/❌
4. Add filter → Pop-out table → Clear all filters → Check update ❌ (KNOWN ISSUE)

**If all fail:** Broad pop-out state sync issue.
**If only clear fails:** Specific to resetFilters() method.

---

## Suggested Fixes

### Fix Option 1: Ensure resetFilters() Emits State (Recommended)

**File:** `frontend/src/app/core/services/state-management.service.ts`

```typescript
resetFilters(): void {
  console.log('[StateManagement] Resetting all filters');

  // Clear filters
  this.currentFilters = {};

  // Update URL
  this.syncStateToUrl();

  // CRITICAL: Emit new state to all subscribers
  this.stateSubject.next(this.getCurrentState());

  // Trigger API call for unfiltered data
  this.fetchVehicleData();
}
```

**Rationale:** Ensures Observable emits, triggering broadcast to pop-outs.

---

### Fix Option 2: Add Explicit Clear Filters Message Type

**File:** `frontend/src/app/features/filters/query-control/query-control.component.ts`

```typescript
onClearAll(): void {
  console.log('[QueryControl] Clearing all filters');

  // Send explicit message to pop-outs
  if (this.popOutContext.isInPopOut()) {
    this.popOutContext.sendMessage({
      type: 'CLEAR_ALL_FILTERS'
    });
  } else {
    // Main window: broadcast to all pop-outs
    // ... existing broadcast logic
  }

  // Reset state
  this.stateService.resetFilters();
}
```

**File:** `frontend/src/app/features/discover/discover.component.ts`

```typescript
// Add handler for CLEAR_ALL_FILTERS
} else if (event.data.type === 'CLEAR_ALL_FILTERS') {
  console.log('Clear all filters from pop-out');
  this.stateService.resetFilters();
}
```

**Rationale:** Explicit message type makes filter clear operation obvious in code.

---

### Fix Option 3: Force Re-Fetch on State Update with Empty Filters

**File:** `frontend/src/app/shared/components/results-table/results-table.component.ts`

```typescript
this.popOutContext.onMessage().subscribe((message) => {
  if (message.type === 'STATE_UPDATE') {
    const newState = message.state;

    // Check if filters were cleared (empty object)
    const filtersCleared = Object.keys(newState.filters || {}).length === 0 &&
                          Object.keys(this.currentFilters || {}).length > 0;

    if (filtersCleared) {
      console.log('[ResultsTable] Filters cleared, forcing data refresh');
    }

    // Always update state and re-fetch
    this.currentFilters = newState.filters;
    this.statistics = newState.statistics;
    this.results = newState.results;

    // Re-render
    this.cdr.markForCheck();
  }
});
```

**Rationale:** Pop-out explicitly detects filter clear and handles it.

---

## Testing Checklist

After implementing fix, verify:

- [ ] Clear filters in main window → Pop-out results update to show all data
- [ ] Clear filters in main window → Pop-out charts update to show all statistics
- [ ] Clear filters in pop-out window (if applicable) → Main window updates
- [ ] Add filter after clear → Results filter correctly
- [ ] Multiple pop-outs → All update on filter clear
- [ ] Console shows expected log sequence (no errors)
- [ ] Network tab shows API calls with no filter parameters
- [ ] Pagination shows correct total count (4,880 not 230)
- [ ] No performance degradation (broadcast efficiency)
- [ ] Browser back button works correctly after filter clear

---

## Related Issues

- **Issue #TBD:** Pop-out highlighting not working (RESOLVED v1.6.4)
- **Issue #TBD:** Multi-select highlighting only highlights first item (RESOLVED v1.6.3)

---

## Additional Notes

### Charts Stuck on 230 Results
The Interactive Charts panel remaining stuck at 230 results suggests:
1. Charts subscribe to same state as results table
2. If results table not updating, charts won't either
3. Single root cause likely affects both components

### Workaround for Users
Until fixed, users can:
1. Close pop-out window
2. Clear filters in main window
3. Verify main window shows correct results
4. Pop-out window again

**Note:** This defeats the purpose of persistent pop-out windows and should be considered a temporary mitigation only.

### Priority Justification
**High Priority** because:
- Affects core multi-window feature
- Leads to incorrect data display
- No automatic recovery (requires manual workaround)
- Undermines trust in application accuracy
- Reproducible 100% of the time

---

## Acceptance Criteria

**This issue is considered RESOLVED when:**

1. ✅ Clearing filters in main window causes pop-out Results table to show all 4,880 results
2. ✅ Clearing filters in main window causes pop-out Charts to show statistics for all data
3. ✅ Console logs show proper state broadcast sequence
4. ✅ Network tab shows API call for unfiltered data
5. ✅ Pagination displays correct total count
6. ✅ Multiple pop-outs all update simultaneously
7. ✅ All regression tests pass
8. ✅ No new errors introduced
9. ✅ Performance remains acceptable (< 100ms broadcast latency)
10. ✅ Code review approved

---

**Status:** 🔴 Open - Awaiting Investigation
**Assigned To:** TBD
**Target Resolution:** TBD
**Last Updated:** 2025-11-09

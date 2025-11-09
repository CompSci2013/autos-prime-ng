# Pop-Out Window Highlighting Architecture

**Created:** 2025-11-09
**Status:** ✅ IMPLEMENTED
**Version:** v1.6.4

---

## Overview

This document describes the architecture for chart highlighting functionality in pop-out windows, demonstrating how the application maintains URL-first state management while supporting interactive charts in separate browser windows.

## Problem Statement

Charts can be popped out to separate browser windows for multi-monitor workflows. When users interact with these charts in highlight mode (click/box-select to emphasize data), we need to:

1. **Maintain URL as single source of truth** - Only the main window's URL matters
2. **Keep pop-outs stateless** - Pop-out windows never modify their own state
3. **Support bidirectional sync** - Highlights from pop-outs appear in all windows
4. **Preserve shareability** - URL bookmarks include highlight state

## Architectural Principles

### 1. URL-First Architecture

The main window's URL is the **only** source of truth:

```
Main Window URL: http://app.com/discover?h_manufacturer=Ford&h_bodyClass=Coupe
Pop-Out Window URL: http://app.com/popout/charts (IGNORED)
```

All state lives in main window URL parameters. Pop-out window URLs are irrelevant to application state.

### 2. Dumb Pop-Out Components

Pop-out windows are "dumb" components that:

- ✅ Receive state via BroadcastChannel messages
- ✅ Render based on received state
- ✅ Emit user events (never update state directly)
- ❌ Never modify their own URL
- ❌ Never call state management services directly
- ❌ Don't know where their events go

### 3. Unidirectional Data Flow

```
User clicks chart in pop-out
    ↓
Pop-out emits message via BroadcastChannel
    ↓
Main window receives message
    ↓
Main window updates URL (urlParamService)
    ↓
Angular router detects URL change
    ↓
StateManagementService hydrates from URL
    ↓
Observable emits new state
    ↓
Main window broadcasts state to all pop-outs
    ↓
All pop-outs re-render with highlights
```

**Key insight:** Pop-out never updates itself - it waits for the broadcast!

## Implementation Details

### Message Flow

#### Step 1: User Interaction in Pop-Out

User clicks "Ford" bar in Manufacturers chart:

```typescript
// plotly-histogram.component.ts (in pop-out window)
private onManufacturerClick(manufacturer: string): void {
  if (this.isHighlightModeActive) {
    console.log(`[PlotlyHistogram] 🟦 Manufacturer HIGHLIGHTED: ${manufacturer}`);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out + highlight mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'HIGHLIGHT_MANUFACTURER',
        payload: manufacturer
      });
    } else {
      // Normal window: update URL directly
      this.urlParamService.setHighlightParam('manufacturer', manufacturer);
    }
    return;
  }
  // ... normal click handling
}
```

**Pop-out behavior:** Send message, do NOT update local state.

#### Step 2: Main Window Receives Message

```typescript
// discover.component.ts
private subscribeToPopoutMessages(): void {
  this.popoutMessages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(({ panelId, event }) => {
      // ... other message handlers

      if (event.data.type === 'HIGHLIGHT_MANUFACTURER') {
        console.log('Manufacturer highlight from pop-out:', event.data.payload);

        // Update main window URL
        this.urlParamService.setHighlightParam('manufacturer', event.data.payload);
      }
    });
}
```

**Main window behavior:** Update URL, trigger state cycle.

#### Step 3: URL Update Triggers State Cycle

```typescript
// URL change detected by Angular Router
// Before: http://app.com/discover
// After:  http://app.com/discover?h_manufacturer=Ford

// StateManagementService hydrates from URL
private hydrateFromUrl(): void {
  const params = this.routeState.getAllParams();

  // Extract highlight parameters (h_ prefix)
  const highlights: HighlightFilters = {};

  Object.keys(params).forEach(key => {
    if (key.startsWith('h_')) {
      const baseKey = key.substring(2); // Remove 'h_' prefix

      switch(baseKey) {
        case 'manufacturer':
          highlights.manufacturer = params[key];
          break;
        // ... other highlight types
      }
    }
  });

  // Emit new state
  this.stateSubject.next({
    filters: this.currentFilters,
    highlights: highlights, // NEW STATE!
    // ... other state properties
  });
}
```

#### Step 4: Main Window Broadcasts State

```typescript
// discover.component.ts
private subscribeToStateBroadcast(): void {
  this.stateService.filters$
    .pipe(takeUntil(this.destroy$))
    .subscribe((state) => {
      // Broadcast to ALL pop-out windows
      this.popoutWindows.forEach((popoutInfo) => {
        popoutInfo.channel.postMessage({
          type: 'STATE_UPDATE',
          state: state
        });
      });
    });
}
```

#### Step 5: Pop-Outs Receive State and Re-Render

```typescript
// plotly-histogram.component.ts (in pop-out window)
ngOnInit(): void {
  if (this.popOutContext.isInPopOut()) {
    // Subscribe to state updates from main window
    this.popOutContext.onMessage().subscribe((message) => {
      if (message.type === 'STATE_UPDATE') {
        // Receive new state with highlights
        this.statistics = message.state.statistics;
        this.highlights = message.state.highlights; // Ford is now highlighted!

        // Re-render all charts with new highlight state
        this.renderAllCharts();
      }
    });
  }
}
```

**Pop-out never knew it caused the update!** It's a dumb component.

## Supported Highlight Types

### 1. Manufacturer Highlighting

**User Action:** Click or box-select manufacturers
**Message Type:** `HIGHLIGHT_MANUFACTURER`
**URL Parameter:** `h_manufacturer=Ford,Chevrolet`
**Backend Query:** `terms` query with array of manufacturers

```typescript
// Single click
payload: "Ford"

// Box select (multiple)
payload: "Ford,Chevrolet,Dodge"
```

### 2. Model Combinations Highlighting

**User Action:** Click or box-select models
**Message Type:** `HIGHLIGHT_MODEL_COMBOS`
**URL Parameter:** `h_modelCombos=Dodge:Charger,Chevrolet:Camaro`
**Backend Query:** OR(AND) query matching manufacturer+model pairs

```typescript
// Single click
payload: "Dodge:Charger"

// Box select (multiple)
payload: "Dodge:Charger,Chevrolet:Camaro,Ford:Mustang"
```

**Note:** Space-separated display text ("Dodge Charger") is converted to colon-separated format ("Dodge:Charger") for URL/backend.

### 3. Body Class Highlighting

**User Action:** Click or box-select body classes
**Message Type:** `HIGHLIGHT_BODY_CLASS`
**URL Parameter:** `h_bodyClass=Coupe,Pickup`
**Backend Query:** `terms` query with array of body classes

```typescript
// Single click
payload: "Coupe"

// Box select (multiple)
payload: "Coupe,Pickup,SUV"
```

### 4. Year Range Highlighting

**User Action:** Click year or box-select range
**Message Type:** `HIGHLIGHT_YEAR_RANGE`
**URL Parameter:** `h_yearMin=1965&h_yearMax=1970`
**Backend Query:** Range query on year field

```typescript
// Single year click
payload: { yearMin: 1970, yearMax: 1970 }

// Range selection
payload: { yearMin: 1965, yearMax: 1970 }
```

## Code Organization

### Frontend Files

**Chart Component:**
- File: `frontend/src/app/shared/components/plotly-histogram/plotly-histogram.component.ts`
- Responsibilities:
  - Detect highlight mode + pop-out context
  - Emit messages for pop-out interactions
  - Update URL directly for main window interactions
  - Re-render charts based on received state

**Discover Component:**
- File: `frontend/src/app/features/discover/discover.component.ts`
- Responsibilities:
  - Listen for pop-out messages (BroadcastChannel)
  - Update main window URL via `urlParamService`
  - Broadcast state updates to all pop-outs

**State Models:**
- File: `frontend/src/app/models/search-filters.model.ts`
- Key Interface:
  ```typescript
  export interface HighlightFilters {
    yearMin?: number;
    yearMax?: number;
    manufacturer?: string;
    modelCombos?: string;
    bodyClass?: string;
  }

  export interface AppState {
    filters: SearchFilters;
    highlights?: HighlightFilters;  // UI-only state
    // ... other properties
  }
  ```

**URL Parameter Service:**
- File: `frontend/src/app/core/services/url-param.service.ts`
- Methods:
  - `setHighlightParam(key, value)` - Set single highlight parameter
  - `setHighlightRange(params)` - Set multiple highlight parameters
  - `getHighlightParam(key)` - Get highlight parameter value
  - `clearAllHighlights()` - Remove all h_* parameters

### Backend Files

**Controller:**
- File: `backend/src/controllers/vehicleController.js`
- Extracts highlight parameters from query string:
  ```javascript
  // Extract highlight parameters (h_ prefix)
  h_manufacturer = '',
  h_modelCombos = '',
  h_bodyClass = '',
  h_yearMin = '',
  h_yearMax = ''
  ```

**Elasticsearch Service:**
- File: `backend/src/services/elasticsearchService.js`
- Builds highlight filters:
  ```javascript
  // Multi-value manufacturer highlighting
  if (highlights.manufacturer) {
    const manufacturers = highlights.manufacturer.split(',').map(m => m.trim());
    highlightFilter.bool.filter.push({
      terms: { 'manufacturer.keyword': manufacturers }
    });
  }

  // Model combos highlighting (OR of AND conditions)
  if (highlights.modelCombos && highlights.modelCombos.length > 0) {
    const modelComboQueries = highlights.modelCombos.map(combo => ({
      bool: {
        must: [
          { term: { 'manufacturer.keyword': combo.manufacturer } },
          { term: { 'model.keyword': combo.model } }
        ]
      }
    }));

    highlightFilter.bool.filter.push({
      bool: {
        should: modelComboQueries,
        minimum_should_match: 1
      }
    });
  }
  ```

## Message Types Reference

| Message Type | Direction | Purpose | Payload Format |
|-------------|-----------|---------|----------------|
| `HIGHLIGHT_MANUFACTURER` | Pop-out → Main | Manufacturer highlight | `"Ford"` or `"Ford,Chevrolet"` |
| `HIGHLIGHT_MODEL_COMBOS` | Pop-out → Main | Model combos highlight | `"Dodge:Charger,Chevrolet:Camaro"` |
| `HIGHLIGHT_BODY_CLASS` | Pop-out → Main | Body class highlight | `"Coupe"` or `"Coupe,Pickup"` |
| `HIGHLIGHT_YEAR_RANGE` | Pop-out → Main | Year range highlight | `{ yearMin: 1965, yearMax: 1970 }` |
| `STATE_UPDATE` | Main → Pop-out | Full state broadcast | `{ filters, highlights, statistics, ... }` |

## Architectural Benefits

### ✅ Single Source of Truth

Main window URL is the only source of truth:
- Bookmarkable: Share URL includes all highlights
- Debuggable: Inspect URL to see current state
- Testable: Set URL parameters to test highlight states

### ✅ Stateless Pop-Outs

Pop-out windows never hold state:
- Predictable: Always render what they're told
- Reliable: Can't get out of sync with main window
- Simple: No complex state management in pop-outs

### ✅ Unidirectional Data Flow

Clear flow prevents circular updates:
- Pop-out emits event → Main updates URL → State hydrates → Observable emits → All components update
- No race conditions between windows
- No conflicting state updates

### ✅ Backwards Compatible

Pattern extends existing architecture:
- Same pattern used for picker selections (`PICKER_SELECTION_CHANGE`)
- Same pattern used for filter changes (`FILTER_ADD`, `FILTER_REMOVE`)
- Consistent with URL-first philosophy

### ✅ Multi-Window Aware

Supports complex workflows:
- Multiple pop-outs stay in sync
- Main window and all pop-outs see same highlights
- Close/reopen pop-out restores correct state

## Testing Scenarios

### Test 1: Highlight from Pop-Out

1. Pop out Interactive Charts panel
2. Enable highlight mode (checkbox)
3. Click "Ford" in Manufacturers chart (pop-out window)
4. **Expected:**
   - Main window URL updates: `?h_manufacturer=Ford`
   - Main window chart highlights Ford
   - Pop-out chart highlights Ford
   - Query Control shows "Highlight Manufacturer: Ford" chip

### Test 2: Box Select Multiple Items

1. Pop out Interactive Charts panel
2. Enable highlight mode
3. Box-select "Coupe" and "Pickup" in Body Class chart (pop-out window)
4. **Expected:**
   - Main window URL updates: `?h_bodyClass=Coupe,Pickup`
   - Both windows highlight both body classes
   - Query Control shows "Highlight Body Class: Coupe, Pickup" chip

### Test 3: Model Combos Highlighting

1. Pop out Interactive Charts panel
2. Select manufacturer in main window (e.g., "Dodge")
3. Enable highlight mode
4. Click "Dodge Charger" in Models chart (pop-out window)
5. **Expected:**
   - Main window URL updates: `?h_modelCombos=Dodge:Charger`
   - Both windows highlight "Dodge Charger" bar
   - Query Control shows "Highlight Models: Dodge Charger" chip

### Test 4: Multiple Pop-Outs Stay in Sync

1. Pop out Interactive Charts panel (window A)
2. Pop out Interactive Charts panel again (window B)
3. Enable highlight mode in main window
4. Click "Ford" in window A
5. **Expected:**
   - Main window URL updates: `?h_manufacturer=Ford`
   - Main window highlights Ford
   - Window A highlights Ford
   - Window B highlights Ford
   - All three windows stay synchronized

### Test 5: Bookmark with Highlights

1. Set highlights in URL: `?h_manufacturer=Ford&h_bodyClass=Coupe&h_yearMin=1965&h_yearMax=1970`
2. Bookmark URL
3. Close browser
4. Open bookmark in new browser session
5. **Expected:**
   - All highlights restore correctly
   - Charts render with correct highlight state
   - Query Control shows all highlight chips

## Known Limitations

### Pop-Out Window URLs are Irrelevant

Pop-out windows have URLs like `http://app.com/popout/charts`, but these URLs:
- Don't contain state (no query parameters)
- Can't be bookmarked meaningfully
- Aren't shareable

**Workaround:** Share main window URL instead. Pop-outs are ephemeral views.

### Multiple Main Windows Not Supported

If user opens two main windows (two tabs of `/discover`):
- Each has its own URL (independent state)
- Pop-outs from each window only sync with their parent
- No cross-tab synchronization

**Workaround:** Use single main window with multiple pop-outs.

### Highlight State vs. Filter State Confusion

Users might confuse:
- **Highlights** (UI-only, `h_` prefix) - Visual emphasis, no API impact
- **Filters** (data filters, no prefix) - Actually filter data via API

**Mitigation:** Clear UI labeling, different chip colors in Query Control.

## Future Enhancements

### 1. Clear Highlights Button

Add button to remove all highlight parameters at once:
```typescript
clearAllHighlights(): void {
  this.urlParamService.clearAllHighlights();
}
```

### 2. Highlight Presets

Save/load highlight combinations:
```typescript
saveHighlightPreset(name: string): void {
  const highlights = this.urlParamService.getAllHighlightParams();
  localStorage.setItem(`highlight-preset-${name}`, JSON.stringify(highlights));
}
```

### 3. Highlight-to-Filter Conversion

Convert highlights to actual filters:
```typescript
convertHighlightsToFilters(): void {
  const highlights = this.urlParamService.getAllHighlightParams();
  this.stateService.updateFilters({
    manufacturer: highlights.manufacturer,
    bodyClass: highlights.bodyClass,
    yearMin: highlights.yearMin ? parseInt(highlights.yearMin) : undefined,
    yearMax: highlights.yearMax ? parseInt(highlights.yearMax) : undefined
  });
  this.urlParamService.clearAllHighlights();
}
```

### 4. Additional Highlight Dimensions

Support highlighting by:
- State code (`h_stateCode=CA,TX`)
- Condition range (`h_conditionMin=4&h_conditionMax=5`)
- Price range (`h_priceMin=20000&h_priceMax=50000`)

## Related Documentation

- **[Panel Pop-Out Architecture](./panel-popout-architecture.md)** - Overall pop-out window design
- **[State Management Guide](../state-management-guide.md)** - URL-first state management patterns
- **[URL Parameter Service](../../frontend/src/app/core/services/url-param.service.ts)** - Service API reference

## Changelog

### v1.6.4 (2025-11-09)
- ✅ Implemented model combos highlighting (`h_modelCombos`)
- ✅ Added OR(AND) Elasticsearch query for model pairs
- ✅ Fixed pop-out + highlight mode logic in all event handlers
- ✅ Added message handlers in discover component

### v1.6.3 (2025-11-09)
- ✅ Fixed multi-value highlighting for manufacturers and body classes
- ✅ Changed backend from `term` to `terms` query for comma-separated values

### v1.6.2 (2025-11-09)
- ✅ Added `plotly_selected` event handlers for box/lasso selection
- ✅ Created multi-select methods for all chart types
- ✅ Initial highlight mode implementation

---

**Document Status:** ✅ COMPLETE
**Implementation Status:** ✅ DEPLOYED (Frontend prod-v1.1.3, Backend v1.6.4)
**Last Updated:** 2025-11-09

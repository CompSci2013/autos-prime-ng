# DISCOVER FEATURE SPECIFICATION
## Vehicle Discovery Page - Complete Component Specification
### Branch: experiment/resource-management-service

**Status**: Working Draft - Subject to Refinement
**Date**: 2025-11-15
**Purpose**: Complete specification for reimplementing the Discover page

---

## OVERVIEW

The Discover page is the primary interface for vehicle discovery, providing 7 collapsible, draggable, and pop-outable panels for comprehensive vehicle search, filtering, and analysis.

**File**: `frontend/src/app/features/discover/discover.component.ts`
**Route**: `/discover`

---

## KEY FEATURES

1. **7 Configurable Panels** - Query Control, Model Pickers (3 variants), VIN Browser, Results Table, Charts
2. **Drag-Drop Reordering** - Angular CDK drag-drop with visual feedback
3. **Pop-Out Windows** - MOVE semantics (panel disappears from main page)
4. **State Persistence** - Panel order and collapse state saved to localStorage
5. **Cross-Window Sync** - BroadcastChannel for state synchronization
6. **URL-First State** - All filters managed via URL parameters

---

## COMPONENT ARCHITECTURE

### Responsibilities

- Panel orchestration and layout management
- Filter coordination between child components
- Pop-out window lifecycle management
- BroadcastChannel communication
- localStorage persistence
- State synchronization

### Service Dependencies

```typescript
constructor(
  private stateService: VehicleResourceManagementService,  // Main state
  private urlState: UrlStateService,                       // URL manipulation
  private route: ActivatedRoute,                           // Route params
  private cdr: ChangeDetectorRef                          // Change detection
) {}
```

---

## PANEL CONFIGURATION

### Panel Model

```typescript
interface PanelConfig {
  id: string;           // Unique identifier
  title: string;        // Display title
  collapsed: boolean;   // Collapse state (persisted)
}
```

### 7 Panels (Default Order)

| # | Panel ID | Title | Component | Default Collapsed |
|---|----------|-------|-----------|-------------------|
| 1 | query-control | Query Control | QueryControlComponent | false |
| 2 | model-picker | Model Picker (Single) | BasePickerComponent | false |
| 3 | dual-picker | Model Picker (Dual Checkbox) | DualCheckboxPickerComponent | true |
| 4 | base-dual-picker | Make/Model Picker (Experimental) | BaseDualPickerComponent | true |
| 5 | vin-browser | VIN Browser | BasePickerComponent | false |
| 6 | vehicle-results | Vehicle Results | ResultsTableComponent | false |
| 7 | interactive-charts | Interactive Charts | PlotlyHistogramComponent | false |

---

## DRAG-DROP SYSTEM

### Technology

- **Library**: `@angular/cdk/drag-drop`
- **Key Classes**: `CdkDragDrop`, `moveItemInArray`

### Implementation

```typescript
// Template
<div cdkDropList (cdkDropListDropped)="onPanelDrop($event)">
  <div *ngFor="let panel of panels" cdkDrag>
    <div cdkDragHandle>...</div>
    <div *cdkDragPreview>...</div>
    <div *cdkDragPlaceholder>...</div>
    <!-- Panel content -->
  </div>
</div>

// Component
onPanelDrop(event: CdkDragDrop<PanelConfig[]>): void {
  moveItemInArray(this.panels, event.previousIndex, event.currentIndex);
  this.savePanelOrder();
}
```

### Visual Feedback

- **Drag Handle**: Left-side handle, appears on hover
- **Drag Preview**: Red border with shadow, shows panel title
- **Drop Placeholder**: Dashed red border with "Drop here" text

---

## POP-OUT WINDOW SYSTEM

### MOVE Semantics

When popped out:
- Panel removed from main page (shows placeholder)
- Opens in separate window at `/panel/:gridId/:panelId/:type`
- BroadcastChannel keeps main and pop-out in sync
- Auto-restores when pop-out window closes

### Pop-Out Flow

```typescript
popOutPanel(panelId: string): void {
  // 1. Build URL
  const url = `/panel/discover/${panelId}/${panelType}`;

  // 2. Open window
  const features = 'width=1200,height=800,...';
  const popoutWindow = window.open(url, `panel-${panelId}`, features);

  // 3. Mark as popped out
  this.poppedOutPanels.add(panelId);

  // 4. Set up BroadcastChannel
  const channel = new BroadcastChannel(`panel-${panelId}`);
  channel.onmessage = (event) => { ... };

  // 5. Monitor for close
  const checkInterval = setInterval(() => {
    if (popoutWindow.closed) {
      this.poppedOutPanels.delete(panelId);
      channel.close();
      clearInterval(checkInterval);
    }
  }, 500);
}
```

### BroadcastChannel Messages

| Type | Source | Purpose |
|------|--------|---------|
| STATE_UPDATE | Main | Full state sync to pop-outs |
| PANEL_READY | Pop-out | Request initial state |
| PICKER_SELECTION_CHANGE | Pop-out | Selection changed |
| FILTER_ADD | Pop-out | Filter added |
| FILTER_REMOVE | Pop-out | Filter removed |

---

## STATE PERSISTENCE

### localStorage Key

```typescript
private readonly PANEL_ORDER_KEY = 'discover-panel-order';
```

### Saved Data Structure

```typescript
// Stored as: JSON.stringify(panels)
[
  { id: 'query-control', title: 'Query Control', collapsed: false },
  { id: 'model-picker', title: 'Model Picker (Single)', collapsed: false },
  ...
]
```

### Load/Save Operations

```typescript
// Load on init
loadPanelOrder(): void {
  const saved = localStorage.getItem(this.PANEL_ORDER_KEY);
  if (saved) {
    const savedPanels = JSON.parse(saved);
    // Reorder and restore collapsed state
    this.panels = this.reconcilePanels(savedPanels);
  }
}

// Save after changes
savePanelOrder(): void {
  localStorage.setItem(this.PANEL_ORDER_KEY, JSON.stringify(this.panels));
}

// Reset to defaults
resetPanelOrder(): void {
  this.panels = DEFAULT_PANELS;
  this.savePanelOrder();
}
```

---

## FILTER MANAGEMENT

### Filter Add (from Query Control)

```typescript
onFilterAdd(filter: QueryFilter): void {
  const updates: Partial<SearchFilters> = {};

  if (filter.type === 'multiselect') {
    updates[filter.field] = filter.values.join(',');
  } else if (filter.type === 'range') {
    if (filter.field === 'year') {
      updates.yearMin = filter.rangeMin;
      updates.yearMax = filter.rangeMax;
    }
  } else {
    updates[filter.field] = filter.value;
  }

  this.stateService.updateFilters(updates);
}
```

### Filter Remove (from Query Control)

```typescript
onFilterRemove(event: { field: string; updates: Partial<SearchFilters> }): void {
  this.stateService.updateFilters(event.updates);
}
```

### Clear All Filters

```typescript
onClearAll(): void {
  this.urlState.replaceQueryParams({ page: '1', size: '20' }).subscribe();
}
```

---

## LIFECYCLE

### ngOnInit

```typescript
ngOnInit(): void {
  this.loadPanelOrder();
  this.subscribeToStateFilters();
  this.subscribeToStateBroadcast();
  this.subscribeToPopoutMessages();
}
```

### ngOnDestroy

```typescript
ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();

  // Clean up pop-out windows
  this.popoutWindows.forEach(({ window, channel, checkInterval }) => {
    clearInterval(checkInterval);
    channel.close();
    if (window && !window.closed) window.close();
  });
}
```

---

## STYLING HIGHLIGHTS

### Material Red Theme

- Primary: `#f44336`
- Dark: `#d32f2f`
- Light: `#ffebee`

### Key Styles

- Drag handle: Positioned left, appears on hover
- Drag preview: Red border, shadow
- Drop placeholder: Dashed red border, light background
- Pop-out placeholder: Dashed grey border, centered content
- Buttons: Red theme with hover states

---

## USER FLOWS

### Flow 1: Add Filter
1. User selects filter type from Query Control
2. Dialog opens with options
3. User makes selection
4. Dialog closes, filter applied
5. URL updates
6. All panels re-render with new data

### Flow 2: Pop Out Panel
1. User hovers panel header → pop-out button appears
2. User clicks button
3. New window opens
4. Main page shows placeholder
5. Both sync via BroadcastChannel
6. User closes window → panel restores

### Flow 3: Reorder Panels
1. User drags panel to new position
2. Visual feedback shows drop location
3. Drop updates panel order
4. Saves to localStorage

---

## ERROR HANDLING

- **Pop-up Blocked**: Console warning, panel stays on main page
- **localStorage Unavailable**: Uses default panel order
- **Window Close**: Polling detects closure, restores panel
- **Missing Config**: Throws error (config is required)

---

## INTEGRATION POINTS

### With ResourceManagementService
- Subscribe to `filters$` for filter updates
- Subscribe to `state$` for full state
- Call `updateFilters()` to modify filters
- Call `getCurrentState()` for snapshots

### With UrlStateService
- Call `clearQueryParam()` to remove highlights
- Call `replaceQueryParams()` to reset all filters

### With Pop-Out Windows
- BroadcastChannel for messaging
- window.open() for window creation
- Polling for close detection

---

## TESTING CONSIDERATIONS

### Unit Tests Should Cover
- Panel drag-drop logic
- Pop-out window lifecycle
- localStorage save/load
- Filter add/remove
- Message handling

### E2E Tests Should Cover
- Complete filter workflow
- Panel reordering persistence
- Pop-out window functionality
- Clear all filters
- Panel collapse state persistence

---

## FUTURE ENHANCEMENTS

1. **Multi-Grid Support**: Multiple discover pages with different configurations
2. **Panel Templates**: Save/load panel configurations
3. **Panel Customization**: User-selectable panels
4. **Advanced Layouts**: Grid vs. list vs. masonry
5. **Keyboard Shortcuts**: Hotkeys for common actions

---

**End of Specification**

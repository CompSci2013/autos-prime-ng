# POP-OUT WINDOW SYSTEM SPECIFICATION
## Multi-Window Dashboard Support
### Branch: experiment/resource-management-service

**Status**: Working Draft
**Date**: 2025-11-15

---

## OVERVIEW

The application supports **pop-out windows** allowing users to move panels to separate browser windows for multi-monitor setups. This uses MOVE semantics: panels disappear from the main window when popped out and automatically restore when the pop-out closes.

**Key Technologies**:
- `window.open()` for window creation
- `BroadcastChannel` API for cross-window messaging
- URL-first state management (each window watches its own URL)

---

## ARCHITECTURE

### MOVE Semantics

```
Main Window                    Pop-Out Window
┌──────────────┐              ┌──────────────┐
│ Panel 1      │              │              │
│ Panel 2      │  Pop Out →   │  Panel 2     │
│ [Placeholder]│              │  (Full View) │
│ Panel 3      │              │              │
└──────────────┘              └──────────────┘
       ↕                             ↕
  BroadcastChannel          BroadcastChannel
  (sends STATE_UPDATE)      (receives updates)
```

**When panel is popped out**:
- ✅ Panel removed from main window
- ✅ Placeholder shown with "Panel is in separate window" message
- ✅ Pop-out window opens at `/panel/:gridId/:panelId/:type`
- ✅ Both windows sync state via BroadcastChannel
- ✅ Pop-out window watches its own URL (URL-first)

**When pop-out closes**:
- ✅ Window close detected via polling
- ✅ Panel automatically restored to main window
- ✅ Placeholder disappears
- ✅ BroadcastChannel cleaned up

---

## 1. POPOUTCONTEXTSERVICE

### Location
`frontend/src/app/core/services/popout-context.service.ts`

### Purpose
Centralized service for pop-out window detection and communication

### API

#### Detection

```typescript
isInPopOut(): boolean
// Returns: true if current window is a pop-out
// Detection: Checks if router.url starts with '/panel/'
```

#### Initialization

```typescript
initializeAsPopOut(panelId: string): void
// Call in PanelPopoutComponent ngOnInit
// Sets up BroadcastChannel for this panel
// Sends PANEL_READY message to main window
```

```typescript
initializeAsParent(): void
// Call in DiscoverComponent ngOnInit
// Sets up BroadcastChannel listeners
// Handles messages from all pop-outs
```

#### Messaging

```typescript
sendMessage(message: PopOutMessage): void
// Send message to other window
// Uses BroadcastChannel.postMessage()

getMessages$(): Observable<PopOutMessage>
// Observable of received messages
// Filtered by message type if needed
```

```typescript
interface PopOutMessage {
  type: string;
  payload?: any;
  timestamp?: number;
}
```

### BroadcastChannel Implementation

```typescript
private channel: BroadcastChannel | null = null;
private messagesSubject = new Subject<PopOutMessage>();

initializeAsPopOut(panelId: string): void {
  this.channel = new BroadcastChannel(`panel-${panelId}`);

  this.channel.onmessage = (event) => {
    this.messagesSubject.next(event.data);
  };

  // Announce readiness
  this.sendMessage({type: 'PANEL_READY'});
}
```

### Cleanup

```typescript
ngOnDestroy(): void {
  if (this.channel) {
    this.channel.close();
    this.channel = null;
  }
  this.messagesSubject.complete();
}
```

---

## 2. MAIN WINDOW (DISCOVERCOMPONENT)

### Pop-Out Initiation

```typescript
popOutPanel(panelId: string): void {
  // Map panel ID to panel type for routing
  const panelTypeMap = {
    'query-control': 'query-control',
    'model-picker': 'picker',
    'dual-picker': 'dual-picker',
    'vin-browser': 'picker',
    'vehicle-results': 'results',
    'interactive-charts': 'plotly-charts'
  };

  const panelType = panelTypeMap[panelId];
  const gridId = 'discover';

  // Build URL
  const url = `/panel/${gridId}/${panelId}/${panelType}`;

  // Window features
  const features = [
    'width=1200',
    'height=800',
    'left=100',
    'top=100',
    'menubar=no',
    'toolbar=no',
    'resizable=yes',
    'scrollbars=yes'
  ].join(',');

  // Open window
  const popoutWindow = window.open(url, `panel-${panelId}`, features);

  if (!popoutWindow) {
    console.error('Pop-up blocked');
    return;
  }

  // Track as popped out
  this.poppedOutPanels.add(panelId);

  // Set up BroadcastChannel
  const channel = new BroadcastChannel(`panel-${panelId}`);

  channel.onmessage = (event) => {
    this.handlePopOutMessage(panelId, event.data);
  };

  // Monitor for close
  const checkInterval = setInterval(() => {
    if (popoutWindow.closed) {
      this.onPopOutClosed(panelId, channel, checkInterval);
    }
  }, 500);

  // Store references
  this.popoutWindows.set(panelId, {
    window: popoutWindow,
    channel,
    checkInterval
  });
}
```

### State Broadcasting

```typescript
private subscribeToStateBroadcast(): void {
  this.stateService.state$
    .pipe(takeUntil(this.destroy$))
    .subscribe(state => {
      // Broadcast to all pop-outs
      this.popoutWindows.forEach((popoutInfo) => {
        if (popoutInfo.window && !popoutInfo.window.closed) {
          popoutInfo.channel.postMessage({
            type: 'STATE_UPDATE',
            state
          });
        }
      });
    });
}
```

### Message Handling

```typescript
private handlePopOutMessage(panelId: string, message: PopOutMessage): void {
  switch (message.type) {
    case 'PANEL_READY':
      // Send current state
      const state = this.stateService.getCurrentState();
      this.popoutWindows.get(panelId)?.channel.postMessage({
        type: 'STATE_UPDATE',
        state
      });
      break;

    case 'PICKER_SELECTION_CHANGE':
      // Update URL from picker selection
      const {urlParam, urlValue} = message.payload;
      this.urlParamService.updateParam(urlParam, urlValue);
      break;

    case 'FILTER_ADD':
      // Add filter from Query Control
      this.onFilterAdd(message.payload);
      break;

    case 'FILTER_REMOVE':
      // Remove filter
      this.onFilterRemove(message.payload);
      break;
  }
}
```

### Pop-Out Closure

```typescript
private onPopOutClosed(
  panelId: string,
  channel: BroadcastChannel,
  checkInterval: number
): void {
  console.log(`Pop-out ${panelId} closed, restoring panel`);

  // Clean up
  clearInterval(checkInterval);
  channel.close();
  this.popoutWindows.delete(panelId);
  this.poppedOutPanels.delete(panelId);

  // Trigger view update (panel will reappear)
  this.cdr.markForCheck();
}
```

### Placeholder Display

```html
<div *ngIf="isPanelPoppedOut(panel.id)" class="popout-placeholder">
  <div class="placeholder-icon">
    <i class="pi pi-external-link"></i>
  </div>
  <div class="placeholder-text">
    <strong>{{panel.title}}</strong>
    <span>This panel is currently open in a separate window</span>
  </div>
</div>
```

---

## 3. POP-OUT WINDOW (PANELPOPOUTCOMPONENT)

### Location
`frontend/src/app/features/panel-popout/panel-popout.component.ts`

### Route
```
/panel/:gridId/:panelId/:type
```

**Parameters**:
- `gridId` - Grid identifier (e.g., "discover")
- `panelId` - Panel identifier (e.g., "model-picker")
- `type` - Component type to render (e.g., "picker", "results", "plotly-charts")

### Initialization

```typescript
ngOnInit(): void {
  // Extract route params
  this.route.params.subscribe(params => {
    this.gridId = params['gridId'];
    this.panelId = params['panelId'];
    this.panelType = params['type'];

    // Initialize pop-out context
    this.popOutContext.initializeAsPopOut(this.panelId);

    // Subscribe to messages
    this.popOutContext.getMessages$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.handleMessage(message);
      });
  });
}
```

### Message Handling

```typescript
private handleMessage(message: PopOutMessage): void {
  if (message.type === 'STATE_UPDATE') {
    // Sync state WITHOUT updating URL (prevents infinite loop)
    this.stateService.syncStateFromExternal(message.state);
  }
}
```

### Component Rendering

```html
<div class="panel-popout-container">
  <h2>{{getPanelTitle()}}</h2>

  <div [ngSwitch]="panelType">
    <app-query-control
      *ngSwitchCase="'query-control'"
      (filterAdd)="onFilterAdd($event)"
      (filterRemove)="onFilterRemove($event)">
    </app-query-control>

    <app-base-picker
      *ngSwitchCase="'picker'"
      [configId]="getPickerConfigId()">
    </app-base-picker>

    <app-dual-checkbox-picker
      *ngSwitchCase="'dual-picker'"
      [configId]="'manufacturer-model-dual'">
    </app-dual-checkbox-picker>

    <app-results-table
      *ngSwitchCase="'results'">
    </app-results-table>

    <app-plotly-histogram
      *ngSwitchCase="'plotly-charts'">
    </app-plotly-histogram>
  </div>
</div>
```

### Component Actions (Send to Main Window)

```typescript
onFilterAdd(filter: QueryFilter): void {
  this.popOutContext.sendMessage({
    type: 'FILTER_ADD',
    payload: filter
  });
}

onFilterRemove(event: any): void {
  this.popOutContext.sendMessage({
    type: 'FILTER_REMOVE',
    payload: event
  });
}
```

---

## 4. URL-FIRST IN POP-OUTS

### Critical Fix (Experiment Branch)

**Previous Behavior** (broken):
- Pop-outs disabled URL watching
- Relied solely on BroadcastChannel for state
- Violated URL-first principle

**New Behavior** (fixed):
```typescript
// In ResourceManagementService constructor
// Both main window AND pop-outs watch their own URL
this.initializeFromUrl();
this.watchUrlChanges();
```

**Benefits**:
- Pop-outs derive state from their own URL
- Highlights preserved (h_* params in pop-out URL)
- BroadcastChannel used for coordination only
- URL is still single source of truth

### Highlight Preservation

**Problem**: Main window sends STATE_UPDATE without highlights → overwrites pop-out's URL-derived highlights

**Solution**: `syncStateFromExternal()` preserves URL-derived highlights

```typescript
public syncStateFromExternal(state: Partial<ResourceState<TFilters, TData>>): void {
  const currentState = this.stateSubject.value;

  // Preserve URL-derived highlights if not explicitly provided
  const preservedHighlights = state.highlights !== undefined
    ? state.highlights
    : currentState.highlights;

  const newState = {
    ...currentState,
    ...state,
    highlights: preservedHighlights
  };

  this.stateSubject.next(newState);
  // NOTE: Does NOT update URL
}
```

---

## 5. MESSAGE TYPES

### Main Window → Pop-Out

| Type | Payload | Purpose |
|------|---------|---------|
| `STATE_UPDATE` | `{state: ResourceState}` | Sync full state |
| `CLOSE_POPOUT` | - | Request close |

### Pop-Out → Main Window

| Type | Payload | Purpose |
|------|---------|---------|
| `PANEL_READY` | - | Pop-out initialized |
| `PICKER_SELECTION_CHANGE` | `{configId, urlParam, urlValue}` | Picker selection changed |
| `FILTER_ADD` | `QueryFilter` | Add filter (Query Control) |
| `FILTER_REMOVE` | `{field, updates}` | Remove filter |
| `HIGHLIGHT_REMOVE` | `string` | Remove highlight |
| `CLEAR_HIGHLIGHTS` | - | Clear all highlights |

---

## 6. ERROR HANDLING

### Pop-Up Blocked

```typescript
const popoutWindow = window.open(...);
if (!popoutWindow) {
  this.messageService.add({
    severity: 'warn',
    summary: 'Pop-Up Blocked',
    detail: 'Please allow pop-ups for this site to use this feature'
  });
  return;
}
```

### Communication Failure

```typescript
// Timeout for PANEL_READY message
const readyTimeout = setTimeout(() => {
  console.warn('Pop-out did not send PANEL_READY within 5 seconds');
  // Send STATE_UPDATE anyway
}, 5000);

// Clear timeout on PANEL_READY
if (message.type === 'PANEL_READY') {
  clearTimeout(readyTimeout);
}
```

### Window Close Detection Failure

```typescript
// Fallback: User manually closes without detection
window.addEventListener('beforeunload', () => {
  // Clean up all pop-outs
  this.popoutWindows.forEach(({channel}) => {
    channel.postMessage({type: 'CLOSE_POPOUT'});
  });
});
```

---

## 7. BROWSER COMPATIBILITY

### BroadcastChannel Support

**Supported**:
- Chrome 54+
- Firefox 38+
- Edge 79+
- Safari 15.4+

**Fallback**: localStorage polling (not implemented)

### window.open() Restrictions

**Pop-Up Blockers**:
- Must be user-initiated (click handler)
- Cannot be called in async callbacks after delay
- Must check if `window.open()` returns null

**Cross-Origin**:
- Main and pop-out must be same origin
- Cannot pop-out to different domain

---

## 8. TESTING CONSIDERATIONS

### Unit Tests

```typescript
describe('PopOutContextService', () => {
  it('should detect pop-out mode from URL', () => {
    // Mock router.url = '/panel/discover/panel-1/picker'
    expect(service.isInPopOut()).toBe(true);
  });

  it('should send/receive messages via BroadcastChannel', () => {
    service.initializeAsPopOut('test-panel');
    service.sendMessage({type: 'TEST'});
    // Assert BroadcastChannel.postMessage called
  });
});
```

### E2E Tests

```typescript
test('pop-out panel workflow', async ({page, context}) => {
  await page.goto('/discover');

  // Click pop-out button
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.click('[data-testid="popout-button-model-picker"]')
  ]);

  // Verify pop-out URL
  expect(popup.url()).toContain('/panel/discover/model-picker/picker');

  // Verify placeholder in main window
  await expect(page.locator('.popout-placeholder')).toBeVisible();

  // Interact in pop-out
  await popup.click('[data-testid="apply-selection"]');

  // Verify main window updated
  await expect(page.locator('.filter-chip')).toContainText('F-150');

  // Close pop-out
  await popup.close();

  // Verify panel restored
  await expect(page.locator('.popout-placeholder')).not.toBeVisible();
  await expect(page.locator('[data-testid="model-picker-panel"]')).toBeVisible();
});
```

---

## 9. PERFORMANCE CONSIDERATIONS

### Polling Optimization

```typescript
// Current: 500ms polling interval
// For 10 pop-outs: 20 checks/second

// Alternative: visibilitychange event
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Check all pop-outs when main window regains focus
    this.checkAllPopOuts();
  }
});
```

### Message Throttling

```typescript
// Throttle STATE_UPDATE broadcasts
this.stateService.state$
  .pipe(
    takeUntil(this.destroy$),
    throttleTime(100)  // Max 10 updates/second
  )
  .subscribe(state => {
    this.broadcastToPopOuts(state);
  });
```

---

## 10. FUTURE ENHANCEMENTS

1. **Drag Panel to New Window**: Drag panel header outside main window to pop out
2. **Multi-Monitor Positioning**: Remember which monitor pop-out was on
3. **Pop-Out Groups**: Pop out multiple panels to same window
4. **Persistent Pop-Outs**: Restore pop-outs on page reload
5. **Fallback for BroadcastChannel**: localStorage polling for older browsers
6. **Window.postMessage Alternative**: For cross-origin support

---

## SUMMARY

The pop-out window system provides:

- ✅ **MOVE semantics** (panel disappears from main)
- ✅ **BroadcastChannel** communication
- ✅ **URL-first** state management (each window watches its own URL)
- ✅ **Automatic restoration** on close
- ✅ **Bi-directional messaging**
- ✅ **Multi-monitor** support (via window positioning)
- ✅ **Type-safe** message protocol

**Key Files**:
- `PopOutContextService` - Detection and messaging
- `DiscoverComponent` - Main window orchestration
- `PanelPopoutComponent` - Pop-out window container
- `ResourceManagementService` - URL-first state in pop-outs

**End of Specification**

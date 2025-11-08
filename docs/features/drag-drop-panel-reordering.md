# Drag/Drop Panel Reordering

**Feature:** Drag/Drop panel reordering on Discover page
**Implementation:** Angular CDK Drag & Drop (no Gridster-2 needed)
**Created:** 2025-11-08

---

## Overview

The Discover page now supports drag/drop reordering of panels using **Angular CDK Drag & Drop**. This is a lightweight solution that doesn't require heavy libraries like Gridster-2.

## Features

✅ **Drag/Drop Reordering** - Reorder panels by dragging
✅ **Visual Feedback** - Drag handles, preview, and placeholder
✅ **Persistent Order** - Panel order saved to localStorage
✅ **Reset to Default** - One-click reset button
✅ **Smooth Animations** - Material Design animations
✅ **No Heavy Libraries** - Uses Angular CDK (already installed)

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 DiscoverComponent                        │
├─────────────────────────────────────────────────────────┤
│ panels: PanelConfig[] = [                               │
│   { id: 'query-control', title: '...', collapsed: false }│
│   { id: 'model-picker', title: '...', collapsed: false } │
│   { id: 'vehicle-results', title: '...', ... }          │
│   { id: 'interactive-charts', title: '...', ... }       │
│ ]                                                        │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│            Template (with CDK directives)                │
├─────────────────────────────────────────────────────────┤
│ <div cdkDropList (cdkDropListDropped)="onPanelDrop()">  │
│   <div *ngFor="let panel of panels" cdkDrag>            │
│     <div cdkDragHandle>🔗 Drag Handle</div>             │
│     <div *cdkDragPreview>📋 Preview</div>               │
│     <div *cdkDragPlaceholder>📍 Placeholder</div>        │
│     <div [ngSwitch]="panel.id">                          │
│       <p-panel>... panel content ...</p-panel>           │
│     </div>                                               │
│   </div>                                                 │
│ </div>                                                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   localStorage                           │
├─────────────────────────────────────────────────────────┤
│ Key: "discover-panel-order"                              │
│ Value: ["query-control", "vehicle-results", ...]        │
└─────────────────────────────────────────────────────────┘
```

### User Interaction Flow

```
1. User hovers over panel
   ↓
2. Drag handle appears (left side of panel)
   ↓
3. User clicks and drags handle
   ↓
4. Preview follows cursor (shows panel title)
   ↓
5. Placeholder appears at drop location (red dashed box)
   ↓
6. User releases mouse
   ↓
7. Panel moves to new position
   ↓
8. Order saved to localStorage
   ↓
9. On next page load, panels appear in saved order
```

---

## Implementation Details

### TypeScript (discover.component.ts)

```typescript
interface PanelConfig {
  id: string;
  title: string;
  collapsed: boolean;
}

panels: PanelConfig[] = [
  { id: 'query-control', title: 'Query Control', collapsed: false },
  { id: 'model-picker', title: 'Model Picker', collapsed: false },
  { id: 'vehicle-results', title: 'Vehicle Results', collapsed: false },
  { id: 'interactive-charts', title: 'Interactive Charts', collapsed: false },
];

// Handle drop event
onPanelDrop(event: CdkDragDrop<PanelConfig[]>): void {
  if (event.previousIndex !== event.currentIndex) {
    moveItemInArray(this.panels, event.previousIndex, event.currentIndex);
    this.savePanelOrder();
  }
}

// Load order from localStorage on init
private loadPanelOrder(): void {
  const savedOrder = localStorage.getItem('discover-panel-order');
  if (savedOrder) {
    const panelIds: string[] = JSON.parse(savedOrder);
    // Reorder panels based on saved IDs
    this.panels = reorderPanels(this.panels, panelIds);
  }
}

// Save order to localStorage
private savePanelOrder(): void {
  const panelIds = this.panels.map(p => p.id);
  localStorage.setItem('discover-panel-order', JSON.stringify(panelIds));
}

// Reset to default order
resetPanelOrder(): void {
  this.panels = [
    { id: 'query-control', title: 'Query Control', collapsed: false },
    // ... default order
  ];
  this.savePanelOrder();
}
```

### HTML Template

```html
<!-- Drag/Drop Container -->
<div cdkDropList (cdkDropListDropped)="onPanelDrop($event)">
  <div *ngFor="let panel of panels" cdkDrag class="panel-wrapper">

    <!-- Drag Handle (appears on hover) -->
    <div class="drag-handle" cdkDragHandle>
      <i class="pi pi-bars"></i>
      <span>Drag to reorder</span>
    </div>

    <!-- Drag Preview (follows cursor) -->
    <div *cdkDragPreview class="drag-preview">
      <i class="pi pi-bars"></i>
      <span>{{ panel.title }}</span>
    </div>

    <!-- Placeholder (shows drop location) -->
    <div *cdkDragPlaceholder class="drag-placeholder">
      Drop here
    </div>

    <!-- Panel Content (dynamically rendered based on panel.id) -->
    <div [ngSwitch]="panel.id">
      <p-panel
        *ngSwitchCase="'query-control'"
        [header]="panel.title"
        [toggleable]="true"
        [(collapsed)]="panel.collapsed"
      >
        <app-query-control></app-query-control>
      </p-panel>
      <!-- ... other panels -->
    </div>
  </div>
</div>
```

### SCSS Styling

```scss
.panel-wrapper {
  position: relative;
  margin-bottom: 20px;
  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);

  // Drag handle (hidden by default, shown on hover)
  .drag-handle {
    position: absolute;
    top: 8px;
    left: -40px;
    opacity: 0;
    cursor: move;
    transition: all 0.2s ease;
  }

  &:hover .drag-handle {
    opacity: 1;
    left: -45px;
  }
}

// Drag preview styling
.drag-preview {
  background: #ffffff;
  border: 2px solid #f44336;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  padding: 16px;
}

// Placeholder styling
.drag-placeholder {
  background: #ffebee;
  border: 2px dashed #f44336;
  min-height: 80px;
}
```

---

## CDK Directives Used

| Directive | Purpose | Example |
|-----------|---------|---------|
| `cdkDropList` | Container for draggable items | `<div cdkDropList>` |
| `(cdkDropListDropped)` | Event when item is dropped | `(cdkDropListDropped)="onPanelDrop($event)"` |
| `cdkDrag` | Makes element draggable | `<div cdkDrag>` |
| `cdkDragHandle` | Restricts drag to specific element | `<div cdkDragHandle>` (only drag when grabbing handle) |
| `*cdkDragPreview` | Custom preview while dragging | `<div *cdkDragPreview>` |
| `*cdkDragPlaceholder` | Custom placeholder at drop location | `<div *cdkDragPlaceholder>` |

---

## Visual Elements

### Drag Handle

```
┌────────┐
│ ≡      │  ← Icon (pi-bars)
│ Drag   │  ← Text hint (vertical)
│ to     │
│ reorder│
└────────┘
```

- **Position:** Left side of panel (absolute positioning)
- **Visibility:** Hidden by default, appears on panel hover
- **Cursor:** `cursor: move`
- **Color:** Gray (#757575), changes to red (#f44336) on hover

### Drag Preview

```
┌──────────────────────────────┐
│ ≡  Query Control             │  ← Shows panel title while dragging
└──────────────────────────────┘
```

- **Style:** White background, red border, shadow
- **Follows:** Mouse cursor during drag
- **Content:** Panel title with icon

### Placeholder

```
┌────────────────────────────────┐
│                                │
│         Drop here              │  ← Dashed red border
│                                │
└────────────────────────────────┘
```

- **Style:** Red dashed border, light pink background
- **Shows:** Where panel will be placed when dropped
- **Height:** Minimum 80px

---

## localStorage Format

**Key:** `discover-panel-order`

**Value (JSON array of panel IDs):**
```json
[
  "query-control",
  "model-picker",
  "vehicle-results",
  "interactive-charts"
]
```

**Example - User moves "Interactive Charts" to top:**
```json
[
  "interactive-charts",
  "query-control",
  "model-picker",
  "vehicle-results"
]
```

---

## Reset Panel Order

A "Reset Panel Order" button is provided in the header:

```html
<button
  pButton
  type="button"
  label="Reset Panel Order"
  class="p-button-secondary p-button-sm"
  (click)="resetPanelOrder()"
  icon="pi pi-refresh"
></button>
```

**Functionality:**
1. Restores panels to default order
2. Saves default order to localStorage
3. Immediately re-renders panels in default order

---

## Browser Support

Angular CDK Drag & Drop uses native browser APIs:

✅ Chrome 60+
✅ Firefox 55+
✅ Safari 10.1+
✅ Edge 79+ (Chromium)

**Fallback:** If drag/drop is not supported, panels remain in their current order (graceful degradation).

---

## Advantages Over Gridster-2

| Feature | Angular CDK | Gridster-2 |
|---------|-------------|------------|
| **Bundle Size** | ~30KB | ~200KB |
| **Dependencies** | Already installed (Angular 14) | Additional npm package |
| **Complexity** | Simple list reordering | Full grid layout system |
| **Performance** | Lightweight, fast | Heavier, slower |
| **Maintenance** | Official Angular package | Third-party library |
| **Use Case** | Perfect for vertical list reordering | Overkill for simple reordering |

---

## Testing

### Manual Testing Checklist

- [ ] Hover over panel → Drag handle appears
- [ ] Click and drag handle → Preview follows cursor
- [ ] Drag over another panel → Placeholder shows drop location
- [ ] Release mouse → Panel moves to new position
- [ ] Refresh page → Panels remain in new order
- [ ] Click "Reset Panel Order" → Panels return to default order
- [ ] Multiple drag operations → Order persists correctly

### Edge Cases

- [ ] Drag panel to same position → No change, no localStorage write
- [ ] localStorage quota exceeded → Gracefully handle error
- [ ] Invalid localStorage data → Fall back to default order
- [ ] New panel added in future → Appears at end of saved order

---

## Future Enhancements

Possible improvements:

1. **Column-wise reordering** - Drag panels between columns (if multi-column layout added)
2. **Panel resizing** - Drag to resize panel height
3. **Panel minimization** - Minimize panel to header bar
4. **Export/Import layout** - Share panel configurations between users
5. **Multiple layouts** - Save and switch between different panel arrangements

---

## Related Documentation

- [Angular CDK Drag & Drop API](https://material.angular.io/cdk/drag-drop/api)
- [Developer Services Reference](../architecture/developer-services-reference.md)
- [BaseDataTable Architecture](../architecture/pickers-vs-tables.md)

---

## Code Files

| File | Purpose | Lines |
|------|---------|-------|
| `discover.component.ts` | Component logic, drag/drop handlers | ~230 |
| `discover.component.html` | Template with CDK directives | ~115 |
| `discover.component.scss` | Drag/drop styling | ~232 |
| `app.module.ts` | DragDropModule import | Line 11, 67 |

---

**Last Updated:** 2025-11-08
**Feature Status:** ✅ Fully Implemented

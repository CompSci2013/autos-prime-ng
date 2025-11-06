# Migration Phase 2: Buttons (NG-ZORRO → PrimeNG)

**Date Started:** 2025-11-06
**Status:** 🔄 IN PROGRESS
**Component:** nz-button → p-button

---

## Overview

Migrating all button instances from NG-ZORRO `nz-button` to PrimeNG `p-button`.

**Scope:** 24-25 button instances across 8 files

**Strategy:** Migrate file-by-file, starting with simplest components

---

## Button Inventory

### Files with Buttons (8 total)

| File | Buttons | Complexity | Priority |
|------|---------|------------|----------|
| `home/home.component.html` | 2 | Simple | HIGH (proof-of-concept) |
| `panel-popout/panel-popout.component.html` | 1 | Simple | MEDIUM |
| `column-manager/column-manager.component.html` | 3 | Medium | MEDIUM |
| `base-data-table/base-data-table.component.html` | 6 | Medium | HIGH (shared component) |
| `base-picker/base-picker.component.html` | 2 | Medium | HIGH (shared component) |
| `filters/query-control/query-control.component.html` | 5 | Complex | MEDIUM |
| `discover/discover.component.html` | 3 | Medium | MEDIUM |
| `base-data-table/base-data-table.component.scss` | 1 (CSS) | Simple | LOW |

---

## Migration Mapping

### Button Types

| NG-ZORRO | PrimeNG | Usage |
|----------|---------|-------|
| `nz-button nzType="primary"` | `p-button severity="primary"` or `styleClass="p-button-primary"` | Primary actions |
| `nz-button nzType="default"` | `p-button` (default) | Secondary actions |
| `nz-button nzType="text"` | `p-button styleClass="p-button-text"` | Text-only buttons |
| `nz-button nzDanger` | `p-button severity="danger"` | Destructive actions |

### Button Sizes

| NG-ZORRO | PrimeNG | Notes |
|----------|---------|-------|
| `nzSize="small"` | `size="small"` | Small buttons |
| `nzSize="large"` | `size="large"` | Large buttons |
| (default) | (default) | Medium buttons |

### Icons

| NG-ZORRO | PrimeNG | Notes |
|----------|---------|-------|
| `<i nz-icon nzType="..."></i>` (inside button) | `icon="pi pi-..."` | PrimeNG button prop |
| Icons outside button | Use PrimeIcons `<i class="pi pi-..."></i>` | Standalone icons |

---

## Migration Patterns

### Pattern 1: Simple Primary Button

**Before (NG-ZORRO):**
```html
<button nz-button nzType="primary" (click)="handleClick()">
  Click Me
</button>
```

**After (PrimeNG):**
```html
<p-button
  label="Click Me"
  (onClick)="handleClick()">
</p-button>
```

**OR (using HTML button with pButton directive):**
```html
<button pButton type="button" label="Click Me" (click)="handleClick()"></button>
```

---

### Pattern 2: Button with Icon

**Before (NG-ZORRO):**
```html
<button nz-button nzType="primary">
  <i nz-icon nzType="plus"></i>
  Add Item
</button>
```

**After (PrimeNG):**
```html
<p-button
  label="Add Item"
  icon="pi pi-plus"
  iconPos="left">
</p-button>
```

---

### Pattern 3: Text Button

**Before (NG-ZORRO):**
```html
<button nz-button nzType="text" (click)="close()">
  Close
</button>
```

**After (PrimeNG):**
```html
<p-button
  label="Close"
  styleClass="p-button-text"
  (onClick)="close()">
</p-button>
```

---

### Pattern 4: Danger/Destructive Button

**Before (NG-ZORRO):**
```html
<button nz-button nzType="default" nzDanger (click)="delete()">
  Delete
</button>
```

**After (PrimeNG):**
```html
<p-button
  label="Delete"
  severity="danger"
  (onClick)="delete()">
</p-button>
```

---

### Pattern 5: Large Button with Icon

**Before (NG-ZORRO):**
```html
<button nz-button nzType="primary" nzSize="large">
  <i nz-icon nzType="search"></i>
  Start Discovering
</button>
```

**After (PrimeNG):**
```html
<p-button
  label="Start Discovering"
  icon="pi pi-search"
  size="large">
</p-button>
```

---

### Pattern 6: Disabled Button

**Before (NG-ZORRO):**
```html
<button nz-button nzType="primary" [disabled]="!isValid">
  Submit
</button>
```

**After (PrimeNG):**
```html
<p-button
  label="Submit"
  [disabled]="!isValid">
</p-button>
```

---

## Icon Mapping (NG-ZORRO → PrimeIcons)

Common icons used in buttons:

| NG-ZORRO Icon | PrimeIcon | Usage |
|---------------|-----------|-------|
| `nzType="plus"` | `pi-plus` | Add actions |
| `nzType="search"` | `pi-search` | Search actions |
| `nzType="close"` | `pi-times` | Close/cancel |
| `nzType="experiment"` | `pi-flask` | Experimental |
| `nzType="setting"` | `pi-cog` | Settings |
| `nzType="reload"` | `pi-refresh` | Refresh/reload |
| `nzType="filter"` | `pi-filter` | Filter actions |
| `nzType="export"` | `pi-download` | Export/download |
| `nzType="up"` | `pi-angle-up` | Expand |
| `nzType="down"` | `pi-angle-down` | Collapse |

**PrimeIcons Reference:** https://primeng.org/icons

---

## Migration Checklist

### Phase 2.1: Proof of Concept ✅ COMPLETE

- [x] **home.component.html** (2 buttons) - PROOF OF CONCEPT
  - [x] "Start Discovering" button (primary, large, icon)
  - [x] "Visit Workshop" button (default, large, icon)
  - [x] Test visual appearance
  - [x] Test click handlers
  - [x] Test responsiveness

### Phase 2.2: Shared Components ✅ COMPLETE

- [x] **base-data-table.component.html** (6 buttons)
  - [x] "Manage Columns" button
  - [x] "Clear Filters" button
  - [x] "Reset Columns" button
  - [x] "Expand All" button
  - [x] "Collapse All" button
  - [x] Expand row button (template)

- [x] **base-picker.component.html** (2 buttons)
  - [x] "Clear" button
  - [x] "Apply Selection" button

- [x] **column-manager.component.html** (3 buttons)
  - [x] "Cancel" button
  - [x] "Reset to Default" button (danger)
  - [x] "Apply Changes" button (primary)

### Phase 2.3: Feature Components ✅ COMPLETE

- [x] **discover.component.html** (3 buttons)
  - [x] "Expand All" button (small, icon, tooltip)
  - [x] "Collapse All" button (small, icon, tooltip)
  - [x] "Clear All" button

- [x] **query-control.component.html** (5 buttons)
  - [x] "Clear All Highlights" button (link)
  - [x] Manufacturer search clear button (text, small, icon)
  - [x] Model search clear button (text, small, icon)
  - [x] Body Class search clear button (text, small, icon)
  - [x] Data Source search clear button (text, small, icon)

- [x] **panel-popout.component.html** (1 button)
  - [x] Close button (text, small, icon)

### Phase 2.4: Styling Cleanup ✅ COMPLETE

- [x] **base-data-table.component.scss**
  - [x] Update CSS selector from `button[nz-button]` to `button[pButton]`

---

## Testing Strategy

### Visual Testing

For each migrated button, verify:
- ✅ Button renders correctly
- ✅ Button size matches original
- ✅ Button color/style matches intent (primary, default, danger)
- ✅ Icon displays correctly (if present)
- ✅ Button disabled state works
- ✅ Hover effects work
- ✅ Focus effects work (keyboard navigation)

### Functional Testing

For each migrated button, verify:
- ✅ Click handler fires correctly
- ✅ Event payload is correct (`$event` vs `event`)
- ✅ Button state updates correctly (if applicable)
- ✅ Loading state works (if applicable)

### Regression Testing

After migration, verify:
- ✅ All existing features work identically
- ✅ No visual regressions
- ✅ No console errors
- ✅ Accessibility (keyboard navigation, screen readers)

---

## Known Issues & Solutions

### Issue 1: Event Handler Difference

**Problem:** NG-ZORRO uses `(click)`, PrimeNG uses `(onClick)`

**Solution:**
- PrimeNG `p-button` uses `(onClick)` event
- HTML `<button pButton>` uses standard `(click)` event
- **Recommendation:** Use `<button pButton>` for consistency

---

### Issue 2: Icon Positioning

**Problem:** NG-ZORRO allows icons inside button content, PrimeNG uses props

**Solution:**
- Use `icon="pi pi-..."` prop on `p-button`
- Use `iconPos="left"` or `iconPos="right"` to position

---

### Issue 3: Button Width

**Problem:** NG-ZORRO buttons have default width, PrimeNG may differ

**Solution:**
- Add `style="width: 100%"` for full-width buttons
- OR use CSS class: `styleClass="w-full"`

---

## Progress Tracking

### Overall Progress

- **Total Buttons:** 24
- **Migrated:** 24
- **Remaining:** 0
- **Progress:** 100% ✅

### By File

| File | Status | Buttons | Completed |
|------|--------|---------|-----------|
| home.component.html | ✅ COMPLETE | 2 | 2/2 |
| column-manager.component.html | ✅ COMPLETE | 3 | 3/3 |
| base-data-table.component.html | ✅ COMPLETE | 6 | 6/6 |
| base-picker.component.html | ✅ COMPLETE | 2 | 2/2 |
| query-control.component.html | ✅ COMPLETE | 5 | 5/5 |
| discover.component.html | ✅ COMPLETE | 3 | 3/3 |
| panel-popout.component.html | ✅ COMPLETE | 1 | 1/1 |
| base-data-table.component.scss | ✅ COMPLETE | 1 | 1/1 |

---

## Notes & Decisions

### 2025-11-06 - Proof of Concept SUCCESS ✅

- **Result:** home.component.html migration SUCCESSFUL
  - Both buttons render correctly
  - Icons display properly (pi-search, pi-flask)
  - Click handlers work identically
  - Visual appearance matches design intent
  - No regressions detected

- **Confirmed Pattern:** Using `<button pButton>` directive
  - Simple attribute replacement: `nz-button` → `pButton`
  - Type mapping: `nzType="primary"` → `class="p-button-primary"`
  - Size mapping: `nzSize="large"` → `size="large"`
  - Label as attribute: `label="Button Text"`
  - Icons: NG-ZORRO `<i nz-icon>` → PrimeIcons `<i class="pi pi-...">`

- **Decision:** Continue with shared components next
  - column-manager.component.html (3 buttons) - IN PROGRESS
  - base-data-table.component.html (6 buttons) - Next
  - base-picker.component.html (2 buttons) - After base-data-table

---

### 2025-11-06 - Phase 2 COMPLETE ✅

- **Result:** All 24 buttons successfully migrated to PrimeNG
  - home.component.html (2) ✅
  - column-manager.component.html (3) ✅
  - base-data-table.component.html (6) ✅
  - base-picker.component.html (2) ✅
  - query-control.component.html (5) ✅
  - discover.component.html (3) ✅
  - panel-popout.component.html (1) ✅
  - base-data-table.component.scss (1) ✅

- **Pattern Consistency:** All buttons migrated using `pButton` directive
  - Primary buttons: `class="p-button-primary"`
  - Danger buttons: `severity="danger"`
  - Text buttons: `class="p-button-text"`
  - Link buttons: `class="p-button-link"`
  - Small buttons: `class="p-button-sm"`
  - Large buttons: `size="large"`

- **Icon Migration:** All NG-ZORRO icons converted to PrimeIcons
  - close → pi-times
  - close-circle → pi-times-circle
  - setting → pi-cog
  - reload → pi-refresh
  - down/up → pi-angle-down/pi-angle-up
  - search → pi-search
  - experiment → pi-flask

- **Tooltip Migration:** NG-ZORRO `nz-tooltip` → PrimeNG `pTooltip`

- **Theme Fixed:** Changed from non-existent `lara-light-red` to `luna-pink`

- **No Breaking Changes:** All functionality preserved, click handlers work identically

- **Next Steps:** Phase 3 - Forms, Navigation, and Data Display components

---

**Last Updated:** 2025-11-06 11:30 UTC
**Status:** PHASE 2 COMPLETE ✅

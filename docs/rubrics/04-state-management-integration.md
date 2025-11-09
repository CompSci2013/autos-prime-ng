# Checklist: State Management Integration

**Use this checklist when:**
- Adding state management to a component
- Auditing existing state management implementation
- Debugging state synchronization issues
- Planning URL-first architecture

**Estimated time:** 1-4 hours (depending on complexity)

---

## Phase 1: State Assessment

### 1.1 Determine State Type

**FIRST: Identify what type of state you're dealing with:**

- [ ] **Query State** (Should be in URL):
  - [ ] Filters (search text, selected categories)
  - [ ] Sort order (column, direction)
  - [ ] Pagination (page number, page size)
  - [ ] Selected items (IDs, keys)
  - [ ] View mode (grid/list, expanded/collapsed)
  - **Rule:** If user should be able to bookmark/share this state → URL

- [ ] **UI Preferences** (Should be in localStorage):
  - [ ] Column visibility (hidden/shown)
  - [ ] Column order (user's custom arrangement)
  - [ ] Panel collapse states (user preference)
  - [ ] Theme preference (dark/light)
  - **Rule:** If state is per-user preference, not shareable → localStorage

- [ ] **App State** (Should be in Service):
  - [ ] Authenticated user info
  - [ ] Global notifications/alerts
  - [ ] Shared data accessed by multiple routes
  - **Rule:** If state is global and not query-specific → Service

- [ ] **Component State** (Should stay in Component):
  - [ ] Form input values (before submit)
  - [ ] Hover/focus states
  - [ ] Temporary UI states
  - [ ] Modal open/close state
  - **Rule:** If state is temporary and local to component → Component property

### 1.2 State Location Decision Matrix

| State Example | Location | Why |
|--------------|----------|-----|
| Search filter | URL | Shareable, bookmarkable |
| Current page | URL | Shareable, bookmarkable |
| Column order | localStorage | User preference, not shareable |
| User profile | Service | Global, needed across routes |
| Input value | Component | Temporary, local |
| Modal open | Component | Temporary, local |

---

## Phase 2: URL State Implementation (Query State)

### 2.1 Define State Interface

```typescript
// ✅ Define state model
export interface VehicleFilters {
  models?: string[];       // Array of selected model IDs
  yearMin?: number;        // Filter: minimum year
  yearMax?: number;        // Filter: maximum year
  bodyClass?: string;      // Filter: body class
  page?: number;           // Pagination: current page
  pageSize?: number;       // Pagination: items per page
  sortBy?: string;         // Sort column
  sortOrder?: 'asc' | 'desc';  // Sort direction
}
```

**Checklist:**

- [ ] All fields optional (may not exist in URL)
- [ ] Proper TypeScript types (no `any`)
- [ ] Array fields for multi-select
- [ ] Enums for restricted values (sortOrder)
- [ ] Documented default values

### 2.2 Route State Service (URL Management)

Create a service to manage URL parameters:

```typescript
import { Injectable } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RouteStateService {
  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  // ✅ Get query parameter (single value)
  getQueryParam(key: string): string | null {
    return this.route.snapshot.queryParams[key] || null;
  }

  // ✅ Get query parameter as observable
  getQueryParam$(key: string): Observable<string | null> {
    return this.route.queryParams.pipe(
      map(params => params[key] || null)
    );
  }

  // ✅ Get all query parameters
  getAllQueryParams(): Params {
    return this.route.snapshot.queryParams;
  }

  // ✅ Get all query parameters as observable
  getAllQueryParams$(): Observable<Params> {
    return this.route.queryParams;
  }

  // ✅ Update query parameters (merge with existing)
  updateQueryParams(params: Params): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'  // ✅ Preserve other params
    });
  }

  // ✅ Replace all query parameters
  setQueryParams(params: Params): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params
      // No queryParamsHandling = replace all
    });
  }

  // ✅ Remove specific query parameter
  removeQueryParam(key: string): void {
    const params = { ...this.getAllQueryParams() };
    delete params[key];
    this.setQueryParams(params);
  }
}
```

**Checklist:**

- [ ] Service provides read and write access to URL
- [ ] Uses `queryParamsHandling: 'merge'` for updates
- [ ] Provides both snapshot and observable access
- [ ] Does NOT store state internally (URL is source of truth)

### 2.3 State Management Service (Business Logic)

Create a service to manage state and coordinate API calls:

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class VehicleStateService {
  // ✅ Private subjects (internal state)
  private filtersSubject = new BehaviorSubject<VehicleFilters>({});
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // ✅ Public observables (exposed to components)
  readonly filters$ = this.filtersSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  // ✅ Derived data stream
  readonly vehicles$ = this.filters$.pipe(
    debounceTime(300),  // ✅ Prevent rapid-fire requests
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    switchMap(filters => {
      this.loadingSubject.next(true);
      return this.apiService.getVehicles(filters).pipe(
        finalize(() => this.loadingSubject.next(false))
      );
    })
  );

  constructor(
    private apiService: VehicleApiService,
    private routeStateService: RouteStateService
  ) {
    // ✅ Initialize from URL on service creation
    this.initializeFromUrl();
  }

  // ✅ Hydrate from URL
  private initializeFromUrl(): void {
    this.routeStateService.getAllQueryParams$().subscribe(params => {
      const filters = this.parseFiltersFromParams(params);
      this.filtersSubject.next(filters);
    });
  }

  // ✅ Parse URL params to typed filters
  private parseFiltersFromParams(params: Params): VehicleFilters {
    return {
      models: params['models'] ? params['models'].split(',') : undefined,
      yearMin: params['yearMin'] ? +params['yearMin'] : undefined,
      yearMax: params['yearMax'] ? +params['yearMax'] : undefined,
      bodyClass: params['bodyClass'] || undefined,
      page: params['page'] ? +params['page'] : 1,
      pageSize: params['pageSize'] ? +params['pageSize'] : 20,
      sortBy: params['sortBy'] || undefined,
      sortOrder: params['sortOrder'] || 'asc'
    };
  }

  // ✅ Update filters and sync to URL
  updateFilters(updates: Partial<VehicleFilters>): void {
    const currentFilters = this.filtersSubject.value;
    const newFilters = { ...currentFilters, ...updates };

    // Update internal state
    this.filtersSubject.next(newFilters);

    // Sync to URL
    this.syncFiltersToUrl(newFilters);
  }

  // ✅ Sync filters to URL
  private syncFiltersToUrl(filters: VehicleFilters): void {
    const params: Params = {};

    if (filters.models?.length) {
      params['models'] = filters.models.join(',');
    }
    if (filters.yearMin) {
      params['yearMin'] = filters.yearMin;
    }
    if (filters.yearMax) {
      params['yearMax'] = filters.yearMax;
    }
    if (filters.bodyClass) {
      params['bodyClass'] = filters.bodyClass;
    }
    if (filters.page && filters.page !== 1) {
      params['page'] = filters.page;
    }
    if (filters.pageSize && filters.pageSize !== 20) {
      params['pageSize'] = filters.pageSize;
    }
    if (filters.sortBy) {
      params['sortBy'] = filters.sortBy;
    }
    if (filters.sortOrder && filters.sortOrder !== 'asc') {
      params['sortOrder'] = filters.sortOrder;
    }

    this.routeStateService.setQueryParams(params);
  }

  // ✅ Reset filters
  resetFilters(): void {
    this.updateFilters({});
  }

  // ✅ Get current filters snapshot
  getCurrentFilters(): VehicleFilters {
    return this.filtersSubject.value;
  }
}
```

**Checklist:**

- [ ] Uses BehaviorSubject for state (has current value)
- [ ] Exposes observables, not subjects (read-only access)
- [ ] Initializes from URL on creation
- [ ] Updates URL when state changes
- [ ] Parses URL params to typed state
- [ ] Serializes typed state to URL params
- [ ] Uses debounceTime to prevent rapid API calls
- [ ] Uses distinctUntilChanged to prevent duplicate calls
- [ ] Uses switchMap to cancel previous requests
- [ ] Provides loading and error state

### 2.4 Component Integration (Container)

```typescript
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-vehicle-dashboard',
  template: `
    <app-vehicle-filters
      [filters]="filters$ | async"
      (filtersChange)="onFiltersChange($event)">
    </app-vehicle-filters>

    <app-vehicle-table
      [vehicles]="vehicles$ | async"
      [loading]="loading$ | async"
      [error]="error$ | async"
      (sortChange)="onSortChange($event)"
      (pageChange)="onPageChange($event)">
    </app-vehicle-table>
  `
})
export class VehicleDashboardComponent implements OnInit {
  // ✅ Use async pipe (no manual subscriptions)
  filters$ = this.stateService.filters$;
  vehicles$ = this.stateService.vehicles$;
  loading$ = this.stateService.loading$;
  error$ = this.stateService.error$;

  constructor(private stateService: VehicleStateService) {}

  ngOnInit(): void {
    // ✅ State automatically hydrated from URL by service
    // No initialization needed!
  }

  // ✅ Event handlers delegate to state service
  onFiltersChange(filters: VehicleFilters): void {
    this.stateService.updateFilters(filters);
  }

  onSortChange(sort: SortEvent): void {
    this.stateService.updateFilters({
      sortBy: sort.column,
      sortOrder: sort.direction
    });
  }

  onPageChange(page: number): void {
    this.stateService.updateFilters({ page });
  }
}
```

**Checklist:**

- [ ] Component uses async pipe (no manual subscriptions)
- [ ] Component does NOT initialize state with defaults
- [ ] Component delegates all state changes to service
- [ ] Component does NOT directly modify URL
- [ ] Component is idempotent (can reload from URL)

---

## Phase 3: localStorage State Implementation (UI Preferences)

### 3.1 Persistence Service

```typescript
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  // ✅ Generic get/set methods
  get<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}

// ✅ Table preferences service
@Injectable({ providedIn: 'root' })
export class TablePreferencesService {
  private storageKey = (tableId: string) => `table-prefs-${tableId}`;

  constructor(private storage: StorageService) {}

  getPreferences(tableId: string): TablePreferences | null {
    return this.storage.get<TablePreferences>(this.storageKey(tableId));
  }

  savePreferences(tableId: string, prefs: TablePreferences): void {
    this.storage.set(this.storageKey(tableId), prefs);
  }

  clearPreferences(tableId: string): void {
    this.storage.remove(this.storageKey(tableId));
  }
}

export interface TablePreferences {
  columnOrder: string[];     // Column IDs in user's preferred order
  columnVisibility: { [columnId: string]: boolean };  // Which columns shown
  defaultPageSize?: number;  // User's preferred page size
}
```

**Checklist:**

- [ ] Wraps localStorage with error handling
- [ ] Provides generic get/set methods
- [ ] Uses namespaced keys (avoid collisions)
- [ ] Handles JSON parse errors gracefully
- [ ] Does NOT store query state (use URL instead)

### 3.2 Component Integration

```typescript
export class DataTableComponent implements OnInit {
  @Input() tableId!: string;  // ✅ Unique ID for this table

  columns: Column[] = [...];  // Default columns
  visibleColumns: Column[] = [];

  constructor(private prefsService: TablePreferencesService) {}

  ngOnInit(): void {
    // ✅ Load preferences from localStorage
    const prefs = this.prefsService.getPreferences(this.tableId);

    if (prefs) {
      this.applyPreferences(prefs);
    } else {
      // Use defaults
      this.visibleColumns = this.columns.filter(c => c.defaultVisible);
    }
  }

  onColumnOrderChange(newOrder: string[]): void {
    // ✅ Save to localStorage
    this.prefsService.savePreferences(this.tableId, {
      columnOrder: newOrder,
      columnVisibility: this.getColumnVisibility()
    });
  }

  onColumnVisibilityChange(columnId: string, visible: boolean): void {
    // ✅ Save to localStorage
    this.prefsService.savePreferences(this.tableId, {
      columnOrder: this.getColumnOrder(),
      columnVisibility: { ...this.getColumnVisibility(), [columnId]: visible }
    });
  }
}
```

---

## Phase 4: Audit Checklist (Identifying Problems)

### 🔍 Detecting State Management Anti-Patterns

#### ❌ Problem: State Stored Only in Component (Not URL)

**How to detect:**

```typescript
// 🚨 RED FLAG: Component initializes state with defaults
export class ProductListComponent {
  currentPage = 1;  // ❌ Lost on refresh!
  selectedCategory = 'all';  // ❌ Not shareable!

  ngOnInit() {
    this.loadProducts();
  }
}
```

**Impact:**
- ❌ URL doesn't reflect current state
- ❌ Can't bookmark or share URL
- ❌ Page refresh loses state
- ❌ Browser back/forward doesn't work

**Fix:**

```typescript
// ✅ State lives in URL
export class ProductListComponent {
  currentPage$ = this.route.queryParams.pipe(
    map(params => params['page'] ? +params['page'] : 1)
  );

  selectedCategory$ = this.route.queryParams.pipe(
    map(params => params['category'] || 'all')
  );
}
```

#### ❌ Problem: Duplicate API Calls

**How to detect:**

1. Open Chrome DevTools → Network tab
2. Filter by XHR/Fetch
3. Interact with UI (change filter, click button)
4. 🚨 RED FLAG: Same URL called multiple times simultaneously

**Code patterns that cause this:**

```typescript
// ❌ BAD: No request deduplication
export class DataService {
  getData(): Observable<Data> {
    return this.http.get('/api/data');
    // Each subscription = new HTTP request!
  }
}

// ❌ BAD: Multiple components calling same API
export class Component1 {
  ngOnInit() {
    this.dataService.getData().subscribe(...);  // Call 1
  }
}

export class Component2 {
  ngOnInit() {
    this.dataService.getData().subscribe(...);  // Call 2 (duplicate!)
  }
}
```

**Fix:**

```typescript
// ✅ GOOD: Shared request
export class DataService {
  private cache$ = this.http.get('/api/data').pipe(shareReplay(1));

  getData(): Observable<Data> {
    return this.cache$;  // All subscribers share one request
  }
}
```

#### ❌ Problem: Memory Leaks (Unmanaged Subscriptions)

**How to detect:**

```typescript
// 🚨 RED FLAG: Subscription without cleanup
export class MyComponent implements OnInit {
  ngOnInit() {
    this.dataService.data$.subscribe(data => {
      this.data = data;
    });
    // ❌ Never unsubscribed!
  }
}
```

**Detection method:**
1. Navigate to component repeatedly
2. Open Chrome DevTools → Memory tab
3. Take heap snapshot
4. 🚨 RED FLAG: Component instances not garbage collected

**Fix:**

```typescript
// ✅ GOOD: Proper cleanup
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.dataService.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.data = data);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// ✅ BETTER: No manual subscription
@Component({
  template: `{{ data$ | async }}`
})
export class MyComponent {
  data$ = this.dataService.data$;
}
```

#### ❌ Problem: State Desynchronization

**How to detect:**

```typescript
// 🚨 RED FLAG: URL and component state out of sync
export class FilterComponent {
  selectedFilters: Filter[] = [];

  onFilterChange(filter: Filter) {
    this.selectedFilters.push(filter);  // ❌ Component state updated
    // URL not updated!
  }
}
```

**Test:**
1. Change filter in UI
2. Refresh page
3. 🚨 RED FLAG: Filter state is lost

**Fix:**

```typescript
// ✅ GOOD: URL is single source of truth
export class FilterComponent {
  onFilterChange(filter: Filter) {
    this.stateService.updateFilters(filter);  // ✅ Updates URL
  }
}
```

#### ❌ Problem: Tight Coupling (Presentational Component with Services)

**How to detect:**

```typescript
// 🚨 RED FLAG: "Dumb" component with service injections
@Component({
  selector: 'app-user-card',
  template: `...`
})
export class UserCardComponent {
  constructor(
    private userService: UserService,  // ❌ Red flag!
    private router: Router              // ❌ Red flag!
  ) {}

  ngOnInit() {
    this.userService.getUser().subscribe(...);  // ❌ Shouldn't fetch data
  }

  onClick() {
    this.router.navigate(['/profile']);  // ❌ Shouldn't navigate
  }
}
```

**Impact:**
- ❌ Component can't be reused in different contexts
- ❌ Hard to test (need to mock services)
- ❌ Violates single responsibility

**Fix:**

```typescript
// ✅ GOOD: Pure presentational component
@Component({
  selector: 'app-user-card',
  template: `...`
})
export class UserCardComponent {
  @Input() user!: User;  // ✅ Data from parent
  @Output() cardClick = new EventEmitter<void>();  // ✅ Event to parent

  onClick() {
    this.cardClick.emit();  // ✅ Parent decides what to do
  }
}
```

---

## Audit Checklist Summary

### URL State Audit

- [ ] ✅ All shareable state is in URL query params
- [ ] ✅ Page refresh preserves state
- [ ] ✅ URLs are bookmarkable
- [ ] ✅ Browser back/forward works correctly
- [ ] ❌ Check for state in component properties (should be in URL)
- [ ] ❌ Check for hardcoded default values (should hydrate from URL)

### API Call Audit

- [ ] ✅ No duplicate HTTP requests in network tab
- [ ] ✅ Request deduplication implemented (shareReplay)
- [ ] ✅ Loading states managed
- [ ] ✅ Error handling implemented
- [ ] ❌ Check network tab for duplicate requests
- [ ] ❌ Check for multiple subscriptions without shareReplay

### Memory Leak Audit

- [ ] ✅ All subscriptions use takeUntil or async pipe
- [ ] ✅ Components implement ngOnDestroy
- [ ] ✅ Subjects completed in ngOnDestroy
- [ ] ❌ Check for subscriptions without cleanup
- [ ] ❌ Profile memory usage (heap snapshots)

### Component Coupling Audit

- [ ] ✅ Presentational components have no service injections
- [ ] ✅ Presentational components use @Input/@Output only
- [ ] ✅ Container components orchestrate children
- [ ] ❌ Check for services in "dumb" components
- [ ] ❌ Check for direct API calls in components

---

## Checklist Complete?

- [ ] State type identified (URL, localStorage, service, component)
- [ ] URL state implemented with RouteStateService
- [ ] State service implemented with proper observables
- [ ] Component hydrates from state (not defaults)
- [ ] No duplicate API calls detected
- [ ] No memory leaks detected
- [ ] URL and component state synchronized
- [ ] Page refresh preserves state
- [ ] Browser back/forward works
- [ ] URLs are bookmarkable/shareable

---

**Related Checklists:**
- [02-creating-new-component.md](02-creating-new-component.md) - Component architecture
- [03-adding-api-endpoint.md](03-adding-api-endpoint.md) - API integration
- [06-code-review.md](06-code-review.md) - Code review guidelines

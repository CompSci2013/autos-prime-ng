# Checklist: Component Refactoring

**Use this checklist when:**
- Converting tightly coupled components to loosely coupled
- Breaking up monolithic components
- Improving component reusability
- Fixing technical debt
- Migrating legacy code to modern patterns

**Estimated time:** 2-8 hours (depending on component complexity)

---

## Phase 1: Assessment

### 1.1 Identify Refactoring Candidates

**🚨 Signs a component needs refactoring:**

- [ ] Component has >300 lines of code
- [ ] Component has >5 service injections
- [ ] Component makes direct API calls (should use service)
- [ ] Component has business logic (should be in service)
- [ ] Component manages complex state (should use state service)
- [ ] Component is hard to test (too many mocks needed)
- [ ] Component can't be reused in different contexts
- [ ] Component does multiple unrelated things
- [ ] Component has manual subscription management (memory leak risk)

### 1.2 Analyze Current Component

**Answer these questions:**

- [ ] What is the component's single responsibility? (If you can't answer in one sentence, it does too much)
- [ ] Which services does it inject? (More than 3-4 is a red flag)
- [ ] Does it fetch data? (Presentational components shouldn't)
- [ ] Does it manage URL/route state? (Should be in state service)
- [ ] Does it have subscriptions without cleanup? (Memory leak)
- [ ] Can it be reused elsewhere? (If no, why not?)
- [ ] Does it have business logic? (Should be in service)

### 1.3 Plan Refactoring Strategy

**Choose refactoring approach:**

- [ ] **Extract presentational component** - Separate UI from logic
- [ ] **Extract service** - Move business logic to service
- [ ] **Extract state management** - Move state to service with URL sync
- [ ] **Split component** - Break large component into smaller ones
- [ ] **Composition** - Use child components instead of monolithic template

---

## Phase 2: Extract Presentational Component

### 2.1 Identify Pure Presentation Logic

**What should move to presentational component:**

- [ ] Template/HTML structure
- [ ] Styling/CSS
- [ ] Display logic (formatting, conditional display)
- [ ] User interaction events (click, input)
- [ ] TrackBy functions
- [ ] Template helper methods

**What should NOT move:**

- [ ] Service injections
- [ ] API calls
- [ ] State management
- [ ] Routing/navigation
- [ ] Business logic

### 2.2 Create Presentational Component

**Before (Tightly Coupled):**

```typescript
// ❌ BAD: Component does everything
@Component({
  selector: 'app-user-list',
  template: `
    <div *ngIf="loading">Loading...</div>
    <div *ngIf="error">{{ error }}</div>
    <ul>
      <li *ngFor="let user of users">
        {{ user.name }}
        <button (click)="deleteUser(user.id)">Delete</button>
      </li>
    </ul>
  `
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private userService: UserService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: users => {
        this.users = users;
        this.loading = false;
      },
      error: err => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }

  deleteUser(id: string) {
    this.userService.deleteUser(id).subscribe(() => {
      this.toastService.success('User deleted');
      this.loadUsers();
    });
  }

  viewUser(id: string) {
    this.router.navigate(['/users', id]);
  }
}
```

**After (Loosely Coupled):**

```typescript
// ✅ GOOD: Presentational component (pure UI)
@Component({
  selector: 'app-user-list-view',
  template: `
    <div *ngIf="loading">Loading...</div>
    <div *ngIf="error" class="error">{{ error }}</div>
    <ul *ngIf="!loading && !error">
      <li *ngFor="let user of users; trackBy: trackById">
        {{ user.name }}
        <button (click)="userDelete.emit(user.id)">Delete</button>
        <button (click)="userClick.emit(user.id)">View</button>
      </li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush  // ✅ Performance boost
})
export class UserListViewComponent {
  @Input() users: User[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;

  @Output() userClick = new EventEmitter<string>();
  @Output() userDelete = new EventEmitter<string>();

  trackById(index: number, user: User): string {
    return user.id;
  }
}

// ✅ GOOD: Container component (orchestration)
@Component({
  selector: 'app-user-list-container',
  template: `
    <app-user-list-view
      [users]="users$ | async"
      [loading]="loading$ | async"
      [error]="error$ | async"
      (userClick)="onUserClick($event)"
      (userDelete)="onUserDelete($event)">
    </app-user-list-view>
  `
})
export class UserListContainerComponent {
  users$ = this.userService.users$;
  loading$ = this.userService.loading$;
  error$ = this.userService.error$;

  constructor(
    private userService: UserService,
    private router: Router,
    private toastService: ToastService
  ) {}

  onUserClick(userId: string): void {
    this.router.navigate(['/users', userId]);
  }

  onUserDelete(userId: string): void {
    this.userService.deleteUser(userId).subscribe(() => {
      this.toastService.success('User deleted');
    });
  }
}
```

**Checklist:**

- [ ] Presentational component uses @Input for all data
- [ ] Presentational component uses @Output for all events
- [ ] Presentational component has NO service injections
- [ ] Presentational component uses OnPush change detection
- [ ] Container component uses async pipe (no manual subscriptions)
- [ ] Container component handles all events
- [ ] Container component manages state and API calls

### 2.3 Benefits Achieved

- [ ] ✅ Presentational component is reusable
- [ ] ✅ Presentational component is easy to test (no mocks)
- [ ] ✅ Container component is thin (just orchestration)
- [ ] ✅ Clear separation of concerns
- [ ] ✅ OnPush change detection improves performance

---

## Phase 3: Extract Business Logic to Service

### 3.1 Identify Business Logic in Component

**🚨 Business logic that should be in service:**

- [ ] Data transformation/mapping
- [ ] Validation rules
- [ ] Calculations/computations
- [ ] Filtering/sorting logic
- [ ] Data aggregation
- [ ] Business rules ("if user is admin, then...")

**Before (Logic in Component):**

```typescript
// ❌ BAD: Business logic in component
export class OrderComponent {
  calculateTotal(order: Order): number {
    let total = 0;
    for (const item of order.items) {
      total += item.price * item.quantity;
    }

    // Apply discount
    if (order.customer.isPremium) {
      total *= 0.9;  // 10% discount
    }

    // Add tax
    total *= 1.08;  // 8% tax

    return total;
  }

  canCancelOrder(order: Order): boolean {
    const hoursSinceOrder = (Date.now() - order.createdAt.getTime()) / 3600000;
    return order.status === 'pending' && hoursSinceOrder < 24;
  }
}
```

**After (Logic in Service):**

```typescript
// ✅ GOOD: Business logic in service
@Injectable({ providedIn: 'root' })
export class OrderService {
  calculateTotal(order: Order): number {
    const subtotal = order.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    const discountedTotal = this.applyDiscount(subtotal, order.customer);
    return this.addTax(discountedTotal);
  }

  private applyDiscount(amount: number, customer: Customer): number {
    return customer.isPremium ? amount * 0.9 : amount;
  }

  private addTax(amount: number): number {
    return amount * 1.08;
  }

  canCancelOrder(order: Order): boolean {
    const hoursSinceOrder = (Date.now() - order.createdAt.getTime()) / 3600000;
    return order.status === 'pending' && hoursSinceOrder < 24;
  }
}

// ✅ GOOD: Component uses service
export class OrderComponent {
  total$ = this.orderService.order$.pipe(
    map(order => this.orderService.calculateTotal(order))
  );

  canCancel$ = this.orderService.order$.pipe(
    map(order => this.orderService.canCancelOrder(order))
  );

  constructor(private orderService: OrderService) {}
}
```

**Checklist:**

- [ ] Business logic moved to service
- [ ] Service methods are pure functions (when possible)
- [ ] Service methods have unit tests
- [ ] Component delegates to service
- [ ] Component template uses observables with async pipe

---

## Phase 4: Extract State Management

### 4.1 Move State to Service

**Before (State in Component):**

```typescript
// ❌ BAD: State managed in component
export class ProductFilterComponent implements OnInit {
  selectedCategories: string[] = [];
  priceRange = { min: 0, max: 1000 };
  sortOrder = 'asc';
  currentPage = 1;

  ngOnInit() {
    // Initialize from... nowhere! Lost on refresh.
    this.loadProducts();
  }

  onCategoryChange(category: string) {
    const index = this.selectedCategories.indexOf(category);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
    } else {
      this.selectedCategories.push(category);
    }
    this.loadProducts();
  }

  onPriceChange(range: PriceRange) {
    this.priceRange = range;
    this.loadProducts();
  }

  private loadProducts() {
    // Direct API call from component ❌
    this.productService.getProducts({
      categories: this.selectedCategories,
      priceMin: this.priceRange.min,
      priceMax: this.priceRange.max,
      sort: this.sortOrder,
      page: this.currentPage
    }).subscribe(products => {
      this.products = products;
    });
  }
}
```

**After (State in Service with URL Sync):**

```typescript
// ✅ GOOD: State service
@Injectable({ providedIn: 'root' })
export class ProductStateService {
  private filtersSubject = new BehaviorSubject<ProductFilters>({});

  readonly filters$ = this.filtersSubject.asObservable();

  readonly products$ = this.filters$.pipe(
    debounceTime(300),
    switchMap(filters => this.productService.getProducts(filters))
  );

  constructor(
    private productService: ProductService,
    private routeStateService: RouteStateService
  ) {
    this.initializeFromUrl();
  }

  private initializeFromUrl(): void {
    this.routeStateService.getAllQueryParams$().subscribe(params => {
      const filters = this.parseFilters(params);
      this.filtersSubject.next(filters);
    });
  }

  updateFilters(updates: Partial<ProductFilters>): void {
    const newFilters = { ...this.filtersSubject.value, ...updates };
    this.filtersSubject.next(newFilters);
    this.syncToUrl(newFilters);
  }

  private syncToUrl(filters: ProductFilters): void {
    // Sync to URL params
    this.routeStateService.updateQueryParams({
      categories: filters.categories?.join(','),
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      sort: filters.sortOrder,
      page: filters.page
    });
  }
}

// ✅ GOOD: Component uses state service
@Component({
  template: `
    <app-product-filters
      [filters]="filters$ | async"
      (filtersChange)="onFiltersChange($event)">
    </app-product-filters>

    <app-product-list
      [products]="products$ | async">
    </app-product-list>
  `
})
export class ProductPageComponent {
  filters$ = this.stateService.filters$;
  products$ = this.stateService.products$;

  constructor(private stateService: ProductStateService) {}

  onFiltersChange(filters: ProductFilters): void {
    this.stateService.updateFilters(filters);
  }
}
```

**Checklist:**

- [ ] State moved to dedicated service
- [ ] State initialized from URL
- [ ] State changes sync to URL
- [ ] Component uses async pipe (no manual subscriptions)
- [ ] Page refresh preserves state
- [ ] URLs are bookmarkable/shareable

**See:** [04-state-management-integration.md](04-state-management-integration.md) for complete state management patterns.

---

## Phase 5: Fix Memory Leaks

### 5.1 Identify Subscription Leaks

**🚨 Patterns that cause memory leaks:**

```typescript
// ❌ BAD: Subscription without cleanup
export class LeakyComponent implements OnInit {
  ngOnInit() {
    // Memory leak #1: Observable subscription
    this.dataService.data$.subscribe(data => {
      this.data = data;
    });

    // Memory leak #2: Timer
    setInterval(() => {
      console.log('Still running!');
    }, 1000);

    // Memory leak #3: Event listener
    window.addEventListener('resize', this.onResize);
  }

  // No ngOnDestroy! ❌
}
```

### 5.2 Fix Subscription Leaks

**Solution 1: Use async pipe (preferred):**

```typescript
// ✅ BEST: No manual subscription
@Component({
  template: `
    <div *ngIf="data$ | async as data">
      {{ data }}
    </div>
  `
})
export class NoLeakComponent {
  data$ = this.dataService.data$;
  // Async pipe automatically unsubscribes!
}
```

**Solution 2: Use takeUntil pattern:**

```typescript
// ✅ GOOD: Proper cleanup with takeUntil
export class CleanComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.dataService.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.data = data);

    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => console.log('Tick'));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Solution 3: Store subscriptions:**

```typescript
// ✅ ACCEPTABLE: Manual subscription management
export class ManualCleanupComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  ngOnInit() {
    this.subscriptions.add(
      this.dataService.data$.subscribe(data => this.data = data)
    );

    this.subscriptions.add(
      interval(1000).subscribe(() => console.log('Tick'))
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
```

**Checklist:**

- [ ] All observables use async pipe OR takeUntil OR manual unsubscribe
- [ ] Component implements ngOnDestroy
- [ ] destroy$ Subject is completed in ngOnDestroy
- [ ] Event listeners are removed in ngOnDestroy
- [ ] Timers/intervals are cleared in ngOnDestroy

---

## Phase 6: Split Large Components

### 6.1 Identify Component Boundaries

**When to split a component:**

- [ ] Component has >300 lines
- [ ] Template has multiple logical sections
- [ ] Component does multiple unrelated things
- [ ] Parts of component could be reused elsewhere

**Example: Split by responsibility:**

```typescript
// ❌ BAD: Monolithic component (500 lines)
@Component({
  selector: 'app-user-dashboard',
  template: `
    <!-- User profile section (100 lines) -->
    <section class="profile">...</section>

    <!-- Recent orders section (150 lines) -->
    <section class="orders">...</section>

    <!-- Recommendations section (100 lines) -->
    <section class="recommendations">...</section>

    <!-- Activity feed section (150 lines) -->
    <section class="activity">...</section>
  `
})
export class UserDashboardComponent {
  // 500 lines of code for 4 different responsibilities!
}
```

**✅ GOOD: Split into focused components:**

```typescript
// Container component (orchestration only)
@Component({
  selector: 'app-user-dashboard',
  template: `
    <app-user-profile [user]="user$ | async"></app-user-profile>
    <app-recent-orders [orders]="orders$ | async"></app-recent-orders>
    <app-recommendations [items]="recommendations$ | async"></app-recommendations>
    <app-activity-feed [activities]="activities$ | async"></app-activity-feed>
  `
})
export class UserDashboardComponent {
  user$ = this.userService.currentUser$;
  orders$ = this.orderService.recentOrders$;
  recommendations$ = this.recommendationService.recommendations$;
  activities$ = this.activityService.feed$;

  constructor(
    private userService: UserService,
    private orderService: OrderService,
    private recommendationService: RecommendationService,
    private activityService: ActivityService
  ) {}
}

// Each child component is focused and reusable
@Component({
  selector: 'app-user-profile',
  template: `<!-- 50 lines -->`
})
export class UserProfileComponent {
  @Input() user!: User;
}

// etc...
```

**Checklist:**

- [ ] Each component has single responsibility
- [ ] Components are <200 lines
- [ ] Child components are reusable
- [ ] Parent component orchestrates children
- [ ] Clear data flow via @Input/@Output

---

## Phase 7: Testing After Refactoring

### 7.1 Test Presentational Components

```typescript
describe('UserListViewComponent', () => {
  it('should emit userClick when user is clicked', () => {
    const component = fixture.componentInstance;
    const testUser = { id: '1', name: 'Test' };

    spyOn(component.userClick, 'emit');

    component.userClick.emit(testUser.id);

    expect(component.userClick.emit).toHaveBeenCalledWith(testUser.id);
  });

  it('should display loading spinner when loading is true', () => {
    component.loading = true;
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.loading');
    expect(spinner).toBeTruthy();
  });
});
```

**Checklist:**

- [ ] Test all @Input combinations
- [ ] Test all @Output emissions
- [ ] Test rendering states (loading, error, empty, data)
- [ ] No service mocking needed (pure component)

### 7.2 Test Container Components

```typescript
describe('UserListContainerComponent', () => {
  let mockUserService: jasmine.SpyObj<UserService>;

  beforeEach(() => {
    mockUserService = jasmine.createSpyObj('UserService', ['users$', 'deleteUser']);
    mockUserService.users$ = of([{ id: '1', name: 'Test' }]);

    TestBed.configureTestingModule({
      declarations: [UserListContainerComponent],
      providers: [
        { provide: UserService, useValue: mockUserService }
      ]
    });
  });

  it('should call router on user click', () => {
    spyOn(router, 'navigate');

    component.onUserClick('123');

    expect(router.navigate).toHaveBeenCalledWith(['/users', '123']);
  });
});
```

**Checklist:**

- [ ] Mock all services
- [ ] Test event handlers delegate to services
- [ ] Test navigation logic
- [ ] Test data flow to child components

### 7.3 Test Services

```typescript
describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should fetch users', () => {
    const mockUsers = [{ id: '1', name: 'Test' }];

    service.getUsers().subscribe(users => {
      expect(users).toEqual(mockUsers);
    });

    const req = httpMock.expectOne('/api/users');
    req.flush(mockUsers);
  });

  afterEach(() => {
    httpMock.verify();
  });
});
```

**Checklist:**

- [ ] Test all service methods
- [ ] Test business logic
- [ ] Test error scenarios
- [ ] Mock HTTP calls
- [ ] >80% code coverage

---

## Refactoring Checklist Complete?

### Before Merge:

- [ ] All tests passing
- [ ] Code coverage maintained or improved
- [ ] No memory leaks (verified with profiling)
- [ ] No duplicate API calls (verified in network tab)
- [ ] Components follow presentational/container pattern
- [ ] Business logic in services
- [ ] State management follows URL-first pattern
- [ ] Subscriptions properly cleaned up
- [ ] Code reviewed and approved

### Benefits Achieved:

- [ ] ✅ Components are more reusable
- [ ] ✅ Components are easier to test
- [ ] ✅ Business logic is centralized
- [ ] ✅ State management is consistent
- [ ] ✅ No memory leaks
- [ ] ✅ Better performance (OnPush, deduplication)
- [ ] ✅ Code is more maintainable

---

## Common Refactoring Patterns Summary

| Problem | Solution | See Checklist |
|---------|----------|---------------|
| Tight coupling | Extract presentational component | 02-creating-new-component.md |
| Logic in component | Extract service | 03-adding-api-endpoint.md |
| State in component | Extract state service | 04-state-management-integration.md |
| Memory leaks | Use async pipe or takeUntil | This document |
| Large component | Split by responsibility | This document |
| Duplicate API calls | Implement request deduplication | 03-adding-api-endpoint.md |
| Hard to test | Reduce dependencies, use DI | 07-testing.md |

---

**Related Checklists:**
- [02-creating-new-component.md](02-creating-new-component.md) - Component patterns
- [04-state-management-integration.md](04-state-management-integration.md) - State management
- [06-code-review.md](06-code-review.md) - Review guidelines

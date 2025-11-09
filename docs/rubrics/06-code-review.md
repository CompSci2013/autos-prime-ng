# Checklist: Code Review

**Use this checklist when:**
- Reviewing pull requests
- Auditing existing codebase for quality issues
- Conducting architectural reviews
- Identifying technical debt

**Estimated time:** 30 minutes - 2 hours per PR (depending on size)

---

## How to Use This Checklist

1. **For PRs:** Copy checklist items into PR review comments
2. **For Audits:** Run through entire codebase section by section
3. **Severity Levels:**
   - 🔴 **CRITICAL** - Must fix before merge (security, memory leaks, data loss)
   - 🟠 **HIGH** - Should fix before merge (architecture violations, performance)
   - 🟡 **MEDIUM** - Should fix soon (maintainability, technical debt)
   - 🟢 **LOW** - Nice to have (style, minor improvements)

---

## Phase 1: Architecture Review

### 1.1 Component Architecture

- [ ] 🟠 **Components follow presentational vs container pattern**
  ```typescript
  // 🚨 RED FLAG: Presentational component with services
  @Component({ selector: 'app-user-card' })
  export class UserCardComponent {
    constructor(
      private userService: UserService,  // ❌ Should use @Input
      private router: Router              // ❌ Should emit @Output
    ) {}
  }
  ```
  - **Fix:** Extract presentational component with @Input/@Output
  - **See:** [02-creating-new-component.md](02-creating-new-component.md)

- [ ] 🟠 **Components have single responsibility**
  ```typescript
  // 🚨 RED FLAG: Component does too much
  export class DashboardComponent {
    // Manages users, orders, analytics, notifications...
    // 500+ lines of code
  }
  ```
  - **Fix:** Split into focused components
  - **See:** [05-component-refactoring.md](05-component-refactoring.md)

- [ ] 🟡 **Components use OnPush change detection (when applicable)**
  ```typescript
  // ✅ GOOD: OnPush for presentational components
  @Component({
    selector: 'app-data-table',
    changeDetection: ChangeDetectionStrategy.OnPush
  })
  ```

- [ ] 🟡 **Component files are <300 lines**

### 1.2 Service Architecture

- [ ] 🟠 **Services are stateless OR use BehaviorSubject for state**
  ```typescript
  // ❌ BAD: Mutable state in service
  export class DataService {
    public data: Data[] = [];  // ❌ Mutable, no reactivity
  }

  // ✅ GOOD: Reactive state
  export class DataService {
    private dataSubject = new BehaviorSubject<Data[]>([]);
    readonly data$ = this.dataSubject.asObservable();
  }
  ```

- [ ] 🟠 **Business logic is in services, not components**
  ```typescript
  // 🚨 RED FLAG: Business logic in component
  export class OrderComponent {
    calculateTotal(order: Order): number {
      // Complex calculation logic...
    }
  }
  ```
  - **Fix:** Move to service
  - **See:** [05-component-refactoring.md](05-component-refactoring.md)

- [ ] 🟠 **Services have single responsibility**
  - Good: `UserService`, `AuthService`, `LoggingService`
  - Bad: `UtilsService`, `HelperService`, `ManagerService`

- [ ] 🟡 **Services use dependency injection (not `new` keyword)**

### 1.3 State Management

- [ ] 🔴 **Query state is stored in URL (not component/service)**
  ```typescript
  // 🚨 CRITICAL: State lost on refresh
  export class FilterComponent {
    selectedFilters: string[] = [];  // ❌ Not in URL

    ngOnInit() {
      this.selectedFilters = ['default'];  // ❌ Hardcoded
    }
  }
  ```
  - **Impact:** Can't bookmark, can't share, lost on refresh
  - **Fix:** Use RouteStateService to sync with URL
  - **See:** [04-state-management-integration.md](04-state-management-integration.md)

- [ ] 🟠 **UI preferences stored in localStorage (not URL)**
  ```typescript
  // ❌ BAD: Column order in URL (not shareable across users)
  this.router.navigate([], {
    queryParams: { columnOrder: '1,3,2,4' }  // ❌ User preference
  });

  // ✅ GOOD: Column order in localStorage
  this.storageService.set('table-column-order', [1, 3, 2, 4]);
  ```

- [ ] 🟠 **Components hydrate from state (not hardcoded defaults)**
  ```typescript
  // 🚨 RED FLAG: Hardcoded defaults
  ngOnInit() {
    this.currentPage = 1;  // ❌ Ignores URL
    this.loadData();
  }

  // ✅ GOOD: Hydrate from URL
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.currentPage = params['page'] ? +params['page'] : 1;
      this.loadData();
    });
  }
  ```

- [ ] 🟡 **State updates are unidirectional (URL → State → Component)**

---

## Phase 2: Performance Review

### 2.1 API Calls

- [ ] 🔴 **No duplicate API calls**
  ```typescript
  // 🚨 CRITICAL: Open DevTools Network tab during testing
  // Multiple simultaneous calls to same endpoint = RED FLAG
  ```
  - **Detection:** Open Chrome DevTools → Network → Filter XHR
  - **Test:** Navigate, change filters, refresh page
  - **Fix:** Implement request deduplication with `shareReplay(1)`
  - **See:** [03-adding-api-endpoint.md](03-adding-api-endpoint.md)

- [ ] 🟠 **HTTP calls use shareReplay for shared data**
  ```typescript
  // ❌ BAD: Each subscription triggers new request
  getData(): Observable<Data> {
    return this.http.get('/api/data');
  }

  // ✅ GOOD: Shared request
  private cache$ = this.http.get('/api/data').pipe(shareReplay(1));
  getData(): Observable<Data> {
    return this.cache$;
  }
  ```

- [ ] 🟠 **Debounce/throttle rapid user inputs**
  ```typescript
  // ✅ GOOD: Debounce search input
  this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged()
  ).subscribe(value => this.search(value));
  ```

- [ ] 🟠 **Use switchMap for user-triggered requests (cancel previous)**
  ```typescript
  // ✅ GOOD: Cancel previous search when new search starts
  this.searchTerm$.pipe(
    switchMap(term => this.searchService.search(term))
  ).subscribe(results => this.results = results);
  ```

### 2.2 Memory Leaks

- [ ] 🔴 **All subscriptions are cleaned up**
  ```typescript
  // 🚨 CRITICAL: Check for subscriptions without cleanup
  ngOnInit() {
    this.service.data$.subscribe(...);  // ❌ Never unsubscribed
  }

  // ✅ GOOD: Use async pipe
  data$ = this.service.data$;

  // ✅ GOOD: Use takeUntil
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.service.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(...);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  ```
  - **Detection:** Chrome DevTools → Memory → Take heap snapshots → Check for leaked component instances
  - **Test:** Navigate to component 10 times, take snapshot, search for component name

- [ ] 🔴 **Event listeners are removed in ngOnDestroy**
  ```typescript
  // 🚨 CRITICAL: Memory leak
  ngOnInit() {
    window.addEventListener('resize', this.onResize);
  }
  // No cleanup! ❌

  // ✅ GOOD: Cleanup
  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize);
  }
  ```

- [ ] 🔴 **Timers/intervals are cleared in ngOnDestroy**
  ```typescript
  // 🚨 CRITICAL: Memory leak
  ngOnInit() {
    setInterval(() => console.log('tick'), 1000);
  }
  // No cleanup! ❌

  // ✅ GOOD: Cleanup
  private timer: any;

  ngOnInit() {
    this.timer = setInterval(() => console.log('tick'), 1000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }
  ```

- [ ] 🟡 **Components implement ngOnDestroy when needed**

### 2.3 Change Detection

- [ ] 🟡 **OnPush used for presentational components**
- [ ] 🟡 **trackBy functions used for *ngFor loops**
  ```typescript
  // ❌ BAD: No trackBy (re-renders all items)
  <li *ngFor="let item of items">{{ item.name }}</li>

  // ✅ GOOD: TrackBy (only re-renders changed items)
  <li *ngFor="let item of items; trackBy: trackById">{{ item.name }}</li>

  trackById(index: number, item: Item): string {
    return item.id;
  }
  ```

- [ ] 🟡 **Avoid function calls in templates**
  ```typescript
  // ❌ BAD: Function called on every change detection
  <div>{{ calculateTotal() }}</div>

  // ✅ GOOD: Use pipe or cached property
  <div>{{ total$ | async }}</div>
  ```

---

## Phase 3: Code Quality

### 3.1 TypeScript

- [ ] 🟠 **No `any` types (except rare justified cases)**
  ```typescript
  // ❌ BAD
  data: any;
  getData(): any { ... }

  // ✅ GOOD
  data: User[];
  getData(): Observable<User[]> { ... }
  ```

- [ ] 🟠 **Strict null checks respected**
  ```typescript
  // ❌ BAD: Assuming value exists
  const name = user.profile.name;  // ❌ profile might be null

  // ✅ GOOD: Null checks
  const name = user.profile?.name ?? 'Unknown';
  ```

- [ ] 🟡 **Interfaces preferred over types (for objects)**
- [ ] 🟡 **Enums used for fixed sets of values**
  ```typescript
  // ✅ GOOD
  enum UserRole {
    Admin = 'admin',
    User = 'user',
    Guest = 'guest'
  }
  ```

- [ ] 🟡 **Proper access modifiers (public/private/protected)**

### 3.2 Error Handling

- [ ] 🔴 **All observables have error handling**
  ```typescript
  // 🚨 CRITICAL: Unhandled error crashes stream
  this.http.get('/api/data').subscribe(data => {
    this.data = data;
  });

  // ✅ GOOD: Error handling
  this.http.get('/api/data').pipe(
    catchError(error => {
      this.errorService.handleError(error);
      return of([]);  // Return fallback value
    })
  ).subscribe(data => this.data = data);
  ```

- [ ] 🟠 **HTTP interceptor for global error handling**
  - See: [08-creating-services.md](08-creating-services.md) (HTTP Interceptors section)

- [ ] 🟡 **User-friendly error messages (not raw error objects)**
  ```typescript
  // ❌ BAD: Technical error shown to user
  this.errorMessage = error;

  // ✅ GOOD: User-friendly message
  this.errorMessage = 'Failed to load data. Please try again.';
  this.logger.error('API Error:', error);  // Log technical details
  ```

### 3.3 Security

- [ ] 🔴 **No sensitive data in URL/localStorage**
  ```typescript
  // 🚨 CRITICAL: Never store sensitive data in URL or localStorage
  localStorage.setItem('password', pass);  // ❌ NEVER
  localStorage.setItem('creditCard', card);  // ❌ NEVER
  ```

- [ ] 🔴 **User inputs are sanitized**
  ```typescript
  // ✅ Angular sanitizes by default in templates
  <div>{{ userInput }}</div>  // ✅ Safe

  // 🚨 CRITICAL: Bypassing sanitization is dangerous
  <div [innerHTML]="userInput"></div>  // ❌ XSS risk
  ```

- [ ] 🔴 **API calls use parameterized queries (backend)**
  ```typescript
  // ❌ BAD: SQL injection risk
  const query = `SELECT * FROM users WHERE id = ${userId}`;

  // ✅ GOOD: Parameterized
  const query = `SELECT * FROM users WHERE id = ?`;
  ```

- [ ] 🟠 **Authentication tokens in HTTP-only cookies (not localStorage)**
- [ ] 🟠 **CORS configured properly (backend)**
- [ ] 🟠 **Rate limiting implemented (backend)**

### 3.4 Testing

- [ ] 🟠 **All services have unit tests**
  - Target: >80% coverage

- [ ] 🟡 **All components have unit tests**
  - Target: >70% coverage

- [ ] 🟡 **Critical flows have integration tests**

- [ ] 🟡 **Tests are isolated (no shared state)**
  ```typescript
  // ❌ BAD: Shared mutable state
  const testUser = { id: '1', name: 'Test' };

  it('test 1', () => {
    testUser.name = 'Changed';  // ❌ Mutates shared state
  });

  it('test 2', () => {
    expect(testUser.name).toBe('Test');  // ❌ Fails!
  });

  // ✅ GOOD: Each test creates own data
  it('test 1', () => {
    const testUser = { id: '1', name: 'Test' };
    testUser.name = 'Changed';
  });

  it('test 2', () => {
    const testUser = { id: '1', name: 'Test' };
    expect(testUser.name).toBe('Test');  // ✅ Passes
  });
  ```

- [ ] 🟡 **Tests have descriptive names**
  ```typescript
  // ❌ BAD
  it('works', () => { ... });

  // ✅ GOOD
  it('should emit userSelected event when user card is clicked', () => { ... });
  ```

---

## Phase 4: Code Style

### 4.1 Naming Conventions

- [ ] 🟡 **Components use PascalCase and end with Component**
  - `UserListComponent`, `DataTableComponent`

- [ ] 🟡 **Services use PascalCase and end with Service**
  - `UserService`, `AuthService`, `LoggingService`

- [ ] 🟡 **Observables end with $**
  ```typescript
  // ✅ GOOD
  users$ = this.userService.getUsers();
  loading$ = this.loadingSubject.asObservable();
  ```

- [ ] 🟡 **Boolean variables start with is/has/can**
  - `isLoading`, `hasError`, `canEdit`

- [ ] 🟡 **Constants use UPPER_SNAKE_CASE**
  ```typescript
  const MAX_RETRIES = 3;
  const API_BASE_URL = '/api';
  ```

### 4.2 Code Organization

- [ ] 🟡 **Imports are organized**
  ```typescript
  // ✅ GOOD: Grouped and sorted
  // Angular core
  import { Component, OnInit } from '@angular/core';
  import { CommonModule } from '@angular/common';

  // Third-party
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';

  // App-specific
  import { UserService } from '@app/services';
  import { User } from '@app/models';
  ```

- [ ] 🟡 **Files are in correct directories**
  ```
  ✅ src/app/features/users/user-list/user-list.component.ts
  ✅ src/app/core/services/auth.service.ts
  ✅ src/app/shared/components/data-table/data-table.component.ts
  ❌ src/app/user-list.component.ts  (should be in feature directory)
  ```

- [ ] 🟡 **Magic numbers/strings are constants**
  ```typescript
  // ❌ BAD
  if (status === 200) { ... }
  if (role === 'admin') { ... }

  // ✅ GOOD
  const HTTP_OK = 200;
  enum UserRole {
    Admin = 'admin',
    User = 'user'
  }

  if (status === HTTP_OK) { ... }
  if (role === UserRole.Admin) { ... }
  ```

### 4.3 Documentation

- [ ] 🟡 **Public methods have JSDoc comments**
  ```typescript
  /**
   * Calculates the total price of an order including tax and discount.
   * @param order - The order to calculate
   * @returns Total price in dollars
   */
  calculateTotal(order: Order): number {
    // ...
  }
  ```

- [ ] 🟡 **Complex logic has inline comments**
  ```typescript
  // ✅ GOOD: Explain "why", not "what"
  // Cache the request for 5 minutes to reduce server load
  return this.http.get('/api/data').pipe(
    shareReplay({ bufferSize: 1, refCount: true, windowTime: 300000 })
  );
  ```

- [ ] 🟡 **TODOs include ticket/issue number**
  ```typescript
  // ❌ BAD
  // TODO: fix this

  // ✅ GOOD
  // TODO(JIRA-123): Implement caching for this endpoint
  ```

---

## Phase 5: PR-Specific Checks

### 5.1 Changes Review

- [ ] 🟠 **PR description is clear**
  - What: Feature description
  - Why: Business justification
  - How: High-level implementation approach
  - Testing: How to test

- [ ] 🟠 **PR is focused (not too many unrelated changes)**
  - Guideline: <500 lines changed

- [ ] 🟠 **No commented-out code**
  ```typescript
  // ❌ BAD
  // const oldCode = () => { ... }  // Remove instead of commenting
  ```

- [ ] 🟡 **No console.log (use logging service)**
  ```typescript
  // ❌ BAD
  console.log('User logged in', user);

  // ✅ GOOD
  this.logger.info('User logged in', { userId: user.id });
  ```

- [ ] 🟡 **Screenshots/GIFs for UI changes**

### 5.2 Testing PR Changes

- [ ] 🟠 **Manually test all changed features**
- [ ] 🟠 **Test page refresh**
- [ ] 🟠 **Test browser back/forward**
- [ ] 🟠 **Check network tab for duplicate requests**
- [ ] 🟡 **Test in multiple browsers (Chrome, Firefox)**
- [ ] 🟡 **Test responsive layout (mobile/tablet)**

---

## Severity Guidelines

| Severity | When to Use | Must Fix Before Merge? |
|----------|-------------|----------------------|
| 🔴 CRITICAL | Security, data loss, memory leaks, crashes | YES |
| 🟠 HIGH | Architecture violations, performance issues | YES (or create follow-up ticket) |
| 🟡 MEDIUM | Maintainability, technical debt | NO (create follow-up ticket) |
| 🟢 LOW | Style, minor improvements | NO (optional) |

---

## Common Code Smells

| Code Smell | Severity | Fix |
|------------|----------|-----|
| Component >300 lines | 🟡 | Split into smaller components |
| Service injections in presentational component | 🟠 | Use @Input/@Output |
| Subscription without cleanup | 🔴 | Use async pipe or takeUntil |
| Hardcoded state initialization | 🟠 | Hydrate from URL/service |
| Duplicate API calls | 🔴 | Implement request deduplication |
| `any` type | 🟠 | Use proper types |
| Business logic in component | 🟠 | Move to service |
| No error handling | 🔴 | Add catchError |
| Magic numbers/strings | 🟡 | Use constants/enums |
| console.log in production | 🟡 | Use logging service |

---

## Review Checklist Complete?

Before approving PR:

- [ ] All 🔴 CRITICAL issues resolved
- [ ] All 🟠 HIGH issues resolved or follow-up tickets created
- [ ] Tests passing
- [ ] Manually tested changes
- [ ] No duplicate API calls verified
- [ ] No memory leaks verified
- [ ] Documentation updated (if needed)

---

**Related Checklists:**
- [02-creating-new-component.md](02-creating-new-component.md)
- [03-adding-api-endpoint.md](03-adding-api-endpoint.md)
- [04-state-management-integration.md](04-state-management-integration.md)
- [05-component-refactoring.md](05-component-refactoring.md)
- [07-testing.md](07-testing.md)
- [08-creating-services.md](08-creating-services.md)

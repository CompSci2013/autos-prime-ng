# Checklist: Adding a New Feature

**Use this checklist when:** Adding any new user-facing functionality to the Angular application.

**Estimated time:** Varies (small feature: 1-2 days, large feature: 1-2 weeks)

---

## Phase 1: Planning & Design

### 1.1 Requirements Gathering

- [ ] Define user story / acceptance criteria
- [ ] Identify affected components and services
- [ ] Determine if feature requires new API endpoints
- [ ] Identify state management requirements:
  - [ ] Does feature need URL state (shareable/bookmarkable)?
  - [ ] Does feature need component-level state only?
  - [ ] Does feature need app-wide state?
- [ ] List all UI components needed (new vs existing)

### 1.2 Architecture Design

- [ ] Sketch component hierarchy
  - [ ] Identify container (smart) components
  - [ ] Identify presentational (dumb) components
- [ ] Define data flow:
  - [ ] Where does state live? (URL params, service, local component)
  - [ ] How do components communicate? (@Output events, service, router)
- [ ] Identify API integration points:
  - [ ] List required API endpoints (existing or new)
  - [ ] Plan request deduplication strategy
  - [ ] Define caching requirements
- [ ] Review similar existing features for patterns to reuse

### 1.3 Technical Decisions

- [ ] Document architectural decisions in ADR (Architecture Decision Record)
- [ ] Identify potential performance concerns
- [ ] Plan error handling strategy
- [ ] Define loading state UX
- [ ] Determine mobile/responsive requirements

---

## Phase 2: Backend Implementation (if needed)

### 2.1 API Endpoint Creation

- [ ] Follow **[03-adding-api-endpoint.md](03-adding-api-endpoint.md)** for each new endpoint
- [ ] Document API contract (request/response models)
- [ ] Add API endpoint to API documentation
- [ ] Test endpoints with Postman/curl before frontend integration

### 2.2 Backend Testing

- [ ] Write unit tests for new backend logic
- [ ] Write integration tests for API endpoints
- [ ] Test error scenarios (400, 404, 500 responses)
- [ ] Verify performance under load (if applicable)

---

## Phase 3: Frontend Implementation

### 3.1 State Management Setup

- [ ] Follow **[04-state-management-integration.md](04-state-management-integration.md)**
- [ ] Define state interface/model
- [ ] Implement state service (if new state required)
- [ ] Add URL parameter handling (if feature uses query params)
- [ ] Implement state hydration logic

### 3.2 Component Creation

For each new component:

- [ ] Follow **[02-creating-new-component.md](02-creating-new-component.md)**
- [ ] Create component with proper architecture (presentational vs container)
- [ ] Define @Input and @Output clearly
- [ ] Implement lifecycle hooks properly (ngOnInit, ngOnDestroy)
- [ ] Add proper TypeScript typing (no `any` types)

### 3.3 Service Integration

- [ ] Create or update Angular service for feature
- [ ] Implement API client methods
- [ ] Add request deduplication logic (prevent duplicate calls)
- [ ] Implement caching if appropriate
- [ ] Add retry logic for transient failures
- [ ] Handle error scenarios gracefully

### 3.4 Routing (if applicable)

- [ ] Add new routes to routing module
- [ ] Configure route guards (auth, data resolution)
- [ ] Implement route parameter handling
- [ ] Add breadcrumb/navigation updates
- [ ] Test deep linking and page refresh

### 3.5 UI Implementation

- [ ] Implement responsive layout
- [ ] Add loading indicators
- [ ] Add error states and messages
- [ ] Add empty states (no data)
- [ ] Implement accessibility (ARIA labels, keyboard navigation)
- [ ] Add form validation (if applicable)
- [ ] Test in multiple browsers

---

## Phase 4: Testing

### 4.1 Unit Testing

- [ ] Follow **[07-testing.md](07-testing.md)**
- [ ] Write unit tests for all services (target: >80% coverage)
- [ ] Write unit tests for all components (target: >70% coverage)
- [ ] Test all @Output event emissions
- [ ] Test error handling paths
- [ ] Mock external dependencies properly

### 4.2 Integration Testing

- [ ] Test component interactions
- [ ] Test state management flow (URL → state → component)
- [ ] Test API integration with real backend (dev environment)
- [ ] Test user workflows end-to-end
- [ ] Test edge cases and boundary conditions

### 4.3 Manual Testing

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if applicable)
- [ ] Test on mobile devices (or browser dev tools)
- [ ] Test page refresh at various states
- [ ] Test browser back/forward buttons
- [ ] Test bookmark/share URLs (if feature uses URL state)
- [ ] Test with slow network (throttle in dev tools)
- [ ] Test error scenarios (disconnect network, 500 errors)

---

## Phase 5: Code Review & Quality

### 5.1 Self-Review

- [ ] Follow **[06-code-review.md](06-code-review.md)** on your own code
- [ ] Check for tight coupling between components
- [ ] Verify no duplicate API calls
- [ ] Ensure proper subscription cleanup (no memory leaks)
- [ ] Check for magic numbers/strings (use constants)
- [ ] Verify TypeScript strict mode compliance
- [ ] Run linter and fix all warnings
- [ ] Format code consistently

### 5.2 Documentation

- [ ] Update README if feature changes usage
- [ ] Add JSDoc comments for public methods
- [ ] Update architecture diagrams if structure changed
- [ ] Document any gotchas or edge cases
- [ ] Add inline comments for complex logic

### 5.3 Prepare PR

- [ ] Create feature branch with descriptive name
- [ ] Write clear PR description:
  - [ ] What: Feature description
  - [ ] Why: Business justification
  - [ ] How: High-level implementation approach
  - [ ] Testing: How to test the feature
- [ ] Link related tickets/issues
- [ ] Add screenshots/GIFs of UI changes
- [ ] Mark any breaking changes clearly

---

## Phase 6: Deployment

### 6.1 Pre-Deployment

- [ ] Merge latest from main/develop branch
- [ ] Run full test suite locally
- [ ] Build production bundle and verify no errors
- [ ] Check bundle size impact (if significant, investigate)
- [ ] Verify environment variables configured for all environments

### 6.2 Deployment

- [ ] Deploy to dev/staging environment first
- [ ] Smoke test in dev/staging
- [ ] Get stakeholder approval (if required)
- [ ] Deploy to production
- [ ] Monitor application logs for errors
- [ ] Monitor performance metrics

### 6.3 Post-Deployment

- [ ] Verify feature works in production
- [ ] Check analytics/telemetry (if applicable)
- [ ] Monitor error tracking (Sentry, etc.)
- [ ] Communicate deployment to team/stakeholders
- [ ] Update ticket status to "Done"

---

## Common Pitfalls to Avoid

### ❌ Don't: Create Tightly Coupled Components

```typescript
// ❌ BAD: Component knows about service and state management
export class UserListComponent {
  constructor(
    private apiService: ApiService,
    private stateService: StateService,
    private router: Router
  ) {}

  ngOnInit() {
    this.apiService.getUsers().subscribe(users => {
      this.users = users;
      this.stateService.updateUsers(users);
    });
  }
}
```

### ✅ Do: Create Loosely Coupled Components

```typescript
// ✅ GOOD: Presentational component
export class UserListComponent {
  @Input() users: User[] = [];
  @Input() loading: boolean = false;
  @Output() userSelected = new EventEmitter<User>();
}

// ✅ GOOD: Container component manages state
export class UsersDashboardComponent {
  users$ = this.userService.users$;
  loading$ = this.userService.loading$;

  constructor(private userService: UserService) {}

  onUserSelected(user: User) {
    this.router.navigate(['/users', user.id]);
  }
}
```

### ❌ Don't: Make Duplicate API Calls

```typescript
// ❌ BAD: Multiple subscriptions = multiple HTTP calls
ngOnInit() {
  this.service.getData().subscribe(data => this.data1 = data);
  this.service.getData().subscribe(data => this.data2 = data);
  // Two HTTP calls for same data!
}
```

### ✅ Do: Share Observables

```typescript
// ✅ GOOD: One HTTP call, shared result
ngOnInit() {
  const data$ = this.service.getData().pipe(shareReplay(1));
  data$.subscribe(data => this.data1 = data);
  data$.subscribe(data => this.data2 = data);
  // One HTTP call!
}

// ✅ BETTER: Use service-level caching
export class DataService {
  private cache$ = this.http.get('/api/data').pipe(
    shareReplay(1)
  );

  getData(): Observable<Data> {
    return this.cache$;
  }
}
```

### ❌ Don't: Forget Subscription Cleanup

```typescript
// ❌ BAD: Memory leak
ngOnInit() {
  this.service.data$.subscribe(data => this.data = data);
  // Never unsubscribed!
}
```

### ✅ Do: Always Clean Up Subscriptions

```typescript
// ✅ GOOD: Use takeUntil
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.service.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.data = data);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// ✅ BETTER: Use async pipe (no manual subscription)
@Component({
  template: `<div *ngIf="data$ | async as data">{{ data }}</div>`
})
export class MyComponent {
  data$ = this.service.data$;
}
```

---

## Checklist Complete?

Before marking this feature as "Done":

- [ ] All checklist items above are completed
- [ ] Feature is deployed to production
- [ ] No critical bugs reported in first 24 hours
- [ ] Stakeholders have approved the feature
- [ ] Documentation is updated

---

**Next Steps:**
- Monitor feature usage and performance
- Gather user feedback
- Plan iterative improvements

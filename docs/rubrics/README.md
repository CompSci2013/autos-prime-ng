# Developer Rubrics - Enterprise Angular 14 Applications

**Purpose:** Comprehensive checklists for systematically maintaining and extending enterprise-grade Angular 14 applications while avoiding common architectural pitfalls.

**Last Updated:** 2025-11-08

---

## Overview

This directory contains **nested checklists** that serve as a Developer's Manual for building well-architected Angular 14 applications. Each checklist is designed to prevent:

- ❌ Tight coupling between components
- ❌ Cascading/repeated API calls
- ❌ State management anti-patterns
- ❌ Component architecture violations
- ❌ State/URL desynchronization
- ❌ Memory leaks and subscription issues

---

## Checklist Index

### Core Development Checklists

1. **[Adding a New Feature](01-adding-new-feature.md)**
   - End-to-end feature development workflow
   - Planning, implementation, testing, deployment
   - Use when: Adding any new user-facing functionality

2. **[Creating a New Component](02-creating-new-component.md)**
   - Component architecture patterns (presentational vs container)
   - @Input/@Output design principles
   - Subscription management and lifecycle hooks
   - Use when: Creating any new Angular component

3. **[Adding an API Endpoint](03-adding-api-endpoint.md)**
   - Backend endpoint design
   - Frontend service integration
   - Request deduplication and caching strategies
   - Use when: Adding new backend functionality

4. **[State Management Integration](04-state-management-integration.md)**
   - URL-first state patterns
   - Component hydration from state
   - State service design
   - Use when: Component needs to interact with app state

5. **[Component Refactoring](05-component-refactoring.md)**
   - Converting tightly coupled to loosely coupled components
   - Extracting business logic to services
   - Breaking up monolithic components
   - Use when: Technical debt cleanup or component improvement

6. **[Code Review](06-code-review.md)**
   - What to check in pull requests
   - Architecture violation detection
   - Performance anti-pattern identification
   - Use when: Reviewing any code changes

7. **[Testing](07-testing.md)**
   - Unit test coverage requirements
   - Integration test patterns
   - E2E test scenarios
   - Use when: Writing or reviewing tests

8. **[Creating Services](08-creating-services.md)**
   - When to create a service vs adding to existing
   - Service design patterns (single responsibility, DI)
   - Logging service implementation
   - HTTP interceptors (error handling, auth, loading)
   - Caching strategies, Guards, Resolvers
   - Use when: Creating any new Angular service

---

## How to Use These Checklists

### 1. Start with the Appropriate Master Checklist

- **New feature?** → Start with **01-adding-new-feature.md**
- **New component?** → Start with **02-creating-new-component.md**
- **Refactoring?** → Start with **05-component-refactoring.md**
- **Code review?** → Start with **06-code-review.md**

### 2. Follow Nested Checklist References

When a checklist item says:
> ☑️ Create new component → See [02-creating-new-component.md](02-creating-new-component.md)

Complete that nested checklist before returning to the parent.

### 3. Use Checkboxes for Tracking

Copy checklist markdown into your task tracker or PR description:

```markdown
- [ ] Plan feature architecture
- [ ] Create component structure
  - [ ] Define @Input properties
  - [ ] Define @Output events
  - [x] Create component spec file
- [ ] Integrate with state management
```

### 4. Reference During Planning and Review

- **Planning:** Use checklists to ensure comprehensive design
- **Implementation:** Follow checklist items systematically
- **Review:** Use **06-code-review.md** to validate PRs

---

## Key Architectural Principles

These checklists enforce the following Angular best practices:

### 1. URL as Single Source of Truth (for Query State)

```typescript
// ✅ DO: Shareable, bookmarkable state in URL
this.router.navigate([], {
  queryParams: { filter: 'active', page: 2 },
  queryParamsHandling: 'merge'
});

// ❌ DON'T: Store query state only in component/service
private currentFilters: Filters = {};  // Lost on refresh!
```

### 2. Presentational vs Container Components

```typescript
// ✅ DO: Presentational (Dumb) Component
@Component({
  selector: 'app-data-table',
  template: '...'
})
export class DataTableComponent {
  @Input() data: Item[] = [];
  @Input() loading: boolean = false;
  @Output() rowClick = new EventEmitter<Item>();
  @Output() sortChange = new EventEmitter<SortEvent>();

  // No service injections!
  // No business logic!
  // Just presentation and events!
}

// ✅ DO: Container (Smart) Component
@Component({
  selector: 'app-dashboard',
  template: `
    <app-data-table
      [data]="data$ | async"
      [loading]="loading$ | async"
      (rowClick)="onRowClick($event)"
      (sortChange)="onSortChange($event)">
    </app-data-table>
  `
})
export class DashboardComponent {
  data$ = this.dataService.getData();
  loading$ = this.dataService.loading$;

  constructor(private dataService: DataService) {}

  onRowClick(item: Item): void {
    this.router.navigate(['/details', item.id]);
  }

  onSortChange(event: SortEvent): void {
    this.dataService.updateSort(event);
  }
}
```

### 3. Request Deduplication and Caching

```typescript
// ✅ DO: Prevent duplicate requests
private requestCache = new Map<string, Observable<any>>();

getDataWithCache(params: Params): Observable<Data> {
  const cacheKey = JSON.stringify(params);

  if (!this.requestCache.has(cacheKey)) {
    const request$ = this.http.get<Data>('/api/data', { params }).pipe(
      shareReplay(1),
      finalize(() => this.requestCache.delete(cacheKey))
    );
    this.requestCache.set(cacheKey, request$);
  }

  return this.requestCache.get(cacheKey)!;
}

// ❌ DON'T: Allow duplicate requests
getData(params: Params): Observable<Data> {
  return this.http.get<Data>('/api/data', { params });
  // Multiple subscribers = multiple HTTP calls!
}
```

### 4. Subscription Management

```typescript
// ✅ DO: Use takeUntil pattern
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.dataService.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.data = data);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// ✅ BETTER: Use async pipe (no manual subscription!)
@Component({
  template: `<div *ngIf="data$ | async as data">...</div>`
})
export class MyComponent {
  data$ = this.dataService.data$;
}

// ❌ DON'T: Forget to unsubscribe
ngOnInit(): void {
  this.dataService.data$.subscribe(data => this.data = data);
  // Memory leak!
}
```

### 5. Idempotent Component Initialization

```typescript
// ✅ DO: Hydrate from state, don't initialize with defaults
ngOnInit(): void {
  this.route.queryParams.pipe(
    takeUntil(this.destroy$)
  ).subscribe(params => {
    this.currentPage = params['page'] ? +params['page'] : 1;
    this.pageSize = params['size'] ? +params['size'] : 20;
    this.loadData();
  });
}

// ❌ DON'T: Initialize with hardcoded defaults
ngOnInit(): void {
  this.currentPage = 1;  // Ignores URL state!
  this.pageSize = 20;    // Not bookmarkable!
  this.loadData();
}
```

---

## Quick Reference: Which Checklist Do I Need?

| Task | Primary Checklist | Secondary Checklists |
|------|------------------|---------------------|
| Add new feature | 01-adding-new-feature.md | 02, 03, 04, 08 |
| Create component | 02-creating-new-component.md | 04 (if stateful) |
| Add API endpoint | 03-adding-api-endpoint.md | 08 (service layer) |
| Create service | 08-creating-services.md | 07 (testing) |
| Fix state bug | 04-state-management-integration.md | - |
| Refactor component | 05-component-refactoring.md | 02, 04, 08 |
| Review PR | 06-code-review.md | All (as needed) |
| Write tests | 07-testing.md | - |

---

## Customizing for Your Project

These checklists are **templates**. You should:

1. **Fork and customize** for your specific architecture
2. **Add project-specific items** (e.g., your state management library)
3. **Remove items** that don't apply to your tech stack
4. **Update examples** to match your coding standards

### Common Customizations

- Replace generic "StateService" with your actual state management (NgRx, Akita, etc.)
- Add your project's specific design system components
- Include your CI/CD deployment steps
- Reference your API documentation standards

---

## Checklist Maintenance

### When to Update

- ✅ After discovering a new anti-pattern
- ✅ When architectural patterns evolve
- ✅ After post-mortem of architecture-related bugs
- ✅ When adding new state management patterns
- ✅ When team identifies repeated mistakes

### How to Update

1. Identify the pattern/anti-pattern
2. Find the relevant checklist (or create a new one)
3. Add specific checklist item with DO/DON'T examples
4. Update this README if adding new checklist
5. Get team review and commit

---

## Philosophy

These checklists are based on these principles:

1. **Prevent problems before they happen** - Checklists catch issues during development, not in production
2. **Enforce loose coupling** - Components should be reusable and testable in isolation
3. **Single source of truth** - State should live in one place (URL for query state, service for app state)
4. **Fail gracefully** - Handle errors, loading states, and edge cases
5. **Test thoroughly** - Every checklist includes testing requirements
6. **Document decisions** - Understanding "why" is as important as "how"

---

## Contributing

These checklists improve with team experience. When you:
- Find a gap in coverage
- Discover a new anti-pattern
- Learn a better approach

**Update the checklists!** They're living documents that capture institutional knowledge.

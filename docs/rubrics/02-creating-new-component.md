# Checklist: Creating a New Component

**Use this checklist when:** Creating any new Angular component.

**Estimated time:** 30 minutes - 2 hours (depending on complexity)

---

## Decision: Presentational vs Container Component

**FIRST: Determine component type before writing any code!**

### Presentational (Dumb) Component

Choose this when:
- Component should be **reusable** across different contexts
- Component should **NOT** know about business logic or services
- Component should be **easy to test** in isolation
- Component displays data and emits events

### Container (Smart) Component

Choose this when:
- Component **orchestrates** multiple child components
- Component **manages state** and data fetching
- Component is **tied to a specific route or feature**
- Component **injects services** and makes decisions

---

## Phase 1: Planning

### 1.1 Component Specification

- [ ] Define component name (kebab-case, descriptive)
- [ ] Determine component type: [ ] Presentational [ ] Container
- [ ] List all @Input properties needed
- [ ] List all @Output events needed
- [ ] Identify child components (if any)
- [ ] Define component's single responsibility

### 1.2 Data Requirements

- [ ] Define input data model/interface
- [ ] Define output event payload types
- [ ] Identify which data comes from @Input vs service injection
- [ ] Plan loading state handling
- [ ] Plan error state handling
- [ ] Plan empty state handling

### 1.3 UI/UX Planning

- [ ] Sketch component layout (wireframe)
- [ ] Identify accessibility requirements (ARIA, keyboard nav)
- [ ] Plan responsive behavior
- [ ] Determine animation requirements

---

## Phase 2: Component Creation

### 2.1 Generate Component

```bash
ng generate component features/my-feature/my-component
```

- [ ] Component generated in correct feature directory
- [ ] Files created: .ts, .html, .scss, .spec.ts
- [ ] Component declared in appropriate module
- [ ] Selector follows naming convention (app-my-component)

### 2.2 Component Class Setup

#### For Presentational Components:

```typescript
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.component.html',
  styleUrls: ['./my-component.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush  // ✅ Use OnPush for presentational
})
export class MyComponent {
  // ✅ All inputs with types and defaults
  @Input() data: MyData[] = [];
  @Input() loading: boolean = false;
  @Input() error: string | null = null;

  // ✅ All outputs with descriptive names
  @Output() itemSelected = new EventEmitter<MyData>();
  @Output() itemDeleted = new EventEmitter<string>();

  // ✅ NO service injections (except ChangeDetectorRef if needed)
  // ✅ NO business logic
  // ✅ Only presentation logic
}
```

**Checklist:**

- [ ] ChangeDetectionStrategy.OnPush enabled (for presentational)
- [ ] All @Input properties have type annotations
- [ ] All @Input properties have default values
- [ ] All @Output events use EventEmitter with typed payload
- [ ] NO service injections (except renderer, cdr if needed)
- [ ] NO API calls or business logic

#### For Container Components:

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-my-container',
  templateUrl: './my-container.component.html',
  styleUrls: ['./my-container.component.scss']
})
export class MyContainerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();  // ✅ For subscription cleanup

  // ✅ Use observables with async pipe when possible
  data$ = this.dataService.getData();
  loading$ = this.dataService.loading$;

  constructor(
    private dataService: MyDataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // ✅ Subscribe to state/route params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => this.handleParamsChange(params));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ Handle events from child components
  onItemSelected(item: MyData): void {
    this.router.navigate(['/details', item.id]);
  }

  onItemDeleted(id: string): void {
    this.dataService.deleteItem(id);
  }
}
```

**Checklist:**

- [ ] Implements OnInit (if needed)
- [ ] Implements OnDestroy (if has subscriptions)
- [ ] destroy$ Subject created for subscription cleanup
- [ ] Services injected via constructor
- [ ] Observable streams use async pipe when possible
- [ ] Manual subscriptions use takeUntil(destroy$)
- [ ] Event handlers delegate to services/router

### 2.3 Lifecycle Hooks

- [ ] ngOnChanges: Implement if need to react to @Input changes
  - [ ] Check which inputs changed using SimpleChanges
  - [ ] Avoid heavy computations (use pipe transforms instead)
- [ ] ngOnInit: Implement for initialization logic
  - [ ] Subscribe to route params (if needed)
  - [ ] Subscribe to state changes (if needed)
  - [ ] Hydrate component from URL/state
- [ ] ngOnDestroy: Implement if component has subscriptions
  - [ ] Complete all Subjects
  - [ ] Unsubscribe from manual subscriptions
- [ ] ngAfterViewInit: Implement if need to access ViewChild/ViewChildren
  - [ ] Avoid causing ExpressionChangedAfterItHasBeenCheckedError

### 2.4 Template Development

- [ ] Use OnPush-safe patterns (don't mutate objects)
- [ ] Use trackBy functions for *ngFor loops
- [ ] Use async pipe instead of manual subscriptions
- [ ] Add loading state display
- [ ] Add error state display
- [ ] Add empty state display
- [ ] Use proper semantic HTML (table, ul/li, etc.)
- [ ] Add ARIA labels for accessibility

**Example:**

```html
<!-- ✅ Loading state -->
<div *ngIf="loading">
  <app-spinner></app-spinner>
</div>

<!-- ✅ Error state -->
<div *ngIf="error" class="error">
  {{ error }}
</div>

<!-- ✅ Empty state -->
<div *ngIf="!loading && !error && data.length === 0" class="empty">
  No data available
</div>

<!-- ✅ Data display with trackBy -->
<ul *ngIf="!loading && !error && data.length > 0">
  <li *ngFor="let item of data; trackBy: trackById">
    {{ item.name }}
    <button (click)="onItemClick(item)">Select</button>
  </li>
</ul>
```

### 2.5 Component Logic

- [ ] Implement trackBy functions for all *ngFor
- [ ] Create helper methods for template logic
- [ ] Avoid business logic (move to service)
- [ ] Use pipes for transformations
- [ ] Type all method parameters and return values

```typescript
// ✅ TrackBy function
trackById(index: number, item: MyData): string {
  return item.id;
}

// ✅ Helper method for template
isSelected(item: MyData): boolean {
  return this.selectedId === item.id;
}

// ✅ Event handler
onItemClick(item: MyData): void {
  this.itemSelected.emit(item);
}
```

---

## Phase 3: Styling

### 3.1 Component Styles

- [ ] Use component-scoped styles (avoid global styles)
- [ ] Use CSS variables for theming
- [ ] Follow BEM or consistent naming convention
- [ ] Add responsive breakpoints
- [ ] Test different screen sizes

### 3.2 Accessibility

- [ ] Add ARIA labels where needed
- [ ] Ensure keyboard navigation works
- [ ] Test with screen reader (if critical component)
- [ ] Ensure sufficient color contrast
- [ ] Add focus indicators

---

## Phase 4: Testing

### 4.1 Unit Test Setup

```typescript
describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MyComponent ],
      imports: [ /* required modules */ ],
      providers: [ /* mock services */ ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### 4.2 Test Cases

**For Presentational Components:**

- [ ] Test component creation
- [ ] Test @Input property binding
  - [ ] Test default values
  - [ ] Test with various input values
- [ ] Test @Output event emission
  - [ ] Test each event emits correct payload
  - [ ] Test user interactions trigger events
- [ ] Test rendering states:
  - [ ] Loading state
  - [ ] Error state
  - [ ] Empty state
  - [ ] Data display
- [ ] Test template logic (trackBy, helpers)
- [ ] Test OnPush change detection (if applicable)

**For Container Components:**

- [ ] Test component creation
- [ ] Test service injection
- [ ] Test ngOnInit initialization
- [ ] Test subscription to route params
- [ ] Test subscription to state changes
- [ ] Test event handlers
  - [ ] Test delegation to services
  - [ ] Test navigation
- [ ] Test ngOnDestroy cleanup
  - [ ] Verify subscriptions are unsubscribed

### 4.3 Test Best Practices

- [ ] Mock all external dependencies (services, router)
- [ ] Use fixture.detectChanges() after setting inputs
- [ ] Test user interactions with triggerEventHandler or native elements
- [ ] Verify template rendering with fixture.nativeElement
- [ ] Aim for >70% code coverage

```typescript
// ✅ Example: Testing @Output emission
it('should emit itemSelected when item is clicked', () => {
  const testItem = { id: '1', name: 'Test' };
  let emittedItem: MyData | undefined;

  component.itemSelected.subscribe((item: MyData) => {
    emittedItem = item;
  });

  component.onItemClick(testItem);

  expect(emittedItem).toEqual(testItem);
});

// ✅ Example: Testing template rendering
it('should display loading spinner when loading is true', () => {
  component.loading = true;
  fixture.detectChanges();

  const spinner = fixture.nativeElement.querySelector('app-spinner');
  expect(spinner).toBeTruthy();
});
```

---

## Phase 5: Integration

### 5.1 Module Registration

- [ ] Component declared in correct module
- [ ] Module imports all dependencies (CommonModule, etc.)
- [ ] Component exported if used outside module

### 5.2 Parent Component Integration

- [ ] Import component in parent template
- [ ] Bind all required @Input properties
- [ ] Handle all @Output events
- [ ] Test component in parent context

### 5.3 Routing (if applicable)

- [ ] Add route to routing module
- [ ] Configure route data/params
- [ ] Test direct navigation to route
- [ ] Test deep linking

---

## Common Anti-Patterns to Avoid

### ❌ Don't: Inject Services into Presentational Components

```typescript
// ❌ BAD: Presentational component with service injection
export class UserCardComponent {
  @Input() userId!: string;

  constructor(private userService: UserService) {}  // ❌ Don't!

  ngOnInit() {
    this.userService.getUser(this.userId).subscribe(user => {
      this.user = user;  // ❌ Fetching data in presentational component
    });
  }
}
```

### ✅ Do: Pass Data via @Input

```typescript
// ✅ GOOD: Presentational component receives data
export class UserCardComponent {
  @Input() user!: User;  // ✅ Parent provides data
}

// ✅ GOOD: Container component fetches data
export class UserDashboardComponent {
  user$ = this.userService.getUser(this.userId);

  constructor(private userService: UserService) {}
}
```

### ❌ Don't: Mutate @Input Objects

```typescript
// ❌ BAD: Mutating input (breaks OnPush detection)
@Input() user!: User;

ngOnInit() {
  this.user.name = 'Changed';  // ❌ Don't mutate inputs!
}
```

### ✅ Do: Emit Events for Changes

```typescript
// ✅ GOOD: Emit event to request change
@Input() user!: User;
@Output() userChanged = new EventEmitter<User>();

updateUser(newName: string) {
  const updatedUser = { ...this.user, name: newName };
  this.userChanged.emit(updatedUser);  // ✅ Let parent handle it
}
```

### ❌ Don't: Forget to Unsubscribe

```typescript
// ❌ BAD: Memory leak
ngOnInit() {
  this.dataService.data$.subscribe(data => {
    this.data = data;
  });
  // Never cleaned up!
}
```

### ✅ Do: Use takeUntil or Async Pipe

```typescript
// ✅ GOOD: Proper cleanup
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

// ✅ BETTER: No manual subscription
@Component({
  template: `<div>{{ data$ | async }}</div>`
})
export class MyComponent {
  data$ = this.dataService.data$;
}
```

### ❌ Don't: Use `any` Type

```typescript
// ❌ BAD: Losing type safety
@Input() data: any;  // ❌ What is this data?

handleClick(event: any) {  // ❌ What properties does event have?
  console.log(event);
}
```

### ✅ Do: Use Proper Types

```typescript
// ✅ GOOD: Type safety
@Input() data: User[] = [];

handleClick(event: MouseEvent) {
  console.log(event.clientX, event.clientY);
}
```

---

## Checklist Complete?

Before marking component as "Done":

- [ ] Component follows presentational vs container pattern
- [ ] All @Input and @Output properly typed
- [ ] Subscriptions properly cleaned up (if any)
- [ ] Unit tests written and passing (>70% coverage)
- [ ] Component tested in parent context
- [ ] Accessibility requirements met
- [ ] Responsive behavior verified
- [ ] Code reviewed and approved

---

## Quick Reference: Component Patterns

| Pattern | Presentational | Container |
|---------|----------------|-----------|
| Service injection | ❌ No | ✅ Yes |
| @Input properties | ✅ Yes | ⚠️ Minimal |
| @Output events | ✅ Yes | ❌ No |
| API calls | ❌ No | ✅ Yes |
| Route subscriptions | ❌ No | ✅ Yes |
| Business logic | ❌ No | ✅ Yes |
| Reusability | ✅ High | ❌ Low |
| OnPush detection | ✅ Yes | ⚠️ Optional |
| Testing complexity | ✅ Easy | ⚠️ Moderate |

---

**Related Checklists:**
- [04-state-management-integration.md](04-state-management-integration.md) - If component needs state
- [07-testing.md](07-testing.md) - Comprehensive testing guide

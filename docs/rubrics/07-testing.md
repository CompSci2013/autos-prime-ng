# Checklist: Testing

**Use this checklist when:**
- Writing tests for new code
- Reviewing test coverage
- Planning test strategy
- Debugging failing tests

**Target Coverage:**
- Services: >80%
- Components: >70%
- Overall: >75%

---

## Phase 1: Test Planning

### 1.1 Determine Test Strategy

- [ ] **Identify what needs testing:**
  - [ ] Business logic (services)
  - [ ] UI components (presentational)
  - [ ] Container components (integration)
  - [ ] Integration flows (API → Service → Component)
  - [ ] Edge cases and error scenarios
  - [ ] User workflows (E2E)

- [ ] **Choose test types:**
  - [ ] **Unit tests** - Test individual functions/methods in isolation
  - [ ] **Component tests** - Test component logic and rendering
  - [ ] **Integration tests** - Test component + service interaction
  - [ ] **E2E tests** - Test complete user workflows

### 1.2 Test Coverage Goals

```typescript
// Prioritize testing by importance:

// 🔴 CRITICAL (Must have >90% coverage):
- Authentication/authorization logic
- Payment processing
- Data modification (create/update/delete)
- Security-critical code

// 🟠 HIGH (Should have >80% coverage):
- Business logic in services
- State management
- API integration
- Complex calculations

// 🟡 MEDIUM (Should have >60% coverage):
- UI components
- Data transformation
- Validation logic

// 🟢 LOW (Nice to have):
- Simple getters/setters
- Trivial helper functions
```

---

## Phase 2: Unit Testing Services

### 2.1 Service Test Setup

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';

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

  afterEach(() => {
    // ✅ Verify no outstanding HTTP requests
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

**Checklist:**

- [ ] Import `HttpClientTestingModule` for HTTP services
- [ ] Inject service under test
- [ ] Inject `HttpTestingController` for mocking HTTP
- [ ] Call `httpMock.verify()` in `afterEach`
- [ ] Test service creation

### 2.2 Testing HTTP Calls

```typescript
describe('UserService', () => {
  it('should fetch users', () => {
    const mockUsers = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ];

    // ✅ Subscribe to service method
    service.getUsers().subscribe(users => {
      expect(users.length).toBe(2);
      expect(users).toEqual(mockUsers);
    });

    // ✅ Expect HTTP request
    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');

    // ✅ Respond with mock data
    req.flush(mockUsers);
  });

  it('should handle 404 error', () => {
    const errorMessage = 'User not found';

    service.getUser('999').subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        expect(error.message).toContain(errorMessage);
      }
    });

    const req = httpMock.expectOne('/api/users/999');
    req.flush({ message: errorMessage }, { status: 404, statusText: 'Not Found' });
  });

  it('should send POST request with correct body', () => {
    const newUser = { name: 'Charlie', email: 'charlie@example.com' };

    service.createUser(newUser).subscribe(user => {
      expect(user.id).toBeDefined();
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newUser);

    req.flush({ id: '3', ...newUser });
  });
});
```

**Checklist:**

- [ ] Test successful requests
- [ ] Test error responses (404, 500)
- [ ] Verify HTTP method (GET, POST, PUT, DELETE)
- [ ] Verify request body (for POST/PUT)
- [ ] Verify query parameters (for GET)
- [ ] Test request headers (if applicable)

### 2.3 Testing Business Logic

```typescript
describe('OrderService', () => {
  it('should calculate total with discount', () => {
    const order = {
      items: [
        { price: 10, quantity: 2 },
        { price: 5, quantity: 3 }
      ],
      customer: { isPremium: true }
    };

    const total = service.calculateTotal(order);

    // (10*2 + 5*3) * 0.9 (premium discount) * 1.08 (tax)
    expect(total).toBeCloseTo(34.02, 2);
  });

  it('should not apply discount for non-premium customers', () => {
    const order = {
      items: [{ price: 10, quantity: 2 }],
      customer: { isPremium: false }
    };

    const total = service.calculateTotal(order);

    // 10*2 * 1.08 (no discount, just tax)
    expect(total).toBeCloseTo(21.6, 2);
  });

  it('should allow order cancellation within 24 hours', () => {
    const order = {
      status: 'pending',
      createdAt: new Date(Date.now() - 23 * 3600000)  // 23 hours ago
    };

    expect(service.canCancelOrder(order)).toBe(true);
  });

  it('should not allow order cancellation after 24 hours', () => {
    const order = {
      status: 'pending',
      createdAt: new Date(Date.now() - 25 * 3600000)  // 25 hours ago
    };

    expect(service.canCancelOrder(order)).toBe(false);
  });
});
```

**Checklist:**

- [ ] Test all branches of conditional logic
- [ ] Test edge cases (empty arrays, null values, boundaries)
- [ ] Test calculations with expected values
- [ ] Use `toBeCloseTo()` for floating-point comparisons
- [ ] Test time-dependent logic with specific dates

### 2.4 Testing Observables

```typescript
describe('DataService', () => {
  it('should emit updated data when refresh is called', (done) => {
    const mockData = [{ id: '1', value: 'test' }];

    service.data$.subscribe(data => {
      expect(data).toEqual(mockData);
      done();  // ✅ Signal async test completion
    });

    service.refresh();

    const req = httpMock.expectOne('/api/data');
    req.flush(mockData);
  });

  it('should debounce rapid calls', fakeAsync(() => {
    let callCount = 0;

    service.searchResults$.subscribe(() => callCount++);

    service.search('a');
    tick(100);
    service.search('ab');
    tick(100);
    service.search('abc');
    tick(300);  // ✅ Wait for debounce

    flush();  // ✅ Flush pending timers

    const req = httpMock.expectOne('/api/search?q=abc');
    req.flush([]);

    expect(callCount).toBe(1);  // ✅ Only last search executed
  }));
});
```

**Checklist:**

- [ ] Use `done()` callback for async tests
- [ ] Use `fakeAsync()` and `tick()` for time-based observables
- [ ] Use `flush()` to clear pending timers
- [ ] Test observable streams (debounce, throttle, switchMap)
- [ ] Test BehaviorSubject initial values

---

## Phase 3: Component Testing

### 3.1 Presentational Component Tests

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserCardComponent } from './user-card.component';
import { User } from '@app/models';

describe('UserCardComponent', () => {
  let component: UserCardComponent;
  let fixture: ComponentFixture<UserCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('@Input', () => {
    it('should display user name', () => {
      const testUser: User = { id: '1', name: 'Alice', email: 'alice@example.com' };

      // ✅ Set input
      component.user = testUser;
      fixture.detectChanges();

      // ✅ Query DOM
      const nameElement = fixture.nativeElement.querySelector('.user-name');
      expect(nameElement.textContent).toContain('Alice');
    });

    it('should handle null user', () => {
      component.user = null;
      fixture.detectChanges();

      const element = fixture.nativeElement.querySelector('.user-card');
      expect(element).toBeFalsy();
    });
  });

  describe('@Output', () => {
    it('should emit userClick when card is clicked', () => {
      const testUser: User = { id: '1', name: 'Alice', email: 'alice@example.com' };
      let emittedUser: User | undefined;

      // ✅ Subscribe to output
      component.userClick.subscribe((user: User) => {
        emittedUser = user;
      });

      // ✅ Trigger event
      component.onCardClick();

      expect(emittedUser).toEqual(testUser);
    });

    it('should emit delete event with user ID', () => {
      const testUser: User = { id: '1', name: 'Alice', email: 'alice@example.com' };
      let emittedId: string | undefined;

      component.user = testUser;
      component.userDelete.subscribe((id: string) => {
        emittedId = id;
      });

      // ✅ Click button in template
      const deleteButton = fixture.nativeElement.querySelector('.delete-btn');
      deleteButton.click();
      fixture.detectChanges();

      expect(emittedId).toBe('1');
    });
  });

  describe('rendering states', () => {
    it('should show loading spinner when loading is true', () => {
      component.loading = true;
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner).toBeTruthy();
    });

    it('should show error message when error is set', () => {
      component.error = 'Failed to load';
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.error');
      expect(errorElement.textContent).toContain('Failed to load');
    });

    it('should show empty state when data is empty', () => {
      component.users = [];
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });
  });
});
```

**Checklist:**

- [ ] Test all @Input property bindings
- [ ] Test all @Output event emissions
- [ ] Test rendering for different input values
- [ ] Test loading state
- [ ] Test error state
- [ ] Test empty state
- [ ] Test user interactions (clicks, inputs)
- [ ] Use `fixture.detectChanges()` after setting inputs
- [ ] Query DOM with `fixture.nativeElement.querySelector()`

### 3.2 Container Component Tests

```typescript
describe('UserListContainerComponent', () => {
  let component: UserListContainerComponent;
  let fixture: ComponentFixture<UserListContainerComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // ✅ Create service mocks
    mockUserService = jasmine.createSpyObj('UserService', ['getUsers', 'deleteUser']);
    mockUserService.users$ = of([{ id: '1', name: 'Alice' }]);
    mockUserService.loading$ = of(false);
    mockUserService.error$ = of(null);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [UserListContainerComponent],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should navigate to user details on user click', () => {
    component.onUserClick('123');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users', '123']);
  });

  it('should call service to delete user', () => {
    mockUserService.deleteUser.and.returnValue(of(void 0));

    component.onUserDelete('123');

    expect(mockUserService.deleteUser).toHaveBeenCalledWith('123');
  });

  it('should pass data to child component', () => {
    const childComponent = fixture.debugElement.query(
      By.directive(UserListViewComponent)
    ).componentInstance;

    expect(childComponent.users).toEqual([{ id: '1', name: 'Alice' }]);
  });
});
```

**Checklist:**

- [ ] Mock all injected services
- [ ] Use `jasmine.createSpyObj()` for mocks
- [ ] Test event handler methods
- [ ] Test navigation calls
- [ ] Test service method calls
- [ ] Verify data passed to child components

### 3.3 Testing Forms

```typescript
describe('UserFormComponent', () => {
  it('should create form with validators', () => {
    expect(component.userForm.get('email')?.hasError('required')).toBe(true);
  });

  it('should validate email format', () => {
    const emailControl = component.userForm.get('email');

    emailControl?.setValue('invalid');
    expect(emailControl?.hasError('email')).toBe(true);

    emailControl?.setValue('valid@example.com');
    expect(emailControl?.hasError('email')).toBe(false);
  });

  it('should emit formSubmit when valid form is submitted', () => {
    let emittedData: any;

    component.formSubmit.subscribe(data => {
      emittedData = data;
    });

    component.userForm.setValue({
      name: 'Alice',
      email: 'alice@example.com'
    });

    component.onSubmit();

    expect(emittedData).toEqual({
      name: 'Alice',
      email: 'alice@example.com'
    });
  });

  it('should not submit when form is invalid', () => {
    spyOn(component.formSubmit, 'emit');

    component.userForm.setValue({
      name: '',
      email: 'invalid'
    });

    component.onSubmit();

    expect(component.formSubmit.emit).not.toHaveBeenCalled();
  });
});
```

**Checklist:**

- [ ] Test form initialization
- [ ] Test validators (required, email, pattern, custom)
- [ ] Test form submission
- [ ] Test invalid form handling
- [ ] Test form reset
- [ ] Test dynamic form controls (if applicable)

---

## Phase 4: Integration Testing

### 4.1 Component + Service Integration

```typescript
describe('UserDashboardComponent (Integration)', () => {
  let component: UserDashboardComponent;
  let fixture: ComponentFixture<UserDashboardComponent>;
  let userService: UserService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserDashboardComponent, UserListViewComponent],
      imports: [HttpClientTestingModule],
      providers: [UserService]  // ✅ Use real service
    }).compileComponents();

    fixture = TestBed.createComponent(UserDashboardComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should load users on init', () => {
    const mockUsers = [{ id: '1', name: 'Alice' }];

    fixture.detectChanges();  // ✅ Trigger ngOnInit

    const req = httpMock.expectOne('/api/users');
    req.flush(mockUsers);

    fixture.detectChanges();

    const userElements = fixture.nativeElement.querySelectorAll('.user-item');
    expect(userElements.length).toBe(1);
  });

  it('should delete user and refresh list', () => {
    const mockUsers = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ];

    fixture.detectChanges();

    const req1 = httpMock.expectOne('/api/users');
    req1.flush(mockUsers);
    fixture.detectChanges();

    // Click delete button
    const deleteButton = fixture.nativeElement.querySelector('.delete-btn');
    deleteButton.click();

    const deleteReq = httpMock.expectOne('/api/users/1');
    deleteReq.flush({});

    const refreshReq = httpMock.expectOne('/api/users');
    refreshReq.flush([{ id: '2', name: 'Bob' }]);

    fixture.detectChanges();

    const userElements = fixture.nativeElement.querySelectorAll('.user-item');
    expect(userElements.length).toBe(1);
  });
});
```

**Checklist:**

- [ ] Use real services (not mocks)
- [ ] Use `HttpClientTestingModule` for HTTP
- [ ] Test complete user workflows
- [ ] Test data flow: Component → Service → HTTP → Component
- [ ] Test UI updates after service calls

---

## Phase 5: E2E Testing

### 5.1 Protractor/Cypress Tests (Example)

```typescript
// Cypress example
describe('User Management', () => {
  beforeEach(() => {
    cy.visit('/users');
  });

  it('should display list of users', () => {
    cy.get('.user-item').should('have.length.greaterThan', 0);
  });

  it('should create new user', () => {
    cy.get('.add-user-btn').click();
    cy.get('input[name="name"]').type('Alice');
    cy.get('input[name="email"]').type('alice@example.com');
    cy.get('button[type="submit"]').click();

    cy.contains('Alice').should('be.visible');
  });

  it('should delete user', () => {
    cy.contains('Alice').parent().find('.delete-btn').click();
    cy.get('.confirm-btn').click();

    cy.contains('Alice').should('not.exist');
  });

  it('should navigate to user details', () => {
    cy.contains('Alice').click();
    cy.url().should('include', '/users/');
    cy.get('.user-details').should('be.visible');
  });
});
```

**Checklist:**

- [ ] Test critical user workflows
- [ ] Test navigation
- [ ] Test form submission
- [ ] Test CRUD operations
- [ ] Test error scenarios
- [ ] Test across browsers (if applicable)

---

## Phase 6: Test Quality

### 6.1 Test Best Practices

- [ ] **Tests are isolated** (no shared mutable state)
  ```typescript
  // ❌ BAD: Shared state
  const testUser = { id: '1', name: 'Test' };

  it('test 1', () => {
    testUser.name = 'Changed';
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

- [ ] **Tests are deterministic** (no random values, no Date.now())
  ```typescript
  // ❌ BAD: Non-deterministic
  it('should set created date', () => {
    const order = service.createOrder();
    expect(order.createdAt).toBe(Date.now());  // ❌ Flaky!
  });

  // ✅ GOOD: Use specific date
  it('should set created date', () => {
    const fixedDate = new Date('2025-01-01');
    jasmine.clock().mockDate(fixedDate);

    const order = service.createOrder();
    expect(order.createdAt).toEqual(fixedDate);
  });
  ```

- [ ] **Tests have descriptive names**
  ```typescript
  // ❌ BAD
  it('works', () => { ... });
  it('test 1', () => { ... });

  // ✅ GOOD
  it('should emit userSelected event when user card is clicked', () => { ... });
  it('should return 404 error when user does not exist', () => { ... });
  ```

- [ ] **Tests follow AAA pattern** (Arrange, Act, Assert)
  ```typescript
  it('should calculate total', () => {
    // Arrange
    const order = { items: [{ price: 10, quantity: 2 }] };

    // Act
    const total = service.calculateTotal(order);

    // Assert
    expect(total).toBe(21.6);
  });
  ```

- [ ] **One assertion per test** (when reasonable)
  ```typescript
  // ✅ GOOD: Multiple related assertions OK
  it('should create user with correct properties', () => {
    const user = service.createUser('Alice', 'alice@example.com');

    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
    expect(user.id).toBeDefined();
  });
  ```

### 6.2 Code Coverage

- [ ] Run coverage report:
  ```bash
  ng test --code-coverage
  ```

- [ ] Check coverage in `coverage/index.html`

- [ ] Identify untested code:
  - Look for red (uncovered) lines
  - Look for yellow (partially covered) branches

- [ ] Add tests for uncovered code

**Coverage Targets:**

```
Services:     >80%
Components:   >70%
Guards:       >90%
Pipes:        >80%
Overall:      >75%
```

---

## Testing Checklist Complete?

- [ ] All services have unit tests (>80% coverage)
- [ ] All components have unit tests (>70% coverage)
- [ ] Critical flows have integration tests
- [ ] Key workflows have E2E tests
- [ ] All tests are passing
- [ ] No flaky tests (tests pass consistently)
- [ ] Tests are isolated (no shared state)
- [ ] Tests are fast (<5 seconds for unit tests)
- [ ] Mock external dependencies
- [ ] Code coverage meets targets

---

## Quick Reference: Test Types

| Test Type | What to Test | Tools | Speed |
|-----------|-------------|-------|-------|
| Unit (Services) | Business logic, calculations, data transformation | Jasmine, HttpClientTestingModule | Fast |
| Unit (Components) | @Input/@Output, rendering, user interactions | Jasmine, TestBed | Fast |
| Integration | Component + Service, data flow | Jasmine, TestBed, real services | Medium |
| E2E | User workflows, navigation, CRUD | Cypress, Protractor | Slow |

---

**Related Checklists:**
- [02-creating-new-component.md](02-creating-new-component.md) - Component architecture
- [03-adding-api-endpoint.md](03-adding-api-endpoint.md) - API testing
- [06-code-review.md](06-code-review.md) - Review guidelines

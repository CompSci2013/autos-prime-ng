# Checklist: Adding an API Endpoint

**Use this checklist when:** Adding a new backend API endpoint and integrating it with the frontend.

**Estimated time:** 2-6 hours (depending on complexity)

---

## Phase 1: Planning

### 1.1 API Design

- [ ] Define endpoint purpose and responsibility
- [ ] Choose HTTP method:
  - [ ] GET (retrieve data, idempotent, cacheable)
  - [ ] POST (create resource, non-idempotent)
  - [ ] PUT (update entire resource, idempotent)
  - [ ] PATCH (partial update, idempotent)
  - [ ] DELETE (remove resource, idempotent)
- [ ] Design URL structure (RESTful):
  ```
  ✅ /api/users/:id              (specific resource)
  ✅ /api/users?role=admin       (filtered collection)
  ✅ /api/users/:id/orders       (nested resource)
  ❌ /api/getUserById?id=123     (not RESTful)
  ```
- [ ] Define request contract:
  - [ ] URL parameters (path params)
  - [ ] Query parameters (filters, pagination, sort)
  - [ ] Request body (for POST/PUT/PATCH)
  - [ ] Required vs optional fields
- [ ] Define response contract:
  - [ ] Success response (200, 201, 204)
  - [ ] Error responses (400, 401, 403, 404, 500)
  - [ ] Response structure (envelope vs direct)
- [ ] Define authentication/authorization requirements
- [ ] Identify data validation rules
- [ ] Consider pagination (for collections)
- [ ] Consider rate limiting needs

### 1.2 Performance Considerations

- [ ] Estimate response time (target: <500ms)
- [ ] Identify expensive operations (DB queries, external APIs)
- [ ] Plan caching strategy:
  - [ ] Server-side caching (Redis, in-memory)
  - [ ] HTTP caching headers (ETag, Cache-Control)
  - [ ] Client-side caching
- [ ] Consider pagination for large datasets
- [ ] Plan database indexes (if applicable)

### 1.3 Documentation

- [ ] Document API in OpenAPI/Swagger specification
- [ ] Include example requests/responses
- [ ] Document error codes and messages
- [ ] Document rate limits and quotas

---

## Phase 2: Backend Implementation

### 2.1 Data Model (if new)

- [ ] Create/update database schema
- [ ] Add database migrations
- [ ] Create TypeScript interfaces/types for models
- [ ] Add validation decorators (class-validator)
- [ ] Add database indexes for query performance

### 2.2 Controller/Route Handler

```typescript
// Example: Express.js controller
import { Request, Response } from 'express';
import { validateRequest } from '../middleware/validation';
import { userSchema } from '../schemas/user.schema';

export class UserController {
  // ✅ Async/await for clean error handling
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;

      // ✅ Validate input
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      // ✅ Delegate business logic to service
      const user = await this.userService.getUserById(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // ✅ Return consistent response structure
      res.status(200).json({
        data: user,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // ✅ Centralized error handling
      this.handleError(error, res);
    }
  }

  private handleError(error: Error, res: Response): void {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
```

**Checklist:**

- [ ] Use async/await (not callbacks)
- [ ] Validate all inputs (path params, query params, body)
- [ ] Return proper HTTP status codes
- [ ] Use consistent response structure
- [ ] Delegate business logic to service layer
- [ ] Implement proper error handling
- [ ] Add request logging
- [ ] Add performance timing logs
- [ ] Type all parameters (no `any`)

### 2.3 Service Layer

```typescript
// ✅ Service contains business logic
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {}

  async getUserById(userId: string): Promise<User | null> {
    // ✅ Data access logic
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return null;
    }

    // ✅ Business logic (transform, enrich, etc.)
    return this.enrichUserData(user);
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    // ✅ Validation
    this.validateUserData(userData);

    // ✅ Business logic
    const user = await this.userRepository.create(userData);

    // ✅ Side effects (email, events, etc.)
    await this.emailService.sendWelcomeEmail(user.email);

    return user;
  }

  private enrichUserData(user: User): User {
    // Transform or add computed fields
    return {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`,
      memberSince: this.calculateMembershipDuration(user.createdAt)
    };
  }
}
```

**Checklist:**

- [ ] Service is independent of HTTP layer (no Request/Response)
- [ ] Service can be reused by other controllers
- [ ] Business logic isolated from data access
- [ ] All methods properly typed
- [ ] Complex logic has unit tests

### 2.4 Validation

- [ ] Add input validation middleware/decorators
- [ ] Validate required fields
- [ ] Validate field types and formats
- [ ] Validate field constraints (min/max, regex)
- [ ] Return clear validation error messages

```typescript
// ✅ Example: Joi validation schema
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(18).max(120),
  role: Joi.string().valid('user', 'admin').default('user')
});

// ✅ Validation middleware
function validateBody(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    req.body = value;
    next();
  };
}
```

### 2.5 Error Handling

- [ ] Handle all error types:
  - [ ] Validation errors (400)
  - [ ] Authentication errors (401)
  - [ ] Authorization errors (403)
  - [ ] Not found errors (404)
  - [ ] Server errors (500)
- [ ] Use centralized error handler
- [ ] Log errors with context (user ID, request ID)
- [ ] Return user-friendly error messages
- [ ] Don't leak sensitive information in errors

### 2.6 Security

- [ ] Add authentication middleware (if required)
- [ ] Add authorization checks (if required)
- [ ] Sanitize user inputs (prevent injection)
- [ ] Use parameterized queries (prevent SQL injection)
- [ ] Validate file uploads (if applicable)
- [ ] Implement rate limiting
- [ ] Add CORS configuration
- [ ] Use HTTPS only (production)

### 2.7 Testing (Backend)

- [ ] Write unit tests for service layer:
  - [ ] Test happy path
  - [ ] Test error scenarios
  - [ ] Test edge cases
  - [ ] Mock external dependencies
- [ ] Write integration tests for endpoint:
  - [ ] Test with valid inputs
  - [ ] Test with invalid inputs
  - [ ] Test authentication/authorization
  - [ ] Test error responses
- [ ] Test with Postman/curl before frontend integration
- [ ] Aim for >80% code coverage

```typescript
// ✅ Example: Unit test for service
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      create: jest.fn()
    } as any;

    service = new UserService(mockRepository);
  });

  it('should return user by ID', async () => {
    const mockUser = { id: '1', name: 'Test' };
    mockRepository.findById.mockResolvedValue(mockUser);

    const result = await service.getUserById('1');

    expect(result).toEqual(mockUser);
    expect(mockRepository.findById).toHaveBeenCalledWith('1');
  });

  it('should return null for non-existent user', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const result = await service.getUserById('999');

    expect(result).toBeNull();
  });
});
```

---

## Phase 3: Frontend Integration

### 3.1 TypeScript Models/Interfaces

- [ ] Create TypeScript interfaces for request/response
- [ ] Place models in shared/models directory
- [ ] Match backend response structure exactly
- [ ] Use proper types (not `any`)

```typescript
// ✅ Frontend models
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  createdAt: string;  // ISO date string
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: string[];
}
```

### 3.2 HTTP Service Method

- [ ] Add method to Angular service
- [ ] Use HttpClient for requests
- [ ] Type request and response
- [ ] Add error handling
- [ ] Add request/response interceptors (if needed)

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = '/api/users';

  constructor(private http: HttpClient) {}

  // ✅ Typed request and response
  getUser(userId: string): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${userId}`).pipe(
      map(response => response.data),  // ✅ Extract data from envelope
      retry(2),  // ✅ Retry transient failures
      catchError(this.handleError)  // ✅ Handle errors
    );
  }

  // ✅ Query parameters
  getUsers(filters: UserFilters): Observable<User[]> {
    const params = new HttpParams()
      .set('role', filters.role || '')
      .set('page', filters.page?.toString() || '1')
      .set('size', filters.size?.toString() || '20');

    return this.http.get<ApiResponse<User[]>>(this.apiUrl, { params }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  // ✅ POST request with body
  createUser(userData: CreateUserRequest): Observable<User> {
    return this.http.post<ApiResponse<User>>(this.apiUrl, userData).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  // ✅ Centralized error handling
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
    }

    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
```

**Checklist:**

- [ ] Method returns Observable
- [ ] Request and response properly typed
- [ ] Uses HttpParams for query parameters
- [ ] Implements retry logic for transient failures
- [ ] Implements error handling
- [ ] Logs errors appropriately
- [ ] No `any` types used

### 3.3 Request Deduplication (Critical!)

**Problem:** Multiple components subscribing to same API call creates duplicate HTTP requests.

**Solution:** Implement request deduplication/caching.

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private requestCache = new Map<string, Observable<any>>();

  getUserWithCache(userId: string): Observable<User> {
    const cacheKey = `user-${userId}`;

    // ✅ Check cache first
    if (!this.requestCache.has(cacheKey)) {
      // ✅ Create new request
      const request$ = this.http.get<ApiResponse<User>>(`${this.apiUrl}/${userId}`).pipe(
        map(response => response.data),
        shareReplay(1),  // ✅ Share result with all subscribers
        finalize(() => this.requestCache.delete(cacheKey))  // ✅ Clean up after complete
      );

      this.requestCache.set(cacheKey, request$);
    }

    return this.requestCache.get(cacheKey)!;
  }
}
```

**Checklist:**

- [ ] Use Map to cache in-flight requests
- [ ] Use shareReplay(1) to share HTTP response
- [ ] Clean up cache with finalize()
- [ ] Create cache key from request parameters
- [ ] Invalidate cache when data changes

### 3.4 Request Coordinator Pattern (Advanced)

For complex applications, create a centralized request coordinator:

```typescript
@Injectable({ providedIn: 'root' })
export class RequestCoordinatorService {
  private pendingRequests = new Map<string, Observable<any>>();

  executeRequest<T>(
    requestKey: string,
    requestFn: () => Observable<T>,
    options?: { retries?: number; cacheDuration?: number }
  ): Observable<T> {
    // ✅ Deduplicate requests
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    // ✅ Create new request
    const request$ = requestFn().pipe(
      retry(options?.retries || 2),
      shareReplay(1),
      finalize(() => {
        // ✅ Clean up after delay (allow caching)
        setTimeout(() => {
          this.pendingRequests.delete(requestKey);
        }, options?.cacheDuration || 1000);
      })
    );

    this.pendingRequests.set(requestKey, request$);
    return request$;
  }
}
```

**Usage:**

```typescript
// ✅ Component uses RequestCoordinator
this.requestCoordinator.executeRequest(
  'users-list',
  () => this.userService.getUsers(filters),
  { retries: 3, cacheDuration: 5000 }
).subscribe(users => this.users = users);
```

**Checklist:**

- [ ] Implement RequestCoordinatorService (if needed)
- [ ] Use for all API calls that might be duplicated
- [ ] Configure retry and cache options
- [ ] Monitor network tab to verify no duplicate requests

### 3.5 Loading and Error States

- [ ] Add loading state management:
  ```typescript
  isLoading = false;

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: users => this.users = users,
      error: error => this.handleError(error)
    });
  }
  ```
- [ ] Add error state management:
  ```typescript
  errorMessage: string | null = null;

  handleError(error: Error): void {
    this.errorMessage = error.message;
    // Show toast notification
    this.toastService.error(error.message);
  }
  ```
- [ ] Display loading spinner in UI
- [ ] Display error message in UI
- [ ] Add retry button for failed requests

### 3.6 Testing (Frontend)

- [ ] Mock HttpClient in tests:
  ```typescript
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();  // ✅ Verify no outstanding requests
  });

  it('should fetch user by ID', () => {
    const mockUser = { id: '1', name: 'Test' };

    service.getUser('1').subscribe(user => {
      expect(user).toEqual(mockUser.data);
    });

    const req = httpMock.expectOne('/api/users/1');
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockUser });  // ✅ Mock response
  });
  ```
- [ ] Test success scenarios
- [ ] Test error scenarios (404, 500)
- [ ] Test request deduplication
- [ ] Verify no duplicate HTTP calls in tests

---

## Phase 4: Integration Testing

### 4.1 End-to-End Testing

- [ ] Test complete flow: UI → Frontend → Backend → DB
- [ ] Test with real backend (dev environment)
- [ ] Test error scenarios:
  - [ ] Network timeout
  - [ ] 400 Bad Request
  - [ ] 401 Unauthorized
  - [ ] 404 Not Found
  - [ ] 500 Server Error
- [ ] Test concurrent requests (deduplication)
- [ ] Test browser refresh (state persistence)

### 4.2 Performance Testing

- [ ] Monitor response times
- [ ] Check for N+1 query problems
- [ ] Verify request deduplication works
- [ ] Test with realistic data volumes
- [ ] Profile database queries

---

## Common Anti-Patterns to Avoid

### ❌ Don't: Make Direct HTTP Calls from Components

```typescript
// ❌ BAD: Component makes HTTP call directly
export class UserListComponent {
  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get('/api/users').subscribe(users => {
      this.users = users;
    });
  }
}
```

### ✅ Do: Use Service Layer

```typescript
// ✅ GOOD: Component uses service
export class UserListComponent {
  users$ = this.userService.getUsers();

  constructor(private userService: UserService) {}
}
```

### ❌ Don't: Allow Duplicate Requests

```typescript
// ❌ BAD: Each subscription makes new HTTP request
getData(): Observable<Data> {
  return this.http.get('/api/data');
  // Calling this 3 times = 3 HTTP requests!
}
```

### ✅ Do: Share Requests

```typescript
// ✅ GOOD: Shared request
private data$ = this.http.get('/api/data').pipe(shareReplay(1));

getData(): Observable<Data> {
  return this.data$;
  // Calling this 3 times = 1 HTTP request!
}
```

### ❌ Don't: Use `any` Type

```typescript
// ❌ BAD: No type safety
getUser(id: string): Observable<any> {
  return this.http.get(`/api/users/${id}`);
}
```

### ✅ Do: Use Proper Types

```typescript
// ✅ GOOD: Type-safe
getUser(id: string): Observable<User> {
  return this.http.get<User>(`/api/users/${id}`);
}
```

### ❌ Don't: Ignore Errors

```typescript
// ❌ BAD: No error handling
getData(): Observable<Data> {
  return this.http.get('/api/data');
}
```

### ✅ Do: Handle Errors

```typescript
// ✅ GOOD: Error handling
getData(): Observable<Data> {
  return this.http.get<Data>('/api/data').pipe(
    retry(2),
    catchError(error => {
      console.error('Error fetching data:', error);
      return throwError(() => new Error('Failed to fetch data'));
    })
  );
}
```

---

## Checklist Complete?

Before marking API endpoint as "Done":

- [ ] Backend endpoint implemented and tested
- [ ] Frontend service method implemented
- [ ] TypeScript models/interfaces defined
- [ ] Request deduplication implemented
- [ ] Error handling implemented (frontend and backend)
- [ ] Loading states managed
- [ ] Unit tests written (backend and frontend)
- [ ] Integration tests passing
- [ ] No duplicate HTTP requests in network tab
- [ ] API documented in Swagger/OpenAPI
- [ ] Code reviewed and approved

---

**Related Checklists:**
- [01-adding-new-feature.md](01-adding-new-feature.md) - Feature implementation
- [07-testing.md](07-testing.md) - Testing strategies

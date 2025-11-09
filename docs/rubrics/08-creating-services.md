# Checklist: Creating Services

**Use this checklist when:**
- Creating a new Angular service
- Planning service architecture
- Implementing logging, error handling, or HTTP interceptors
- Auditing existing services for quality

**Estimated time:** 30 minutes - 4 hours (depending on complexity)

---

## Phase 1: When to Create a Service

### 1.1 Service Decision Tree

**Should you create a new service? Ask:**

- [ ] **Does this logic need to be shared across multiple components?**
  - ✅ Yes → Create service
  - ❌ No → Keep in component (if truly component-specific)

- [ ] **Does this involve business logic (calculations, validations, transformations)?**
  - ✅ Yes → Create service
  - ❌ No → Keep in component (if pure presentation)

- [ ] **Does this make HTTP calls or interact with APIs?**
  - ✅ Yes → Create service
  - ❌ No → Consider if component can handle it

- [ ] **Does this manage state that needs to be shared?**
  - ✅ Yes → Create state service
  - ❌ No → Component-local state is OK

- [ ] **Does this provide utility functions (logging, formatting, etc.)?**
  - ✅ Yes → Create utility service
  - ❌ No → Consider pipe instead

### 1.2 Common Service Categories

| Service Type | Purpose | Example | When to Create |
|--------------|---------|---------|---------------|
| **Data Service** | API integration, HTTP calls | `UserService`, `OrderService` | Need to fetch/modify data |
| **State Service** | Manage app/feature state | `AuthStateService`, `CartStateService` | Need shared state |
| **Utility Service** | Helper functions | `DateUtilService`, `ValidationService` | Reusable utilities |
| **Logging Service** | Application logging | `LoggingService` | Centralized logging |
| **Notification Service** | User notifications | `ToastService`, `AlertService` | User feedback |
| **Storage Service** | localStorage/sessionStorage | `StorageService` | Persist data |
| **Interceptor** | HTTP request/response handling | `AuthInterceptor`, `ErrorInterceptor` | Cross-cutting HTTP concerns |
| **Guard** | Route protection | `AuthGuard`, `RoleGuard` | Route authorization |
| **Resolver** | Pre-fetch route data | `UserResolver` | Load data before route |

---

## Phase 2: Service Design Principles

### 2.1 Single Responsibility Principle

**✅ DO: Each service has ONE clear purpose**

```typescript
// ✅ GOOD: Focused service
@Injectable({ providedIn: 'root' })
export class UserService {
  // Only user-related operations
  getUser(id: string): Observable<User> { }
  createUser(user: User): Observable<User> { }
  updateUser(id: string, user: User): Observable<User> { }
  deleteUser(id: string): Observable<void> { }
}

// ✅ GOOD: Separate authentication service
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Only authentication operations
  login(credentials: Credentials): Observable<AuthToken> { }
  logout(): void { }
  refreshToken(): Observable<AuthToken> { }
  isAuthenticated(): boolean { }
}
```

**❌ DON'T: Create "kitchen sink" services**

```typescript
// ❌ BAD: Service does too much
@Injectable({ providedIn: 'root' })
export class UtilService {
  // User operations
  getUser(id: string) { }

  // Date formatting
  formatDate(date: Date) { }

  // Validation
  validateEmail(email: string) { }

  // HTTP helpers
  handleError(error: any) { }

  // Logging
  log(message: string) { }
}
```

**Fix:** Split into focused services: `UserService`, `DateUtilService`, `ValidationService`, `ErrorHandlingService`, `LoggingService`

### 2.2 Dependency Injection

```typescript
// ✅ GOOD: Use providedIn: 'root' for singletons
@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(
    private http: HttpClient,
    private logger: LoggingService
  ) {}
}

// ✅ GOOD: Inject dependencies, don't create them
export class OrderService {
  constructor(
    private http: HttpClient,
    private userService: UserService,  // ✅ Injected
    private logger: LoggingService     // ✅ Injected
  ) {}
}

// ❌ BAD: Creating dependencies with 'new'
export class OrderService {
  private userService = new UserService();  // ❌ Don't do this!
  private logger = new LoggingService();    // ❌ Hard to test
}
```

### 2.3 Service State Management

**Option 1: Stateless Service (Preferred for data services)**

```typescript
// ✅ GOOD: Stateless - no internal state
@Injectable({ providedIn: 'root' })
export class UserApiService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`/api/users/${id}`);
  }
}
```

**Option 2: Stateful Service with BehaviorSubject (For shared state)**

```typescript
// ✅ GOOD: Stateful - uses BehaviorSubject
@Injectable({ providedIn: 'root' })
export class UserStateService {
  private usersSubject = new BehaviorSubject<User[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // ✅ Expose observables, not subjects
  readonly users$ = this.usersSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor(private apiService: UserApiService) {}

  loadUsers(): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    this.apiService.getUsers().subscribe({
      next: users => {
        this.usersSubject.next(users);
        this.loadingSubject.next(false);
      },
      error: error => {
        this.errorSubject.next(error.message);
        this.loadingSubject.next(false);
      }
    });
  }

  addUser(user: User): void {
    const currentUsers = this.usersSubject.value;
    this.usersSubject.next([...currentUsers, user]);
  }
}
```

**Checklist:**

- [ ] Use BehaviorSubject for state that has a current value
- [ ] Expose observables (asObservable()), not subjects
- [ ] Make subjects private
- [ ] Provide methods to update state (don't expose subjects)
- [ ] Include loading and error state

---

## Phase 3: Logging Service

### 3.1 Create Logging Service

```typescript
export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  None = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
  stack?: string;
}

@Injectable({ providedIn: 'root' })
export class LoggingService {
  private logLevel: LogLevel = LogLevel.Info;
  private logs: LogEntry[] = [];

  constructor() {
    // Set log level from environment
    this.logLevel = environment.production ? LogLevel.Warn : LogLevel.Debug;
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.Debug, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.Info, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.Warn, message, data);
  }

  error(message: string, error?: any): void {
    const data = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    this.log(LogLevel.Error, message, data);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.logLevel) {
      return;  // Don't log below configured level
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
      stack: level === LogLevel.Error ? new Error().stack : undefined
    };

    // Store log entry
    this.logs.push(entry);

    // Console output (dev only)
    if (!environment.production) {
      this.logToConsole(entry);
    }

    // Send critical errors to remote logging (production)
    if (environment.production && level === LogLevel.Error) {
      this.sendToRemoteLogger(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${LogLevel[entry.level]}] ${timestamp}`;

    switch (entry.level) {
      case LogLevel.Debug:
        console.debug(prefix, entry.message, entry.data);
        break;
      case LogLevel.Info:
        console.info(prefix, entry.message, entry.data);
        break;
      case LogLevel.Warn:
        console.warn(prefix, entry.message, entry.data);
        break;
      case LogLevel.Error:
        console.error(prefix, entry.message, entry.data);
        if (entry.stack) {
          console.error('Stack:', entry.stack);
        }
        break;
    }
  }

  private sendToRemoteLogger(entry: LogEntry): void {
    // Send to remote logging service (Sentry, LogRocket, etc.)
    // Example: this.http.post('/api/logs', entry).subscribe();
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}
```

**Usage:**

```typescript
export class UserService {
  constructor(
    private http: HttpClient,
    private logger: LoggingService
  ) {}

  getUser(id: string): Observable<User> {
    this.logger.debug('Fetching user', { id });

    return this.http.get<User>(`/api/users/${id}`).pipe(
      tap(user => this.logger.info('User fetched', { user })),
      catchError(error => {
        this.logger.error('Failed to fetch user', error);
        return throwError(() => error);
      })
    );
  }
}
```

**Checklist:**

- [ ] Support multiple log levels (Debug, Info, Warn, Error)
- [ ] Include timestamps
- [ ] Include context data
- [ ] Different output for dev vs production
- [ ] Send errors to remote logger (production)
- [ ] Structured log format
- [ ] Configurable log level

---

## Phase 4: HTTP Interceptors

### 4.1 Error Interceptor

```typescript
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private logger: LoggingService,
    private toastService: ToastService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Log the error
        this.logger.error('HTTP Error', {
          url: req.url,
          method: req.method,
          status: error.status,
          message: error.message
        });

        // Handle different error types
        let userMessage = 'An error occurred';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          userMessage = error.error.message;
        } else {
          // Server-side error
          switch (error.status) {
            case 400:
              userMessage = 'Invalid request. Please check your input.';
              break;
            case 401:
              userMessage = 'You are not authenticated. Please log in.';
              this.router.navigate(['/login']);
              break;
            case 403:
              userMessage = 'You do not have permission for this action.';
              break;
            case 404:
              userMessage = 'The requested resource was not found.';
              break;
            case 500:
              userMessage = 'Server error. Please try again later.';
              break;
            default:
              userMessage = error.error?.message || 'An unexpected error occurred.';
          }
        }

        // Show user-friendly message
        this.toastService.error(userMessage);

        // Re-throw error
        return throwError(() => error);
      })
    );
  }
}
```

**Register in app.module.ts:**

```typescript
providers: [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: ErrorInterceptor,
    multi: true
  }
]
```

### 4.2 Auth Interceptor (Token Injection)

```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get token from auth service
    const token = this.authService.getToken();

    // Clone request and add Authorization header
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req);
  }
}
```

### 4.3 Loading Interceptor

```typescript
@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private activeRequests = 0;

  constructor(private loadingService: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Increment active requests
    if (this.activeRequests === 0) {
      this.loadingService.show();
    }
    this.activeRequests++;

    return next.handle(req).pipe(
      finalize(() => {
        // Decrement active requests
        this.activeRequests--;
        if (this.activeRequests === 0) {
          this.loadingService.hide();
        }
      })
    );
  }
}
```

### 4.4 Caching Interceptor

```typescript
@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, HttpResponse<any>>();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle(req);
    }

    // Check cache
    const cachedResponse = this.cache.get(req.url);
    if (cachedResponse) {
      return of(cachedResponse.clone());
    }

    // Make request and cache response
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          this.cache.set(req.url, event.clone());
        }
      })
    );
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

**Checklist:**

- [ ] Error interceptor for centralized error handling
- [ ] Auth interceptor for token injection
- [ ] Loading interceptor for global loading state
- [ ] Caching interceptor for GET requests (optional)
- [ ] Register interceptors in providers
- [ ] Use `multi: true` when registering

---

## Phase 5: Specialized Services

### 5.1 Storage Service

```typescript
@Injectable({ providedIn: 'root' })
export class StorageService {
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
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded();
      }
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }

  private handleQuotaExceeded(): void {
    // Clear old data or notify user
    console.warn('localStorage quota exceeded');
  }
}
```

### 5.2 Notification/Toast Service

```typescript
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  private idCounter = 0;

  success(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration = 4000): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration = 3000): void {
    this.show(message, 'info', duration);
  }

  private show(message: string, type: Toast['type'], duration: number): void {
    const toast: Toast = {
      id: `toast-${this.idCounter++}`,
      message,
      type,
      duration
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => this.remove(toast.id), duration);
    }
  }

  remove(id: string): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
  }

  clear(): void {
    this.toastsSubject.next([]);
  }
}
```

### 5.3 Caching Service

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;  // Time to live in milliseconds
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMinutes = 5): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    };
    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const data = this.get(key);
    return data !== null;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    });
  }
}
```

**Usage with HTTP:**

```typescript
export class UserService {
  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}

  getUser(id: string): Observable<User> {
    const cacheKey = `user-${id}`;

    // Check cache first
    const cached = this.cacheService.get<User>(cacheKey);
    if (cached) {
      return of(cached);
    }

    // Fetch from API and cache
    return this.http.get<User>(`/api/users/${id}`).pipe(
      tap(user => this.cacheService.set(cacheKey, user, 5))  // Cache for 5 minutes
    );
  }
}
```

---

## Phase 6: Guards and Resolvers

### 6.1 Auth Guard

```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    // Redirect to login with return URL
    return this.router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }
}
```

**Usage in routing:**

```typescript
const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]  // ✅ Protected route
  }
];
```

### 6.2 Role Guard

```typescript
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const requiredRoles = route.data['roles'] as string[];
    const userRoles = this.authService.getUserRoles();

    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (hasRole) {
      return true;
    }

    // Redirect to unauthorized page
    return this.router.createUrlTree(['/unauthorized']);
  }
}
```

**Usage:**

```typescript
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: ['admin'] }  // ✅ Only admins
}
```

### 6.3 Resolver

```typescript
@Injectable({ providedIn: 'root' })
export class UserResolver implements Resolve<User> {
  constructor(private userService: UserService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<User> {
    const userId = route.paramMap.get('id')!;
    return this.userService.getUser(userId);
  }
}
```

**Usage:**

```typescript
{
  path: 'users/:id',
  component: UserDetailComponent,
  resolve: { user: UserResolver }  // ✅ Data pre-fetched
}

// In component:
export class UserDetailComponent implements OnInit {
  user: User;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.user = this.route.snapshot.data['user'];  // ✅ Already loaded
  }
}
```

---

## Service Quality Checklist

### Before Merge:

- [ ] **Single Responsibility** - Service has one clear purpose
- [ ] **Dependency Injection** - Uses constructor injection
- [ ] **Type Safety** - All methods properly typed (no `any`)
- [ ] **Error Handling** - Observables have catchError
- [ ] **State Management** - Uses BehaviorSubject if stateful
- [ ] **Observables Exposed** - Subjects are private, observables public
- [ ] **Logging** - Uses logging service (not console.log)
- [ ] **Documentation** - Public methods have JSDoc comments
- [ ] **Unit Tests** - >80% code coverage
- [ ] **No Memory Leaks** - Subscriptions cleaned up

### Good Service Smells:

- ✅ Clear, descriptive name (`UserService`, not `UtilService`)
- ✅ Methods return Observables (reactive)
- ✅ Methods are pure or have clear side effects
- ✅ Mocked easily in tests
- ✅ Can be reused in different contexts

### Bad Service Smells:

- ❌ Generic names (`HelperService`, `UtilsService`)
- ❌ Does multiple unrelated things
- ❌ Difficult to test (too many dependencies)
- ❌ Uses `new` keyword to create dependencies
- ❌ Directly manipulates DOM
- ❌ Has many public properties (should expose observables)

---

## Quick Reference: Service Patterns

| Pattern | When to Use | Example |
|---------|------------|---------|
| Data Service | API calls, CRUD operations | `UserService`, `OrderService` |
| State Service | Shared state management | `AuthStateService`, `CartStateService` |
| Facade Service | Coordinate multiple services | `CheckoutFacadeService` |
| Utility Service | Pure functions, helpers | `DateUtilService`, `ValidationService` |
| Interceptor | Cross-cutting HTTP concerns | `AuthInterceptor`, `ErrorInterceptor` |
| Guard | Route protection | `AuthGuard`, `RoleGuard` |
| Resolver | Pre-fetch route data | `UserResolver`, `ProductResolver` |

---

**Related Checklists:**
- [03-adding-api-endpoint.md](03-adding-api-endpoint.md) - API integration
- [04-state-management-integration.md](04-state-management-integration.md) - State services
- [06-code-review.md](06-code-review.md) - Service review guidelines
- [07-testing.md](07-testing.md) - Service testing

# NON-FUNCTIONAL REQUIREMENTS SPECIFICATION
## Performance, Security, Accessibility, and Quality Standards
### Branch: experiment/resource-management-service

**Status**: Working Draft
**Date**: 2025-11-15

---

## OVERVIEW

This specification defines the quality attributes, performance targets, security requirements, and operational standards for the Vehicle Discovery Platform. These requirements ensure the application delivers a reliable, performant, secure, and accessible user experience.

**Key Areas**:
- Performance & Bundle Size
- Browser Compatibility
- Accessibility (WCAG 2.1)
- Security Requirements
- Scalability & Capacity
- Error Handling Standards
- Logging & Monitoring
- Code Quality Standards
- Testing Requirements

---

## 1. PERFORMANCE REQUIREMENTS

### 1.1 Bundle Size Targets

**Initial Bundle Size** (Production Build):

```typescript
// From angular.json configuration
{
  "type": "initial",
  "maximumWarning": "5mb",   // Triggers build warning
  "maximumError": "10mb"     // Fails build
}
```

**Component Style Budgets**:

```typescript
{
  "type": "anyComponentStyle",
  "maximumWarning": "10kb",  // Per-component CSS limit (warning)
  "maximumError": "20kb"     // Per-component CSS limit (error)
}
```

**Current Bundle Composition** (Typical Production Build):

| Bundle | Size (Approx) | Purpose |
|--------|---------------|---------|
| main.js | 2.5-3.0 MB | Application code |
| vendor.js | 1.5-2.0 MB | Angular + PrimeNG + Plotly |
| polyfills.js | 100-150 KB | Browser compatibility |
| runtime.js | 10-20 KB | Webpack runtime |
| styles.css | 300-400 KB | Global + PrimeNG styles |

**Total**: Typically 4.5-5.5 MB (within 5 MB warning threshold)

### 1.2 Load Time Targets

**Initial Page Load** (Production, from blank cache):
- **Target**: < 3 seconds on broadband (10 Mbps+)
- **Maximum Acceptable**: < 5 seconds
- **Measured At**: First Contentful Paint (FCP)

**Time to Interactive** (TTI):
- **Target**: < 4 seconds
- **Maximum Acceptable**: < 6 seconds

**Subsequent Navigation** (within app):
- **Target**: < 500ms
- **Maximum Acceptable**: < 1 second

### 1.3 Runtime Performance

**Table Rendering**:
- **Client-Side Pagination**: Render 10,000+ rows without lag
- **Page Change**: < 100ms to render new page of data
- **Sort Operation**: < 200ms for client-side sort
- **Filter Operation**: < 300ms for client-side filter

**Chart Rendering** (Plotly.js):
- **Initial Render**: < 1 second for 1000 data points
- **Update Animation**: 60 FPS (16.67ms per frame)
- **Resize**: < 200ms to recalculate layout

**State Updates**:
- **URL Update**: < 50ms (synchronous)
- **Data Fetch**: Depends on API (see API SLAs)
- **BroadcastChannel Message**: < 10ms (cross-window sync)

### 1.4 Memory Usage

**Baseline** (Application loaded, no data):
- **Target**: < 50 MB heap size
- **Maximum Acceptable**: < 100 MB

**With Data** (typical usage):
- **Target**: < 200 MB heap size
- **Maximum Acceptable**: < 500 MB

**Memory Leaks**:
- **Requirement**: No detectable memory leaks after 1 hour of usage
- **Test**: Navigate between routes 100 times, heap size should stabilize

### 1.5 Change Detection Optimization

**Strategy**: OnPush change detection for all major components

```typescript
@Component({
  selector: 'app-discover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

**Requirements**:
- All components displaying large datasets MUST use OnPush
- Manual `cdr.markForCheck()` required after async updates
- Immutable update patterns for state changes

### 1.6 Network Optimization

**HTTP Caching**:
- **Cache Duration**: 5 minutes (configurable per endpoint)
- **Cache Key**: URL + query parameters
- **Storage**: In-memory Map<string, CachedResponse>

**Request Deduplication**:
- Identical concurrent requests → Single HTTP call
- Subsequent callers share same Observable

**Connection Pooling**:
- Browser default (6 concurrent connections per domain)
- No explicit configuration needed

---

## 2. BROWSER COMPATIBILITY

### 2.1 Supported Browsers

From [.browserslistrc](file:///home/odin/projects/autos-prime-ng/frontend/.browserslistrc):

```
last 1 Chrome version
last 1 Firefox version
last 2 Edge major versions
last 2 Safari major versions
last 2 iOS major versions
Firefox ESR
```

**Minimum Browser Versions** (as of 2025):

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 130+ | Current - 1 version |
| Firefox | 132+ | Current - 1 version |
| Edge | 130+ | Last 2 major versions |
| Safari | 17+ | Last 2 major versions |
| iOS Safari | 17+ | Last 2 major versions |
| Firefox ESR | 128+ | Extended Support Release |

### 2.2 Polyfills

**Included Polyfills** (src/polyfills.ts):
- **zone.js** (Angular requirement)
- **core-js/proposals/reflect-metadata** (decorator support)
- **BroadcastChannel** (if not natively supported - to be added)

**NOT Supported**:
- Internet Explorer (any version)
- Opera Mini
- UC Browser
- Legacy Android browsers (< Android 10)

### 2.3 Feature Detection

**Required Features**:

| Feature | Detection Method | Fallback |
|---------|------------------|----------|
| BroadcastChannel | `typeof BroadcastChannel !== 'undefined'` | Disable pop-out feature |
| localStorage | `typeof Storage !== 'undefined'` | In-memory state only |
| window.open() | `typeof window.open === 'function'` | Disable pop-out feature |
| CSS Grid | `@supports (display: grid)` | Flexbox fallback |
| ES6 Modules | Implicit (build target) | N/A (required) |

### 2.4 Responsive Design

**Breakpoints**:

```scss
$breakpoint-mobile: 576px;
$breakpoint-tablet: 768px;
$breakpoint-desktop: 992px;
$breakpoint-wide: 1200px;
```

**Minimum Viewport**:
- **Width**: 320px (iPhone SE)
- **Height**: 568px

**Target Viewports**:
- **Desktop**: 1920x1080 (primary)
- **Laptop**: 1366x768
- **Tablet**: 768x1024
- **Mobile**: 375x667 (best effort, limited support)

---

## 3. ACCESSIBILITY (WCAG 2.1)

### 3.1 Conformance Level

**Target**: WCAG 2.1 Level AA

**Exceptions**:
- Charts (Plotly.js) - Level A compliance only
- Complex drag-drop interfaces - Keyboard alternatives required

### 3.2 Keyboard Navigation

**Requirements**:

| Feature | Keyboard Support | Notes |
|---------|------------------|-------|
| All interactive elements | Tab, Enter, Space | Standard navigation |
| Dialogs | Esc to close | PrimeNG default |
| Tables | Arrow keys | Row navigation |
| Charts | Tab to legend items | Plotly.js default |
| Drag-drop panels | Keyboard alternative | Toolbar with Up/Down buttons |
| Pop-out windows | Keyboard shortcut | Ctrl+Shift+P (to be implemented) |

**Tab Order**:
- Follows logical DOM order
- No `tabindex > 0` (anti-pattern)
- Skip links for repeated navigation

### 3.3 Screen Reader Support

**Target Screen Readers**:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)

**ARIA Requirements**:

```html
<!-- Tables -->
<table role="table" aria-label="Vehicle Results">
  <thead role="rowgroup">
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">Manufacturer</th>
    </tr>
  </thead>
</table>

<!-- Dialogs -->
<p-dialog
  role="dialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description">
</p-dialog>

<!-- Charts -->
<div
  role="img"
  aria-label="Manufacturer distribution chart showing 45% Ford, 30% Chevrolet...">
  <plotly-chart></plotly-chart>
</div>

<!-- Loading states -->
<div role="status" aria-live="polite" aria-busy="true">
  Loading vehicle data...
</div>
```

### 3.4 Color Contrast

**Minimum Contrast Ratios** (WCAG 2.1 Level AA):

| Element Type | Minimum Ratio | Example |
|--------------|---------------|---------|
| Normal text | 4.5:1 | Body text on background |
| Large text (18pt+) | 3:1 | Headings |
| UI components | 3:1 | Buttons, form borders |
| Graphical objects | 3:1 | Chart colors |

**Theme Colors** (Material Red - PrimeNG):
- **Primary**: `#D32F2F` (Red 700) on white = 5.1:1 ✅
- **Text**: `#212121` (Grey 900) on white = 16.1:1 ✅
- **Secondary**: `#757575` (Grey 600) on white = 4.6:1 ✅

### 3.5 Text Alternatives

**Requirements**:
- All images: `alt` attribute (empty for decorative)
- All icons: `aria-label` or visually-hidden text
- All charts: Text description in `aria-label`
- All form inputs: `<label>` or `aria-label`

### 3.6 Focus Indicators

**Visible Focus**:
- Minimum 2px outline
- High contrast color (not browser default blue)
- Never `outline: none` without custom focus style

```scss
button:focus-visible {
  outline: 2px solid #D32F2F;
  outline-offset: 2px;
}
```

---

## 4. SECURITY REQUIREMENTS

### 4.1 HTTP Security

**HTTPS Enforcement**:
- All production traffic MUST use HTTPS
- HTTP requests automatically upgraded to HTTPS
- HSTS header: `max-age=31536000; includeSubDomains`

**CORS Configuration**:
```typescript
// Backend CORS headers
Access-Control-Allow-Origin: https://autos.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 3600
```

### 4.2 Content Security Policy (CSP)

**Recommended CSP Header**:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://autos.minilab;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**Notes**:
- `'unsafe-inline'` required for Angular and PrimeNG inline styles
- `'unsafe-eval'` required for Plotly.js (evaluates chart configs)
- Tighten in future releases

### 4.3 XSS Protection

**Angular Built-In Protections**:
- Automatic HTML escaping in templates
- DomSanitizer for user-generated content
- No `innerHTML` usage (use `[textContent]` instead)

**Manual Sanitization**:

```typescript
import { DomSanitizer } from '@angular/platform-browser';

// Sanitize user input before rendering
const safe = this.sanitizer.sanitize(SecurityContext.HTML, userInput);
```

**Prohibited Patterns**:
- ❌ `element.innerHTML = userInput`
- ❌ `bypassSecurityTrustHtml()` on user input
- ❌ `eval()` on user data
- ❌ `new Function(userInput)`

### 4.4 CSRF Protection

**Token-Based CSRF**:
```typescript
// HTTP Interceptor adds CSRF token
intercept(req: HttpRequest<any>, next: HttpHandler) {
  const csrfToken = this.getCsrfToken();
  const cloned = req.clone({
    headers: req.headers.set('X-CSRF-Token', csrfToken)
  });
  return next.handle(cloned);
}
```

**Cookie Settings**:
```
Set-Cookie: XSRF-TOKEN=...; SameSite=Strict; Secure; HttpOnly
```

### 4.5 Authentication & Authorization

**Authentication**:
- JWT tokens stored in `httpOnly` cookies (NOT localStorage)
- Token expiration: 1 hour
- Refresh token rotation

**Authorization**:
- Role-based access control (RBAC)
- Route guards for protected pages
- Component-level permission checks

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRole = route.data['role'];
    return this.authService.hasRole(requiredRole);
  }
}
```

### 4.6 Sensitive Data Handling

**URL Parameters**:
- ✅ Vehicle filters (manufacturer, model, year) - Safe to expose
- ❌ User IDs, session tokens - NEVER in URL
- ❌ API keys, secrets - NEVER client-side

**localStorage**:
- ✅ Panel layout preferences
- ✅ Column visibility settings
- ❌ Authentication tokens
- ❌ Personal user data

**Logging**:
- ❌ NEVER log passwords, tokens, or PII
- ✅ Log sanitized error messages
- ✅ Log request URLs (without sensitive params)

---

## 5. SCALABILITY & CAPACITY

### 5.1 Data Volume Limits

**Frontend Limits**:

| Data Type | Client-Side Mode | Server-Side Mode | Notes |
|-----------|------------------|------------------|-------|
| Table rows | 10,000 | Unlimited | Pagination required |
| Picker options | 5,000 | 100,000+ | Server-side search |
| Chart data points | 1,000 | N/A | Plotly.js performance limit |
| Concurrent filters | 10 | 10 | UI becomes cluttered beyond this |
| Active highlights | 5 | 5 | Visual clarity limit |

**Backend Limits** (API):
- Maximum query size: 10,000 rows per request
- Maximum page size: 1,000 rows
- Query timeout: 30 seconds
- Connection pool: 20 connections

### 5.2 Concurrent Users

**Target Capacity**:
- **Concurrent Users**: 100 (simultaneous active users)
- **Peak Load**: 500 requests/minute
- **Average Session Duration**: 15 minutes

**Resource Scaling** (Backend):
- Horizontal scaling: Add more API server instances
- Database connection pooling: 20 connections per instance
- Cache layer: Redis for shared cache

### 5.3 Caching Strategy

**Frontend Cache** (RequestCoordinatorService):
- **TTL**: 5 minutes (default)
- **Max Size**: 100 entries
- **Eviction**: LRU (Least Recently Used)
- **Storage**: In-memory only (lost on page refresh)

**Backend Cache**:
- **Static Data**: 1 hour (manufacturer list, body classes)
- **Dynamic Data**: 5 minutes (vehicle counts, statistics)
- **User Data**: No caching (always fresh)

**Cache Invalidation**:
- Time-based expiration (TTL)
- Manual invalidation on data updates
- Versioned API endpoints (`/api/v1/...`)

---

## 6. ERROR HANDLING STANDARDS

### 6.1 HTTP Error Handling

**Error Interceptor** (Centralized):

```typescript
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', {
          url: req.url,
          method: req.method,
          status: error.status,
          message: error.message
        });

        this.errorNotification.handleHttpError(error);
        return throwError(() => error);
      })
    );
  }
}
```

**Error Categorization**:

| Status Code | Category | User Message | Action |
|-------------|----------|--------------|--------|
| 400 | Client Error | "Invalid request. Please check your filters." | Show notification |
| 401 | Unauthorized | "Session expired. Please log in again." | Redirect to login |
| 403 | Forbidden | "Access denied." | Show notification |
| 404 | Not Found | "Data not found." | Show notification |
| 429 | Rate Limited | "Too many requests. Please wait." | Show notification + retry |
| 500 | Server Error | "Server error. Please try again." | Show notification + retry |
| 503 | Service Unavailable | "Service temporarily unavailable." | Show notification + retry |
| Network Error | Connection Failed | "Network error. Check your connection." | Show notification + retry |

### 6.2 Global Error Handler

```typescript
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: Error | HttpErrorResponse): void {
    console.error('Global Error Handler:', error);

    if (error instanceof HttpErrorResponse) {
      // Already handled by interceptor
      return;
    }

    if (error.name === 'ChunkLoadError') {
      // New version deployed
      this.errorNotification.showError(
        'Application Update',
        'A new version is available. Please refresh the page.',
        10000
      );
      return;
    }

    // Generic error
    this.errorNotification.showError(
      'Application Error',
      'An unexpected error occurred.',
      8000
    );
  }
}
```

### 6.3 Retry Logic

**Automatic Retry** (RequestCoordinatorService):

```typescript
retryConfig = {
  maxRetries: 3,
  retryDelay: 1000,        // 1 second
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};
```

**Exponential Backoff**:
- 1st retry: 1 second
- 2nd retry: 2 seconds
- 3rd retry: 4 seconds
- After 3 failures: Give up, show error

### 6.4 User Notifications

**Notification Types** (PrimeNG Toast):

```typescript
interface ErrorNotification {
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;          // Title
  detail: string;           // Message
  life: number;             // Duration (ms)
}
```

**Display Rules**:
- **Success**: 3 seconds, green
- **Info**: 5 seconds, blue
- **Warning**: 8 seconds, orange
- **Error**: 10 seconds, red (or until dismissed)

**Position**: Top-right corner

**Maximum Concurrent**: 3 notifications (queue additional)

---

## 7. LOGGING & MONITORING

### 7.1 Console Logging

**Development Mode**:
- ✅ All errors logged with stack traces
- ✅ HTTP requests/responses
- ✅ State changes
- ✅ Performance warnings

**Production Mode**:
- ✅ Errors only (no debug/info logs)
- ❌ No request/response bodies (privacy)
- ✅ Performance metrics
- ❌ No user data

### 7.2 Log Levels

```typescript
enum LogLevel {
  ERROR = 0,   // Always logged
  WARN = 1,    // Production + Dev
  INFO = 2,    // Dev only
  DEBUG = 3    // Dev only (verbose)
}
```

**Log Format**:

```typescript
console.error('[ERROR] 2025-11-15 10:30:45 - HTTP Error:', {
  url: '/api/v1/vehicles',
  status: 500,
  message: 'Internal Server Error'
});
```

### 7.3 Performance Monitoring

**Metrics to Track**:

```typescript
// Page load metrics
performance.mark('app-init-start');
performance.mark('app-init-end');
performance.measure('app-init', 'app-init-start', 'app-init-end');

// API call metrics
const startTime = performance.now();
const duration = performance.now() - startTime;
console.log(`API call took ${duration}ms`);
```

**Performance Budgets** (Alerts):
- API call > 3 seconds: Warning
- Chart render > 2 seconds: Warning
- Page navigation > 1 second: Warning

### 7.4 Error Tracking (Future)

**Recommended Tools**:
- **Sentry**: Error tracking and performance monitoring
- **LogRocket**: Session replay
- **Google Analytics**: User behavior

**Integration Points**:
- GlobalErrorHandler → Sentry
- HTTP errors → Sentry
- Performance metrics → Analytics

---

## 8. CODE QUALITY STANDARDS

### 8.1 TypeScript Configuration

**Strict Mode Enabled**:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 8.2 Linting Rules

**ESLint Configuration** (Recommended):

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@angular-eslint/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "no-debugger": "error",
    "no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### 8.3 Code Formatting

**Prettier Configuration**:

```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

### 8.4 Component Guidelines

**File Size Limits**:
- Component: < 400 lines
- Service: < 800 lines
- Template: < 200 lines

**Complexity Limits**:
- Cyclomatic complexity: < 10 per method
- Cognitive complexity: < 15 per method

**Naming Conventions**:
- Components: PascalCase + `Component` suffix
- Services: PascalCase + `Service` suffix
- Interfaces: PascalCase (no `I` prefix)
- Constants: UPPER_SNAKE_CASE

---

## 9. API PERFORMANCE SLAs

### 9.1 Response Time Targets

**By Endpoint**:

| Endpoint | Target (p50) | Target (p95) | Maximum | Notes |
|----------|--------------|--------------|---------|-------|
| `/vehicles/details` | < 200ms | < 500ms | 2s | Main search |
| `/manufacturer-model-combinations` | < 150ms | < 300ms | 1s | Cached heavily |
| `/vehicles/{id}/instances` | < 100ms | < 200ms | 500ms | Small dataset |
| `/filters/{field}` | < 50ms | < 100ms | 300ms | Cached |
| `/vins` | < 300ms | < 800ms | 3s | Large dataset |

**p50**: 50th percentile (median)
**p95**: 95th percentile (outliers)

### 9.2 Throughput Targets

**Requests Per Second** (per API server instance):
- **Target**: 100 RPS
- **Maximum**: 500 RPS (burst)

**Database Queries**:
- **Target**: < 50ms per query
- **Maximum**: < 200ms

---

## 10. TESTING REQUIREMENTS

### 10.1 Code Coverage

**Minimum Coverage** (per file type):

| File Type | Minimum Coverage | Target Coverage |
|-----------|------------------|-----------------|
| Services | 80% | 90% |
| Components | 70% | 85% |
| Pipes | 90% | 100% |
| Guards | 90% | 100% |
| Interceptors | 80% | 95% |

**Overall Target**: 75% code coverage

### 10.2 Test Types

**Unit Tests** (Karma + Jasmine):
- Every service method
- Component public methods
- Edge cases and error conditions

**Integration Tests**:
- Component + Service interactions
- State management flows
- API integration

**E2E Tests** (Playwright):
- Critical user journeys
- Cross-browser compatibility
- Pop-out window workflows

### 10.3 Test Performance

**Unit Test Suite**:
- **Target**: < 30 seconds total
- **Maximum**: < 60 seconds

**E2E Test Suite**:
- **Target**: < 5 minutes total
- **Maximum**: < 10 minutes

**CI/CD Pipeline**:
- **Build**: < 5 minutes
- **Test**: < 10 minutes
- **Deploy**: < 5 minutes
- **Total**: < 20 minutes

---

## SUMMARY

This specification defines the non-functional requirements for the Vehicle Discovery Platform:

### Performance
- ✅ Bundle size < 5 MB (warning) / < 10 MB (error)
- ✅ Load time < 3 seconds (target)
- ✅ 60 FPS chart animations
- ✅ OnPush change detection for all major components

### Browser Compatibility
- ✅ Chrome, Firefox, Edge, Safari (last 1-2 versions)
- ✅ iOS Safari support
- ❌ No IE11 support

### Accessibility
- ✅ WCAG 2.1 Level AA compliance (target)
- ✅ Keyboard navigation for all features
- ✅ Screen reader support
- ✅ 4.5:1 color contrast for text

### Security
- ✅ HTTPS enforcement
- ✅ Content Security Policy
- ✅ XSS/CSRF protection
- ✅ JWT authentication
- ❌ No sensitive data in URLs/localStorage

### Scalability
- ✅ 100 concurrent users (target)
- ✅ 10,000 client-side table rows
- ✅ 5-minute frontend cache
- ✅ Horizontal scaling support

### Error Handling
- ✅ Centralized error interceptor
- ✅ Global error handler
- ✅ Automatic retry (3 attempts)
- ✅ User-friendly notifications

### Code Quality
- ✅ TypeScript strict mode
- ✅ 75% code coverage target
- ✅ ESLint + Prettier
- ✅ File size and complexity limits

**End of Specification**

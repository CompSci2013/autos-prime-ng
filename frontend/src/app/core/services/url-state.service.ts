import { Injectable, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { BehaviorSubject, Observable, Subject, from, of } from 'rxjs';
import { map, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';

/**
 * Type definition for query parameters
 * Ensures type safety throughout the service
 */
export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

/**
 * Professional-grade URL State Management Service
 *
 * Provides centralized, type-safe management of URL query parameters with:
 * - Memory leak prevention (proper cleanup via OnDestroy)
 * - Type safety (QueryParams interface instead of 'any')
 * - Error handling (navigation failure handling)
 * - Parameter encoding/decoding (arrays, objects, primitives)
 * - Cross-route persistence (maintain params across navigation)
 * - Reactive programming patterns (Observable-based API)
 *
 * @example
 * ```typescript
 * // Read a parameter
 * this.urlState.getQueryParam('models').subscribe(models => {
 *   console.log('Current models:', models);
 * });
 *
 * // Update parameters
 * this.urlState.setQueryParams({ page: '2', sort: 'asc' });
 *
 * // Navigate with persistence
 * this.urlState.navigateWithPersistence(['/details', id], ['models', 'year']);
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class UrlStateService implements OnDestroy {
  // MEMORY MANAGEMENT: Subject that signals when service is destroyed
  // Used with takeUntil() to prevent memory leaks from subscriptions
  private destroy$ = new Subject<void>();

  // INTERNAL STATE: Private BehaviorSubject holds current query params
  // Only this service can modify it via .next()
  private queryParamsSubject = new BehaviorSubject<QueryParams>({});

  // PUBLIC API: Read-only Observable exposed to components
  // Components can subscribe but cannot directly modify state
  public queryParams$ = this.queryParamsSubject.asObservable();

  // CROSS-ROUTE PERSISTENCE: Configure which params persist across all routes
  // Add param names here to automatically preserve them during navigation
  // Example: ['models', 'year', 'bodyClass'] - these survive route changes
  private persistentParams: string[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    // INITIALIZATION: Subscribe to Angular Router's query param changes
    // takeUntil(destroy$) ensures subscription cleanup when service destroys
    // This prevents memory leaks in long-running applications
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.queryParamsSubject.next(params);
      });
  }

  /**
   * CLEANUP: Called automatically by Angular when service is destroyed
   * Completes the destroy$ Subject, which triggers all takeUntil() operators
   * This unsubscribes all active subscriptions, preventing memory leaks
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // READ METHODS: Get query parameters from URL
  // ============================================================================

  /**
   * Get an Observable that emits a specific query parameter value
   * Automatically filters out duplicate consecutive values for efficiency
   *
   * @param key - The query parameter name
   * @returns Observable emitting the parameter value or null if not present
   *
   * @example
   * ```typescript
   * this.urlState.getQueryParam('page').subscribe(page => {
   *   console.log('Current page:', page);
   * });
   * ```
   */
  getQueryParam(key: string): Observable<string | null> {
    return this.queryParams$.pipe(
      map((params) => params[key] as string || null),
      distinctUntilChanged()
    );
  }

  /**
   * Get current query parameter value synchronously (snapshot)
   * Use sparingly - prefer Observable version for reactive updates
   * Useful for one-time reads or guards
   *
   * @param key - The query parameter name
   * @returns The current parameter value or null
   */
  getQueryParamSnapshot(key: string): string | null {
    return this.queryParamsSubject.value[key] as string || null;
  }

  /**
   * Get query parameter decoded as an array
   * Automatically splits comma-separated values: 'a,b,c' → ['a', 'b', 'c']
   *
   * @param key - The query parameter name
   * @returns Observable emitting an array of strings
   */
  getQueryParamAsArray(key: string): Observable<string[]> {
    return this.getQueryParam(key).pipe(
      map(value => value ? this.decodeParam(value, 'array') : [])
    );
  }

  /**
   * Get query parameter decoded as a number
   * Handles conversion and defaults for invalid/missing values
   *
   * @param key - The query parameter name
   * @param defaultValue - Value to return if param is missing or invalid
   * @returns Observable emitting a number
   */
  getQueryParamAsNumber(key: string, defaultValue: number = 0): Observable<number> {
    return this.getQueryParam(key).pipe(
      map(value => {
        if (!value) return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      })
    );
  }

  /**
   * Get query parameter decoded as a boolean
   * Treats 'true' (case-insensitive) as true, all else as false
   *
   * @param key - The query parameter name
   * @param defaultValue - Value to return if param is missing
   * @returns Observable emitting a boolean
   */
  getQueryParamAsBoolean(key: string, defaultValue: boolean = false): Observable<boolean> {
    return this.getQueryParam(key).pipe(
      map(value => {
        if (!value) return defaultValue;
        return value.toLowerCase() === 'true';
      })
    );
  }

  /**
   * Get query parameter decoded as an object
   * Parses JSON-encoded parameter values
   * Returns null for invalid JSON or missing values
   *
   * @param key - The query parameter name
   * @returns Observable emitting the parsed object or null
   */
  getQueryParamAsObject<T = any>(key: string): Observable<T | null> {
    return this.getQueryParam(key).pipe(
      map(value => {
        if (!value) return null;
        try {
          return this.decodeParam(value, 'object') as T;
        } catch {
          return null;
        }
      })
    );
  }

  // ============================================================================
  // WRITE METHODS: Update query parameters in URL
  // ============================================================================

  /**
   * Set or update query parameters (merges with existing params)
   * Handles navigation errors gracefully and returns success status
   *
   * @param params - Object with parameter key-value pairs
   * @returns Observable<boolean> - true if navigation succeeded, false if failed
   *
   * @example
   * ```typescript
   * // Update multiple params at once
   * this.urlState.setQueryParams({ page: '2', sort: 'asc' }).subscribe(success => {
   *   if (success) console.log('Navigation successful');
   * });
   * ```
   */
  setQueryParams(params: QueryParams): Observable<boolean> {
    // ERROR HANDLING: Wrap router.navigate() in Observable for error handling
    // If navigation fails (guards, resolvers, etc.), catch error and return false
    return from(
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: params,
        queryParamsHandling: 'merge' // Merge with existing params (don't replace all)
      })
    ).pipe(
      catchError((error) => {
        console.error('[UrlStateService] Navigation failed:', error);
        return of(false);
      })
    );
  }

  /**
   * Set query parameter from an array value
   * Automatically encodes array as comma-separated string
   *
   * @param key - The query parameter name
   * @param values - Array of string values
   * @returns Observable<boolean> - navigation success status
   *
   * @example
   * ```typescript
   * this.urlState.setQueryParamArray('colors', ['red', 'blue', 'green']);
   * // URL: ?colors=red,blue,green
   * ```
   */
  setQueryParamArray(key: string, values: string[]): Observable<boolean> {
    return this.setQueryParams({ [key]: this.encodeParam(values) });
  }

  /**
   * Set query parameter from an object value
   * Automatically encodes object as JSON string
   *
   * @param key - The query parameter name
   * @param value - Object to encode
   * @returns Observable<boolean> - navigation success status
   */
  setQueryParamObject(key: string, value: any): Observable<boolean> {
    return this.setQueryParams({ [key]: this.encodeParam(value) });
  }

  /**
   * Replace ALL query parameters (does not merge)
   * Removes existing params and sets only the provided ones
   *
   * @param params - New query parameters (replaces all existing)
   * @returns Observable<boolean> - navigation success status
   */
  replaceQueryParams(params: QueryParams): Observable<boolean> {
    return from(
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: params,
        // NO queryParamsHandling - defaults to replace behavior
      })
    ).pipe(
      catchError((error) => {
        console.error('[UrlStateService] Navigation failed:', error);
        return of(false);
      })
    );
  }

  /**
   * Remove a specific query parameter from URL
   *
   * @param key - The query parameter name to remove
   * @returns Observable<boolean> - navigation success status
   */
  clearQueryParam(key: string): Observable<boolean> {
    const currentParams = { ...this.queryParamsSubject.value };
    delete currentParams[key];
    return this.replaceQueryParams(currentParams);
  }

  /**
   * Remove ALL query parameters from URL
   * Resets to clean URL with no query string
   *
   * @returns Observable<boolean> - navigation success status
   */
  clearAllQueryParams(): Observable<boolean> {
    return this.replaceQueryParams({});
  }

  // ============================================================================
  // CROSS-ROUTE PERSISTENCE: Maintain params across navigation
  // ============================================================================

  /**
   * Navigate to a new route while preserving specified query parameters
   * Useful for maintaining context (filters, selections) across pages
   *
   * @param commands - Route path segments (same as router.navigate)
   * @param paramsToPreserve - Array of param names to keep from current URL
   * @param extras - Additional navigation options
   * @returns Promise<boolean> - navigation success status
   *
   * @example
   * ```typescript
   * // Current URL: /search?models=Ford:F-150&year=2020&page=2
   * this.urlState.navigateWithPersistence(
   *   ['/details', vehicleId],
   *   ['models', 'year']  // Keep these params
   * );
   * // New URL: /details/123?models=Ford:F-150&year=2020
   * // (page is NOT preserved)
   * ```
   */
  navigateWithPersistence(
    commands: any[],
    paramsToPreserve: string[],
    extras?: NavigationExtras
  ): Promise<boolean> {
    const currentParams = this.queryParamsSubject.value;

    // Extract only the params we want to preserve
    const preservedParams = paramsToPreserve.reduce((acc, key) => {
      if (currentParams[key] !== undefined) {
        acc[key] = currentParams[key];
      }
      return acc;
    }, {} as QueryParams);

    // Merge preserved params with any new params from extras
    return this.router.navigate(commands, {
      ...extras,
      queryParams: {
        ...preservedParams,
        ...extras?.queryParams
      }
    });
  }

  /**
   * Navigate to a new route preserving ALL configured persistent params
   * Uses the persistentParams array defined at class level
   *
   * @param commands - Route path segments
   * @param extras - Additional navigation options
   * @returns Promise<boolean> - navigation success status
   *
   * @example
   * ```typescript
   * // If persistentParams = ['models', 'year']
   * // Current URL: /search?models=Ford&year=2020&page=2
   * this.urlState.navigateWithGlobalPersistence(['/details', id]);
   * // New URL: /details/123?models=Ford&year=2020
   * // (page is NOT in persistentParams, so it's dropped)
   * ```
   */
  navigateWithGlobalPersistence(
    commands: any[],
    extras?: NavigationExtras
  ): Promise<boolean> {
    return this.navigateWithPersistence(commands, this.persistentParams, extras);
  }

  /**
   * Configure which parameters persist across ALL route changes
   * Call this early in app initialization (e.g., AppComponent constructor)
   *
   * @param params - Array of parameter names to persist globally
   *
   * @example
   * ```typescript
   * // In AppComponent
   * constructor(private urlState: UrlStateService) {
   *   urlState.setPersistentParams(['models', 'year', 'bodyClass']);
   * }
   * ```
   */
  setPersistentParams(params: string[]): void {
    this.persistentParams = params;
  }

  // ============================================================================
  // ENCODING/DECODING HELPERS: Handle complex parameter types
  // ============================================================================

  /**
   * PRIVATE: Encode a value for URL storage
   * Handles arrays (comma-separated), objects (JSON), primitives (string)
   *
   * @param value - Value to encode
   * @returns URL-safe string representation
   */
  private encodeParam(value: any): string {
    if (Array.isArray(value)) {
      return value.join(',');  // ['a','b'] → 'a,b'
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);  // {x:1} → '{"x":1}'
    }
    return String(value);
  }

  /**
   * PRIVATE: Decode a URL parameter string to typed value
   * Reverses the encoding process based on expected type
   *
   * @param value - URL parameter string
   * @param type - Expected type for decoding
   * @returns Decoded typed value
   */
  private decodeParam(value: string, type: 'string' | 'number' | 'boolean' | 'array' | 'object'): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'array':
        return value.split(',');
      case 'object':
        return JSON.parse(value);
      default:
        return value;
    }
  }
}

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of, timer } from 'rxjs';
import {
  shareReplay,
  catchError,
  finalize,
  retry,
  tap,
  map,
} from 'rxjs/operators';

export interface RequestConfig {
  cacheTime?: number; // Cache duration in ms (0 = no cache)
  deduplication?: boolean; // Deduplicate identical requests
  retryAttempts?: number; // Number of retry attempts
  retryDelay?: number; // Initial retry delay (exponential backoff)
}

export interface RequestState {
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class RequestCoordinatorService {
  // Active requests cache (for deduplication)
  private activeRequests = new Map<string, Observable<any>>();

  // Response cache (for caching)
  private responseCache = new Map<
    string,
    {
      data: any;
      timestamp: number;
      config: RequestConfig;
    }
  >();

  // Loading states per request key
  private loadingStates = new Map<string, BehaviorSubject<RequestState>>();

  // Global loading state (any request loading)
  private globalLoadingSubject = new BehaviorSubject<number>(0);
  public globalLoading$ = this.globalLoadingSubject.asObservable();

  constructor() {}

  /**
   * Execute a request with coordination
   *
   * @param key - Unique identifier for this request type
   * @param requestFn - Function that returns the Observable
   * @param config - Configuration for caching, deduplication, retry
   */
  execute<T>(
    key: string,
    requestFn: () => Observable<T>,
    config: RequestConfig = {}
  ): Observable<T> {
    const {
      cacheTime = 0,
      deduplication = true,
      retryAttempts = 2,
      retryDelay = 1000,
    } = config;

    // Check cache first
    if (cacheTime > 0) {
      const cached = this.getCachedResponse(key, cacheTime);
      if (cached !== null) {
        return of(cached);
      }
    }

    // Check for in-flight request (deduplication)
    if (deduplication && this.activeRequests.has(key)) {
      return this.activeRequests.get(key)!;
    }

    // Create loading state if not exists
    if (!this.loadingStates.has(key)) {
      this.loadingStates.set(
        key,
        new BehaviorSubject<RequestState>({
          loading: false,
          error: null,
          lastUpdated: null,
        })
      );
    }

    // Start loading
    this.setLoadingState(key, true);
    this.incrementGlobalLoading();

    // Create and execute request with retry logic
    const request$ = requestFn().pipe(
      // Retry with exponential backoff (RxJS 7+ style)
      retry({
        count: retryAttempts,
        delay: (error, retryCount) => {
          const delayTime = retryDelay * Math.pow(2, retryCount - 1);
          return timer(delayTime);
        },
      }),
      // Share for deduplication with refCount to prevent memory leaks
      // refCount: true ensures subscription is cleaned up when all subscribers unsubscribe
      shareReplay({ bufferSize: 1, refCount: true }),
      // Tap to cache successful responses
      tap((response) => {
        if (cacheTime > 0) {
          this.cacheResponse(key, response, config);
        }
        this.setLoadingSuccess(key);
      }),
      // Error handling
      catchError((error) => {
        console.error(
          `[RequestCoordinator] Request failed for key: ${key}`,
          error
        );
        this.setLoadingError(key, error);
        return throwError(() => error);
      }),
      // Cleanup
      finalize(() => {
        this.activeRequests.delete(key);
        this.setLoadingState(key, false);
        this.decrementGlobalLoading();
      })
    );

    // Cache the in-flight request
    if (deduplication) {
      this.activeRequests.set(key, request$);
    }

    return request$;
  }

  /**
   * Get loading state for a specific request
   */
  getLoadingState$(key: string): Observable<RequestState> {
    if (!this.loadingStates.has(key)) {
      this.loadingStates.set(
        key,
        new BehaviorSubject<RequestState>({
          loading: false,
          error: null,
          lastUpdated: null,
        })
      );
    }
    return this.loadingStates.get(key)!.asObservable();
  }

  /**
   * Get global loading state as boolean
   */
  getGlobalLoading$(): Observable<boolean> {
    return this.globalLoading$.pipe(map((count) => count > 0));
  }

  /**
   * Check if any requests are loading
   */
  isAnyLoading(): boolean {
    return this.globalLoadingSubject.value > 0;
  }

  /**
   * Cancel all active requests (e.g., on navigation)
   */
  cancelAll(): void {
    this.activeRequests.clear();
    this.loadingStates.forEach((state) => {
      state.next({
        loading: false,
        error: null,
        lastUpdated: state.value.lastUpdated,
      });
    });
    this.globalLoadingSubject.next(0);
  }

  /**
   * Clear cache for a specific key or all
   */
  clearCache(key?: string): void {
    if (key) {
      this.responseCache.delete(key);
    } else {
      this.responseCache.clear();
    }
  }

  // ========== PRIVATE METHODS ==========

  private getCachedResponse(key: string, cacheTime: number): any | null {
    const cached = this.responseCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > cacheTime) {
      this.responseCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private cacheResponse(key: string, data: any, config: RequestConfig): void {
    this.responseCache.set(key, {
      data,
      timestamp: Date.now(),
      config,
    });
  }

  private setLoadingState(key: string, loading: boolean): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.next({
        ...state.value,
        loading,
        error: loading ? null : state.value.error,
      });
    }
  }

  private setLoadingError(key: string, error: Error): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.next({
        loading: false,
        error,
        lastUpdated: Date.now(),
      });
    }
  }

  private setLoadingSuccess(key: string): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.next({
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    }
  }

  private incrementGlobalLoading(): void {
    this.globalLoadingSubject.next(this.globalLoadingSubject.value + 1);
  }

  private decrementGlobalLoading(): void {
    const current = this.globalLoadingSubject.value;
    this.globalLoadingSubject.next(Math.max(0, current - 1));
  }
}

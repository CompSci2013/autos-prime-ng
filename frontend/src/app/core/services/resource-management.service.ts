import { Injectable, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Subject, Observable, throwError } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  takeUntil,
  take,
  filter,
  tap,
  catchError,
} from 'rxjs/operators';
import { UrlStateService } from './url-state.service';
import {
  RequestCoordinatorService,
  RequestState,
} from './request-coordinator.service';
import {
  ResourceState,
  ResourceManagementConfig,
  ApiResponse,
} from './resource-management.types';

/**
 * Generic Resource Management Service
 *
 * Provides URL-first state management for any resource type.
 * Completely domain-agnostic through pluggable adapters.
 *
 * Type Parameters:
 * @template TFilters - Domain-specific filter type
 * @template TData - Domain-specific data/result type
 *
 * Key Features:
 * - URL as single source of truth
 * - Pluggable API adapters (domain-agnostic)
 * - Pluggable filter mappers (domain-agnostic)
 * - Request coordination (caching, deduplication, retry)
 * - Optional highlights support
 * - Pop-out window support
 *
 * @example
 * ```typescript
 * // Vehicle domain
 * const vehicleService = new ResourceManagementService<SearchFilters, VehicleDetail>(
 *   urlState,
 *   router,
 *   route,
 *   requestCoordinator,
 *   {
 *     filterMapper: new VehicleFilterMapper(),
 *     apiAdapter: new VehicleApiAdapter(apiService),
 *     cacheKeyBuilder: new VehicleCacheKeyBuilder(),
 *     defaultFilters: { page: 1, size: 20 }
 *   }
 * );
 *
 * // Parts domain
 * const partsService = new ResourceManagementService<PartsFilters, Part>(
 *   urlState,
 *   router,
 *   route,
 *   requestCoordinator,
 *   {
 *     filterMapper: new PartsFilterMapper(),
 *     apiAdapter: new PartsApiAdapter(partsApi),
 *     cacheKeyBuilder: new PartsCacheKeyBuilder(),
 *     defaultFilters: { page: 1, size: 20 }
 *   }
 * );
 * ```
 */
@Injectable()
export class ResourceManagementService<TFilters, TData> implements OnDestroy {
  private destroy$ = new Subject<void>();

  // ========== PRIVATE STATE ==========
  private stateSubject: BehaviorSubject<ResourceState<TFilters, TData>>;

  // ========== PUBLIC OBSERVABLES ==========
  public state$: Observable<ResourceState<TFilters, TData>>;

  public filters$: Observable<TFilters>;
  public results$: Observable<TData[]>;
  public loading$: Observable<boolean>;
  public error$: Observable<string | null>;
  public totalResults$: Observable<number>;
  public statistics$: Observable<any>;
  public highlights$: Observable<any>;

  constructor(
    private urlState: UrlStateService,
    private router: Router,
    private route: ActivatedRoute,
    private requestCoordinator: RequestCoordinatorService,
    private config: ResourceManagementConfig<TFilters, TData>
  ) {
    // Initialize state with default filters
    this.stateSubject = new BehaviorSubject<ResourceState<TFilters, TData>>({
      filters: config.defaultFilters,
      results: [],
      loading: false,
      error: null,
      totalResults: 0,
    });

    this.state$ = this.stateSubject.asObservable();

    // Create derived observables
    this.filters$ = this.state$.pipe(
      map((state) => state.filters),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );

    this.results$ = this.state$.pipe(
      map((state) => state.results),
      distinctUntilChanged()
    );

    this.loading$ = this.state$.pipe(
      map((state) => state.loading),
      distinctUntilChanged()
    );

    this.error$ = this.state$.pipe(
      map((state) => state.error),
      distinctUntilChanged()
    );

    this.totalResults$ = this.state$.pipe(
      map((state) => state.totalResults),
      distinctUntilChanged()
    );

    this.statistics$ = this.state$.pipe(
      map((state) => state.statistics || null),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );

    this.highlights$ = this.state$.pipe(
      map((state) => state.highlights || {}),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );

    // Detect if we're in a pop-out window
    const isPopout = this.router.url.startsWith('/panel/');

    if (isPopout) {
      console.log('[ResourceManagement] Pop-out window detected - URL watching DISABLED');
    } else {
      console.log('[ResourceManagement] Main window detected - URL watching ENABLED');
      this.initializeFromUrl();
      this.watchUrlChanges();
    }
  }

  // ========== INITIALIZATION ==========

  private initializeFromUrl(): void {
    const params = this.route.snapshot.queryParams;
    const filters = this.config.filterMapper.paramsToFilters(params);

    console.log('[ResourceManagement] Initializing from URL:', filters);

    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      filters,
    });

    // Auto-fetch data on initialization
    console.log('[ResourceManagement] Auto-fetching data on initialization');
    this.fetchData()
      .pipe(take(1))
      .subscribe({
        next: () =>
          console.log('[ResourceManagement] Initial data loaded successfully'),
        error: (err) => {
          console.error('[ResourceManagement] Failed to load initial data:', err);
          this.updateState({
            error: this.formatError(err),
            loading: false,
          });
        },
      });
  }

  private watchUrlChanges(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const params = this.route.snapshot.queryParams;
        const currentState = this.stateSubject.value;

        // Separate base filters from highlights
        const baseFilters = this.extractBaseFilters(params);
        const highlights = this.config.supportsHighlights
          ? this.extractHighlights(params)
          : undefined;

        // Check if base filters changed (triggers API call)
        const baseFiltersChanged =
          JSON.stringify(baseFilters) !== JSON.stringify(currentState.filters);

        // Check if highlights changed (triggers API call for segmented statistics)
        const highlightsChanged = this.config.supportsHighlights
          ? JSON.stringify(highlights) !==
            JSON.stringify(currentState.highlights || {})
          : false;

        if (baseFiltersChanged) {
          console.log(
            '🟡 watchUrlChanges: Base filters changed, updating state:',
            baseFilters
          );
          this.updateState({ filters: baseFilters });

          // Trigger data fetch for base filter changes
          console.log('🟡 watchUrlChanges: Triggering fetchData()');
          this.fetchData().subscribe({
            next: () => console.log('🟢 watchUrlChanges: Data fetched'),
            error: (err) =>
              console.error('🔴 watchUrlChanges: Fetch failed:', err),
          });
        }

        if (highlightsChanged) {
          console.log('🟦 watchUrlChanges: Highlights changed:', highlights);
          this.updateState({ highlights });

          // Highlights require API call to get segmented statistics
          console.log(
            '🟦 watchUrlChanges: Triggering fetchData() for segmented statistics'
          );
          this.fetchData().subscribe({
            next: () =>
              console.log('🟢 watchUrlChanges: Segmented statistics fetched'),
            error: (err) =>
              console.error('🔴 watchUrlChanges: Fetch failed:', err),
          });
        }
      });
  }

  private updateState(updates: Partial<ResourceState<TFilters, TData>>): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({ ...current, ...updates });
  }

  private syncStateToUrl(): void {
    const state = this.stateSubject.value;
    const params = this.config.filterMapper.filtersToParams(state.filters);

    // Preserve existing highlight parameters if supported
    if (this.config.supportsHighlights) {
      const currentParams = this.route.snapshot.queryParams;
      const highlightParams: Record<string, string> = {};
      const prefix = this.config.highlightPrefix || 'h_';

      Object.keys(currentParams).forEach((key) => {
        if (key.startsWith(prefix)) {
          highlightParams[key] = currentParams[key];
        }
      });

      const mergedParams = { ...params, ...highlightParams };
      this.urlState.replaceQueryParams(mergedParams).subscribe();
    } else {
      this.urlState.replaceQueryParams(params).subscribe();
    }
  }

  /**
   * Extract base filters from URL parameters (ignore highlight params)
   */
  private extractBaseFilters(params: Record<string, string>): TFilters {
    if (!this.config.supportsHighlights) {
      return this.config.filterMapper.paramsToFilters(params);
    }

    const baseParams: Record<string, string> = {};
    const prefix = this.config.highlightPrefix || 'h_';

    Object.keys(params).forEach((key) => {
      if (!key.startsWith(prefix)) {
        baseParams[key] = params[key];
      }
    });

    return this.config.filterMapper.paramsToFilters(baseParams);
  }

  /**
   * Extract highlights from URL parameters (only h_* params)
   */
  private extractHighlights(params: Record<string, string>): any {
    if (!this.config.supportsHighlights) {
      return {};
    }

    const highlights: any = {};
    const prefix = this.config.highlightPrefix || 'h_';

    Object.keys(params).forEach((key) => {
      if (key.startsWith(prefix)) {
        const baseKey = key.substring(prefix.length);
        highlights[baseKey] = params[key];
      }
    });

    return highlights;
  }

  // ========== PUBLIC METHODS ==========

  /**
   * Update filters and sync to URL
   */
  updateFilters(filters: Partial<TFilters>): void {
    const currentFilters = this.stateSubject.value.filters;

    // Separate undefined values (to be removed) from defined values
    const filtersToRemove: string[] = [];
    const filtersToSet: Partial<TFilters> = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined) {
        filtersToRemove.push(key);
      } else {
        (filtersToSet as any)[key] = value;
      }
    });

    // Start with current filters
    const newFilters = { ...currentFilters };

    // Remove filters that are explicitly set to undefined
    filtersToRemove.forEach((key) => {
      delete (newFilters as any)[key];
    });

    // Merge in the new defined values
    Object.assign(newFilters, filtersToSet);

    console.log('🔵 ResourceManagement.updateFilters() called with:', filters);
    console.log('🔵 Result filters:', newFilters);

    // TRUE URL-FIRST: Only update URL, let watcher update state + fetch data
    const params = this.config.filterMapper.filtersToParams(newFilters);

    // Preserve existing highlight parameters if supported
    const currentParams = this.route.snapshot.queryParams;
    if (this.config.supportsHighlights) {
      const highlightParams: Record<string, string> = {};
      const prefix = this.config.highlightPrefix || 'h_';

      Object.keys(currentParams).forEach((key) => {
        if (key.startsWith(prefix)) {
          highlightParams[key] = currentParams[key];
        }
      });

      const mergedParams = { ...params, ...highlightParams };
      this.urlState.replaceQueryParams(mergedParams).subscribe();
    } else {
      this.urlState.replaceQueryParams(params).subscribe();
    }

    console.log(
      '🟡 URL updated - watchUrlChanges() will handle state update + data fetch'
    );
  }

  /**
   * Clear all filters and reset to default state
   */
  clearAllFilters(): void {
    console.log('🔵 ResourceManagement.clearAllFilters() - resetting all filters');

    // TRUE URL-FIRST: Only update URL, let watcher update state + fetch data
    const params = this.config.filterMapper.filtersToParams(
      this.config.defaultFilters
    );

    // Preserve existing highlight parameters if supported
    if (this.config.supportsHighlights) {
      const currentParams = this.route.snapshot.queryParams;
      const highlightParams: Record<string, string> = {};
      const prefix = this.config.highlightPrefix || 'h_';

      Object.keys(currentParams).forEach((key) => {
        if (key.startsWith(prefix)) {
          highlightParams[key] = currentParams[key];
        }
      });

      const mergedParams = { ...params, ...highlightParams };
      this.urlState.replaceQueryParams(mergedParams).subscribe();
    } else {
      this.urlState.replaceQueryParams(params).subscribe();
    }

    console.log(
      '🟡 URL updated - watchUrlChanges() will handle state update + data fetch'
    );
  }

  /**
   * Get current filter state (synchronous)
   */
  getCurrentFilters(): TFilters {
    return this.stateSubject.value.filters;
  }

  /**
   * Get current app state (synchronous)
   */
  get currentState(): ResourceState<TFilters, TData> {
    return this.stateSubject.value;
  }

  // ========== API INTEGRATION WITH REQUEST COORDINATION ==========

  /**
   * Fetch data with request coordination
   */
  fetchData(): Observable<ApiResponse<TData>> {
    const filters = this.getCurrentFilters();

    // Extract highlights from URL (not from state, which may not be updated yet)
    const params = this.route.snapshot.queryParams;
    const currentHighlights = this.config.supportsHighlights
      ? this.extractHighlights(params)
      : undefined;

    console.log('🔵 Extracted highlights for API call:', currentHighlights);

    // Build unique cache key from filters AND highlights
    const cacheKey = this.config.cacheKeyBuilder.buildKey(
      'resource-data',
      filters,
      currentHighlights
    );

    console.log('🔵 ResourceManagement: Fetching via RequestCoordinator, key:', cacheKey);

    // Execute through coordinator
    return this.requestCoordinator
      .execute(
        cacheKey,
        () => this.config.apiAdapter.fetchData(filters, currentHighlights),
        {
          cacheTime: this.config.cacheTime || 30000,
          deduplication: true,
          retryAttempts: 2,
          retryDelay: 1000,
        }
      )
      .pipe(
        tap((response) => {
          // Update state on success
          this.updateState({
            results: response.results,
            totalResults: response.total,
            loading: false,
            error: null,
            statistics: response.statistics,
          });
        }),
        catchError((error) => {
          // Update state on error
          this.updateState({
            results: [],
            totalResults: 0,
            loading: false,
            error: this.formatError(error),
          });
          console.error(
            'ResourceManagementService: Failed to load data:',
            error
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Fetch related data (e.g., manufacturer-model combinations for pickers)
   * Only available if apiAdapter implements fetchRelatedData
   */
  fetchRelatedData(page: number = 1, size: number = 1000): Observable<any> {
    if (!this.config.apiAdapter.fetchRelatedData) {
      throw new Error(
        'fetchRelatedData not implemented by API adapter'
      );
    }

    const cacheKey = `related-data:${page}:${size}`;

    return this.requestCoordinator.execute(
      cacheKey,
      () => this.config.apiAdapter.fetchRelatedData!(page, size),
      {
        cacheTime: 600000, // Cache for 10 minutes
        deduplication: true,
        retryAttempts: 2,
        retryDelay: 1000,
      }
    );
  }

  /**
   * Fetch instances of a specific resource
   * Only available if apiAdapter implements fetchInstances
   */
  fetchInstances(resourceId: string, count: number = 8): Observable<any> {
    if (!this.config.apiAdapter.fetchInstances) {
      throw new Error('fetchInstances not implemented by API adapter');
    }

    const cacheKey = `instances:${resourceId}:${count}`;

    return this.requestCoordinator.execute(
      cacheKey,
      () => this.config.apiAdapter.fetchInstances!(resourceId, count),
      {
        cacheTime: 300000, // Cache for 5 minutes
        deduplication: true,
        retryAttempts: 2,
        retryDelay: 1000,
      }
    );
  }

  /**
   * Get loading state for resource data
   */
  getDataLoadingState$(): Observable<RequestState> {
    const filters = this.getCurrentFilters();
    const highlights = this.stateSubject.value.highlights || {};
    const cacheKey = this.config.cacheKeyBuilder.buildKey(
      'resource-data',
      filters,
      highlights
    );
    return this.requestCoordinator.getLoadingState$(cacheKey);
  }

  /**
   * Get global loading state (any request loading)
   */
  getGlobalLoadingState$(): Observable<boolean> {
    return this.requestCoordinator.getGlobalLoading$();
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests(): void {
    this.requestCoordinator.cancelAll();
  }

  /**
   * Clear response cache
   */
  clearCache(key?: string): void {
    this.requestCoordinator.clearCache(key);
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Format error message for display
   */
  private formatError(error: any): string {
    if (error.status === 0) {
      return 'Network error. Please check your connection.';
    }
    if (error.status === 404) {
      return 'No data found matching your criteria.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return error.message || 'An unexpected error occurred.';
  }

  // ========== POP-OUT SUPPORT ==========

  /**
   * Get current state snapshot
   */
  public getCurrentState(): ResourceState<TFilters, TData> {
    return this.stateSubject.value;
  }

  /**
   * Directly update state without making API calls
   * Used by pop-out windows to sync state from main window
   */
  public syncStateFromExternal(
    state: Partial<ResourceState<TFilters, TData>>
  ): void {
    const currentState = this.stateSubject.value;
    const newState = {
      ...currentState,
      ...state,
    };
    console.log('[ResourceManagement] syncStateFromExternal:', {
      currentResults: currentState.results?.length,
      newResults: newState.results?.length,
    });
    this.stateSubject.next(newState);
  }

  // ========== CLEANUP ==========

  ngOnDestroy(): void {
    this.cancelAllRequests();
    this.destroy$.next();
    this.destroy$.complete();
  }
}

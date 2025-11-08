import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
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
import { AppState, SearchFilters, HighlightFilters } from '../../models/search-filters.model';
import { RouteStateService } from './route-state.service';
import {
  RequestCoordinatorService,
  RequestState,
} from './request-coordinator.service';
import { ApiService } from '../../services/api.service';
import {
  VehicleDetailsResponse,
  ManufacturerModelSelection,
} from '../../models';

/**
 * StateManagementService - AUTOS Version
 *
 * Manages application state with URL as single source of truth
 * Now includes API integration with request coordination
 */
@Injectable({
  providedIn: 'root',
})
export class StateManagementService implements OnDestroy {
  private destroy$ = new Subject<void>();

  // ========== PRIVATE STATE ==========
  private stateSubject = new BehaviorSubject<AppState>(this.getInitialState());

  // ========== PUBLIC OBSERVABLES ==========
  public state$ = this.stateSubject.asObservable();

  public filters$ = this.state$.pipe(
    map((state) => state.filters),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
  );

  public results$ = this.state$.pipe(
    map((state) => state.results),
    distinctUntilChanged()
  );

  public loading$ = this.state$.pipe(
    map((state) => state.loading),
    distinctUntilChanged()
  );

  public error$ = this.state$.pipe(
    map((state) => state.error),
    distinctUntilChanged()
  );

  public totalResults$ = this.state$.pipe(
    map((state) => state.totalResults),
    distinctUntilChanged()
  );

  public statistics$ = this.state$.pipe(
    map((state) => state.statistics || null),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
  );

  public highlights$ = this.state$.pipe(
    map((state) => state.highlights || {}),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
  );

  constructor(
    private routeState: RouteStateService,
    private router: Router,
    private apiService: ApiService,
    private requestCoordinator: RequestCoordinatorService
  ) {
    // Detect if we're in a pop-out window
    const isPopout = this.router.url.startsWith('/panel/');

    if (isPopout) {
      console.log('[StateManagement] Pop-out window detected - URL watching DISABLED');
      // Pop-out windows receive initial state via BroadcastChannel, not URL
      // Do not initialize from URL or watch URL changes
      // BUT pop-outs CAN make API calls for pagination/sorting/filtering
    } else {
      console.log('[StateManagement] Main window detected - URL watching ENABLED');
      this.initializeFromUrl();
      this.watchUrlChanges();
    }
  }

  // ========== INITIALIZATION ==========

  private getInitialState(): AppState {
    return {
      filters: {
        page: 1,
        size: 20,
      },
      results: [],
      loading: false,
      error: null,
      totalResults: 0,
    };
  }

  private initializeFromUrl(): void {
    const params = this.routeState.getCurrentParams();
    const filters = this.routeState.paramsToFilters(params);

    console.log('[StateManagement] Initializing from URL:', filters);

    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      filters,
    });

    // Always auto-fetch data on initialization (supports filtered and unfiltered)
    // Backend supports empty modelCombos (returns all vehicles)
    console.log('[StateManagement] Auto-fetching data on initialization');
    this.fetchVehicleData().pipe(take(1)).subscribe();
  }

  private watchUrlChanges(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const params = this.routeState.getCurrentParams();
        const currentState = this.stateSubject.value;

        // Separate base filters from highlights
        const baseFilters = this.extractBaseFilters(params);
        const highlights = this.extractHighlights(params);

        // Check if base filters changed (triggers API call)
        const baseFiltersChanged =
          JSON.stringify(baseFilters) !== JSON.stringify(currentState.filters);

        // Check if highlights changed (triggers API call for segmented statistics)
        const highlightsChanged =
          JSON.stringify(highlights) !== JSON.stringify(currentState.highlights || {});

        if (baseFiltersChanged) {
          console.log(
            '🟡 watchUrlChanges: Base filters changed, updating state:',
            baseFilters
          );
          this.updateState({ filters: baseFilters });

          // Trigger data fetch for base filter changes
          console.log('🟡 watchUrlChanges: Triggering fetchVehicleData()');
          this.fetchVehicleData().subscribe({
            next: () => console.log('🟢 watchUrlChanges: Data fetched'),
            error: (err) =>
              console.error('🔴 watchUrlChanges: Fetch failed:', err),
          });
        }

        if (highlightsChanged) {
          console.log(
            '🟦 watchUrlChanges: Highlights changed:',
            highlights
          );
          this.updateState({ highlights });

          // Highlights now require API call to get segmented statistics
          // Backend returns {total, highlighted} format when h_* params present
          console.log('🟦 watchUrlChanges: Triggering fetchVehicleData() for segmented statistics');
          this.fetchVehicleData().subscribe({
            next: () => console.log('🟢 watchUrlChanges: Segmented statistics fetched'),
            error: (err) =>
              console.error('🔴 watchUrlChanges: Fetch failed:', err),
          });
        }
      });
  }

  private updateState(updates: Partial<AppState>): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({ ...current, ...updates });
  }

  private syncStateToUrl(): void {
    const state = this.stateSubject.value;
    const params = this.routeState.filtersToParams(state.filters);
    this.routeState.setParams(params, false);
  }

  /**
   * Extract base filters from URL parameters (ignore h_* params)
   * Base filters trigger API calls
   */
  private extractBaseFilters(params: Record<string, string>): SearchFilters {
    const baseParams: Record<string, string> = {};

    Object.keys(params).forEach((key) => {
      // Skip highlight parameters (h_* prefix)
      if (!key.startsWith('h_')) {
        baseParams[key] = params[key];
      }
    });

    return this.routeState.paramsToFilters(baseParams);
  }

  /**
   * Extract highlights from URL parameters (only h_* params)
   * Highlights are UI-only and don't trigger API calls
   */
  private extractHighlights(params: Record<string, string>): HighlightFilters {
    const highlights: HighlightFilters = {};

    Object.keys(params).forEach((key) => {
      if (key.startsWith('h_')) {
        const baseKey = key.substring(2); // Remove 'h_' prefix

        // Map to HighlightFilters properties
        switch (baseKey) {
          case 'yearMin':
            highlights.yearMin = parseInt(params[key], 10);
            break;
          case 'yearMax':
            highlights.yearMax = parseInt(params[key], 10);
            break;
          case 'manufacturer':
            highlights.manufacturer = params[key];
            break;
          case 'model':
            highlights.model = params[key];
            break;
          case 'bodyClass':
            highlights.bodyClass = params[key];
            break;
          case 'stateCode':
            highlights.stateCode = params[key];
            break;
          case 'conditionMin':
            highlights.conditionMin = parseInt(params[key], 10);
            break;
          case 'conditionMax':
            highlights.conditionMax = parseInt(params[key], 10);
            break;
        }
      }
    });

    return highlights;
  }

  // ========== PUBLIC METHODS ==========

  /**
   * Update filters and sync to URL
   * This is called by parent component when picker emits selections
   */
  updateFilters(filters: Partial<SearchFilters>): void {
    const currentFilters = this.stateSubject.value.filters;

    // Separate undefined values (to be removed) from defined values
    const filtersToRemove: string[] = [];
    const filtersToSet: Partial<SearchFilters> = {};

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
      delete newFilters[key as keyof SearchFilters];
    });

    // Merge in the new defined values
    Object.assign(newFilters, filtersToSet);

    // Reset to page 1 if any filter changed (except page/size)
    const nonPaginationKeys = Object.keys(filters).filter(
      (k) => k !== 'page' && k !== 'size'
    );
    if (nonPaginationKeys.length > 0 && filters.page === undefined) {
      newFilters.page = 1;
    }

    console.log('🔵 StateManagement.updateFilters() called with:', filters);
    console.log('🔵 Filters to remove:', filtersToRemove);
    console.log('🔵 Filters to set:', filtersToSet);
    console.log('🔵 Result filters:', newFilters);

    this.updateState({ filters: newFilters });
    this.syncStateToUrl();

    // Always trigger API search (supports both filtered and unfiltered queries)
    // Backend supports empty modelCombos (returns all vehicles)
    console.log('🔵 Triggering fetchVehicleData()');
    this.fetchVehicleData().subscribe({
      next: () => console.log('🟢 Data fetched successfully'),
      error: (err) => console.error('🔴 Fetch failed:', err),
    });
  }

  /**
   * Clear all filters and reset to default state
   */
  clearAllFilters(): void {
    const currentFilters = this.stateSubject.value.filters;
    const newFilters: SearchFilters = {
      page: 1,
      size: currentFilters.size || 20, // Keep current page size
    };

    console.log('🔵 StateManagement.clearAllFilters() - resetting all filters');

    this.updateState({ filters: newFilters });
    this.syncStateToUrl();

    // Trigger API search with empty filters (returns all vehicles)
    this.fetchVehicleData().subscribe({
      next: () => console.log('🟢 Data fetched successfully (all filters cleared)'),
      error: (err) => console.error('🔴 Fetch failed:', err),
    });
  }

  /**
   * Update pagination and sync to URL
   */
  updatePage(page: number): void {
    const currentFilters = this.stateSubject.value.filters;
    const newFilters = { ...currentFilters, page };

    this.updateState({ filters: newFilters });
    this.syncStateToUrl();

    // Always trigger API search (supports both filtered and unfiltered)
    this.fetchVehicleData().subscribe();
  }

  /**
   * Update sorting and sync to URL
   */
  updateSort(sort: string, sortDirection: 'asc' | 'desc'): void {
    const currentFilters = this.stateSubject.value.filters;
    const newFilters = {
      ...currentFilters,
      sort,
      sortDirection,
      page: 1, // Reset to page 1 when sort changes
    };

    this.updateState({ filters: newFilters });
    this.syncStateToUrl();

    // Always trigger API search (supports both filtered and unfiltered)
    this.fetchVehicleData().subscribe();
  }

  /**
   * Reset all filters and clear URL
   */
  resetFilters(): void {
    const initialFilters: SearchFilters = {
      page: 1,
      size: 20,
    };

    this.updateState({
      filters: initialFilters,
      results: [],
      error: null,
      totalResults: 0,
    });

    this.syncStateToUrl();
  }

  /**
   * Get current filter state (synchronous)
   */
  getCurrentFilters(): SearchFilters {
    return this.stateSubject.value.filters;
  }

  /**
   * Get current app state (synchronous)
   */
  get currentState(): AppState {
    return this.stateSubject.value;
  }

  /**
   * Select/deselect manufacturer in histogram
   */
  selectManufacturer(manufacturer: string | null): void {
    this.updateState({
      selectedManufacturer: manufacturer
    });
  }

  // ========== NEW: API INTEGRATION WITH REQUEST COORDINATION ==========

  /**
   * Fetch vehicle data with ephemeral filters (table column searches)
   * Does NOT update URL - filters are temporary and lost on page refresh
   * Combines current URL state with ephemeral table filters
   *
   * @param ephemeralFilters - Table column search filters (manufacturerSearch, etc.)
   */
  fetchWithEphemeralFilters(ephemeralFilters: {
    manufacturerSearch?: string;
    modelSearch?: string;
    bodyClassSearch?: string;
    dataSourceSearch?: string;
  }): Observable<VehicleDetailsResponse> {
    // Get current URL-based filters (shareable state)
    const urlFilters = this.getCurrentFilters();

    // Combine URL filters with ephemeral table filters
    const combinedFilters = {
      ...urlFilters,
      ...ephemeralFilters
    };

    // Build models param
    const modelsParam = combinedFilters.modelCombos && combinedFilters.modelCombos.length > 0
      ? this.buildModelsParam(combinedFilters.modelCombos)
      : '';

    console.log('🔵 StateManagement: Fetching with ephemeral filters:', ephemeralFilters);
    console.log('🔵 Combined filters:', combinedFilters);

    // Extract highlights from URL (not from state, which may not be updated yet)
    const params = this.routeState.getCurrentParams();
    const currentHighlights = this.extractHighlights(params);
    console.log('🔵 Extracted highlights for API call:', currentHighlights);

    // Build cache key from combined filters AND highlights
    const cacheKey = this.buildCacheKey('vehicle-details', combinedFilters, currentHighlights);
    console.log('🔵 Cache key:', cacheKey);

    // Execute through coordinator
    return this.requestCoordinator
      .execute(
        cacheKey,
        () =>
          this.apiService.getVehicleDetails(
            modelsParam,
            combinedFilters.page || 1,
            combinedFilters.size || 20,
            this.buildFilterParams(combinedFilters),
            currentHighlights,  // Pass highlights for segmented statistics
            combinedFilters.sort,
            combinedFilters.sortDirection
          ),
        {
          cacheTime: 0, // TEMPORARILY DISABLED for debugging
          deduplication: true,
          retryAttempts: 2,
          retryDelay: 1000,
        }
      )
      .pipe(
        tap((response) => {
          console.log(`🔵 API Response: ${response.results.length} results (total: ${response.total})`);
          console.log('🔵 First 3 results:', response.results.slice(0, 3).map(r => ({
            manufacturer: r.manufacturer,
            model: r.model,
            body_class: r.body_class
          })));

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
            'StateManagementService: Failed to load vehicle data:',
            error
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Fetch vehicle data with request coordination
   * Uses RequestCoordinatorService for deduplication, caching, and retry
   */
  fetchVehicleData(): Observable<VehicleDetailsResponse> {
    const filters = this.getCurrentFilters();

    // Build models param (empty string if no models selected - returns all vehicles)
    const modelsParam = filters.modelCombos && filters.modelCombos.length > 0
      ? this.buildModelsParam(filters.modelCombos)
      : '';

    // Extract highlights from URL (not from state, which may not be updated yet)
    const params = this.routeState.getCurrentParams();
    const currentHighlights = this.extractHighlights(params);
    console.log('🔵 Extracted highlights for API call:', currentHighlights);

    // Build unique cache key from filters AND highlights
    const cacheKey = this.buildCacheKey('vehicle-details', filters, currentHighlights);

    console.log('🔵 StateManagement: Fetching via RequestCoordinator, key:', cacheKey);

    // Execute through coordinator
    return this.requestCoordinator
      .execute(
        cacheKey,
        () =>
          this.apiService.getVehicleDetails(
            modelsParam,
            filters.page || 1,
            filters.size || 20,
            this.buildFilterParams(filters),
            currentHighlights,  // Pass highlights for segmented statistics
            filters.sort,
            filters.sortDirection
          ),
        {
          cacheTime: 30000, // Cache for 30 seconds
          deduplication: true, // Deduplicate identical requests
          retryAttempts: 2, // Retry twice on failure
          retryDelay: 1000, // Start with 1s delay
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
            statistics: response.statistics, // Include statistics for histograms
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
            'StateManagementService: Failed to load vehicle data:',
            error
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Get loading state for vehicle data
   * Returns observable of loading state for the current filters AND highlights
   */
  getVehicleDataLoadingState$(): Observable<RequestState> {
    const filters = this.getCurrentFilters();
    const highlights = this.stateSubject.value.highlights || {};
    const cacheKey = this.buildCacheKey('vehicle-details', filters, highlights);
    return this.requestCoordinator.getLoadingState$(cacheKey);
  }

  /**
   * Get global loading state (any request loading)
   * Returns true if ANY request is currently in progress
   */
  getGlobalLoadingState$(): Observable<boolean> {
    return this.requestCoordinator.getGlobalLoading$();
  }

  /**
   * Cancel all active requests
   * Useful for cleanup on navigation or component destroy
   */
  cancelAllRequests(): void {
    this.requestCoordinator.cancelAll();
  }

  /**
   * Clear response cache
   * Can clear specific key or all cached responses
   */
  clearCache(key?: string): void {
    this.requestCoordinator.clearCache(key);
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Build unique cache key from filter state AND highlights
   * Creates deterministic key for request deduplication and caching
   * IMPORTANT: Highlights must be included to ensure correct cache behavior
   */
  private buildCacheKey(prefix: string, filters: SearchFilters, highlights: HighlightFilters = {}): string {
    // Create deterministic key from filters AND highlights
    const filterString = JSON.stringify({
      modelCombos: filters.modelCombos?.sort((a, b) =>
        `${a.manufacturer}:${a.model}`.localeCompare(
          `${b.manufacturer}:${b.model}`
        )
      ),
      page: filters.page,
      size: filters.size,
      sort: filters.sort,
      sortDirection: filters.sortDirection,
      yearMin: filters.yearMin,
      yearMax: filters.yearMax,
      bodyStyle: filters.bodyStyle,
      q: filters.q,
      // Pattern 2: Field-specific search parameters (table column filters - partial matching)
      manufacturerSearch: filters.manufacturerSearch,
      modelSearch: filters.modelSearch,
      bodyClassSearch: filters.bodyClassSearch,
      dataSourceSearch: filters.dataSourceSearch,
      // Column filters (Query Control - exact matching)
      manufacturer: filters.manufacturer,
      model: filters.model,
      bodyClass: filters.bodyClass,
      dataSource: filters.dataSource,
      // HIGHLIGHTS: Must be included for correct cache invalidation
      h_yearMin: highlights.yearMin,
      h_yearMax: highlights.yearMax,
      h_manufacturer: highlights.manufacturer,
      h_bodyClass: highlights.bodyClass,
    });

    // Use base64 encoding for URL-safe key
    return `${prefix}:${btoa(filterString)}`;
  }

  /**
   * Build models parameter string for API
   * Format: "Ford:F-150,Ford:Mustang,Chevrolet:Corvette"
   */
  private buildModelsParam(modelCombos?: ManufacturerModelSelection[]): string {
    if (!modelCombos || modelCombos.length === 0) {
      return '';
    }
    return modelCombos.map((c) => `${c.manufacturer}:${c.model}`).join(',');
  }

  /**
   * Build filter parameters object for API
   * Extracts relevant filter fields for backend
   */
  private buildFilterParams(filters: SearchFilters): any {
    const params: any = {};

    // Pattern 2: Field-specific search parameters (table column filters - partial matching)
    if (filters.manufacturerSearch) {
      params.manufacturerSearch = filters.manufacturerSearch;
    }
    if (filters.modelSearch) {
      params.modelSearch = filters.modelSearch;
    }
    if (filters.bodyClassSearch) {
      params.bodyClassSearch = filters.bodyClassSearch;
    }
    if (filters.dataSourceSearch) {
      params.dataSourceSearch = filters.dataSourceSearch;
    }

    // Column filters (Query Control - exact matching)
    if (filters.manufacturer) {
      params.manufacturer = filters.manufacturer;
    }
    if (filters.model) {
      params.model = filters.model;
    }
    if (filters.bodyClass) {
      params.bodyClass = filters.bodyClass;
    }
    if (filters.dataSource) {
      params.dataSource = filters.dataSource;
    }

    // Year range filters
    if (filters.yearMin !== undefined && filters.yearMin !== null) {
      params.yearMin = filters.yearMin;
    }
    if (filters.yearMax !== undefined && filters.yearMax !== null) {
      params.yearMax = filters.yearMax;
    }

    // Legacy/other filters
    if (filters.bodyStyle) {
      params.bodyStyle = filters.bodyStyle;
    }
    if (filters.q) {
      params.q = filters.q;
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }

  /**
   * Format error message for display
   * Converts technical errors to user-friendly messages
   */
  private formatError(error: any): string {
    if (error.status === 0) {
      return 'Network error. Please check your connection.';
    }
    if (error.status === 404) {
      return 'No vehicles found matching your criteria.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return error.message || 'An unexpected error occurred.';
  }

  // ========== POP-OUT SUPPORT ==========

  /**
   * Get current state snapshot
   * Used by pop-out service to send initial state to new pop-outs
   */
  public getCurrentState(): AppState {
    return this.stateSubject.value;
  }

  /**
   * Directly update state without making API calls
   * Used by pop-out windows to sync state from main window
   */
  public syncStateFromExternal(state: Partial<AppState>): void {
    const currentState = this.stateSubject.value;
    const newState = {
      ...currentState,
      ...state
    };
    console.log('[StateManagement] syncStateFromExternal:', {
      currentResults: currentState.results?.length,
      newResults: newState.results?.length,
      currentFilters: currentState.filters,
      newFilters: newState.filters
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

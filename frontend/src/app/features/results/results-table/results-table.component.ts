import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../../core/services/state-management.service';
import { PopOutContextService } from '../../../core/services/popout-context.service';
import { VehicleResult, VehicleInstance, SearchFilters } from '../../../models';
import { TableColumn, TableQueryParams } from '../../../shared/models';
import { BaseDataTableComponent } from '../../../shared/components/base-data-table/base-data-table.component';

/**
 * Results-Table Component
 *
 * Displays vehicle search results with pagination, sorting, and row expansion.
 * Uses BaseDataTableComponent for consistent table behavior.
 *
 * STATE OWNERSHIP (Angular Best Practice - Single Responsibility):
 * ----------------------------------------------------------------
 * This component READS filter state but NEVER WRITES it.
 * Only Query Control component writes filter state.
 *
 * Writes (owns):
 *   - page: Current page number
 *   - size: Results per page
 *   - sort: Sort column
 *   - sortDirection: Sort order (asc/desc)
 *
 * Reads (does not own):
 *   - manufacturer: Filter by manufacturer (Query Control)
 *   - model: Filter by model (Query Control)
 *   - yearMin/yearMax: Year range filter (Query Control)
 *   - bodyClass: Body class filter (Query Control)
 *   - dataSource: Data source filter (Query Control)
 *   - modelCombos: Selected manufacturer-model pairs (Picker)
 *
 * This clear separation prevents state conflicts and follows the
 * Single Responsibility Principle.
 */
@Component({
  selector: 'app-results-table',
  templateUrl: './results-table.component.html',
  styleUrls: ['./results-table.component.scss'],
})
export class ResultsTableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Reference to BaseDataTable for calling public methods
  @ViewChild(BaseDataTableComponent) baseTable!: BaseDataTableComponent<VehicleResult>;

  // Pre-fetched data from StateManagement (URL-driven)
  results: VehicleResult[] = [];
  totalResults = 0;
  isLoading = false;

  // Column configuration (matches VehicleResultsTableComponent)
  columns: TableColumn<VehicleResult>[] = [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '180px',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
    },
    {
      key: 'model',
      label: 'Model',
      width: '180px',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
    },
    {
      key: 'year',
      label: 'Year',
      width: '120px',
      sortable: true,
      filterable: true,
      filterType: 'number',
      hideable: true,
    },
    {
      key: 'body_class',
      label: 'Body Class',
      width: '150px',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
    },
    {
      key: 'data_source',
      label: 'Data Source',
      width: '180px',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
    },
    {
      key: 'vehicle_id',
      label: 'Vehicle ID',
      width: 'auto',
      sortable: true,
      filterable: false,
      hideable: true,
    },
    {
      key: 'instance_count',
      label: 'VIN Count',
      width: '120px',
      sortable: true,         // Sorting enabled
      clientSideSort: true,   // Client-side only: sorts current page in-place
      filterable: false,
      hideable: true,
      formatter: (value: number | null | undefined) => {
        if (value === null || value === undefined) return '-';
        if (value === 0) return '0';
        return value.toLocaleString();
      },
    },
  ];

  // Query params for BaseDataTable (initialized from current state)
  tableQueryParams: TableQueryParams;

  // Row expansion state
  expandedRowInstances = new Map<string, VehicleInstance[]>();
  loadingInstances = new Set<string>();

  constructor(
    private stateService: StateManagementService,
    private popOutContext: PopOutContextService,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize tableQueryParams from current state BEFORE template renders
    const currentFilters = this.stateService.getCurrentFilters();
    this.tableQueryParams = this.convertToTableParams(currentFilters);
  }

  ngOnInit(): void {
    console.log(`[ResultsTable] Initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`);

    // Subscribe to results from StateManagement (pre-fetched via URL changes)
    this.stateService.results$
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        const oldLength = this.results.length;
        const oldReference = this.results;

        console.log('📥 ResultsTable: Results updated from StateManagement:', results.length);
        // Create new array reference to ensure OnPush child detects change
        this.results = [...results];

        console.log(`📥 Array reference changed: ${oldReference === this.results ? 'NO ❌' : 'YES ✅'}`);
        console.log(`📥 Length changed: ${oldLength} → ${this.results.length}`);

        // Force immediate change detection (not just schedule it)
        this.cdr.detectChanges();
        console.log('📥 detectChanges() called');
      });

    // Subscribe to total results count
    this.stateService.totalResults$
      .pipe(takeUntil(this.destroy$))
      .subscribe((total) => {
        console.log('ResultsTable: Total results updated:', total);
        this.totalResults = total;
        this.cdr.detectChanges();
      });

    // Subscribe to loading state
    this.stateService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        console.log('ResultsTable: Loading state updated:', loading);
        this.isLoading = loading;
        this.cdr.detectChanges();
      });

    // Subscribe to filters to update tableQueryParams (for pagination/sort state)
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        console.log('ResultsTable: Filters updated from URL:', filters);
        this.tableQueryParams = this.convertToTableParams(filters);
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Convert SearchFilters (app-level) to TableQueryParams (component-level)
   *
   * IMPORTANT: Query Control filters (manufacturer, model, year, etc.) are NOT
   * passed to table filter inputs. Those are URL-driven and managed by Query Control.
   * Table filter inputs are for ADDITIONAL user-typed filtering within displayed results.
   */
  private convertToTableParams(filters: SearchFilters): TableQueryParams {
    return {
      page: filters.page || 1,
      size: filters.size || 20,
      sortBy: filters.sort,
      sortOrder: filters.sortDirection,
      filters: {
        // Do NOT include Query Control filters here:
        // - manufacturer, model, yearMin, yearMax, bodyClass, dataSource
        // Those are applied at fetch time by StateManagementService
        // Table filter inputs should always be empty unless user types in them

        // Include modelCombos for change detection only (not a visible filter)
        _modelCombos: filters.modelCombos?.map(c => `${c.manufacturer}:${c.model}`).join(',') || '',
      },
    };
  }

  /**
   * Handle table query changes (user interactions)
   *
   * Pattern 2: Search vs Filter Separation
   * - Table column filters → Ephemeral (NOT in URL), partial matching
   * - Pagination/Sort → Shareable (in URL)
   * - Query Control selections → Shareable (in URL), exact matching
   */
  onTableQueryChange(params: TableQueryParams): void {
    console.log('========================================');
    console.log('🔄 [ResultsTable] onTableQueryChange CALLED');
    console.log('   Received params:', params);

    // Extract ephemeral filters (table column searches)
    const ephemeralFilters: any = {};
    if (params.filters) {
      if (params.filters['manufacturer']) {
        ephemeralFilters.manufacturerSearch = params.filters['manufacturer'];
      }
      if (params.filters['model']) {
        ephemeralFilters.modelSearch = params.filters['model'];
      }
      if (params.filters['body_class']) {
        ephemeralFilters.bodyClassSearch = params.filters['body_class'];
      }
      if (params.filters['data_source']) {
        ephemeralFilters.dataSourceSearch = params.filters['data_source'];
      }
      if (params.filters['year']) {
        ephemeralFilters.yearMin = params.filters['year'];
        ephemeralFilters.yearMax = params.filters['year'];
      }
    }

    // Check if pagination or sort changed (these should update URL)
    const currentFilters = this.stateService.getCurrentFilters();
    console.log('   Current URL filters:', currentFilters);

    const urlUpdates: any = {};

    if (params.page !== currentFilters.page) {
      console.log(`   Page changed: ${currentFilters.page} → ${params.page}`);
      urlUpdates.page = params.page;
    }
    if (params.size !== currentFilters.size) {
      console.log(`   Size changed: ${currentFilters.size} → ${params.size}`);
      urlUpdates.size = params.size;
    }
    if (params.sortBy !== currentFilters.sort) {
      console.log(`   Sort changed: ${currentFilters.sort} → ${params.sortBy}`);
      urlUpdates.sort = params.sortBy || undefined;
    }
    if (params.sortOrder !== currentFilters.sortDirection) {
      console.log(`   SortDirection changed: ${currentFilters.sortDirection} → ${params.sortOrder}`);
      urlUpdates.sortDirection = params.sortOrder || undefined;
    }

    const hasUrlUpdates = Object.keys(urlUpdates).length > 0;
    const hasEphemeralFilters = Object.keys(ephemeralFilters).length > 0;

    console.log(`   hasUrlUpdates: ${hasUrlUpdates}`, urlUpdates);
    console.log(`   hasEphemeralFilters: ${hasEphemeralFilters}`, ephemeralFilters);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      console.log('   Pop-out mode detected');
      if (hasUrlUpdates) {
        this.popOutContext.sendMessage({
          type: 'PAGINATION_SORT_CHANGE',
          payload: urlUpdates
        });
      }
      if (hasEphemeralFilters) {
        this.popOutContext.sendMessage({
          type: 'EPHEMERAL_FILTER_CHANGE',
          payload: ephemeralFilters
        });
      }
    } else {
      // Normal mode: update URL if needed, then fetch with ephemeral filters
      console.log('   Normal mode (not pop-out)');
      if (hasUrlUpdates) {
        console.log('✅ Calling stateService.updateFilters() with:', urlUpdates);
        // Update URL first (synchronously)
        this.stateService.updateFilters(urlUpdates);
        console.log('✅ updateFilters() returned');
      }

      if (hasEphemeralFilters) {
        console.log('[ResultsTable] Fetching with ephemeral filters:', ephemeralFilters);
        // Fetch with ephemeral filters (does NOT update URL)
        this.stateService.fetchWithEphemeralFilters(ephemeralFilters).subscribe();
      } else if (!hasUrlUpdates) {
        // Filters were cleared - fetch unfiltered data
        console.log('[ResultsTable] Filters cleared, fetching unfiltered data');
        this.stateService.fetchVehicleData().subscribe();
      } else {
        console.log('   URL updated, waiting for automatic data fetch from URL change');
      }
      // If hasUrlUpdates but NO ephemeralFilters, updateFilters() already triggered fetch
    }
    console.log('========================================');
  }

  /**
   * Handle row expansion
   * Lazy load VIN instances on first expand
   */
  onRowExpand(vehicle: VehicleResult): void {
    console.log('ResultsTable: Row expanded:', vehicle.vehicle_id);

    // Only load if not already cached
    if (!this.expandedRowInstances.has(vehicle.vehicle_id)) {
      this.loadVehicleInstances(vehicle.vehicle_id);
    }
  }

  /**
   * Load VIN instances for expanded row
   * Uses StateManagementService wrapper for RequestCoordinator benefits:
   * - Deduplication (expanding same row twice uses cached data)
   * - Caching (5 minute TTL)
   * - Retry with exponential backoff
   */
  private loadVehicleInstances(vehicleId: string): void {
    this.loadingInstances.add(vehicleId);

    this.stateService
      .fetchVehicleInstances(vehicleId, 8)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.expandedRowInstances.set(vehicleId, response.instances);
          this.loadingInstances.delete(vehicleId);
        },
        error: (err) => {
          console.error('Error loading VIN instances:', err);
          this.loadingInstances.delete(vehicleId);
        },
      });
  }

  /**
   * Get instances for expanded row
   */
  getInstances(vehicleId: string): VehicleInstance[] {
    return this.expandedRowInstances.get(vehicleId) || [];
  }

  /**
   * Check if instances are loading
   */
  isLoadingInstances(vehicleId: string): boolean {
    return this.loadingInstances.has(vehicleId);
  }

  /**
   * Determine if a row can be expanded (has VIN instances)
   */
  canExpandRow = (vehicle: VehicleResult): boolean => {
    return (vehicle.instance_count || 0) > 0;
  };

  /**
   * Handle expand all rows
   * Load VIN instances for all visible vehicles with data (instance_count > 0)
   */
  onExpandAll(): void {
    console.log('ResultsTable: Expanding all rows with data');
    // Filter out vehicles with no instances, then load VIN data
    const vehiclesWithData = this.results.filter(v => (v.instance_count || 0) > 0);
    console.log(`Found ${vehiclesWithData.length} vehicles with instance_count > 0`);

    // First, tell BaseDataTable to expand all rows that have data
    if (this.baseTable) {
      // Manually expand each row with data by adding to expandedRowsMap
      vehiclesWithData.forEach((vehicle) => {
        const key = vehicle.vehicle_id;
        this.baseTable.expandedRowSet.add(key);
        this.baseTable.expandedRowsMap[key] = true;
      });
      console.log(`✅ Expanded ${vehiclesWithData.length} rows in UI`);
    }

    // Then load VIN instances for each
    vehiclesWithData.forEach((vehicle) => {
      if (!this.expandedRowInstances.has(vehicle.vehicle_id)) {
        this.loadVehicleInstances(vehicle.vehicle_id);
      }
    });
  }

  /**
   * Handle collapse all rows
   * Calls BaseDataTable's collapseAllRows() method
   */
  onCollapseAll(): void {
    console.log('ResultsTable: Collapsing all rows');
    // Call BaseDataTable's public method to clear expansion state
    this.baseTable?.collapseAllRows();
    // No need to clear our instances cache - keep them for next expand
  }

  /**
   * Get color for title status badge
   */
  getTitleStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      Clean: 'green',
      Salvage: 'red',
      Rebuilt: 'orange',
      Lemon: 'red',
      Flood: 'red',
      'Theft Recovery': 'orange',
      Junk: 'red',
    };
    return statusColors[status] || 'default';
  }
}

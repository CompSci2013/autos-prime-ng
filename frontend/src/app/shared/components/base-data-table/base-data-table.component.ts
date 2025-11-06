import {
  Component,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  ContentChild,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { TableColumn } from '../../models/table-column.model';
import {
  TableDataSource,
  TableQueryParams,
  TableResponse,
} from '../../models/table-data-source.model';
import { TableStatePersistenceService } from '../../services/table-state-persistence.service';

@Component({
  selector: 'app-base-data-table',
  templateUrl: './base-data-table.component.html',
  styleUrls: ['./base-data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseDataTableComponent<T> implements OnInit, OnDestroy, OnChanges {
  // ========== INPUTS ==========

  /** Unique identifier for this table (used for localStorage) */
  @Input() tableId!: string;

  /** Column definitions */
  @Input() columns: TableColumn<T>[] = [];
  private originalColumnDefinitions: TableColumn<T>[] = [];

  /** Data source for fetching table data (optional - use EITHER dataSource OR data) */
  @Input() dataSource?: TableDataSource<T>;

  /** Pre-fetched data (optional - use EITHER dataSource OR data) */
  @Input() data?: T[];

  /** Total count for pre-fetched data mode */
  @Input() totalCount?: number;

  @Input() maxTableHeight: string = '1200px';

  /** Initial query parameters from parent */
  @Input() queryParams: TableQueryParams = {
    page: 1,
    size: 20,
    filters: {},
  };

  /** Whether rows can be expanded */
  @Input() expandable = false;

  /** Whether to show column management buttons (Manage Columns, Reset Columns) */
  @Input() showColumnManagement = true;

  /** Loading state from parent */
  @Input() loading = false;

  // ========== OUTPUTS ==========

  /** Emits when query parameters change */
  @Output() queryParamsChange = new EventEmitter<TableQueryParams>();

  /** Emits when data is successfully loaded */
  @Output() dataLoaded = new EventEmitter<void>();

  /** Emits when a row is expanded */
  @Output() rowExpand = new EventEmitter<T>();

  /** Emits when a row is collapsed */
  @Output() rowCollapse = new EventEmitter<T>();

  // Add these two new outputs:
  @Output() expandAll = new EventEmitter<void>();
  @Output() collapseAll = new EventEmitter<void>();

  // ========== TEMPLATE REFERENCES ==========

  /** Custom cell template from parent */
  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<any>;

  /** Custom expansion template from parent */
  @ContentChild('expansionTemplate') expansionTemplate?: TemplateRef<any>;

  // ========== STATE ==========

  /** Table data */
  tableData: T[] = [];

  /** Current page (1-indexed) */
  currentPage = 1;

  /** Page size */
  pageSize = 20;

  /** First record index for PrimeNG pagination (0-indexed) */
  first = 0;

  /** Expanded row keys (uses row.key if available, otherwise row reference) */
  expandedRowSet = new Set<any>();

  /** Expanded rows map for PrimeNG p-table (key: row key, value: true) */
  expandedRowsMap: { [key: string]: boolean } = {};

  /** Column manager drawer visibility */
  columnManagerVisible = false;

  /** Filter values */
  filters: { [key: string]: any } = {};

  /** Sort column key */
  sortBy?: string;

  /** Sort order */
  sortOrder?: 'asc' | 'desc';

  /** Internal loading state */
  isLoading = false;

  // ========== PRIVATE ==========

  private destroy$ = new Subject<void>();
  private filterSubject$ = new Subject<void>();
  private isReorderingColumns = false;
  private isInternalChange = false;

  // ========== LIFECYCLE ==========

  constructor(
    private persistenceService: TableStatePersistenceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load preferences
    this.loadPreferences();

    // Initialize from input queryParams with validation
    this.currentPage = this.queryParams.page || 1;
    this.pageSize = this.queryParams.size || 20;

    // Ensure values are valid numbers
    if (isNaN(this.currentPage) || this.currentPage < 1) {
      console.warn('⚠️ Invalid currentPage, defaulting to 1');
      this.currentPage = 1;
    }
    if (isNaN(this.pageSize) || this.pageSize < 1) {
      console.warn('⚠️ Invalid pageSize, defaulting to 20');
      this.pageSize = 20;
    }

    this.first = (this.currentPage - 1) * this.pageSize; // Initialize first index
    console.log(`📄 Initial pagination: currentPage=${this.currentPage}, pageSize=${this.pageSize}, first=${this.first}`);

    this.filters = this.queryParams.filters || {};
    this.sortBy = this.queryParams.sortBy;
    this.sortOrder = this.queryParams.sortOrder;

    // Set up filter debouncing
    this.filterSubject$
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1; // Reset to first page on filter change
        this.first = 0; // Reset first index on filter change

        // In data mode, emit event to parent instead of fetching
        if (this.data !== undefined) {
          const params: TableQueryParams = {
            page: this.currentPage,
            size: this.pageSize,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            filters: this.filters,
          };
          console.log(
            '📄 onFilterChange (data mode): Emitting queryParamsChange:',
            params
          );
          this.queryParamsChange.emit(params);
        } else {
          // dataSource mode: fetch directly
          this.fetchData(true); // User-initiated: filter changed
        }
      });

    // Initial data fetch (hydration - NOT user-initiated)
    this.fetchData(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isInternalChange) {
      this.isInternalChange = false;
      return;
    }

    // Handle data input changes (pre-fetched data mode)
    if (changes['data']) {
      const prev = changes['data'].previousValue;
      const curr = changes['data'].currentValue;
      console.log('📊 Data input changed');
      console.log(`   Previous: ${prev?.length || 0} items, Current: ${curr?.length || 0} items`);
      console.log(`   Reference changed: ${prev !== curr ? 'YES' : 'NO'}`);

      this.tableData = this.data || [];

      // Update first property to match current page
      this.first = (this.currentPage - 1) * this.pageSize;
      console.log(`📄 Updated first to ${this.first} (page ${this.currentPage}, size ${this.pageSize})`);

      // Check if current sort column uses client-side sorting
      // If so, re-apply the sort after data loads
      if (this.sortBy && this.sortOrder) {
        const column = this.columns.find((col) => col.key === this.sortBy);
        if (column && column.clientSideSort) {
          console.log(`🔄 Re-applying client-side sort on data change: ${this.sortBy} ${this.sortOrder}`);
          this.sortTableDataClientSide(this.sortBy, this.sortOrder);
        }
      }

      this.cdr.detectChanges(); // Force immediate change detection
    } else {
      // CRITICAL FIX: Update tableData even if ngOnChanges didn't detect a change
      // This handles cases where array reference changes but Angular doesn't detect it
      if (this.data !== undefined && this.data !== this.tableData) {
        console.log('📊 Data input NOT in changes, but data property differs from tableData');
        console.log(`   tableData: ${this.tableData?.length || 0} items, data: ${this.data?.length || 0} items`);
        this.tableData = this.data || [];

        // Update first property to match current page
        this.first = (this.currentPage - 1) * this.pageSize;
        console.log(`📄 Updated first to ${this.first} (page ${this.currentPage}, size ${this.pageSize})`);

        // Re-apply client-side sort if needed
        if (this.sortBy && this.sortOrder) {
          const column = this.columns.find((col) => col.key === this.sortBy);
          if (column && column.clientSideSort) {
            console.log(`🔄 Re-applying client-side sort on data property change: ${this.sortBy} ${this.sortOrder}`);
            this.sortTableDataClientSide(this.sortBy, this.sortOrder);
          }
        }

        this.cdr.detectChanges();
      }
    }

    // Handle totalCount input changes (pre-fetched data mode)
    if (changes['totalCount']) {
      console.log('🔢 TotalCount input changed:', this.totalCount);
      this.cdr.markForCheck();
    }

    // Handle column changes
    if (changes['columns'] && changes['columns'].firstChange) {
      this.originalColumnDefinitions = changes['columns'].currentValue.map(
        (col: TableColumn<T>) => ({ ...col })
      );
      console.log('Original columns saved:', this.originalColumnDefinitions);
    }

    if (changes['columns'] && !changes['columns'].firstChange) {
      console.log('🔄 Columns input changed, re-applying preferences');
      this.loadPreferences();
      this.cdr.markForCheck();
    }

    // Handle queryParams changes with smart comparison
    if (changes['queryParams']) {
      const prev = changes['queryParams'].previousValue;
      const curr = changes['queryParams'].currentValue;

      // Skip if this is the first change (handled in ngOnInit)
      if (changes['queryParams'].firstChange) {
        console.log(
          '⭐ First queryParams change, skipping (handled in ngOnInit)'
        );
        return;
      }

      // Skip if queryParams are deeply equal (no actual change)
      if (this.areQueryParamsEqual(prev, curr)) {
        console.log('⏭️ QueryParams unchanged, skipping fetch');
        return;
      }

      console.log(
        '🔄 QueryParams changed, fetching data (hydration from parent)'
      );

      // Update internal state from new queryParams BEFORE fetching
      this.currentPage = curr.page || 1;
      this.pageSize = curr.size || 20;
      this.first = (this.currentPage - 1) * this.pageSize; // Update first index
      this.filters = curr.filters || {};
      this.sortBy = curr.sortBy;
      this.sortOrder = curr.sortOrder;

      this.fetchData(false); // Hydration from parent - NOT user-initiated
    }
  }

  /**
   * Deep equality check for query parameters
   * Prevents unnecessary re-fetching when params haven't actually changed
   *
   * @param a Previous query parameters
   * @param b Current query parameters
   * @returns true if parameters are deeply equal
   */
  private areQueryParamsEqual(
    a: TableQueryParams,
    b: TableQueryParams
  ): boolean {
    // Handle null/undefined cases
    if (!a && !b) return true;
    if (!a || !b) return false;

    // Compare primitive properties
    if (a.page !== b.page) {
      console.log('🔍 Page changed:', a.page, '→', b.page);
      return false;
    }

    if (a.size !== b.size) {
      console.log('🔍 Size changed:', a.size, '→', b.size);
      return false;
    }

    if (a.sortBy !== b.sortBy) {
      console.log('🔍 SortBy changed:', a.sortBy, '→', b.sortBy);
      return false;
    }

    if (a.sortOrder !== b.sortOrder) {
      console.log('🔍 SortOrder changed:', a.sortOrder, '→', b.sortOrder);
      return false;
    }

    // Compare filters object (deep comparison)
    const aFilters = JSON.stringify(a.filters || {});
    const bFilters = JSON.stringify(b.filters || {});

    if (aFilters !== bFilters) {
      console.log('🔍 Filters changed:', a.filters, '→', b.filters);
      return false;
    }

    // All properties are equal
    return true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== DATA FETCHING ==========

  /**
   * Fetch table data from data source
   *
   * @param userInitiated - Whether this fetch was triggered by user interaction
   *                        (true) or by component hydration (false)
   *
   * IMPORTANT: Only emits queryParamsChange when userInitiated=true to prevent
   * circular feedback loops. See docs/bugfix-circular-fetch-loop.md
   */
  fetchData(userInitiated: boolean = false): void {
    if (this.isReorderingColumns) {
      return; // Don't fetch during column reordering
    }

    // Skip fetch if in data mode (pre-fetched data provided by parent)
    if (this.data !== undefined) {
      console.log('⏭️ Skipping fetch - using pre-fetched data from parent');
      return;
    }

    // Require dataSource in fetch mode
    if (!this.dataSource) {
      console.error(
        '❌ Cannot fetch: no dataSource provided and no pre-fetched data'
      );
      return;
    }

    this.isLoading = true;

    const params: TableQueryParams = {
      page: this.currentPage,
      size: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      filters: this.filters,
    };

    this.dataSource
      .fetch(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: TableResponse<T>) => {
          this.tableData = response.results;
          this.totalCount = response.total;
          this.isLoading = false;

          // Check if current sort column uses client-side sorting
          // If so, re-apply the sort after data loads (for hydration from URL)
          if (this.sortBy && this.sortOrder) {
            const column = this.columns.find((col) => col.key === this.sortBy);
            if (column && column.clientSideSort) {
              console.log(`🔄 Re-applying client-side sort on hydration: ${this.sortBy} ${this.sortOrder}`);
              this.sortTableDataClientSide(this.sortBy, this.sortOrder);
            }
          }

          // Trigger change detection (required for OnPush strategy)
          this.cdr.markForCheck();

          // Always emit dataLoaded (for components that need to know when data arrives)
          this.dataLoaded.emit();

          // Only emit to parent if this was user-initiated (not hydration)
          // Prevents circular feedback loop with ResultsTableComponent
          if (userInitiated) {
            console.log(
              '✅ User-initiated fetch complete, emitting queryParamsChange'
            );
            this.queryParamsChange.emit(params);
          } else {
            console.log(
              '⏭️ Hydration fetch complete, NOT emitting queryParamsChange (prevents circular loop)'
            );
          }
        },
        error: (error) => {
          console.error('Failed to fetch table data:', error);
          this.isLoading = false;
          // Trigger change detection on error as well
          this.cdr.markForCheck();
        },
      });
  }

  // ========== PERSISTENCE ==========

  loadPreferences(): void {
    const prefs = this.persistenceService.loadPreferences(this.tableId);
    if (prefs) {
      // Apply column order
      if (prefs.columnOrder && prefs.columnOrder.length > 0) {
        this.applyColumnOrder(prefs.columnOrder);
      }

      // Apply column visibility
      if (prefs.visibleColumns && prefs.visibleColumns.length > 0) {
        this.applyColumnVisibility(prefs.visibleColumns);
      }

      // Apply page size
      if (prefs.pageSize) {
        this.pageSize = prefs.pageSize;
      }
    }
  }

  savePreferences(): void {
    const columnOrder = this.columns.map((col) => col.key);
    const visibleColumns = this.columns
      .filter((col) => col.visible !== false)
      .map((col) => col.key);

    console.log('💾 BaseDataTable: savePreferences() called', {
      columnOrder,
      visibleColumns,
      allColumns: this.columns.map((c) => ({ key: c.key, visible: c.visible })),
    });

    this.persistenceService.savePreferences(this.tableId, {
      columnOrder,
      visibleColumns,
      pageSize: this.pageSize,
      lastUpdated: Date.now(),
    });

    // Manually trigger change detection for OnPush
    this.cdr.markForCheck();

    console.log('✅ BaseDataTable: markForCheck() called');
  }

  applyColumnOrder(order: string[]): void {
    const orderedColumns: TableColumn<T>[] = [];
    order.forEach((key) => {
      const col = this.columns.find((c) => c.key === key);
      if (col) {
        orderedColumns.push(col);
      }
    });

    // Add any columns not in saved order (new columns)
    this.columns.forEach((col) => {
      if (!orderedColumns.find((c) => c.key === col.key)) {
        orderedColumns.push(col);
      }
    });

    this.columns = orderedColumns;
  }

  applyColumnVisibility(visibleKeys: string[]): void {
    this.columns.forEach((col) => {
      col.visible = visibleKeys.includes(col.key);
    });
  }

  // ========== PAGINATION ==========

  onPageChange(page: number): void {
    this.currentPage = page;
    this.first = (page - 1) * this.pageSize; // Update first index

    // In data mode, emit event to parent instead of fetching
    if (this.data !== undefined) {
      const params: TableQueryParams = {
        page: this.currentPage,
        size: this.pageSize,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        filters: this.filters,
      };
      console.log(
        '📄 onPageChange (data mode): Emitting queryParamsChange:',
        params
      );
      this.queryParamsChange.emit(params);
    } else {
      // dataSource mode: fetch directly
      this.fetchData(true); // User-initiated: clicked pagination
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
    this.first = 0; // Reset first index
    this.savePreferences();

    // In data mode, emit event to parent instead of fetching
    if (this.data !== undefined) {
      const params: TableQueryParams = {
        page: this.currentPage,
        size: this.pageSize,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        filters: this.filters,
      };
      console.log(
        '📄 onPageSizeChange (data mode): Emitting queryParamsChange:',
        params
      );
      this.queryParamsChange.emit(params);
    } else {
      // dataSource mode: fetch directly
      this.fetchData(true); // User-initiated: changed page size
    }
  }

  /**
   * Handle PrimeNG p-table pagination event
   * Event structure: { first: number, rows: number, page: number, pageCount: number }
   */
  onPrimeNgPageChange(event: any): void {
    console.log('📄 onPrimeNgPageChange:', event);
    console.log(`📄 Before: currentPage=${this.currentPage}, pageSize=${this.pageSize}, first=${this.first}`);

    const newPage = event.page + 1; // PrimeNG uses 0-indexed pages
    const newSize = event.rows;
    const newFirst = event.first;

    console.log(`📄 Event values: page=${event.page}, rows=${event.rows}, first=${event.first}`);
    console.log(`📄 Calculated: newPage=${newPage}, newSize=${newSize}, newFirst=${newFirst}`);

    // Validate values
    if (isNaN(newFirst) || isNaN(newSize) || isNaN(newPage)) {
      console.error('❌ Invalid pagination values!', { newFirst, newSize, newPage });
      return;
    }

    // Update first index
    this.first = newFirst;

    // Check if page size changed
    if (newSize !== this.pageSize) {
      console.log(`📄 Page size changed: ${this.pageSize} → ${newSize}`);
      this.onPageSizeChange(newSize);
    } else if (newPage !== this.currentPage) {
      console.log(`📄 Page changed: ${this.currentPage} → ${newPage}`);
      this.onPageChange(newPage);
    }

    console.log(`📄 After: currentPage=${this.currentPage}, pageSize=${this.pageSize}, first=${this.first}`);
  }

  /**
   * Handle PrimeNG p-table row expand event
   */
  onPrimeNgRowExpand(event: any): void {
    const row = event.data;
    const key = this.getRowKey(row);

    // Update our tracking
    this.expandedRowSet.add(key);
    this.expandedRowsMap[key] = true;

    // Emit to parent
    this.rowExpand.emit(row);
  }

  /**
   * Handle PrimeNG p-table row collapse event
   */
  onPrimeNgRowCollapse(event: any): void {
    const row = event.data;
    const key = this.getRowKey(row);

    // Update our tracking
    this.expandedRowSet.delete(key);
    delete this.expandedRowsMap[key];

    // Emit to parent
    this.rowCollapse.emit(row);
  }

  /**
   * Handle PrimeNG p-table sort event
   * Event structure: { field: string, order: number (1=asc, -1=desc, null=unsorted) }
   */
  onPrimeNgSort(event: any): void {
    if (!event.field || event.order === null) {
      // Sort cleared
      this.sortBy = undefined;
      this.sortOrder = undefined;
    } else {
      this.sortBy = event.field;
      this.sortOrder = event.order === 1 ? 'asc' : 'desc';
    }

    // Check if this column uses client-side sorting
    const column = this.columns.find((col) => col.key === this.sortBy);
    if (column && column.clientSideSort && this.sortBy && this.sortOrder) {
      console.log(`🔄 Client-side sorting by ${this.sortBy} (${this.sortOrder})`);
      this.sortTableDataClientSide(this.sortBy, this.sortOrder);

      // Still emit state change to update URL (but don't fetch from server)
      if (this.data !== undefined) {
        const params: TableQueryParams = {
          page: this.currentPage,
          size: this.pageSize,
          sortBy: this.sortBy,
          sortOrder: this.sortOrder,
          filters: this.filters,
        };
        console.log('📄 Client-side sort: Emitting queryParamsChange to update URL:', params);
        this.queryParamsChange.emit(params);
      }
      return; // Don't fetch from server
    }

    // Server-side sorting: In data mode, emit event to parent instead of fetching
    if (this.data !== undefined) {
      const params: TableQueryParams = {
        page: this.currentPage,
        size: this.pageSize,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        filters: this.filters,
      };
      console.log('📄 onPrimeNgSort (data mode): Emitting queryParamsChange:', params);
      this.queryParamsChange.emit(params);
    } else {
      // dataSource mode: fetch directly
      this.fetchData(true); // User-initiated: clicked column header
    }
  }

  // ========== SORTING ==========

  onSort(columnKey: string): void {
    if (this.sortBy === columnKey) {
      // Toggle sort order
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // New sort column
      this.sortBy = columnKey;
      this.sortOrder = 'asc';
    }

    // Check if this column uses client-side sorting
    const column = this.columns.find((col) => col.key === columnKey);
    if (column && column.clientSideSort) {
      console.log(`🔄 Client-side sorting by ${columnKey} (${this.sortOrder})`);
      this.sortTableDataClientSide(columnKey, this.sortOrder || 'asc');

      // Still emit state change to update URL (but don't fetch from server)
      if (this.data !== undefined) {
        const params: TableQueryParams = {
          page: this.currentPage,
          size: this.pageSize,
          sortBy: this.sortBy,
          sortOrder: this.sortOrder,
          filters: this.filters,
        };
        console.log('📄 Client-side sort: Emitting queryParamsChange to update URL:', params);
        this.queryParamsChange.emit(params);
      }
      return; // Don't fetch from server
    }

    // Server-side sorting: In data mode, emit event to parent instead of fetching
    if (this.data !== undefined) {
      const params: TableQueryParams = {
        page: this.currentPage,
        size: this.pageSize,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        filters: this.filters,
      };
      console.log('📄 onSort (data mode): Emitting queryParamsChange:', params);
      this.queryParamsChange.emit(params);
    } else {
      // dataSource mode: fetch directly
      this.fetchData(true); // User-initiated: clicked column header
    }
  }

  /**
   * Sort the current page of data client-side
   * Used for computed fields that can't be sorted server-side
   */
  private sortTableDataClientSide(columnKey: string, sortOrder: 'asc' | 'desc'): void {
    this.tableData.sort((a: any, b: any) => {
      const aValue = a[columnKey];
      const bValue = b[columnKey];

      // Handle null/undefined values (always sort to end)
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (sortOrder === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });

    // Trigger change detection
    this.cdr.markForCheck();
    console.log(`✅ Sorted ${this.tableData.length} rows by ${columnKey} ${sortOrder}`);
  }

  // ========== FILTERING ==========

  onFilterChange(columnKey: string, value: any): void {
    this.isInternalChange = true;
    if (value === null || value === undefined || value === '') {
      delete this.filters[columnKey];
    } else {
      this.filters[columnKey] = value;
    }
    this.filterSubject$.next();
  }

  clearFilters(): void {
    this.filters = {};
    this.currentPage = 1;

    // In data mode, emit event to parent instead of fetching
    if (this.data !== undefined) {
      const params: TableQueryParams = {
        page: this.currentPage,
        size: this.pageSize,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        filters: this.filters,
      };
      console.log(
        '📄 clearFilters (data mode): Emitting queryParamsChange:',
        params
      );
      this.queryParamsChange.emit(params);
    } else {
      // dataSource mode: fetch directly
      this.fetchData(true); // User-initiated: clicked clear filters
    }
  }

  // ========== RANGE FILTERING ==========

  /**
   * Handle minimum value change for range filter
   */
  onRangeMinChange(columnKey: string, minValue: number, rangeConfig: any): void {
    this.isInternalChange = true;

    const maxValue = this.filters[`${columnKey}Max`] || rangeConfig?.max || 100;

    // Store range as object with min/max keys
    this.filters[columnKey] = { min: minValue, max: maxValue };

    // Store individual min/max values for API
    this.filters[`${columnKey}Min`] = minValue;
    this.filters[`${columnKey}Max`] = maxValue;

    this.filterSubject$.next();
  }

  /**
   * Handle maximum value change for range filter
   */
  onRangeMaxChange(columnKey: string, maxValue: number, rangeConfig: any): void {
    this.isInternalChange = true;

    const minValue = this.filters[`${columnKey}Min`] || rangeConfig?.min || 0;

    // Store range as object with min/max keys
    this.filters[columnKey] = { min: minValue, max: maxValue };

    // Store individual min/max values for API
    this.filters[`${columnKey}Min`] = minValue;
    this.filters[`${columnKey}Max`] = maxValue;

    this.filterSubject$.next();
  }

  /**
   * Format number as currency for display
   */
  formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) {
      return '';
    }
    return `$${value.toLocaleString()}`;
  }

  /**
   * Parse currency string back to number
   */
  parseCurrency = (value: string): string => {
    if (!value) {
      return '';
    }
    return value.replace(/\$\s?|(,*)/g, '');
  }

  /**
   * Format number as mileage for display (no currency symbol)
   */
  formatMileage = (value: number | null): string => {
    if (value === null || value === undefined) {
      return '';
    }
    return value.toLocaleString();
  }

  /**
   * Parse mileage string back to number
   */
  parseMileage = (value: string): string => {
    if (!value) {
      return '';
    }
    return value.replace(/,/g, '');
  }

  // ========== COLUMN MANAGEMENT ==========

  onColumnDrop(event: CdkDragDrop<TableColumn<T>[]>): void {
    this.isReorderingColumns = true;
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
    this.savePreferences();
    setTimeout(() => {
      this.isReorderingColumns = false;
    }, 100);

    console.log('🔴 BaseDataTable: onColumnDrop() END', {
      isReorderingColumns_AFTER: this.isReorderingColumns,
    });
  }

  onColumnDragStart(event: any): void {
    // Prevent the event from bubbling up to the grid
    if (event && event.source && event.source.element) {
      const nativeElement = event.source.element.nativeElement;
      // Add a flag to prevent grid from capturing
      nativeElement.classList.add('column-dragging');
    }
  }

  onHeaderMouseDown(event: MouseEvent): void {
    // Stop the mousedown event from reaching the grid container
    event.stopPropagation();
  }

  toggleColumnVisibility(columnKey: string): void {
    const column = this.columns.find((col) => col.key === columnKey);
    if (column) {
      column.visible = !column.visible;
      this.savePreferences();
    }
  }

  openColumnManager(): void {
    this.columnManagerVisible = true;
  }

  closeColumnManager(): void {
    this.columnManagerVisible = false;
  }

  resetColumns(): void {
    console.log('🔄 Reset Columns clicked');

    // Remove saved preferences from localStorage
    this.persistenceService.resetPreferences(this.tableId);
    console.log('✅ localStorage cleared for tableId:', this.tableId);

    // Recreate columns array from original definitions
    if (this.originalColumnDefinitions.length > 0) {
      this.columns = this.originalColumnDefinitions.map((col) => ({ ...col }));
      console.log(
        '✅ Columns restored to original order:',
        this.columns.map((c) => c.key)
      );

      // Trigger change detection
      this.cdr.markForCheck();
    } else {
      console.warn('⚠️ No original column definitions found');
    }
  }

  getVisibleColumns(): TableColumn<T>[] {
    return this.columns.filter((col) => col.visible !== false);
  }

  // ========== ROW EXPANSION ==========

  /**
   * Get the key for a row (uses row.key if available, falls back to row itself)
   */
  private getRowKey(row: T): any {
    return (row as any).key !== undefined ? (row as any).key : row;
  }

  isRowExpanded(row: T): boolean {
    const key = this.getRowKey(row);
    return this.expandedRowSet.has(key);
  }

  toggleRowExpansion(row: T): void {
    const key = this.getRowKey(row);
    if (this.expandedRowSet.has(key)) {
      this.expandedRowSet.delete(key);
      delete this.expandedRowsMap[key];
      this.rowCollapse.emit(row);
    } else {
      this.expandedRowSet.add(key);
      this.expandedRowsMap[key] = true;
      this.rowExpand.emit(row);
    }

    // Force change detection for PrimeNG p-table
    this.cdr.markForCheck();
  }

  /**
   * Expand all rows
   */
  public expandAllRows(): void {
    console.log('🔽 BaseDataTable: Expanding all rows');
    this.tableData.forEach((row) => {
      const key = this.getRowKey(row);
      this.expandedRowSet.add(key);
      this.expandedRowsMap[key] = true;
    });
    this.cdr.markForCheck();
    console.log('✅ Expanded rows:', this.expandedRowSet.size);
  }

  /**
   * Collapse all rows
   */
  public collapseAllRows(): void {
    console.log('🔼 BaseDataTable: Collapsing all rows');
    this.expandedRowSet.clear();
    this.expandedRowsMap = {};
    this.cdr.markForCheck();
    console.log('✅ Collapsed all rows');
  }

  onExpandAll(): void {
    this.expandAll.emit();
  }

  onCollapseAll(): void {
    this.collapseAll.emit();
  }

  // ========== UTILITY ==========

  trackByKey(index: number, column: TableColumn<T>): string {
    return column.key;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getFilterCount(): number {
    return Object.keys(this.filters).length;
  }
}

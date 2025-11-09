import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { BaseDataTableComponent } from './base-data-table.component';
import { TableStatePersistenceService, TablePreferences } from '../../services/table-state-persistence.service';
import { TableDataSource, TableColumn, TableQueryParams, TableResponse } from '../../models';

/**
 * Table Infrastructure Integration Tests
 *
 * Tests the integration of:
 * - BaseDataTableComponent
 * - TableStatePersistenceService
 * - TableDataSource implementations
 *
 * Tests table state persistence, pagination, sorting, filtering, and column management
 */
describe('Table Infrastructure Integration', () => {
  let component: BaseDataTableComponent<any>;
  let fixture: ComponentFixture<BaseDataTableComponent<any>>;
  let persistenceService: TableStatePersistenceService;
  let mockDataSource: jasmine.SpyObj<TableDataSource<any>>;

  const mockColumns: TableColumn<any>[] = [
    { key: 'id', label: 'ID', sortable: true, filterable: false, hideable: false, visible: true },
    { key: 'name', label: 'Name', sortable: true, filterable: true, hideable: true, visible: true },
    { key: 'email', label: 'Email', sortable: false, filterable: false, hideable: true, visible: true },
  ];

  const mockTableResponse: TableResponse<any> = {
    results: [
      { id: '1', name: 'John', email: 'john@example.com' },
      { id: '2', name: 'Jane', email: 'jane@example.com' },
    ],
    total: 2,
    page: 1,
    size: 20,
    totalPages: 1,
  };

  beforeEach(() => {
    mockDataSource = jasmine.createSpyObj('TableDataSource', ['fetch']);
    mockDataSource.fetch.and.returnValue(of(mockTableResponse));

    TestBed.configureTestingModule({
      declarations: [BaseDataTableComponent],
      providers: [TableStatePersistenceService],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(BaseDataTableComponent);
    component = fixture.componentInstance;
    persistenceService = TestBed.inject(TableStatePersistenceService);

    // Set required inputs
    component.columns = [...mockColumns];
    component.dataSource = mockDataSource;
    component.tableId = 'test-table';

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ========== Column Persistence ==========

  describe('Column Persistence', () => {
    it('should persist column visibility changes to localStorage', fakeAsync(() => {
      component.ngOnInit();
      tick();

      // Toggle email column visibility
      component.toggleColumnVisibility('email');
      tick();

      // Check localStorage
      const preferences = persistenceService.loadPreferences('test-table');
      expect(preferences).toBeDefined();
      expect(preferences!.visibleColumns).not.toContain('email');
      expect(preferences!.visibleColumns).toContain('id');
      expect(preferences!.visibleColumns).toContain('name');

      flush();
    }));

    it('should restore column visibility from localStorage on init', fakeAsync(() => {
      // Save preferences with email hidden
      const preferences: TablePreferences = {
        columnOrder: ['id', 'name', 'email'],
        visibleColumns: ['id', 'name'],
      };
      persistenceService.savePreferences('test-table', preferences);

      // Initialize component
      component.ngOnInit();
      tick();

      // Check that email is hidden
      const emailColumn = component.columns.find((c) => c.key === 'email');
      expect(emailColumn?.visible).toBe(false);

      flush();
    }));

    it('should persist page size to localStorage', fakeAsync(() => {
      component.ngOnInit();
      tick();

      // Change page size
      component.onPageSizeChange(50);
      tick();

      // Check localStorage
      const preferences = persistenceService.loadPreferences('test-table');
      expect(preferences?.pageSize).toBe(50);

      flush();
    }));

    it('should restore page size from localStorage on init', fakeAsync(() => {
      // Save preferences with page size 50
      const preferences: TablePreferences = {
        columnOrder: ['id', 'name', 'email'],
        visibleColumns: ['id', 'name', 'email'],
        pageSize: 50,
      };
      persistenceService.savePreferences('test-table', preferences);

      // Initialize component
      component.ngOnInit();
      tick();

      // Check that page size was restored
      expect(component.pageSize).toBe(50);

      flush();
    }));
  });

  // ========== Pagination Integration ==========

  describe('Pagination Integration', () => {
    it('should coordinate page change with data fetch in dataSource mode', fakeAsync(() => {
      component.ngOnInit();
      tick();
      mockDataSource.fetch.calls.reset();

      // Change page
      component.onPageChange(2);
      tick();

      // Verify fetch called with new page
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 2,
        })
      );

      flush();
    }));

    it('should emit queryParamsChange in data mode', fakeAsync(() => {
      // Switch to data mode
      component.dataSource = undefined;
      component.data = mockTableResponse.results;

      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.ngOnInit();
      tick();

      // Change page
      component.onPageChange(2);
      tick();

      // Verify emission
      expect(emitSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 2,
        })
      );

      flush();
    }));

    it('should handle PrimeNG pagination event structure', fakeAsync(() => {
      component.ngOnInit();
      tick();
      mockDataSource.fetch.calls.reset();

      // PrimeNG sends { first: number, rows: number }
      component.onPrimeNgPageChange({ first: 20, rows: 20 });
      tick();

      // Should translate to page 2
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 2,
        })
      );

      flush();
    }));
  });

  // ========== Sorting Integration ==========

  describe('Sorting Integration', () => {
    it('should coordinate server-side sort with data fetch', fakeAsync(() => {
      component.ngOnInit();
      tick();
      mockDataSource.fetch.calls.reset();

      // Sort by name
      component.onSort('name');
      tick();

      // Verify fetch called with sort params
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );

      flush();
    }));

    it('should handle PrimeNG sort event structure', fakeAsync(() => {
      component.ngOnInit();
      tick();
      mockDataSource.fetch.calls.reset();

      // PrimeNG sends { field: string, order: 1 | -1 }
      component.onPrimeNgSort({ field: 'name', order: 1 });
      tick();

      // Verify fetch called with sort params
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );

      flush();
    }));

    it('should handle client-side sort for columns marked clientSideSort', fakeAsync(() => {
      component.columns[1].clientSideSort = true;
      component.ngOnInit();
      tick();

      // Load initial data
      component.tableData = [
        { id: '1', name: 'Zebra', email: 'z@example.com' },
        { id: '2', name: 'Apple', email: 'a@example.com' },
      ];

      mockDataSource.fetch.calls.reset();

      // Sort by name (client-side)
      component.onSort('name');
      tick();

      // Should NOT call data source (client-side sort)
      expect(mockDataSource.fetch).not.toHaveBeenCalled();

      // Verify data sorted in place
      expect(component.tableData[0].name).toBe('Apple');
      expect(component.tableData[1].name).toBe('Zebra');

      flush();
    }));

    it('should toggle sort order on second click', fakeAsync(() => {
      component.ngOnInit();
      tick();
      mockDataSource.fetch.calls.reset();

      // First click: asc
      component.onSort('name');
      tick();
      expect(component.sortBy).toBe('name');
      expect(component.sortOrder).toBe('asc');

      mockDataSource.fetch.calls.reset();

      // Second click: desc
      component.onSort('name');
      tick();
      expect(component.sortBy).toBe('name');
      expect(component.sortOrder).toBe('desc');

      flush();
    }));
  });

  // ========== Filtering Integration ==========

  describe('Filtering Integration', () => {
    it('should coordinate filter changes with data fetch after debounce', fakeAsync(() => {
      component.ngOnInit();
      tick();
      mockDataSource.fetch.calls.reset();

      // Apply filter
      component.onFilterChange('name', 'John');

      // Wait for debounce (400ms)
      tick(400);

      // Verify fetch called with filter
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          filters: jasmine.objectContaining({
            name: 'John',
          }),
        })
      );

      flush();
    }));

    it('should reset to page 1 when filters change', fakeAsync(() => {
      component.ngOnInit();
      tick();

      // Go to page 2
      component.onPageChange(2);
      tick();

      mockDataSource.fetch.calls.reset();

      // Apply filter
      component.onFilterChange('name', 'John');
      tick(400); // Debounce

      // Verify reset to page 1
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 1,
        })
      );

      flush();
    }));

    it('should preserve filter when paginating (BUG REGRESSION TEST: Filter lost on page change)', fakeAsync(() => {
      component.ngOnInit();
      tick();

      // STEP 1: Apply filter first (e.g., Body Class = "Sedan")
      component.onFilterChange('bodyClass', 'Sedan');
      tick(400); // Wait for debounce

      // Verify filter was applied
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 1,
          filters: jasmine.objectContaining({
            bodyClass: 'Sedan',
          }),
        })
      );

      mockDataSource.fetch.calls.reset();

      // STEP 2: Now paginate to page 2
      component.onPageChange(2);
      tick();

      // STEP 3: CRITICAL ASSERTION - Filter MUST be preserved in pagination request
      // BUG: Application was making 2 API calls (one without filter, one with filter)
      // EXPECTED: Only 1 API call with BOTH page=2 AND filter preserved
      expect(mockDataSource.fetch).toHaveBeenCalledTimes(1);
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 2,
          filters: jasmine.objectContaining({
            bodyClass: 'Sedan',
          }),
        })
      );

      flush();
    }));

    it('should debounce rapid filter changes', fakeAsync(() => {
      component.ngOnInit();
      tick();
      mockDataSource.fetch.calls.reset();

      // Apply multiple filters rapidly
      component.onFilterChange('name', 'J');
      tick(100);

      component.onFilterChange('name', 'Jo');
      tick(100);

      component.onFilterChange('name', 'John');
      tick(400);

      // Should only call fetch once with final value
      expect(mockDataSource.fetch).toHaveBeenCalledTimes(1);
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          filters: jasmine.objectContaining({
            name: 'John',
          }),
        })
      );

      flush();
    }));

    it('should clear all filters when clearFilters is called', fakeAsync(() => {
      component.ngOnInit();
      tick();

      // Set some filters
      component.filters = { name: 'John', email: 'john@example.com' };
      mockDataSource.fetch.calls.reset();

      // Clear filters
      component.clearFilters();
      tick();

      // Verify filters cleared and fetch called
      expect(component.filters).toEqual({});
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          filters: {},
        })
      );

      flush();
    }));
  });

  // ========== Row Expansion Integration ==========

  describe('Row Expansion Integration', () => {
    it('should track expanded rows in expandedRowSet', fakeAsync(() => {
      component.expandable = true;
      component.ngOnInit();
      tick();

      const row = mockTableResponse.results[0];

      // Expand row
      component.toggleRowExpansion(row);
      tick();

      // Verify tracking
      expect(component.expandedRowSet.has(row)).toBe(true);
      expect(component.expandedRowsMap[row as any]).toBe(true);

      flush();
    }));

    it('should emit rowExpand event when row is expanded', fakeAsync(() => {
      component.expandable = true;
      const emitSpy = spyOn(component.rowExpand, 'emit');
      component.ngOnInit();
      tick();

      const row = mockTableResponse.results[0];
      component.toggleRowExpansion(row);
      tick();

      expect(emitSpy).toHaveBeenCalledWith(row);

      flush();
    }));

    it('should emit rowCollapse event when row is collapsed', fakeAsync(() => {
      component.expandable = true;
      const emitSpy = spyOn(component.rowCollapse, 'emit');
      component.ngOnInit();
      tick();

      const row = mockTableResponse.results[0];

      // Expand then collapse
      component.toggleRowExpansion(row);
      tick();
      component.toggleRowExpansion(row);
      tick();

      expect(emitSpy).toHaveBeenCalledWith(row);

      flush();
    }));

    it('should support expandAllRows and collapseAllRows', fakeAsync(() => {
      component.expandable = true;
      component.ngOnInit();
      tick();

      // Wait for data to load
      component.tableData = mockTableResponse.results;

      // Expand all
      component.expandAllRows();
      tick();

      expect(component.expandedRowSet.size).toBe(2);

      // Collapse all
      component.collapseAllRows();
      tick();

      expect(component.expandedRowSet.size).toBe(0);

      flush();
    }));
  });

  // ========== Data Mode Integration ==========

  describe('Data Mode Integration', () => {
    beforeEach(() => {
      component.dataSource = undefined;
      component.data = mockTableResponse.results;
      component.totalCount = mockTableResponse.total;
    });

    it('should work without dataSource (data mode)', fakeAsync(() => {
      component.ngOnInit();
      tick();

      expect(component.tableData).toEqual(mockTableResponse.results);
      expect(component.totalCount).toBe(2);

      flush();
    }));

    it('should emit queryParamsChange instead of fetching in data mode', fakeAsync(() => {
      const emitSpy = spyOn(component.queryParamsChange, 'emit');
      component.ngOnInit();
      tick();

      // Change page
      component.onPageChange(2);
      tick();

      // Should emit, not fetch
      expect(emitSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 2,
        })
      );

      flush();
    }));

    it('should update tableData when data input changes', fakeAsync(() => {
      component.ngOnInit();
      tick();

      // Simulate data input change
      const newData = [{ id: '3', name: 'Bob', email: 'bob@example.com' }];
      component.data = newData;
      component.ngOnChanges({
        data: {
          previousValue: mockTableResponse.results,
          currentValue: newData,
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      tick();

      expect(component.tableData).toEqual(newData);

      flush();
    }));
  });

  // ========== Column Management Integration ==========

  describe('Column Management Integration', () => {
    it('should reset columns to original state', fakeAsync(() => {
      component.ngOnInit();
      tick();

      // Modify columns
      component.toggleColumnVisibility('email');
      tick();

      // Reset
      component.resetColumns();
      tick();

      // Verify all columns visible again
      const emailColumn = component.columns.find((c) => c.key === 'email');
      expect(emailColumn?.visible).toBe(true);

      flush();
    }));

    it('should clear localStorage when resetting columns', fakeAsync(() => {
      component.ngOnInit();
      tick();

      // Save some preferences
      component.toggleColumnVisibility('email');
      tick();

      // Verify saved
      let preferences = persistenceService.loadPreferences('test-table');
      expect(preferences).toBeDefined();

      // Reset
      component.resetColumns();
      tick();

      // Verify cleared
      preferences = persistenceService.loadPreferences('test-table');
      expect(preferences).toBeNull();

      flush();
    }));
  });

  // ========== Query Params Hydration ==========

  describe('Query Params Hydration', () => {
    it('should hydrate from queryParams input on init', fakeAsync(() => {
      component.queryParams = {
        page: 3,
        size: 50,
        sortBy: 'name',
        sortOrder: 'desc',
        filters: { name: 'John' },
      };

      component.ngOnInit();
      tick();

      expect(component.currentPage).toBe(3);
      expect(component.pageSize).toBe(50);
      expect(component.sortBy).toBe('name');
      expect(component.sortOrder).toBe('desc');
      expect(component.filters).toEqual({ name: 'John' });

      flush();
    }));

    it('should not re-fetch when queryParams change to same values', fakeAsync(() => {
      component.queryParams = { page: 1, size: 20, filters: {} };
      component.ngOnInit();
      tick();

      mockDataSource.fetch.calls.reset();

      // Change queryParams to same values
      component.ngOnChanges({
        queryParams: {
          previousValue: { page: 1, size: 20, filters: {} },
          currentValue: { page: 1, size: 20, filters: {} },
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      tick();

      // Should not trigger fetch (no actual change)
      expect(mockDataSource.fetch).not.toHaveBeenCalled();

      flush();
    }));

    it('should fetch when queryParams actually change', fakeAsync(() => {
      component.queryParams = { page: 1, size: 20, filters: {} };
      component.ngOnInit();
      tick();

      mockDataSource.fetch.calls.reset();

      // Change queryParams to different values
      component.queryParams = { page: 2, size: 20, filters: {} };
      component.ngOnChanges({
        queryParams: {
          previousValue: { page: 1, size: 20, filters: {} },
          currentValue: { page: 2, size: 20, filters: {} },
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      tick();

      // Should trigger fetch
      expect(mockDataSource.fetch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 2,
        })
      );

      flush();
    }));
  });
});

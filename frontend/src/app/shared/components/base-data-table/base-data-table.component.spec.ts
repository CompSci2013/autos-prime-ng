import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangeDetectorRef, TemplateRef } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { of, throwError, Subject } from 'rxjs';

import { BaseDataTableComponent } from './base-data-table.component';
import { TableStatePersistenceService } from '../../services/table-state-persistence.service';
import { TableColumn } from '../../models/table-column.model';
import { TableDataSource, TableQueryParams, TableResponse } from '../../models/table-data-source.model';

describe('BaseDataTableComponent', () => {
  let component: BaseDataTableComponent<any>;
  let fixture: ComponentFixture<BaseDataTableComponent<any>>;
  let mockPersistenceService: jasmine.SpyObj<TableStatePersistenceService>;
  let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;

  const mockColumns: TableColumn<any>[] = [
    { key: 'id', label: 'ID', sortable: true, filterable: false, hideable: false, visible: true },
    { key: 'name', label: 'Name', sortable: true, filterable: true, hideable: true, visible: true },
    { key: 'count', label: 'Count', sortable: true, filterable: false, hideable: true, visible: true, clientSideSort: true },
  ];

  const mockTableData = [
    { id: 1, name: 'Item 1', count: 10 },
    { id: 2, name: 'Item 2', count: 5 },
    { id: 3, name: 'Item 3', count: 15 },
  ];

  beforeEach(() => {
    mockPersistenceService = jasmine.createSpyObj('TableStatePersistenceService', [
      'loadPreferences',
      'savePreferences',
      'resetPreferences',
    ]);

    mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck', 'detectChanges']);

    TestBed.configureTestingModule({
      declarations: [BaseDataTableComponent],
      providers: [
        { provide: TableStatePersistenceService, useValue: mockPersistenceService },
        { provide: ChangeDetectorRef, useValue: mockCdr },
      ],
    });

    fixture = TestBed.createComponent(BaseDataTableComponent);
    component = fixture.componentInstance;
    component.tableId = 'test-table';
    component.columns = [...mockColumns];
  });

  // ========== Component Initialization ==========

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.currentPage).toBe(1);
      expect(component.pageSize).toBe(20);
      expect(component.first).toBe(0);
      expect(component.expandedRowSet.size).toBe(0);
      expect(component.columnManagerVisible).toBe(false);
    });

    it('should load preferences on init', () => {
      const mockPrefs = {
        columnOrder: ['name', 'id', 'count'],
        visibleColumns: ['name', 'id'],
        pageSize: 50,
        lastUpdated: Date.now(),
      };
      mockPersistenceService.loadPreferences.and.returnValue(mockPrefs);

      component.ngOnInit();

      expect(mockPersistenceService.loadPreferences).toHaveBeenCalledWith('test-table');
      expect(component.pageSize).toBe(50);
    });

    it('should initialize pagination from queryParams', () => {
      component.queryParams = { page: 3, size: 50, filters: {} };

      component.ngOnInit();

      expect(component.currentPage).toBe(3);
      expect(component.pageSize).toBe(50);
      expect(component.first).toBe(100); // (3-1) * 50
    });

    it('should handle invalid queryParams with defaults', () => {
      component.queryParams = { page: -1, size: 0, filters: {} };

      component.ngOnInit();

      expect(component.currentPage).toBe(1);
      expect(component.pageSize).toBe(20);
    });

    it('should set up filter debouncing on init', fakeAsync(() => {
      component.ngOnInit();
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.onFilterChange('name', 'test');
      tick(300); // Less than debounce time
      expect(emitSpy).not.toHaveBeenCalled();

      tick(200); // Total 500ms, exceeds debounce time
      expect(component.currentPage).toBe(1); // Reset to first page
    }));
  });

  // ========== Data Fetching ==========

  describe('Data Fetching', () => {
    it('should fetch data using dataSource on init', () => {
      const mockResponse: TableResponse<any> = {
        results: mockTableData,
        total: 3,
        page: 1,
        size: 20,
        totalPages: 1,
      };

      const mockDataSource: TableDataSource<any> = {
        fetch: jasmine.createSpy('fetch').and.returnValue(of(mockResponse)),
      };

      component.dataSource = mockDataSource;
      component.ngOnInit();

      expect(mockDataSource.fetch).toHaveBeenCalled();
      expect(component.tableData).toEqual(mockTableData);
      expect(component.totalCount).toBe(3);
    });

    it('should skip fetch in data mode (pre-fetched)', () => {
      component.data = mockTableData;
      component.totalCount = 3;
      const fetchSpy = spyOn<any>(component, 'fetchData').and.callThrough();

      component.ngOnInit();

      expect(fetchSpy).toHaveBeenCalled();
      // fetchData should return early without making HTTP call
    });

    it('should emit queryParamsChange when user-initiated fetch', () => {
      const mockResponse: TableResponse<any> = {
        results: mockTableData,
        total: 3,
        page: 1,
        size: 20,
        totalPages: 1,
      };

      const mockDataSource: TableDataSource<any> = {
        fetch: jasmine.createSpy('fetch').and.returnValue(of(mockResponse)),
      };

      component.dataSource = mockDataSource;
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.ngOnInit(); // Hydration - should NOT emit
      expect(emitSpy).not.toHaveBeenCalled();

      component['fetchData'](true); // User-initiated - SHOULD emit
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', () => {
      const mockDataSource: TableDataSource<any> = {
        fetch: jasmine.createSpy('fetch').and.returnValue(
          throwError(() => new Error('Network error'))
        ),
      };

      component.dataSource = mockDataSource;
      spyOn(console, 'error');

      component.ngOnInit();

      expect(console.error).toHaveBeenCalledWith('Failed to fetch table data:', jasmine.any(Error));
      expect(component.isLoading).toBe(false);
    });

    it('should re-apply client-side sort after data fetch', () => {
      const mockResponse: TableResponse<any> = {
        results: [...mockTableData],
        total: 3,
        page: 1,
        size: 20,
        totalPages: 1,
      };

      const mockDataSource: TableDataSource<any> = {
        fetch: jasmine.createSpy('fetch').and.returnValue(of(mockResponse)),
      };

      component.dataSource = mockDataSource;
      component.sortBy = 'count';
      component.sortOrder = 'desc';

      component.ngOnInit();

      // Verify sort was applied (count: 15, 10, 5)
      expect(component.tableData[0].count).toBe(15);
      expect(component.tableData[2].count).toBe(5);
    });

    it('should not fetch during column reordering', () => {
      const mockDataSource: TableDataSource<any> = {
        fetch: jasmine.createSpy('fetch').and.returnValue(of({ results: [], total: 0, page: 1, size: 20, totalPages: 0 })),
      };

      component.dataSource = mockDataSource;
      component['isReorderingColumns'] = true;

      component['fetchData'](true);

      expect(mockDataSource.fetch).not.toHaveBeenCalled();
    });
  });

  // ========== ngOnChanges Lifecycle ==========

  describe('ngOnChanges - Data Input Changes', () => {
    it('should update tableData when data input changes', () => {
      const newData = [{ id: 4, name: 'Item 4', count: 20 }];

      component.ngOnChanges({
        data: {
          previousValue: mockTableData,
          currentValue: newData,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.tableData).toBe(newData);
      expect(mockCdr.detectChanges).toHaveBeenCalled();
    });

    it('should re-apply client-side sort on data change', () => {
      component.sortBy = 'count';
      component.sortOrder = 'asc';
      const unsortedData = [
        { id: 1, name: 'Item 1', count: 15 },
        { id: 2, name: 'Item 2', count: 5 },
        { id: 3, name: 'Item 3', count: 10 },
      ];

      component.ngOnChanges({
        data: {
          previousValue: [],
          currentValue: unsortedData,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      // Verify sort was applied (count: 5, 10, 15)
      expect(component.tableData[0].count).toBe(5);
      expect(component.tableData[2].count).toBe(15);
    });

    it('should update totalCount when input changes', () => {
      component.ngOnChanges({
        totalCount: {
          previousValue: 100,
          currentValue: 200,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should save original column definitions on first change', () => {
      component.ngOnChanges({
        columns: {
          previousValue: undefined,
          currentValue: mockColumns,
          firstChange: true,
          isFirstChange: () => true,
        },
      });

      expect(component['originalColumnDefinitions'].length).toBe(3);
      expect(component['originalColumnDefinitions'][0].key).toBe('id');
    });

    it('should reload preferences when columns change (not first change)', () => {
      component.ngOnChanges({
        columns: {
          previousValue: mockColumns,
          currentValue: [...mockColumns, { key: 'new', label: 'New', sortable: false, visible: true }],
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(mockPersistenceService.loadPreferences).toHaveBeenCalled();
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should skip queryParams change if first change', () => {
      const fetchSpy = spyOn<any>(component, 'fetchData');

      component.ngOnChanges({
        queryParams: {
          previousValue: undefined,
          currentValue: { page: 1, size: 20, filters: {} },
          firstChange: true,
          isFirstChange: () => true,
        },
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should skip queryParams change if deeply equal', () => {
      const params = { page: 1, size: 20, filters: { name: 'test' } };
      const fetchSpy = spyOn<any>(component, 'fetchData');

      component.ngOnChanges({
        queryParams: {
          previousValue: params,
          currentValue: { ...params, filters: { name: 'test' } },
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should fetch data when queryParams change (not equal)', () => {
      const fetchSpy = spyOn<any>(component, 'fetchData');

      component.ngOnChanges({
        queryParams: {
          previousValue: { page: 1, size: 20, filters: {} },
          currentValue: { page: 2, size: 20, filters: {} },
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.currentPage).toBe(2);
      expect(component.first).toBe(20);
      expect(fetchSpy).toHaveBeenCalledWith(false); // Hydration - not user-initiated
    });
  });

  // ========== Pagination ==========

  describe('Pagination', () => {
    it('should handle page change in data mode', () => {
      component.data = mockTableData;
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.onPageChange(3);

      expect(emitSpy).toHaveBeenCalledWith({
        page: 3,
        size: 20,
        sortBy: undefined,
        sortOrder: undefined,
        filters: {},
      });
    });

    it('should handle page change in dataSource mode', () => {
      const mockDataSource: TableDataSource<any> = {
        fetch: jasmine.createSpy('fetch').and.returnValue(of({ results: [], total: 0, page: 2, size: 20, totalPages: 5 })),
      };
      component.dataSource = mockDataSource;

      component.onPageChange(2);

      expect(component.currentPage).toBe(2);
      expect(component.first).toBe(20);
      expect(mockDataSource.fetch).toHaveBeenCalled();
    });

    it('should handle page size change and save preference', () => {
      component.data = mockTableData;
      mockPersistenceService.loadPreferences.and.returnValue({
        columnOrder: [],
        visibleColumns: [],
        pageSize: 20,
        lastUpdated: Date.now(),
      });
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.onPageSizeChange(50);

      expect(mockPersistenceService.savePreferences).toHaveBeenCalledWith(
        'test-table',
        jasmine.objectContaining({ pageSize: 50 })
      );
      expect(emitSpy).toHaveBeenCalledWith({
        page: 1, // Reset to first page
        size: 50,
        sortBy: undefined,
        sortOrder: undefined,
        filters: {},
      });
    });

    it('should handle PrimeNG pagination event', () => {
      const pageSpy = spyOn(component, 'onPageChange');
      const sizeSpy = spyOn(component, 'onPageSizeChange');

      // Page change only
      component.onPrimeNgPageChange({ first: 20, rows: 20 });
      expect(pageSpy).toHaveBeenCalledWith(2);

      // Page size change
      component.pageSize = 20;
      component.onPrimeNgPageChange({ first: 0, rows: 50 });
      expect(sizeSpy).toHaveBeenCalledWith(50);
    });

    it('should reject invalid PrimeNG pagination values', () => {
      spyOn(console, 'error');

      component.onPrimeNgPageChange({ first: -1, rows: 0 });

      expect(console.error).toHaveBeenCalledWith(
        '❌ Invalid pagination values!',
        jasmine.any(Object)
      );
    });
  });

  // ========== Sorting ==========

  describe('Sorting', () => {
    it('should toggle sort order on same column', () => {
      component.data = mockTableData;
      component.sortBy = 'name';
      component.sortOrder = 'asc';
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.onSort('name');

      expect(component.sortOrder).toBe('desc');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should set default sort order on new column', () => {
      component.data = mockTableData;
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.onSort('id');

      expect(component.sortBy).toBe('id');
      expect(component.sortOrder).toBe('asc');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should perform client-side sort for clientSideSort columns', () => {
      component.data = mockTableData;
      component.tableData = [...mockTableData];

      component.onSort('count'); // count column has clientSideSort: true

      // Verify sort was applied (count: 5, 10, 15)
      expect(component.tableData[0].count).toBe(5);
      expect(component.tableData[2].count).toBe(15);
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should handle PrimeNG sort event', () => {
      component.data = mockTableData;
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.onPrimeNgSort({ field: 'name', order: 1 });

      expect(component.sortBy).toBe('name');
      expect(component.sortOrder).toBe('asc');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should clear sort on null order', () => {
      component.data = mockTableData;
      component.sortBy = 'name';
      component.sortOrder = 'asc';

      component.onPrimeNgSort({ field: 'name', order: null });

      expect(component.sortBy).toBeUndefined();
      expect(component.sortOrder).toBeUndefined();
    });

    it('should sort strings case-insensitively', () => {
      const data = [
        { id: 1, name: 'Zebra', count: 1 },
        { id: 2, name: 'apple', count: 2 },
        { id: 3, name: 'Banana', count: 3 },
      ];
      component.tableData = [...data];

      component['sortTableDataClientSide']('name', 'asc');

      expect(component.tableData[0].name).toBe('apple');
      expect(component.tableData[1].name).toBe('Banana');
      expect(component.tableData[2].name).toBe('Zebra');
    });

    it('should handle null values in sort (always to end)', () => {
      const data = [
        { id: 1, name: 'Item 1', count: null },
        { id: 2, name: 'Item 2', count: 10 },
        { id: 3, name: 'Item 3', count: 5 },
      ];
      component.tableData = [...data];

      component['sortTableDataClientSide']('count', 'asc');

      expect(component.tableData[0].count).toBe(5);
      expect(component.tableData[1].count).toBe(10);
      expect(component.tableData[2].count).toBeNull();
    });
  });

  // ========== Filtering ==========

  describe('Filtering', () => {
    it('should add filter value', fakeAsync(() => {
      component.onFilterChange('name', 'test');

      expect(component.filters['name']).toBe('test');
      tick(500); // Debounce
      expect(component.currentPage).toBe(1); // Reset to first page
    }));

    it('should remove filter on empty value', () => {
      component.filters = { name: 'test' };

      component.onFilterChange('name', '');

      expect(component.filters['name']).toBeUndefined();
    });

    it('should clear all filters', () => {
      component.data = mockTableData;
      component.filters = { name: 'test', id: '1' };
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.clearFilters();

      expect(component.filters).toEqual({});
      expect(component.currentPage).toBe(1);
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should handle range filter min change', fakeAsync(() => {
      component.onRangeMinChange('price', 100, { min: 0, max: 1000 });

      expect(component.filters['priceMin']).toBe(100);
      expect(component.filters['price']).toEqual({ min: 100, max: 1000 });

      tick(500); // Debounce
    }));

    it('should handle range filter max change', fakeAsync(() => {
      component.filters['priceMin'] = 100;
      component.onRangeMaxChange('price', 500, { min: 0, max: 1000 });

      expect(component.filters['priceMax']).toBe(500);
      expect(component.filters['price']).toEqual({ min: 100, max: 500 });

      tick(500); // Debounce
    }));

    it('should format currency correctly', () => {
      expect(component.formatCurrency(1234.56)).toBe('$1,234.56');
      expect(component.formatCurrency(null)).toBe('');
    });

    it('should parse currency correctly', () => {
      expect(component.parseCurrency('$1,234.56')).toBe('1234.56');
      expect(component.parseCurrency('')).toBe('');
    });

    it('should format mileage correctly', () => {
      expect(component.formatMileage(12345)).toBe('12,345');
      expect(component.formatMileage(null)).toBe('');
    });

    it('should parse mileage correctly', () => {
      expect(component.parseMileage('12,345')).toBe('12345');
      expect(component.parseMileage('')).toBe('');
    });

    it('should return filter count', () => {
      component.filters = { name: 'test', id: '1', active: true };

      expect(component.getFilterCount()).toBe(3);
    });
  });

  // ========== Column Management ==========

  describe('Column Management', () => {
    it('should reorder columns on drag-drop', fakeAsync(() => {
      const event: CdkDragDrop<TableColumn<any>[]> = {
        previousIndex: 0,
        currentIndex: 2,
        item: null as any,
        container: null as any,
        previousContainer: null as any,
        isPointerOverContainer: true,
        distance: { x: 0, y: 0 },
        dropPoint: { x: 0, y: 0 },
        event: null as any,
      };

      component.onColumnDrop(event);

      expect(component.columns[2].key).toBe('id'); // Moved to end
      expect(mockPersistenceService.savePreferences).toHaveBeenCalled();

      tick(150); // Wait for isReorderingColumns flag reset
      expect(component['isReorderingColumns']).toBe(false);
    }));

    it('should toggle column visibility', () => {
      component.toggleColumnVisibility('name');

      expect(component.columns[1].visible).toBe(false);
      expect(mockPersistenceService.savePreferences).toHaveBeenCalled();
    });

    it('should open column manager', () => {
      component.openColumnManager();

      expect(component.columnManagerVisible).toBe(true);
    });

    it('should close column manager', () => {
      component.columnManagerVisible = true;

      component.closeColumnManager();

      expect(component.columnManagerVisible).toBe(false);
    });

    it('should reset columns to original order', () => {
      component['originalColumnDefinitions'] = [...mockColumns];
      component.columns = [mockColumns[2], mockColumns[0], mockColumns[1]]; // Reordered

      component.resetColumns();

      expect(mockPersistenceService.resetPreferences).toHaveBeenCalledWith('test-table');
      expect(component.columns[0].key).toBe('id'); // Back to original order
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should get only visible columns', () => {
      component.columns[1].visible = false;

      const visible = component.getVisibleColumns();

      expect(visible.length).toBe(2);
      expect(visible.find(c => c.key === 'name')).toBeUndefined();
    });

    it('should apply column order from preferences', () => {
      component['applyColumnOrder'](['count', 'name', 'id']);

      expect(component.columns[0].key).toBe('count');
      expect(component.columns[1].key).toBe('name');
      expect(component.columns[2].key).toBe('id');
    });

    it('should apply column visibility from preferences', () => {
      component['applyColumnVisibility'](['id', 'count']);

      expect(component.columns[0].visible).toBe(true); // id
      expect(component.columns[1].visible).toBe(false); // name (not in list)
      expect(component.columns[2].visible).toBe(true); // count
    });
  });

  // ========== Row Expansion ==========

  describe('Row Expansion', () => {
    it('should toggle row expansion', () => {
      const row = mockTableData[0];
      const expandSpy = spyOn(component.rowExpand, 'emit');

      component.toggleRowExpansion(row);

      expect(component.isRowExpanded(row)).toBe(true);
      expect(expandSpy).toHaveBeenCalledWith(row);
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should collapse expanded row on second toggle', () => {
      const row = mockTableData[0];
      const collapseSpy = spyOn(component.rowCollapse, 'emit');

      component.toggleRowExpansion(row); // Expand
      component.toggleRowExpansion(row); // Collapse

      expect(component.isRowExpanded(row)).toBe(false);
      expect(collapseSpy).toHaveBeenCalledWith(row);
    });

    it('should expand all rows', () => {
      component.tableData = mockTableData;

      component.expandAllRows();

      expect(component.expandedRowSet.size).toBe(3);
      expect(component.isRowExpanded(mockTableData[0])).toBe(true);
      expect(component.isRowExpanded(mockTableData[2])).toBe(true);
    });

    it('should collapse all rows', () => {
      component.tableData = mockTableData;
      component.expandAllRows();

      component.collapseAllRows();

      expect(component.expandedRowSet.size).toBe(0);
      expect(component.isRowExpanded(mockTableData[0])).toBe(false);
    });

    it('should handle PrimeNG row expand event', () => {
      const row = mockTableData[0];
      const expandSpy = spyOn(component.rowExpand, 'emit');

      component.onPrimeNgRowExpand({ data: row });

      expect(component.isRowExpanded(row)).toBe(true);
      expect(expandSpy).toHaveBeenCalledWith(row);
    });

    it('should handle PrimeNG row collapse event', () => {
      const row = mockTableData[0];
      component.toggleRowExpansion(row); // Expand first
      const collapseSpy = spyOn(component.rowCollapse, 'emit');

      component.onPrimeNgRowCollapse({ data: row });

      expect(component.isRowExpanded(row)).toBe(false);
      expect(collapseSpy).toHaveBeenCalledWith(row);
    });

    it('should emit expandAll event', () => {
      const emitSpy = spyOn(component.expandAll, 'emit');

      component.onExpandAll();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit collapseAll event', () => {
      const emitSpy = spyOn(component.collapseAll, 'emit');

      component.onCollapseAll();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  // ========== Utility Functions ==========

  describe('Utility Functions', () => {
    it('should compare query params for equality', () => {
      const params1 = { page: 1, size: 20, filters: { name: 'test' } };
      const params2 = { page: 1, size: 20, filters: { name: 'test' } };

      expect(component['areQueryParamsEqual'](params1, params2)).toBe(true);
    });

    it('should detect query param differences', () => {
      const params1 = { page: 1, size: 20, filters: {} };
      const params2 = { page: 2, size: 20, filters: {} };

      expect(component['areQueryParamsEqual'](params1, params2)).toBe(false);
    });

    it('should detect filter differences', () => {
      const params1 = { page: 1, size: 20, filters: { name: 'test' } };
      const params2 = { page: 1, size: 20, filters: { name: 'other' } };

      expect(component['areQueryParamsEqual'](params1, params2)).toBe(false);
    });

    it('should handle null/undefined in query param comparison', () => {
      expect(component['areQueryParamsEqual'](null as any, null as any)).toBe(true);
      expect(component['areQueryParamsEqual'](null as any, { page: 1, size: 20, filters: {} })).toBe(false);
    });

    it('should track columns by key', () => {
      const key = component.trackByKey(0, mockColumns[0]);

      expect(key).toBe('id');
    });

    it('should track by index', () => {
      const index = component.trackByIndex(5);

      expect(index).toBe(5);
    });
  });

  // ========== Component Cleanup ==========

  describe('Component Cleanup', () => {
    it('should complete subscriptions on destroy', () => {
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});

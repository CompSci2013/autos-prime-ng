import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  flush,
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, SimpleChange, ChangeDetectorRef } from '@angular/core';
import { BaseDataTableComponent } from './base-data-table.component';
import { ColumnManagerComponent } from '../column-manager/column-manager.component';
import { TableStatePersistenceService } from '../../services/table-state-persistence.service';
import { MockTableDataSource } from './mocks/mock-data-source';
import { createTestColumns } from './tests/test-helpers';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule, NzIconService } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTransferModule } from 'ng-zorro-antd/transfer';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TableColumn, TableQueryParams } from '../../models';
import { VehicleResult } from '../../../models';
import { of } from 'rxjs';

/**
 * BaseDataTableComponent Enhanced Test Suite
 *
 * Comprehensive tests for the generic, reusable base table component.
 *
 * Key Testing Areas:
 * - Initialization and inputs
 * - Query parameter hydration
 * - Data fetching and response handling
 * - Pagination
 * - Sorting
 * - Filtering (with debounce)
 * - Column management (reordering, visibility)
 * - Row expansion
 * - Table state persistence (localStorage)
 * - Change detection (OnPush strategy)
 * - Edge cases and error handling
 */
describe('BaseDataTableComponent', () => {
  let component: BaseDataTableComponent<VehicleResult>;
  let fixture: ComponentFixture<BaseDataTableComponent<VehicleResult>>;
  let mockDataSource: MockTableDataSource;
  let persistenceService: jasmine.SpyObj<TableStatePersistenceService>;

  beforeEach(async () => {
    // Create spy for persistence service with correct method names
    const persistenceSpy = jasmine.createSpyObj('TableStatePersistenceService', [
      'loadPreferences',
      'savePreferences',
      'resetPreferences',
    ]);

    // Mock NzIconService to prevent icon lookup errors
    const mockIconService = jasmine.createSpyObj('NzIconService', ['getRenderedContent']);
    mockIconService.getRenderedContent.and.callFake(() => {
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      return of(svgElement);
    });

    await TestBed.configureTestingModule({
      declarations: [BaseDataTableComponent, ColumnManagerComponent],
      imports: [
        FormsModule,
        HttpClientModule,
        DragDropModule,
        NzTableModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzEmptyModule,
        NzSpinModule,
        NzDrawerModule,
        NzTransferModule,
        NzAlertModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: TableStatePersistenceService, useValue: persistenceSpy },
        { provide: NzIconService, useValue: mockIconService },
      ],
      schemas: [NO_ERRORS_SCHEMA], // Suppress icon errors
    }).compileComponents();

    persistenceService = TestBed.inject(
      TableStatePersistenceService
    ) as jasmine.SpyObj<TableStatePersistenceService>;

    // Setup default return value for loadPreferences
    persistenceService.loadPreferences.and.returnValue(null);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BaseDataTableComponent) as ComponentFixture<
      BaseDataTableComponent<VehicleResult>
    >;
    component = fixture.componentInstance;

    // Setup required inputs
    mockDataSource = new MockTableDataSource();
    component.tableId = 'test-table';
    component.columns = createTestColumns();
    component.dataSource = mockDataSource;
    component.queryParams = {
      page: 1,
      size: 20,
      filters: {},
    };
  });

  /**
   * =========================================================================
   * COMPONENT INITIALIZATION
   * =========================================================================
   */
  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should have required inputs defined', () => {
      expect(component.tableId).toBe('test-table');
      expect(component.columns.length).toBeGreaterThan(0);
      expect(component.dataSource).toBeTruthy();
    });

    it('should initialize with default query params', () => {
      fixture.detectChanges(); // Trigger ngOnInit

      expect(component.currentPage).toBe(1);
      expect(component.pageSize).toBe(20);
      expect(component.filters).toEqual({});
    });

    it('should initialize expandedRowSet as empty Set', () => {
      expect(component.expandedRowSet).toBeInstanceOf(Set);
      expect(component.expandedRowSet.size).toBe(0);
    });

    it('should initialize with columnManagerVisible false', () => {
      expect(component.columnManagerVisible).toBe(false);
    });

    it('should initialize with default maxTableHeight', () => {
      expect(component.maxTableHeight).toBe('1200px');
    });

    it('should initialize with expandable false by default', () => {
      expect(component.expandable).toBe(false);
    });

    it('should initialize with loading false by default', () => {
      expect(component.loading).toBe(false);
    });
  });

  /**
   * =========================================================================
   * QUERY PARAMETER HYDRATION
   * =========================================================================
   */
  describe('Query Parameter Hydration from Input', () => {
    it('should hydrate state from queryParams input on ngOnInit', fakeAsync(() => {
      component.queryParams = {
        page: 3,
        size: 50,
        sortBy: 'year',
        sortOrder: 'desc',
        filters: { manufacturer: 'Ford' },
      };

      fixture.detectChanges();
      tick();

      expect(component.currentPage).toBe(3);
      expect(component.pageSize).toBe(50);
      expect(component.sortBy).toBe('year');
      expect(component.sortOrder).toBe('desc');
      expect(component.filters).toEqual({ manufacturer: 'Ford' });
    }));

    it('should use default values when queryParams are incomplete', fakeAsync(() => {
      component.queryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      fixture.detectChanges();
      tick();

      expect(component.currentPage).toBe(1);
      expect(component.pageSize).toBe(20);
      expect(component.sortBy).toBeUndefined();
      expect(component.sortOrder).toBeUndefined();
    }));

    it('should call fetchData on initialization', fakeAsync(() => {
      spyOn(component, 'fetchData');
      fixture.detectChanges();

      expect(component.fetchData).toHaveBeenCalled();
    }));
  });

  /**
   * =========================================================================
   * DATA FETCHING
   * =========================================================================
   */
  describe('Data Fetching', () => {
    it('should fetch data from dataSource on ngOnInit', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(mockDataSource.fetchCallCount).toBe(1);
      expect(component.tableData.length).toBeGreaterThan(0);
    }));

    it('should set isLoading to true during fetch', fakeAsync(() => {
      fixture.detectChanges();

      // Immediately after ngOnInit, should be loading
      expect(component.isLoading).toBe(true);

      tick();

      // After data returns, should not be loading
      expect(component.isLoading).toBe(false);
    }));

    it('should update totalCount from response', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(component.totalCount).toBeGreaterThan(0);
      expect(component.totalCount).toBe(mockDataSource.lastParams?.page === 1 ? 50 : component.totalCount);
    }));

    it('should emit queryParamsChange after successful fetch', fakeAsync(() => {
      spyOn(component.queryParamsChange, 'emit');

      fixture.detectChanges();
      tick();

      expect(component.queryParamsChange.emit).toHaveBeenCalled();
    }));

    it('should handle fetch errors gracefully', fakeAsync(() => {
      spyOn(console, 'error');
      spyOn(mockDataSource, 'fetch').and.returnValue(
        // Create an observable that errors
        new (require('rxjs').Observable)((subscriber: any) => {
          subscriber.error(new Error('Network error'));
        })
      );

      fixture.detectChanges();
      tick();

      expect(console.error).toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
    }));

    it('should not fetch during column reordering', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const initialCallCount = mockDataSource.fetchCallCount;

      // Set reordering flag
      (component as any).isReorderingColumns = true;

      component.fetchData();
      tick();

      expect(mockDataSource.fetchCallCount).toBe(initialCallCount);
    }));
  });

  /**
   * =========================================================================
   * PAGINATION
   * =========================================================================
   */
  describe('Pagination', () => {
    it('should handle page change', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const initialCallCount = mockDataSource.fetchCallCount;

      component.onPageChange(2);
      tick();

      expect(component.currentPage).toBe(2);
      expect(mockDataSource.fetchCallCount).toBe(initialCallCount + 1);
      expect(mockDataSource.lastParams?.page).toBe(2);
    }));

    it('should handle page size change', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onPageSizeChange(50);
      tick();

      expect(component.pageSize).toBe(50);
      expect(component.currentPage).toBe(1); // Should reset to first page
      expect(mockDataSource.lastParams?.size).toBe(50);
    }));

    it('should save preferences when page size changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onPageSizeChange(100);
      tick();

      expect(persistenceService.savePreferences).toHaveBeenCalled();
    }));

    it('should emit queryParamsChange when page changes', fakeAsync(() => {
      spyOn(component.queryParamsChange, 'emit');

      fixture.detectChanges();
      tick();

      component.onPageChange(3);
      tick();

      expect(component.queryParamsChange.emit).toHaveBeenCalledWith(
        jasmine.objectContaining({ page: 3 })
      );
    }));
  });

  /**
   * =========================================================================
   * SORTING
   * =========================================================================
   */
  describe('Sorting', () => {
    it('should sort ascending on first click', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onSort('manufacturer');
      tick();

      expect(component.sortBy).toBe('manufacturer');
      expect(component.sortOrder).toBe('asc');
    }));

    it('should toggle to descending on second click', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onSort('manufacturer');
      tick();

      component.onSort('manufacturer');
      tick();

      expect(component.sortBy).toBe('manufacturer');
      expect(component.sortOrder).toBe('desc');
    }));

    it('should reset sort when clicking different column', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onSort('manufacturer');
      tick();

      component.onSort('year');
      tick();

      expect(component.sortBy).toBe('year');
      expect(component.sortOrder).toBe('asc');
    }));

    it('should fetch data after sorting', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const initialCallCount = mockDataSource.fetchCallCount;

      component.onSort('year');
      tick();

      expect(mockDataSource.fetchCallCount).toBe(initialCallCount + 1);
    }));
  });

  /**
   * =========================================================================
   * FILTERING
   * =========================================================================
   */
  describe('Filtering', () => {
    it('should add filter when value is provided', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onFilterChange('manufacturer', 'Ford');
      tick(400); // Wait for debounce

      expect(component.filters['manufacturer']).toBe('Ford');
    }));

    it('should remove filter when value is empty', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onFilterChange('manufacturer', 'Ford');
      tick(400);

      component.onFilterChange('manufacturer', '');
      tick(400);

      expect(component.filters['manufacturer']).toBeUndefined();
    }));

    it('should remove filter when value is null', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onFilterChange('manufacturer', 'Ford');
      tick(400);

      component.onFilterChange('manufacturer', null);
      tick(400);

      expect(component.filters['manufacturer']).toBeUndefined();
    }));

    it('should debounce filter changes by 400ms', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const initialCallCount = mockDataSource.fetchCallCount;

      component.onFilterChange('manufacturer', 'F');
      tick(100);
      component.onFilterChange('manufacturer', 'Fo');
      tick(100);
      component.onFilterChange('manufacturer', 'For');
      tick(100);
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);

      // Should only fetch once after final debounce
      expect(mockDataSource.fetchCallCount).toBe(initialCallCount + 1);
    }));

    it('should reset to page 1 when filter changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.currentPage = 5;

      component.onFilterChange('manufacturer', 'Ford');
      tick(400);

      expect(component.currentPage).toBe(1);
    }));

    it('should clear all filters when clearFilters is called', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.filters = {
        manufacturer: 'Ford',
        model: 'F-150',
        year: 2020,
      };

      component.clearFilters();
      tick();

      expect(component.filters).toEqual({});
      expect(component.currentPage).toBe(1);
    }));

    it('should fetch data after clearing filters', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const initialCallCount = mockDataSource.fetchCallCount;

      component.clearFilters();
      tick();

      expect(mockDataSource.fetchCallCount).toBe(initialCallCount + 1);
    }));

    it('should return correct filter count', () => {
      component.filters = {
        manufacturer: 'Ford',
        model: 'F-150',
      };

      expect(component.getFilterCount()).toBe(2);
    });

    it('should return 0 filter count when no filters', () => {
      component.filters = {};
      expect(component.getFilterCount()).toBe(0);
    });
  });

  /**
   * =========================================================================
   * COLUMN MANAGEMENT - REORDERING
   * =========================================================================
   */
  describe('Column Reordering', () => {
    it('should reorder columns on drag and drop', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const originalOrder = component.columns.map((c) => c.key);

      const event: any = {
        previousIndex: 0,
        currentIndex: 2,
        item: {},
        container: {},
        previousContainer: {},
        isPointerOverContainer: true,
        distance: { x: 0, y: 0 },
      };

      component.onColumnDrop(event);
      tick(100);

      const newOrder = component.columns.map((c) => c.key);
      expect(newOrder).not.toEqual(originalOrder);
    }));

    it('should save preferences after column reorder', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const event: any = {
        previousIndex: 0,
        currentIndex: 2,
      };

      component.onColumnDrop(event);
      tick(100);

      expect(persistenceService.savePreferences).toHaveBeenCalled();
    }));

    it('should set and reset isReorderingColumns flag', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const event: any = {
        previousIndex: 0,
        currentIndex: 1,
      };

      expect((component as any).isReorderingColumns).toBe(false);

      component.onColumnDrop(event);

      expect((component as any).isReorderingColumns).toBe(true);

      tick(100);

      expect((component as any).isReorderingColumns).toBe(false);
    }));
  });

  /**
   * =========================================================================
   * COLUMN MANAGEMENT - VISIBILITY
   * =========================================================================
   */
  describe('Column Visibility', () => {
    it('should toggle column visibility', () => {
      fixture.detectChanges();

      const column = component.columns[1]; // manufacturer
      const initialVisibility = column.visible !== false;

      component.toggleColumnVisibility('manufacturer');

      expect(column.visible).toBe(!initialVisibility);
    });

    it('should save preferences after toggling visibility', () => {
      fixture.detectChanges();

      component.toggleColumnVisibility('manufacturer');

      expect(persistenceService.savePreferences).toHaveBeenCalled();
    });

    it('should return only visible columns from getVisibleColumns', () => {
      component.columns[1].visible = false;
      component.columns[2].visible = false;

      const visibleColumns = component.getVisibleColumns();

      expect(visibleColumns.length).toBe(component.columns.length - 2);
      expect(visibleColumns.some((c) => c.key === 'manufacturer')).toBe(false);
    });

    it('should open column manager drawer', () => {
      component.openColumnManager();
      expect(component.columnManagerVisible).toBe(true);
    });

    it('should close column manager drawer', () => {
      component.columnManagerVisible = true;
      component.closeColumnManager();
      expect(component.columnManagerVisible).toBe(false);
    });
  });

  /**
   * =========================================================================
   * TABLE STATE PERSISTENCE
   * =========================================================================
   */
  describe('Table State Persistence', () => {
    it('should load preferences on ngOnInit', () => {
      fixture.detectChanges();
      expect(persistenceService.loadPreferences).toHaveBeenCalledWith(
        'test-table'
      );
    });

    it('should apply column order from loaded preferences', fakeAsync(() => {
      const savedOrder = ['year', 'model', 'manufacturer', 'body_class', 'vehicle_id'];

      persistenceService.loadPreferences.and.returnValue({
        columnOrder: savedOrder,
        visibleColumns: savedOrder,
        pageSize: 20,
        lastUpdated: Date.now(),
      });

      fixture.detectChanges();
      tick();

      const currentOrder = component.columns.map((c) => c.key);
      expect(currentOrder[0]).toBe('year');
    }));

    it('should apply column visibility from loaded preferences', fakeAsync(() => {
      const visibleColumns = ['vehicle_id', 'manufacturer', 'model'];

      persistenceService.loadPreferences.and.returnValue({
        columnOrder: [],
        visibleColumns,
        pageSize: 20,
        lastUpdated: Date.now(),
      });

      fixture.detectChanges();
      tick();

      const yearColumn = component.columns.find((c) => c.key === 'year');
      expect(yearColumn?.visible).toBe(false);
    }));

    it('should apply page size from loaded preferences', fakeAsync(() => {
      persistenceService.loadPreferences.and.returnValue({
        columnOrder: [],
        visibleColumns: [],
        pageSize: 50,
        lastUpdated: Date.now(),
      });

      fixture.detectChanges();
      tick();

      expect(component.pageSize).toBe(50);
    }));

    it('should save preferences with correct structure', () => {
      fixture.detectChanges();

      component.savePreferences();

      expect(persistenceService.savePreferences).toHaveBeenCalledWith(
        'test-table',
        jasmine.objectContaining({
          columnOrder: jasmine.any(Array),
          visibleColumns: jasmine.any(Array),
          pageSize: jasmine.any(Number),
          lastUpdated: jasmine.any(Number),
        })
      );
    });

    it('should reset preferences and restore original columns', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // Modify columns
      component.columns[1].visible = false;

      component.resetColumns();

      expect(persistenceService.resetPreferences).toHaveBeenCalledWith(
        'test-table'
      );
    }));
  });

  /**
   * =========================================================================
   * ROW EXPANSION
   * =========================================================================
   */
  describe('Row Expansion', () => {
    it('should toggle row expansion state', () => {
      const row: any = { key: 'row-1', manufacturer: 'Ford' };

      expect(component.isRowExpanded(row)).toBe(false);

      component.toggleRowExpansion(row);

      expect(component.isRowExpanded(row)).toBe(true);

      component.toggleRowExpansion(row);

      expect(component.isRowExpanded(row)).toBe(false);
    });

    it('should emit rowExpand event when expanding', () => {
      spyOn(component.rowExpand, 'emit');
      const row: any = { key: 'row-1', manufacturer: 'Ford' };

      component.toggleRowExpansion(row);

      expect(component.rowExpand.emit).toHaveBeenCalledWith(row);
    });

    it('should emit rowCollapse event when collapsing', () => {
      spyOn(component.rowCollapse, 'emit');
      const row: any = { key: 'row-1', manufacturer: 'Ford' };

      component.toggleRowExpansion(row); // Expand
      component.toggleRowExpansion(row); // Collapse

      expect(component.rowCollapse.emit).toHaveBeenCalledWith(row);
    });

    it('should expand all rows', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.expandAllRows();

      expect(component.expandedRowSet.size).toBe(component.tableData.length);
    }));

    it('should collapse all rows', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.expandAllRows();
      component.collapseAllRows();

      expect(component.expandedRowSet.size).toBe(0);
    }));

    it('should emit expandAll event', () => {
      spyOn(component.expandAll, 'emit');
      component.onExpandAll();
      expect(component.expandAll.emit).toHaveBeenCalled();
    });

    it('should emit collapseAll event', () => {
      spyOn(component.collapseAll, 'emit');
      component.onCollapseAll();
      expect(component.collapseAll.emit).toHaveBeenCalled();
    });
  });

  /**
   * =========================================================================
   * ngOnChanges LIFECYCLE
   * =========================================================================
   */
  describe('ngOnChanges Lifecycle', () => {
    it('should save original column definitions on first change', fakeAsync(() => {
      const columns = createTestColumns();
      component.columns = columns;

      component.ngOnChanges({
        columns: new SimpleChange(null, columns, true),
      });

      expect((component as any).originalColumnDefinitions.length).toBe(
        columns.length
      );
    }));

    it('should skip fetch on first queryParams change', fakeAsync(() => {
      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      spyOn(component, 'fetchData');

      component.ngOnChanges({
        queryParams: new SimpleChange(null, params, true),
      });

      tick();

      expect(component.fetchData).not.toHaveBeenCalled();
    }));

    it('should fetch data when queryParams change after first change', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const initialCallCount = mockDataSource.fetchCallCount;

      const newParams: TableQueryParams = {
        page: 2,
        size: 20,
        filters: {},
      };

      component.queryParams = newParams;
      component.ngOnChanges({
        queryParams: new SimpleChange(
          { page: 1, size: 20, filters: {} },
          newParams,
          false
        ),
      });

      tick();

      expect(mockDataSource.fetchCallCount).toBeGreaterThan(initialCallCount);
    }));

    it('should skip fetch when queryParams are deeply equal', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const initialCallCount = mockDataSource.fetchCallCount;

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      component.ngOnChanges({
        queryParams: new SimpleChange(params, params, false),
      });

      tick();

      expect(mockDataSource.fetchCallCount).toBe(initialCallCount);
    }));
  });

  /**
   * =========================================================================
   * CHANGE DETECTION (OnPush Strategy)
   * =========================================================================
   */
  describe('Change Detection Strategy', () => {
    it('should use ChangeDetectionStrategy.OnPush', () => {
      const metadata = (BaseDataTableComponent as any).__annotations__[0];
      expect(metadata.changeDetection).toBe(2); // OnPush = 2
    });

    it('should call markForCheck after save preferences', () => {
      const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
      spyOn(cdr, 'markForCheck');

      component.savePreferences();

      expect(cdr.markForCheck).toHaveBeenCalled();
    });
  });

  /**
   * =========================================================================
   * UTILITY METHODS
   * =========================================================================
   */
  describe('Utility Methods', () => {
    it('should track columns by key', () => {
      const column = component.columns[0];
      expect(component.trackByKey(0, column)).toBe(column.key);
    });

    it('should track by index', () => {
      expect(component.trackByIndex(5)).toBe(5);
    });
  });

  /**
   * =========================================================================
   * LIFECYCLE HOOKS
   * =========================================================================
   */
  describe('Lifecycle Hooks', () => {
    it('should complete destroy$ subject on ngOnDestroy', () => {
      const destroySpy = jasmine.createSpyObj('Subject', ['next', 'complete']);
      (component as any).destroy$ = destroySpy;

      component.ngOnDestroy();

      expect(destroySpy.next).toHaveBeenCalled();
      expect(destroySpy.complete).toHaveBeenCalled();
    });
  });

  /**
   * =========================================================================
   * EDGE CASES
   * =========================================================================
   */
  describe('Edge Cases', () => {
    it('should handle missing column in applyColumnOrder', () => {
      const savedOrder = ['nonexistent-column', 'manufacturer'];

      persistenceService.loadPreferences.and.returnValue({
        columnOrder: savedOrder,
        visibleColumns: [],
        pageSize: 20,
        lastUpdated: Date.now(),
      });

      fixture.detectChanges();

      // Should not crash, columns should still exist
      expect(component.columns.length).toBeGreaterThan(0);
    });

    it('should handle toggleColumnVisibility for non-existent column', () => {
      expect(() => {
        component.toggleColumnVisibility('nonexistent-column');
      }).not.toThrow();
    });

    it('should handle very large page sizes', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onPageSizeChange(10000);
      tick();

      expect(component.pageSize).toBe(10000);
    }));

    it('should handle negative page numbers gracefully', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onPageChange(-1);
      tick();

      expect(component.currentPage).toBe(-1); // Let data source handle validation
    }));
  });
});

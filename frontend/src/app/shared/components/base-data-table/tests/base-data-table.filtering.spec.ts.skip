import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BaseDataTableComponent } from '../base-data-table.component';
import { TableColumn } from '../../../models/table-column.model';
import { TableQueryParams } from '../../../models/table-data-source.model';
import { TableStatePersistenceService } from '../../../services/table-state-persistence.service';

import { MockTableDataSource } from '../mocks/mock-data-source';
import { createTestColumns } from './test-helpers';
import { NzIconService } from 'ng-zorro-antd/icon';
import { of } from 'rxjs';

describe('BaseDataTableComponent - Filtering', () => {
  let component: BaseDataTableComponent<any>;
  let fixture: ComponentFixture<BaseDataTableComponent<any>>;
  let mockDataSource: MockTableDataSource;
  let mockPersistenceService: jasmine.SpyObj<TableStatePersistenceService>;

  beforeEach(async () => {
    mockDataSource = new MockTableDataSource();
    mockPersistenceService = jasmine.createSpyObj('TableStatePersistenceService', [
      'loadPreferences',
      'savePreferences',
      'resetPreferences'
    ]);

    // Mock NzIconService to prevent icon lookup errors
    const mockIconService = jasmine.createSpyObj('NzIconService', ['getRenderedContent']);
    mockIconService.getRenderedContent.and.callFake(() => {
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      return of(svgElement);
    });

    await TestBed.configureTestingModule({
      declarations: [BaseDataTableComponent],
      imports: [
        FormsModule
      ],
      providers: [
        { provide: TableStatePersistenceService, useValue: mockPersistenceService },
        { provide: NzIconService, useValue: mockIconService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(BaseDataTableComponent);
    component = fixture.componentInstance;
    
    component.tableId = 'test-table';
    component.columns = createTestColumns();
    component.dataSource = mockDataSource;
    component.queryParams = { page: 1, size: 20, filters: {} };
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Filter Input Handling', () => {
    it('should update filter state when input value changes', () => {
      component.onFilterChange('manufacturer', 'Ford');
      expect(component.filters['manufacturer']).toBe('Ford');
    });

    it('should remove filter when input is cleared', () => {
      component.filters['manufacturer'] = 'Ford';
      component.onFilterChange('manufacturer', '');
      expect(component.filters['manufacturer']).toBeUndefined();
    });

    it('should remove filter when value is null', () => {
      component.filters['manufacturer'] = 'Ford';
      component.onFilterChange('manufacturer', null);
      expect(component.filters['manufacturer']).toBeUndefined();
    });

    it('should remove filter when value is undefined', () => {
      component.filters['manufacturer'] = 'Ford';
      component.onFilterChange('manufacturer', undefined);
      expect(component.filters['manufacturer']).toBeUndefined();
    });
  });

  describe('Filter Debouncing', () => {
    it('should debounce filter changes', fakeAsync(() => {
      const fetchSpy = spyOn(mockDataSource, 'fetch').and.callThrough();
      
      fixture.detectChanges();
      tick();
      
      const initialCallCount = fetchSpy.calls.count();
      
      component.onFilterChange('manufacturer', 'F');
      tick(100);
      expect(fetchSpy.calls.count()).toBe(initialCallCount);

      tick(300);
      expect(fetchSpy.calls.count()).toBe(initialCallCount + 1);
    }));

    it('should only trigger one fetch for rapid filter changes', fakeAsync(() => {
      const fetchSpy = spyOn(mockDataSource, 'fetch').and.callThrough();
      
      fixture.detectChanges();
      tick();
      
      const initialCallCount = fetchSpy.calls.count();

      component.onFilterChange('manufacturer', 'F');
      tick(100);
      component.onFilterChange('manufacturer', 'Fo');
      tick(100);
      component.onFilterChange('manufacturer', 'For');
      tick(100);
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);

      expect(fetchSpy.calls.count()).toBe(initialCallCount + 1);
    }));
  });

  describe('Filter Query Param Emission', () => {
    it('should emit queryParamsChange with filters', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.onFilterChange('manufacturer', 'Ford');
      tick(400);

      expect(emitSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          filters: jasmine.objectContaining({ manufacturer: 'Ford' })
        })
      );
    }));

    it('should reset to page 1 when filter changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      component.currentPage = 5;
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.onFilterChange('manufacturer', 'Ford');
      tick(400);

      expect(emitSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 1
        })
      );
    }));
  });

  describe('Multiple Filter Handling', () => {
    it('should handle multiple active filters', fakeAsync(() => {
      const fetchSpy = spyOn(mockDataSource, 'fetch').and.callThrough();
      
      fixture.detectChanges();
      tick();
      
      fetchSpy.calls.reset();

      component.onFilterChange('manufacturer', 'Ford');
      tick(400);
      
      expect(fetchSpy.calls.count()).toBe(1);
      
      component.onFilterChange('model', 'F-150');
      tick(400);

      expect(component.filters['manufacturer']).toBe('Ford');
      expect(component.filters['model']).toBe('F-150');
      expect(fetchSpy.calls.count()).toBe(2);
    }));

    it('should preserve existing filters when adding new ones', () => {
      component.filters['manufacturer'] = 'Ford';
      component.onFilterChange('model', 'F-150');

      expect(component.filters['manufacturer']).toBe('Ford');
      expect(component.filters['model']).toBe('F-150');
    });
  });

  describe('Clear Filters', () => {
    it('should clear all filters when clearFilters is called', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      component.filters = { manufacturer: 'Ford', model: 'F-150', year: 2020 };
      
      component.clearFilters();
      tick();

      expect(Object.keys(component.filters).length).toBe(0);
    }));

    it('should emit queryParamsChange after clearing filters', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      component.filters = { manufacturer: 'Ford' };
      const emitSpy = spyOn(component.queryParamsChange, 'emit');

      component.clearFilters();
      tick();

      expect(emitSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          filters: {}
        })
      );
    }));

    it('should reset to page 1 after clearing filters', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      component.currentPage = 5;
      component.filters = { manufacturer: 'Ford' };
      
      component.clearFilters();
      tick();

      expect(component.currentPage).toBe(1);
    }));
  });

  describe('Data Source Integration', () => {
    it('should pass filters to data source fetch', fakeAsync(() => {
      const fetchSpy = spyOn(mockDataSource, 'fetch').and.callThrough();
      
      fixture.detectChanges();
      tick();
      
      fetchSpy.calls.reset();

      component.onFilterChange('manufacturer', 'Ford');
      tick(400);

      expect(fetchSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          filters: jasmine.objectContaining({ manufacturer: 'Ford' })
        })
      );
    }));

    it('should update table data after filtering', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      
      expect(component.tableData.length).toBe(5);
      
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);
      fixture.detectChanges();

      expect(component.tableData.length).toBe(2);
      expect(component.tableData.every(item => item.manufacturer === 'Ford')).toBe(true);
    }));
  });

  describe('Internal vs External Query Param Changes', () => {
    it('should NOT skip fetch when user types in filter repeatedly (internal changes)', fakeAsync(() => {
      const fetchSpy = spyOn(mockDataSource, 'fetch').and.callThrough();
      
      fixture.detectChanges();
      tick();
      
      fetchSpy.calls.reset();

      // First filter change
      component.onFilterChange('manufacturer', 'Ford');
      tick(400);
      expect(fetchSpy.calls.count()).toBe(1);
      
      // Second filter change - should still fetch!
      component.onFilterChange('manufacturer', 'Toyota');
      tick(400);
      expect(fetchSpy.calls.count()).toBe(2);
      
      // Third filter change - should still fetch!
      component.onFilterChange('manufacturer', 'Honda');
      tick(400);
      expect(fetchSpy.calls.count()).toBe(3);
    }));

    it('SHOULD skip fetch when parent sends identical queryParams back (external change)', fakeAsync(() => {
      const fetchSpy = spyOn(mockDataSource, 'fetch').and.callThrough();
      
      fixture.detectChanges();
      tick();
      
      fetchSpy.calls.reset();

      // Simulate parent sending same params back
      const sameParams = { page: 1, size: 20, filters: {} };
      component.queryParams = sameParams;
      component.ngOnChanges({
        queryParams: {
          previousValue: sameParams,
          currentValue: sameParams,
          firstChange: false,
          isFirstChange: () => false
        }
      });
      tick();
      
      // Should NOT fetch because params didn't actually change
      expect(fetchSpy.calls.count()).toBe(0);
    }));
  });
});

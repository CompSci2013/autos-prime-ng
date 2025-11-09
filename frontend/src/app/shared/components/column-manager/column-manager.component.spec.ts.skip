import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnManagerComponent } from './column-manager.component';
import { TableColumn } from '../../models/table-column.model';
import { SimpleChange } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ColumnManagerComponent - Column Visibility Management', () => {
  let component: ColumnManagerComponent;
  let fixture: ComponentFixture<ColumnManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ColumnManagerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnManagerComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default state', () => {
      expect(component.visible).toBe(false);
      expect(component.columns).toEqual([]);
      expect(component.transferData).toEqual([]);
      expect(component.searchText).toBe('');
    });

    it('should initialize transfer data when columns change', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true },
        { key: 'col2', label: 'Column 2', sortable: false, filterable: true, hideable: true },
      ];

      component.columns = columns;
      component.ngOnChanges({
        columns: new SimpleChange(null, columns, true),
      });

      expect(component.transferData.length).toBe(2);
    });
  });

  describe('Transfer Data Initialization', () => {
    it('should create transfer items from columns', () => {
      const columns: TableColumn[] = [
        { key: 'manufacturer', label: 'Manufacturer', sortable: true, filterable: true, hideable: true },
        { key: 'model', label: 'Model', sortable: true, filterable: true, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      expect(component.transferData.length).toBe(2);
      expect(component.transferData[0]['key']).toBe('manufacturer');
      expect(component.transferData[0]['title']).toBe('Manufacturer');
    });

    it('should set direction to "right" for visible columns', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', visible: true, sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      expect(component.transferData[0]['direction']).toBe('right');
    });

    it('should set direction to "left" for hidden columns', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', visible: false, sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      expect(component.transferData[0]['direction']).toBe('left');
    });

    it('should treat undefined visibility as visible', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      // visible: undefined should be treated as visible
      expect(component.transferData[0]['direction']).toBe('right');
    });

    it('should disable transfer for non-hideable columns', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Required Column', sortable: true, filterable: false, hideable: false },
        { key: 'col2', label: 'Optional Column', sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      expect(component.transferData[0]['disabled']).toBe(true);
      expect(component.transferData[1]['disabled']).toBe(false);
    });
  });

  describe('Column Description Generation', () => {
    it('should describe sortable columns', () => {
      const column: TableColumn = {
        key: 'col1',
        label: 'Column 1',
        sortable: true,
        filterable: false,
        hideable: true,
      };

      const description = component.getColumnDescription(column);
      expect(description).toContain('Sortable');
    });

    it('should describe filterable columns', () => {
      const column: TableColumn = {
        key: 'col1',
        label: 'Column 1',
        sortable: false,
        filterable: true,
        hideable: true,
      };

      const description = component.getColumnDescription(column);
      expect(description).toContain('Filterable');
    });

    it('should describe required columns', () => {
      const column: TableColumn = {
        key: 'col1',
        label: 'Column 1',
        sortable: false,
        filterable: false,
        hideable: false,
      };

      const description = component.getColumnDescription(column);
      expect(description).toContain('Required');
    });

    it('should combine multiple features', () => {
      const column: TableColumn = {
        key: 'col1',
        label: 'Column 1',
        sortable: true,
        filterable: true,
        hideable: false,
      };

      const description = component.getColumnDescription(column);
      expect(description).toContain('Sortable');
      expect(description).toContain('Filterable');
      expect(description).toContain('Required');
    });

    it('should return "Standard column" when no features', () => {
      const column: TableColumn = {
        key: 'col1',
        label: 'Column 1',
        sortable: false,
        filterable: false,
        hideable: true,
      };

      const description = component.getColumnDescription(column);
      expect(description).toBe('Standard column');
    });
  });

  describe('Drawer Visibility', () => {
    it('should close drawer and emit visibleChange', () => {
      spyOn(component.visibleChange, 'emit');

      component.visible = true;
      component.onClose();

      expect(component.visible).toBe(false);
      expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
    });

    it('should close drawer on cancel', () => {
      spyOn(component, 'onClose');

      component.onCancel();

      expect(component.onClose).toHaveBeenCalled();
    });

    it('should close drawer after applying changes', () => {
      spyOn(component, 'onClose');

      component.columns = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true },
      ];
      component.initializeTransferData();

      component.onApply();

      expect(component.onClose).toHaveBeenCalled();
    });
  });

  describe('Apply Changes', () => {
    it('should update column visibility based on transfer direction', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', visible: true, sortable: true, filterable: false, hideable: true },
        { key: 'col2', label: 'Column 2', visible: true, sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      // Move col2 to left (hide)
      component.transferData[1]['direction'] = 'left';

      component.onApply();

      expect(component.columns[0].visible).toBe(true);
      expect(component.columns[1].visible).toBe(false);
    });

    it('should emit columnsChange event', () => {
      spyOn(component.columnsChange, 'emit');

      component.columns = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true },
      ];
      component.initializeTransferData();

      component.onApply();

      expect(component.columnsChange.emit).toHaveBeenCalled();
    });

    it('should validate dependencies when applying', () => {
      spyOn(component, 'validateDependencies');

      component.columns = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true },
      ];
      component.initializeTransferData();

      component.onApply();

      expect(component.validateDependencies).toHaveBeenCalled();
    });

    it('should handle multiple columns changing visibility', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', visible: true, sortable: true, filterable: false, hideable: true },
        { key: 'col2', label: 'Column 2', visible: true, sortable: true, filterable: false, hideable: true },
        { key: 'col3', label: 'Column 3', visible: false, sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      // Hide col1, show col3
      component.transferData[0]['direction'] = 'left';
      component.transferData[2]['direction'] = 'right';

      component.onApply();

      expect(component.columns[0].visible).toBe(false);
      expect(component.columns[1].visible).toBe(true);
      expect(component.columns[2].visible).toBe(true);
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset hideable columns to undefined visibility', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', visible: false, sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.onReset();

      expect(component.columns[0].visible).toBeUndefined();
    });

    it('should keep required columns visible', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Required', visible: true, sortable: true, filterable: false, hideable: false },
      ];

      component.columns = columns;
      component.onReset();

      expect(component.columns[0].visible).toBe(true);
    });

    it('should reinitialize transfer data', () => {
      spyOn(component, 'initializeTransferData');

      component.columns = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true },
      ];

      component.onReset();

      expect(component.initializeTransferData).toHaveBeenCalled();
    });

    it('should emit columnsChange event', () => {
      spyOn(component.columnsChange, 'emit');

      component.columns = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true },
      ];

      component.onReset();

      expect(component.columnsChange.emit).toHaveBeenCalled();
    });
  });

  describe('Dependency Validation', () => {
    it('should ensure dependent columns are visible', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', visible: true, sortable: true, filterable: false, hideable: true, dependencies: ['col2'] },
        { key: 'col2', label: 'Column 2', visible: false, sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      component.validateDependencies();

      expect(component.columns[1].visible).toBe(true);
    });

    it('should update transfer data for dependent columns', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', visible: true, sortable: true, filterable: false, hideable: true, dependencies: ['col2'] },
        { key: 'col2', label: 'Column 2', visible: false, sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      component.validateDependencies();

      const col2Transfer = component.transferData.find((t) => t['key'] === 'col2');
      expect(col2Transfer?.['direction']).toBe('right');
    });

    it('should handle multiple dependencies', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', visible: true, sortable: true, filterable: false, hideable: true, dependencies: ['col2', 'col3'] },
        { key: 'col2', label: 'Column 2', visible: false, sortable: true, filterable: false, hideable: true },
        { key: 'col3', label: 'Column 3', visible: false, sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      component.validateDependencies();

      expect(component.columns[1].visible).toBe(true);
      expect(component.columns[2].visible).toBe(true);
    });

    it('should not affect columns without dependencies', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', visible: true, sortable: true, filterable: false, hideable: true },
        { key: 'col2', label: 'Column 2', visible: false, sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      component.validateDependencies();

      expect(component.columns[1].visible).toBe(false);
    });

    it('should only validate visible columns dependencies', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', visible: false, sortable: true, filterable: false, hideable: true, dependencies: ['col2'] },
        { key: 'col2', label: 'Column 2', visible: false, sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      component.validateDependencies();

      // col1 is hidden, so its dependencies should not be enforced
      expect(component.columns[1].visible).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    it('should count visible columns correctly', () => {
      component.columns = [
        { key: 'col1', label: 'Column 1', visible: true, sortable: true, filterable: false, hideable: true },
        { key: 'col2', label: 'Column 2', visible: false, sortable: true, filterable: false, hideable: true },
        { key: 'col3', label: 'Column 3', sortable: true, filterable: false, hideable: true }, // undefined = visible
      ];

      expect(component.getVisibleCount()).toBe(2);
    });

    it('should count hidden columns correctly', () => {
      component.columns = [
        { key: 'col1', label: 'Column 1', visible: true, sortable: true, filterable: false, hideable: true },
        { key: 'col2', label: 'Column 2', visible: false, sortable: true, filterable: false, hideable: true },
        { key: 'col3', label: 'Column 3', visible: false, sortable: true, filterable: false, hideable: true },
      ];

      expect(component.getHiddenCount()).toBe(2);
    });

    it('should count total columns correctly', () => {
      component.columns = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true },
        { key: 'col2', label: 'Column 2', sortable: true, filterable: false, hideable: true },
        { key: 'col3', label: 'Column 3', sortable: true, filterable: false, hideable: true },
      ];

      expect(component.getTotalCount()).toBe(3);
    });

    it('should detect if reset is possible when columns modified', () => {
      component.columns = [
        { key: 'col1', label: 'Column 1', visible: false, sortable: true, filterable: false, hideable: true },
      ];

      expect(component.canReset()).toBe(true);
    });

    it('should detect if reset is not needed when columns at default', () => {
      component.columns = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true }, // visible: undefined = default
      ];

      expect(component.canReset()).toBe(false);
    });

    it('should not allow reset for required columns', () => {
      component.columns = [
        { key: 'col1', label: 'Required', visible: true, sortable: true, filterable: false, hideable: false },
      ];

      expect(component.canReset()).toBe(false);
    });
  });

  describe('Filter Options', () => {
    it('should filter columns by title case-insensitively', () => {
      const item: any = { title: 'Manufacturer' };

      expect(component.filterOption('manu', item)).toBe(true);
      expect(component.filterOption('MANU', item)).toBe(true);
      expect(component.filterOption('facturer', item)).toBe(true);
      expect(component.filterOption('xyz', item)).toBe(false);
    });

    it('should handle empty search text', () => {
      const item: any = { title: 'Column' };

      expect(component.filterOption('', item)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty column list', () => {
      component.columns = [];
      component.initializeTransferData();

      expect(component.transferData).toEqual([]);
      expect(component.getVisibleCount()).toBe(0);
      expect(component.getHiddenCount()).toBe(0);
    });

    it('should handle columns with missing optional properties', () => {
      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true },
      ];

      component.columns = columns;
      component.initializeTransferData();

      expect(component.transferData.length).toBe(1);
    });

    it('should handle apply with no transfer data', () => {
      component.columns = [];
      component.transferData = [];

      expect(() => {
        component.onApply();
      }).not.toThrow();
    });

    it('should handle reset with no columns', () => {
      component.columns = [];

      expect(() => {
        component.onReset();
      }).not.toThrow();
    });
  });

  describe('ngOnChanges Lifecycle', () => {
    it('should reinitialize on columns change', () => {
      spyOn(component, 'initializeTransferData');

      const columns: TableColumn[] = [
        { key: 'col1', label: 'Column 1', sortable: true, filterable: false, hideable: true },
      ];

      component.ngOnChanges({
        columns: new SimpleChange(null, columns, false),
      });

      expect(component.initializeTransferData).toHaveBeenCalled();
    });

    it('should reinitialize on visible change', () => {
      spyOn(component, 'initializeTransferData');

      component.ngOnChanges({
        visible: new SimpleChange(false, true, false),
      });

      expect(component.initializeTransferData).toHaveBeenCalled();
    });

    it('should not reinitialize on other changes', () => {
      spyOn(component, 'initializeTransferData');

      component.ngOnChanges({
        otherProp: new SimpleChange(null, 'value', false),
      });

      expect(component.initializeTransferData).not.toHaveBeenCalled();
    });
  });
});

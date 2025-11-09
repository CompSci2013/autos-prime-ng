import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ColumnManagerComponent, ColumnItem } from './column-manager.component';
import { TableColumn } from '../../models/table-column.model';

describe('ColumnManagerComponent', () => {
  let component: ColumnManagerComponent;
  let fixture: ComponentFixture<ColumnManagerComponent>;

  const mockColumns: TableColumn[] = [
    { key: 'id', label: 'ID', sortable: true, filterable: false, visible: true, hideable: false },
    { key: 'name', label: 'Name', sortable: true, filterable: true, visible: true, hideable: true },
    { key: 'email', label: 'Email', sortable: false, filterable: false, visible: false, hideable: true },
    { key: 'count', label: 'Count', sortable: true, filterable: false, visible: true, hideable: true },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ColumnManagerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(ColumnManagerComponent);
    component = fixture.componentInstance;
  });

  // ========== Component Initialization ==========

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.visible).toBe(false);
      expect(component.columns).toEqual([]);
      expect(component.sourceColumns).toEqual([]);
      expect(component.targetColumns).toEqual([]);
      expect(component.searchText).toBe('');
    });

    it('should initialize PickList data with visible and hidden columns', () => {
      component.columns = [...mockColumns];

      component.initializePickListData();

      // Verify target (visible) columns: id, name, count
      expect(component.targetColumns.length).toBe(3);
      expect(component.targetColumns.map(c => c.key)).toContain('id');
      expect(component.targetColumns.map(c => c.key)).toContain('name');
      expect(component.targetColumns.map(c => c.key)).toContain('count');

      // Verify source (hidden) columns: email
      expect(component.sourceColumns.length).toBe(1);
      expect(component.sourceColumns[0].key).toBe('email');
    });

    it('should mark required columns as disabled', () => {
      component.columns = [...mockColumns];

      component.initializePickListData();

      const idItem = component.targetColumns.find(c => c.key === 'id');
      expect(idItem?.disabled).toBe(true); // Not hideable = disabled

      const nameItem = component.targetColumns.find(c => c.key === 'name');
      expect(nameItem?.disabled).toBe(false); // Hideable = not disabled
    });

    it('should generate column descriptions based on features', () => {
      const desc1 = component.getColumnDescription(mockColumns[0]); // ID: sortable, required
      const desc2 = component.getColumnDescription(mockColumns[1]); // Name: sortable, filterable
      const desc3 = component.getColumnDescription(mockColumns[2]); // Email: none

      expect(desc1).toContain('Sortable');
      expect(desc1).toContain('Required');
      expect(desc2).toContain('Sortable');
      expect(desc2).toContain('Filterable');
      expect(desc3).toBe('Standard column');
    });
  });

  // ========== ngOnChanges Lifecycle ==========

  describe('ngOnChanges Lifecycle', () => {
    it('should reinitialize PickList data when columns change', () => {
      const initSpy = spyOn(component, 'initializePickListData');

      component.ngOnChanges({
        columns: {
          previousValue: [],
          currentValue: mockColumns,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(initSpy).toHaveBeenCalled();
    });

    it('should reinitialize PickList data when visible changes', () => {
      const initSpy = spyOn(component, 'initializePickListData');

      component.ngOnChanges({
        visible: {
          previousValue: false,
          currentValue: true,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(initSpy).toHaveBeenCalled();
    });

    it('should not reinitialize if unrelated properties change', () => {
      const initSpy = spyOn(component, 'initializePickListData');

      component.ngOnChanges({
        someOtherProp: {
          previousValue: 'old',
          currentValue: 'new',
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(initSpy).not.toHaveBeenCalled();
    });
  });

  // ========== Drawer Actions ==========

  describe('Drawer Actions', () => {
    it('should close drawer and emit visibleChange', () => {
      component.visible = true;
      const emitSpy = spyOn(component.visibleChange, 'emit');

      component.onClose();

      expect(component.visible).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith(false);
    });

    it('should call onClose when cancel is clicked', () => {
      const closeSpy = spyOn(component, 'onClose');

      component.onCancel();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should update column visibility on apply', () => {
      component.columns = [...mockColumns];
      component.initializePickListData();

      // Move 'name' from target to source (hide it)
      const nameItem = component.targetColumns.find(c => c.key === 'name')!;
      component.targetColumns = component.targetColumns.filter(c => c.key !== 'name');
      component.sourceColumns.push(nameItem);

      component.onApply();

      const nameColumn = component.columns.find(c => c.key === 'name');
      expect(nameColumn?.visible).toBe(false);
    });

    it('should emit columnsChange on apply', () => {
      component.columns = [...mockColumns];
      component.initializePickListData();
      const emitSpy = spyOn(component.columnsChange, 'emit');

      component.onApply();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should close drawer after apply', () => {
      component.columns = [...mockColumns];
      component.initializePickListData();
      const closeSpy = spyOn(component, 'onClose');

      component.onApply();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle errors during apply gracefully', () => {
      component.columns = [...mockColumns];
      spyOn(console, 'error');
      spyOn(component, 'validateDependencies').and.throwError('Validation error');

      component.onApply();

      expect(console.error).toHaveBeenCalledWith('❌ ERROR in onApply():', jasmine.any(Error));
    });

    it('should reset all columns to default visibility', () => {
      component.columns = [...mockColumns];
      // Modify visibility
      component.columns[1].visible = false; // Hide 'name'
      component.columns[2].visible = true; // Show 'email'

      component.onReset();

      // Check reset: hideable columns should have visible=undefined, required columns=true
      expect(component.columns[0].visible).toBe(true); // id (required)
      expect(component.columns[1].visible).toBeUndefined(); // name (hideable)
      expect(component.columns[2].visible).toBeUndefined(); // email (hideable)
    });

    it('should reinitialize PickList data on reset', () => {
      component.columns = [...mockColumns];
      const initSpy = spyOn(component, 'initializePickListData');

      component.onReset();

      expect(initSpy).toHaveBeenCalled();
    });

    it('should emit columnsChange on reset', () => {
      component.columns = [...mockColumns];
      const emitSpy = spyOn(component.columnsChange, 'emit');

      component.onReset();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  // ========== PickList Actions ==========

  describe('PickList Actions', () => {
    it('should log when columns are moved to target', () => {
      spyOn(console, 'log');

      component.onMoveToTarget({ items: [{ key: 'email', title: 'Email' }] });

      expect(console.log).toHaveBeenCalledWith('Move to target (show columns):', jasmine.any(Object));
    });

    it('should log when columns are moved to source', () => {
      spyOn(console, 'log');

      component.onMoveToSource({ items: [{ key: 'name', title: 'Name' }] });

      expect(console.log).toHaveBeenCalledWith('Move to source (hide columns):', jasmine.any(Object));
    });
  });

  // ========== Validation ==========

  describe('Validation - Dependencies', () => {
    it('should auto-show dependent columns when parent is visible', () => {
      const columnsWithDeps: TableColumn[] = [
        { key: 'id', label: 'ID', sortable: true, filterable: false, visible: true, hideable: true },
        { key: 'expanded', label: 'Expanded View', sortable: false, filterable: false, visible: true, hideable: true, dependencies: ['details'] },
        { key: 'details', label: 'Details', sortable: false, filterable: false, visible: false, hideable: true },
      ];

      component.columns = columnsWithDeps;
      component.initializePickListData();

      // Apply changes (expanded is visible, details is hidden)
      component.onApply();

      // Verify 'details' was auto-shown because 'expanded' depends on it
      const detailsColumn = component.columns.find(c => c.key === 'details');
      expect(detailsColumn?.visible).toBe(true);
    });

    it('should move dependent columns from source to target', () => {
      const columnsWithDeps: TableColumn[] = [
        { key: 'parent', label: 'Parent', sortable: true, filterable: false, visible: true, hideable: true, dependencies: ['child'] },
        { key: 'child', label: 'Child', sortable: false, filterable: false, visible: false, hideable: true },
      ];

      component.columns = columnsWithDeps;
      component.initializePickListData();

      // Before validation: child is in source
      expect(component.sourceColumns.find(c => c.key === 'child')).toBeDefined();
      expect(component.targetColumns.find(c => c.key === 'child')).toBeUndefined();

      component.validateDependencies();

      // After validation: child moved to target
      expect(component.sourceColumns.find(c => c.key === 'child')).toBeUndefined();
      expect(component.targetColumns.find(c => c.key === 'child')).toBeDefined();
    });

    it('should handle multiple dependencies', () => {
      const columnsWithDeps: TableColumn[] = [
        { key: 'parent', label: 'Parent', sortable: true, filterable: false, visible: true, hideable: true, dependencies: ['child1', 'child2'] },
        { key: 'child1', label: 'Child 1', sortable: false, filterable: false, visible: false, hideable: true },
        { key: 'child2', label: 'Child 2', sortable: false, filterable: false, visible: false, hideable: true },
      ];

      component.columns = columnsWithDeps;
      component.initializePickListData();
      component.validateDependencies();

      // Both children should be auto-shown
      expect(component.columns.find(c => c.key === 'child1')?.visible).toBe(true);
      expect(component.columns.find(c => c.key === 'child2')?.visible).toBe(true);
    });

    it('should not affect columns without dependencies', () => {
      component.columns = [...mockColumns]; // No dependencies
      component.initializePickListData();

      const beforeState = component.columns.map(c => ({ key: c.key, visible: c.visible }));
      component.validateDependencies();
      const afterState = component.columns.map(c => ({ key: c.key, visible: c.visible }));

      expect(beforeState).toEqual(afterState);
    });
  });

  // ========== Helper Methods ==========

  describe('Helper Methods', () => {
    beforeEach(() => {
      component.columns = [...mockColumns];
    });

    it('should count visible columns correctly', () => {
      expect(component.getVisibleCount()).toBe(3); // id, name, count
    });

    it('should count hidden columns correctly', () => {
      expect(component.getHiddenCount()).toBe(1); // email
    });

    it('should count total columns correctly', () => {
      expect(component.getTotalCount()).toBe(4);
    });

    it('should return true if columns can be reset', () => {
      // Modify a hideable column
      component.columns[1].visible = false;

      expect(component.canReset()).toBe(true);
    });

    it('should return false if no columns modified from default', () => {
      // Reset all hideable columns to undefined (default)
      component.columns.forEach(col => {
        if (col.hideable) {
          col.visible = undefined;
        }
      });

      expect(component.canReset()).toBe(false);
    });

    it('should not count required columns in canReset', () => {
      // Only required column is modified (doesn't count)
      component.columns.forEach(col => {
        if (col.hideable) {
          col.visible = undefined;
        }
      });
      component.columns[0].visible = false; // Modify required column

      expect(component.canReset()).toBe(false); // Still false because required columns don't count
    });
  });

  // ========== ColumnItem Interface ==========

  describe('ColumnItem Interface', () => {
    it('should create ColumnItem with correct properties', () => {
      component.columns = [mockColumns[0]];

      component.initializePickListData();

      const item = component.targetColumns[0];
      expect(item.key).toBe('id');
      expect(item.title).toBe('ID');
      expect(item.description).toContain('Sortable');
      expect(item.disabled).toBe(true); // Not hideable
    });

    it('should set disabled=false for hideable columns', () => {
      component.columns = [mockColumns[1]]; // name is hideable

      component.initializePickListData();

      const item = component.targetColumns[0];
      expect(item.disabled).toBe(false);
    });
  });
});

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { TableColumn } from '../../models/table-column.model';

/** Column item for PickList */
export interface ColumnItem {
  key: string;
  title: string;
  description: string;
  disabled: boolean;
}

@Component({
  selector: 'app-column-manager',
  templateUrl: './column-manager.component.html',
  styleUrls: ['./column-manager.component.scss'],
})
export class ColumnManagerComponent implements OnChanges {
  // ========== INPUTS ==========

  /** Sidebar visibility */
  @Input() visible = false;

  /** Column definitions */
  @Input() columns: TableColumn[] = [];

  // ========== OUTPUTS ==========

  /** Emits when sidebar visibility changes */
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Emits when columns are modified */
  @Output() columnsChange = new EventEmitter<void>();

  // ========== STATE ==========

  /** Hidden columns (source list for PickList) */
  sourceColumns: ColumnItem[] = [];

  /** Visible columns (target list for PickList) */
  targetColumns: ColumnItem[] = [];

  /** Search text for filtering columns */
  searchText = '';

  // ========== LIFECYCLE ==========

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns'] || changes['visible']) {
      this.initializePickListData();
    }
  }

  // ========== INITIALIZATION ==========

  initializePickListData(): void {
    this.sourceColumns = [];
    this.targetColumns = [];

    this.columns.forEach((col) => {
      const item: ColumnItem = {
        key: col.key,
        title: col.label,
        description: this.getColumnDescription(col),
        disabled: !col.hideable, // Required columns cannot be moved
      };

      if (col.visible !== false) {
        this.targetColumns.push(item); // Visible columns
      } else {
        this.sourceColumns.push(item); // Hidden columns
      }
    });
  }

  getColumnDescription(column: TableColumn): string {
    const features: string[] = [];
    if (column.sortable) features.push('Sortable');
    if (column.filterable) features.push('Filterable');
    if (!column.hideable) features.push('Required');
    return features.join(', ') || 'Standard column';
  }

  // ========== DRAWER ACTIONS ==========

  onClose(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onCancel(): void {
    this.onClose();
  }

  onApply(): void {
    console.log('🔥🔥🔥 APPLY BUTTON CLICKED! 🔥🔥🔥');

    try {
      console.log('🎯 ColumnManager: onApply() START', {
        columnsBeforeUpdate: this.columns.map((c) => ({
          key: c.key,
          visible: c.visible,
        })),
        targetColumns: this.targetColumns.map((t) => t.key),
        sourceColumns: this.sourceColumns.map((s) => s.key),
      });

      // Update column visibility based on PickList position
      this.columns.forEach((col) => {
        const inTarget = this.targetColumns.some((item) => item.key === col.key);
        const newVisible = inTarget;

        if (col.visible !== newVisible) {
          console.log(`📝 Updating ${col.key}: ${col.visible} -> ${newVisible}`);
          col.visible = newVisible;
        }
      });

      console.log('📝 ColumnManager: Columns updated', {
        columnsAfterUpdate: this.columns.map((c) => ({
          key: c.key,
          visible: c.visible,
        })),
      });

      // Validate dependencies
      this.validateDependencies();

      console.log('✅ ColumnManager: Emitting columnsChange event');

      // Emit changes
      this.columnsChange.emit();

      console.log('🚪 ColumnManager: Closing sidebar');

      // Close sidebar
      this.onClose();

      console.log('✅ ColumnManager: onApply() COMPLETE');
    } catch (error) {
      console.error('❌ ERROR in onApply():', error);
    }
  }
  onReset(): void {
    // Reset all columns to default visibility
    this.columns.forEach((col) => {
      col.visible = col.hideable ? undefined : true;
    });

    // Reinitialize PickList data
    this.initializePickListData();

    // Emit changes
    this.columnsChange.emit();
  }

  // ========== PICKLIST ACTIONS ==========

  onMoveToTarget(event: any): void {
    console.log('Move to target (show columns):', event);
  }

  onMoveToSource(event: any): void {
    console.log('Move to source (hide columns):', event);
  }

  // ========== VALIDATION ==========

  validateDependencies(): void {
    // If a column has dependencies, ensure they are visible
    this.columns.forEach((col) => {
      if (col.visible !== false && col.dependencies) {
        col.dependencies.forEach((depKey) => {
          const depCol = this.columns.find((c) => c.key === depKey);
          if (depCol) {
            depCol.visible = true;
            // Update PickList data: move from source to target if needed
            const sourceIndex = this.sourceColumns.findIndex((item) => item.key === depKey);
            if (sourceIndex !== -1) {
              const [item] = this.sourceColumns.splice(sourceIndex, 1);
              this.targetColumns.push(item);
            }
          }
        });
      }
    });
  }

  // ========== HELPER METHODS ==========

  getVisibleCount(): number {
    return this.columns.filter((col) => col.visible !== false).length;
  }

  getHiddenCount(): number {
    return this.columns.filter((col) => col.visible === false).length;
  }

  getTotalCount(): number {
    return this.columns.length;
  }

  canReset(): boolean {
    // Check if any columns have been modified from default state
    return this.columns.some((col) => {
      if (col.hideable) {
        return col.visible !== undefined;
      }
      return false;
    });
  }
}

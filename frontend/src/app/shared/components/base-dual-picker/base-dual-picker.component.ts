/**
 * Base Dual Picker Component
 *
 * EXPERIMENTAL: Demonstrates proper config-driven parent-child picker architecture
 *
 * Key Differences from DualCheckboxPicker:
 * - Uses BaseDataTable (gets sorting/filtering/column management for free)
 * - Config-driven rendering (respects column.sortable, column.filterable)
 * - Transforms flat data into parent-child grouped rows
 * - Uses custom cellTemplate for tri-state parent checkboxes
 *
 * Architecture:
 * - Wraps BaseDataTable like BasePicker does
 * - Adds parent-child grouping transformation layer
 * - Config controls ALL rendering behavior
 */

import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Observable } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { PickerConfig } from '../../models/picker-config.model';
import { PickerConfigService } from '../../../core/services/picker-config.service';
import { UrlParamService } from '../../../core/services/url-param.service';
import { PopOutContextService } from '../../../core/services/popout-context.service';
import { ApiService } from '../../../services/api.service';
import { TableColumn } from '../../models/table-column.model';
import { TableQueryParams, TableDataSource } from '../../models/table-data-source.model';
import { BasePickerDataSource } from '../../services/base-picker-data-source';

/**
 * Flat row interface (no hierarchy - just manufacturer + model per row)
 */
interface FlatRow {
  manufacturer: string;
  model: string;
  count?: number;
  [key: string]: any;
}

@Component({
  selector: 'app-base-dual-picker',
  templateUrl: './base-dual-picker.component.html',
  styleUrls: ['./base-dual-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseDualPickerComponent implements OnInit, OnDestroy {
  @Input() configId!: string;

  config!: PickerConfig<any>;
  columns: TableColumn<any>[] = [];
  dataSource!: TableDataSource<FlatRow>;
  tableQueryParams: TableQueryParams = { page: 1, size: 20, filters: {} };

  // Selection management
  selectedRows = new Set<string>();
  selectedItems: any[] = [];
  selectionCount = 0;
  selectedItemsDisplay: string[] = [];

  // Parent-child state
  private parentChildMap = new Map<string, string[]>(); // parentKey -> childKeys[]

  // Base data source for flat data
  private flatDataSource!: BasePickerDataSource<any>;

  private destroy$ = new Subject<void>();

  constructor(
    private pickerConfigService: PickerConfigService,
    private apiService: ApiService,
    private http: HttpClient,
    private urlParamService: UrlParamService,
    private popOutContext: PopOutContextService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('[BaseDualPicker] Initializing with configId:', this.configId);

    // Load configuration
    this.config = this.pickerConfigService.getConfig(this.configId);
    if (!this.config) {
      console.error(`[BaseDualPicker] Config not found for ID: ${this.configId}`);
      return;
    }

    // Build columns (add selection column)
    this.buildColumns();

    // Create data source
    this.createDataSource();

    // Subscribe to URL state for hydration
    this.subscribeToUrlState();

    console.log('[BaseDualPicker] Initialized successfully');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Build columns (checkboxes are embedded in manufacturer/model columns)
   */
  private buildColumns(): void {
    // Use config columns directly (no separate selection column)
    // Checkboxes are rendered inside manufacturer and model column cells
    this.columns = [...this.config.columns as TableColumn<FlatRow>[]];
  }

  /**
   * Create data source that uses flat API data and builds parentChildMap
   */
  private createDataSource(): void {
    // Create base data source for fetching flat data
    this.flatDataSource = new BasePickerDataSource<any>(
      this.apiService,
      this.config,
      this.http
    );

    // Create wrapper data source that builds parentChildMap for checkbox state
    this.dataSource = {
      fetch: (params: TableQueryParams): Observable<any> => {
        console.log('[BaseDualPicker] Fetching data with params:', params);

        // Fetch flat data from base data source
        return this.flatDataSource.fetch(params).pipe(
          map((response) => {
            console.log('[BaseDualPicker] Received flat data:', response.results.length, 'rows');

            // Build parent-child map for tri-state checkbox calculations
            this.buildParentChildMap(response.results);

            // Return flat rows (no grouping/hierarchy)
            return response;
          })
        );
      },
    };
  }

  /**
   * Build parent-child map from flat data
   * Maps each manufacturer to its list of model keys
   *
   * Input: [{manufacturer: 'Ford', model: 'F-150'}, {manufacturer: 'Ford', model: 'Mustang'}, ...]
   * Output: parentChildMap = { 'Ford': ['Ford|F-150', 'Ford|Mustang'], ... }
   */
  private buildParentChildMap(flatData: any[]): void {
    this.parentChildMap.clear();

    // Group rows by manufacturer
    flatData.forEach((row) => {
      const manufacturer = row.manufacturer;
      const key = this.config.row.keyGenerator(row);

      if (!this.parentChildMap.has(manufacturer)) {
        this.parentChildMap.set(manufacturer, []);
      }

      this.parentChildMap.get(manufacturer)!.push(key);
    });

    console.log('[BaseDualPicker] Built parent-child map:', this.parentChildMap);
  }

  /**
   * Subscribe to URL state for selection hydration
   */
  private subscribeToUrlState(): void {
    this.urlParamService
      .watchParam(this.config.selection.urlParam)
      .pipe(takeUntil(this.destroy$))
      .subscribe((urlValue: string | null) => {
        console.log('[BaseDualPicker] URL param changed:', urlValue);

        if (urlValue) {
          const selections = this.config.selection.deserializer(urlValue);
          const keys = selections.map((sel) => this.config.row.keyGenerator(sel));
          this.hydrateSelections(keys);
        } else {
          this.selectedRows.clear();
          this.updateSelectionDisplay();
        }

        this.cdr.markForCheck();
      });
  }

  /**
   * Hydrate selections from keys
   */
  private hydrateSelections(keys: string[]): void {
    this.selectedRows.clear();
    keys.forEach((key) => this.selectedRows.add(key));
    this.updateSelectionDisplay();
  }

  /**
   * Update selection display
   */
  private updateSelectionDisplay(): void {
    this.selectionCount = this.selectedRows.size;
    this.selectedItems = Array.from(this.selectedRows).map((key) => {
      const parsed = this.config.row.keyParser(key);
      return parsed;
    });
    this.selectedItemsDisplay = this.selectedItems.map((item) =>
      `${item.manufacturer} - ${item.model}`
    );
  }

  /**
   * Check if row is selected
   */
  isRowSelected(row: FlatRow): boolean {
    const key = this.config.row.keyGenerator(row);
    return this.selectedRows.has(key);
  }

  /**
   * Get manufacturer checkbox state (tri-state)
   * Returns checkbox state for a given manufacturer
   */
  getManufacturerCheckboxState(manufacturer: string): { checked: boolean; indeterminate: boolean } {
    const childKeys = this.parentChildMap.get(manufacturer) || [];

    if (childKeys.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const selectedCount = childKeys.filter((key) => this.selectedRows.has(key)).length;

    return {
      checked: selectedCount === childKeys.length,
      indeterminate: selectedCount > 0 && selectedCount < childKeys.length,
    };
  }

  /**
   * Handle model checkbox change (individual row)
   */
  onModelCheckboxChange(row: FlatRow, checked: boolean): void {
    console.log('[BaseDualPicker] Model checkbox changed:', row, checked);

    const key = this.config.row.keyGenerator(row);

    if (checked) {
      this.selectedRows.add(key);
    } else {
      this.selectedRows.delete(key);
    }

    this.updateSelectionDisplay();
    this.cdr.markForCheck();
  }

  /**
   * Handle manufacturer checkbox change (all models for manufacturer)
   */
  onManufacturerCheckboxChange(manufacturer: string, checked: boolean): void {
    console.log('[BaseDualPicker] Manufacturer checkbox changed:', manufacturer, checked);

    const childKeys = this.parentChildMap.get(manufacturer) || [];

    childKeys.forEach((key) => {
      if (checked) {
        this.selectedRows.add(key);
      } else {
        this.selectedRows.delete(key);
      }
    });

    this.updateSelectionDisplay();
    this.cdr.markForCheck();
  }

  /**
   * Handle table query change
   */
  onTableQueryChange(params: TableQueryParams): void {
    console.log('[BaseDualPicker] Table query changed:', params);
    this.tableQueryParams = params;
    // Sorting/filtering will be handled by BaseDataTable
  }

  /**
   * Handle data loaded
   */
  onDataLoaded(): void {
    console.log('[BaseDualPicker] Data loaded');
    // Apply any pending hydration
  }

  /**
   * Apply selections
   */
  onApply(): void {
    console.log('[BaseDualPicker] Applying selections:', this.selectedItems);

    const urlValue = this.config.selection.serializer(this.selectedItems);

    if (this.popOutContext.isInPopOut()) {
      this.popOutContext.sendMessage({
        type: 'PICKER_SELECTION_CHANGE',
        payload: {
          configId: this.config.id,
          urlParam: this.config.selection.urlParam,
          urlValue,
        },
      });
    } else {
      this.urlParamService.updateParam(this.config.selection.urlParam, urlValue);
    }
  }

  /**
   * Clear selections
   */
  onClear(): void {
    console.log('[BaseDualPicker] Clearing selections');

    this.selectedRows.clear();
    this.updateSelectionDisplay();

    if (this.popOutContext.isInPopOut()) {
      this.popOutContext.sendMessage({
        type: 'PICKER_CLEAR',
        payload: {
          configId: this.config.id,
          urlParam: this.config.selection.urlParam,
        },
      });
    } else {
      this.urlParamService.removeParam(this.config.selection.urlParam);
    }

    this.cdr.markForCheck();
  }

  /**
   * Remove single item
   */
  onRemoveItem(label: string): void {
    const parts = label.split(' - ');
    if (parts.length !== 2) {
      console.warn(`[BaseDualPicker] Invalid label format for removal: "${label}"`);
      return;
    }
    const [manufacturer, model] = parts;
    if (!manufacturer || !model) {
      console.warn(`[BaseDualPicker] Empty value in label: "${label}"`);
      return;
    }
    const key = `${manufacturer}|${model}`;

    this.selectedRows.delete(key);
    this.updateSelectionDisplay();

    // Persist the removal to URL (same logic as onApply)
    const urlValue = this.config.selection.serializer(this.selectedItems);

    if (this.popOutContext.isInPopOut()) {
      this.popOutContext.sendMessage({
        type: 'PICKER_SELECTION_CHANGE',
        payload: {
          configId: this.config.id,
          urlParam: this.config.selection.urlParam,
          urlValue,
        },
      });
    } else {
      this.urlParamService.updateParam(this.config.selection.urlParam, urlValue);
    }

    this.cdr.markForCheck();
  }
}

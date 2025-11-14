/**
 * Base Picker Component
 *
 * Generic, reusable picker component driven by PickerConfig.
 * Handles selection logic, URL hydration, and pop-out awareness.
 *
 * Features:
 * - Configuration-driven (columns, API, selection logic)
 * - Client-side and server-side pagination
 * - URL-driven state management
 * - Pop-out window support
 * - Set-based selection (O(1) lookups)
 * - Uses BaseDataTableComponent for display
 *
 * Usage:
 *   <app-base-picker
 *     [configId]="'manufacturer-model'"
 *     [context]="{ vehicleId: '123' }"
 *     (selectionChange)="onSelectionChange($event)"
 *   >
 *   </app-base-picker>
 */

import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  PickerConfig,
  PickerSelectionEvent,
} from '../../models/picker-config.model';
import { TableColumn, TableQueryParams } from '../../models';
import { BaseDataTableComponent } from '../base-data-table/base-data-table.component';
import { BasePickerDataSource } from '../../services/base-picker-data-source';
import { PickerConfigService } from '../../../core/services/picker-config.service';
import { PopOutContextService } from '../../../core/services/popout-context.service';
import { UrlParamService } from '../../../core/services/url-param.service';
import { UrlStateService } from '../../../core/services/url-state.service';
// EXPERIMENT: Swap StateManagementService with VehicleResourceManagementService
// import { StateManagementService } from '../../../core/services/state-management.service';
import { VehicleResourceManagementService } from '../../../core/services/vehicle-resource-management.factory';
import { ApiService } from '../../../services/api.service';
import { SearchFilters } from '../../../models/search-filters.model';
import { TableStatePersistenceService } from '../../services/table-state-persistence.service';

/**
 * Base Picker Component
 * Generic implementation driven by PickerConfig
 */
@Component({
  selector: 'app-base-picker',
  templateUrl: './base-picker.component.html',
  styleUrls: ['./base-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasePickerComponent<T = any> implements OnInit, OnDestroy, OnChanges {
  /**
   * Configuration ID (required)
   * Example: 'manufacturer-model', 'vin-picker'
   */
  @Input() configId!: string;

  /**
   * Optional context data for API calls
   * Example: { vehicleId: '123' } for VIN picker
   */
  @Input() context?: Record<string, any>;

  /**
   * External filters from parent component (e.g., Query Control)
   * Used to auto-select rows that match these filters
   * Example: { manufacturer: 'Ford,Chevrolet', model: 'F-150' }
   */
  @Input() externalFilters?: SearchFilters;

  /**
   * Selection change event
   * Emitted when user applies or clears selections
   */
  @Output() selectionChange = new EventEmitter<PickerSelectionEvent<T>>();

  /** Reference to BaseDataTableComponent */
  @ViewChild(BaseDataTableComponent)
  baseTable!: BaseDataTableComponent<T>;

  /** Picker configuration (loaded from PickerConfigService) */
  config!: PickerConfig<T>;

  /** Data source (created from configuration) */
  dataSource!: BasePickerDataSource<T>;

  /** Column configuration for BaseDataTableComponent */
  columns: TableColumn<T>[] = [];

  /** Query params for BaseDataTableComponent */
  tableQueryParams: TableQueryParams = {
    page: 1,
    size: 20,
    filters: {},
  };

  /** Selection state (Set<string> for O(1) lookups) */
  selectedRows = new Set<string>();

  /** Cached display labels for selected items (prevents template function calls) */
  selectedItemsDisplay: string[] = [];

  /** Pending hydration (selections to apply after data loads) */
  private pendingHydration: string[] = [];

  /** Flag indicating if data has been loaded */
  private dataLoaded = false;

  /** Destroy subject for subscription cleanup */
  private destroy$ = new Subject<void>();

  constructor(
    private pickerConfigService: PickerConfigService,
    private apiService: ApiService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private popOutContext: PopOutContextService,
    private urlParamService: UrlParamService,
    private urlState: UrlStateService,
    // EXPERIMENT: Using VehicleResourceManagementService instead of StateManagementService
    private stateService: VehicleResourceManagementService,
    private tablePersistence: TableStatePersistenceService
  ) {}

  ngOnInit(): void {
    // Validate required inputs
    if (!this.configId) {
      throw new Error('[BasePickerComponent] configId input is required');
    }

    // Load configuration
    try {
      this.config = this.pickerConfigService.getConfig<T>(this.configId);
      console.log(
        `[BasePickerComponent] Loaded configuration: ${this.config.id} (${this.config.displayName})`
      );
    } catch (error) {
      console.error('[BasePickerComponent] Failed to load configuration:', error);
      throw error;
    }

    // Create data source
    this.dataSource = new BasePickerDataSource<T>(this.apiService, this.config, this.http);

    // Set up columns (convert PickerColumnConfig to TableColumn)
    // Add selection column first
    this.columns = [
      {
        key: '__selection',
        label: 'Select',
        width: '60px',
        sortable: false,
        filterable: false,
        hideable: false,
      } as TableColumn<T>,
      ...this.config.columns.map((col) => ({
        ...col,
        // TableColumn uses 'key' but we may have 'valuePath'
        // The resolveColumnValue() function will handle this
      })) as TableColumn<T>[],
    ];

    // Load saved page size from localStorage
    const savedPrefs = this.tablePersistence.loadPreferences(this.config.id);
    const pageSize = savedPrefs?.pageSize || this.config.pagination.defaultPageSize;

    // Set up initial query params
    this.tableQueryParams = {
      page: 1,
      size: pageSize,
      filters: { ...this.context }, // Add context to filters (e.g., vehicleId)
    };

    // Subscribe to URL state for hydration
    this.subscribeToUrlState();

    // In popout mode, also subscribe to filters$ for state synchronization
    if (this.popOutContext.isInPopOut()) {
      this.subscribeToStateFilters();
    }

    console.log(
      `[BasePickerComponent] Initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle input changes (externalFilters)
   * Applies external filters to auto-select matching rows
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Only react to externalFilters changes
    if (changes['externalFilters'] && !changes['externalFilters'].firstChange) {
      console.log('[BasePickerComponent] externalFilters changed:', this.externalFilters);

      // Skip externalFilters in popout mode - subscribeToStateFilters() handles it
      if (this.popOutContext.isInPopOut()) {
        console.log('[BasePickerComponent] Popout mode: Skipping externalFilters (using filters$ subscription)');
        return;
      }

      // Only apply if data is loaded (client-side mode only)
      if (this.dataLoaded && this.config.pagination.mode === 'client') {
        this.applyExternalFilters();
        this.cdr.markForCheck();
      }
    }
  }

  /**
   * Subscribe to URL state changes for selection hydration
   */
  private subscribeToUrlState(): void {
    const urlParam = this.config.selection.urlParam;

    this.urlState.getQueryParam(urlParam).pipe(
      takeUntil(this.destroy$)
    ).subscribe((urlValue: string | null) => {
      console.log(`[BasePickerComponent] URL param '${urlParam}' changed:`, urlValue);

      // Deserialize selections from URL
      const selections = urlValue
        ? this.config.selection.deserializer(urlValue)
        : [];

      // Convert to keys
      this.pendingHydration = selections.map((sel) =>
        this.config.row.keyGenerator(sel as T)
      );

      // If data already loaded, hydrate immediately
      if (this.dataLoaded) {
        this.hydrateSelections();
        this.cdr.markForCheck();
      } else {
        console.log(
          '[BasePickerComponent] Data not loaded yet, deferring hydration'
        );
      }
    });
  }

  /**
   * Subscribe to StateManagementService filters$ for popout mode
   * In popout mode, the URL doesn't contain query params, so we need to
   * hydrate from the filters$ observable which is synchronized via BroadcastChannel
   */
  private subscribeToStateFilters(): void {
    const urlParam = this.config.selection.urlParam;

    this.stateService.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((filters) => {
      console.log('[BasePickerComponent] Filters updated from StateManagementService:', filters);

      // Extract selections from filters object
      // The urlParam is the key we're looking for (e.g., 'modelCombos')
      const modelCombos = (filters as any)[urlParam] || filters.modelCombos || [];

      console.log(`[BasePickerComponent] Extracted ${modelCombos.length} selections from filters`);

      // Convert to keys
      this.pendingHydration = modelCombos.map((sel: any) =>
        this.config.row.keyGenerator(sel as T)
      );

      // If data already loaded, hydrate immediately
      if (this.dataLoaded) {
        console.log('[BasePickerComponent] Data loaded, hydrating selections now');
        this.hydrateSelections();
        this.cdr.markForCheck();
      } else {
        console.log(
          '[BasePickerComponent] Data not loaded yet, deferring hydration'
        );
      }
    });
  }

  /**
   * Hydrate selections from pendingHydration
   * CRITICAL: Only call after data is loaded
   */
  private hydrateSelections(): void {
    // Clear existing selections first (idempotent operation)
    this.selectedRows.clear();

    // If no pending selections, nothing to hydrate
    if (!this.pendingHydration || this.pendingHydration.length === 0) {
      this.updateSelectedItemsDisplay();
      return;
    }

    // Add each selection key to the Set
    this.pendingHydration.forEach((key) => {
      this.selectedRows.add(key);
    });

    // Update display cache
    this.updateSelectedItemsDisplay();

    console.log(
      `[BasePickerComponent] Hydrated ${this.pendingHydration.length} selections from URL state`
    );
  }

  /**
   * Apply external filters to auto-select matching rows
   * Called when externalFilters input changes or when data loads with externalFilters set
   *
   * Note: Only works for client-side pagination mode where all data is loaded
   * IMPORTANT: URL selections always take precedence over external filters
   */
  private applyExternalFilters(): void {
    // Only works for client-side mode
    if (this.config.pagination.mode !== 'client') {
      console.log('[BasePickerComponent] External filters only supported for client-side mode');
      return;
    }

    if (!this.externalFilters) {
      return;
    }

    // Check if URL has selections - if so, URL takes precedence (don't apply external filters)
    const urlParam = this.config.selection.urlParam;
    const urlValue = this.urlState.getQueryParamSnapshot(urlParam);
    if (urlValue) {
      console.log('[BasePickerComponent] URL has selections, skipping external filters (URL takes precedence)');
      return;
    }

    // Get cached data (client-side mode)
    const data = this.dataSource.getCachedData();
    if (!data || data.length === 0) {
      console.log('[BasePickerComponent] No cached data available for external filters');
      return;
    }

    // Clear existing selections (safe because we checked URL above)
    this.selectedRows.clear();

    // Extract manufacturer and model filters (comma-separated lists)
    const manufacturerFilter = this.externalFilters.manufacturer;
    const modelFilter = this.externalFilters.model;

    // If no filters, nothing to select
    if (!manufacturerFilter && !modelFilter) {
      this.updateSelectedItemsDisplay();
      console.log('[BasePickerComponent] No external filters to apply');
      return;
    }

    // Split into arrays
    const manufacturers = manufacturerFilter
      ? manufacturerFilter.split(',').map((m) => m.trim().toLowerCase())
      : [];
    const models = modelFilter
      ? modelFilter.split(',').map((m) => m.trim().toLowerCase())
      : [];

    console.log('[BasePickerComponent] Applying external filters:', {
      manufacturers,
      models,
    });

    // Iterate through data and select matching rows
    let matchCount = 0;
    data.forEach((row: any) => {
      let matches = false;

      // Check manufacturer match
      if (manufacturers.length > 0 && row.manufacturer) {
        const rowManufacturer = row.manufacturer.toLowerCase();
        if (manufacturers.includes(rowManufacturer)) {
          matches = true;
        }
      }

      // Check model match
      if (models.length > 0 && row.model) {
        const rowModel = row.model.toLowerCase();
        if (models.includes(rowModel)) {
          matches = true;
        }
      }

      // If matches, add to selection
      if (matches) {
        const key = this.config.row.keyGenerator(row);
        this.selectedRows.add(key);
        matchCount++;
      }
    });

    // Update display cache
    this.updateSelectedItemsDisplay();

    console.log(
      `[BasePickerComponent] Auto-selected ${matchCount} rows based on external filters`
    );
  }

  /**
   * Handle data loaded event from BaseDataTable
   * Called when data fetch completes successfully
   */
  onDataLoaded(): void {
    this.dataLoaded = true;
    console.log('[BasePickerComponent] Data loaded event received');

    // Priority 1: Apply URL state hydration (pendingHydration takes precedence)
    if (this.pendingHydration.length > 0) {
      this.hydrateSelections();
      this.cdr.markForCheck();
    }
    // Priority 2: Apply external filters if no URL selections
    else if (this.externalFilters) {
      this.applyExternalFilters();
      this.cdr.markForCheck();
    }
  }

  /**
   * Handle table query changes (pagination, sorting, filtering)
   */
  onTableQueryChange(params: TableQueryParams): void {
    console.log('[BasePickerComponent] Table query changed:', params);

    // Check if page size changed - if so, save to localStorage
    if (params.size !== this.tableQueryParams.size) {
      console.log(`[BasePickerComponent] Page size changed: ${this.tableQueryParams.size} → ${params.size}`);

      // Load existing preferences or create new
      const prefs = this.tablePersistence.loadPreferences(this.config.id) || {
        columnOrder: [],
        visibleColumns: [],
      };

      // Update page size and save
      prefs.pageSize = params.size;
      prefs.lastUpdated = Date.now();
      this.tablePersistence.savePreferences(this.config.id, prefs);

      console.log(`[BasePickerComponent] Saved page size ${params.size} to localStorage for '${this.config.id}'`);
    }

    // Merge context into filters
    this.tableQueryParams = {
      ...params,
      filters: { ...params.filters, ...this.context },
    };
  }

  /**
   * Check if a specific row is selected
   */
  isRowSelected(row: T): boolean {
    const key = this.config.row.keyGenerator(row);
    return this.selectedRows.has(key);
  }

  /**
   * Toggle row selection
   */
  onRowSelectionChange(row: T, checked: boolean): void {
    const key = this.config.row.keyGenerator(row);

    if (checked) {
      this.selectedRows.add(key);
    } else {
      this.selectedRows.delete(key);
    }

    // Update display cache
    this.updateSelectedItemsDisplay();

    console.log(
      `[BasePickerComponent] Row selection changed. Total selected: ${this.selectedRows.size}`
    );

    // Trigger change detection after Set mutation
    this.cdr.markForCheck();
  }

  /**
   * Get selected items as array
   */
  get selectedItems(): T[] {
    return Array.from(this.selectedRows).map((key) =>
      this.config.row.keyParser(key)
    ) as T[];
  }

  /**
   * Update cached display labels for selected items
   * Called whenever selection changes to avoid template function calls
   */
  private updateSelectedItemsDisplay(): void {
    this.selectedItemsDisplay = Array.from(this.selectedRows);
  }

  /**
   * Handle Apply button click
   * Context-aware: Updates state directly or sends message to main window
   */
  onApply(): void {
    console.log('[BasePickerComponent] Apply clicked');
    console.log('[BasePickerComponent] Selected rows (keys):', Array.from(this.selectedRows));
    console.log('[BasePickerComponent] Selected items:', this.selectedItems);

    try {
      // Emit selection change event
      this.selectionChange.emit({
        pickerId: this.config.id,
        selections: this.selectedItems,
        keys: Array.from(this.selectedRows),
      });

      // Update state based on context (pop-out vs normal)
      if (this.popOutContext.isInPopOut()) {
        // Pop-out mode: send message to main window
        console.log('[BasePickerComponent] Pop-out mode: Sending message to main window');
        const urlValue = this.config.selection.serializer(this.selectedItems);
        console.log('[BasePickerComponent] Serialized URL value:', urlValue);
        this.popOutContext.sendMessage({
          type: 'PICKER_SELECTION_CHANGE',
          payload: {
            configId: this.config.id,
            urlParam: this.config.selection.urlParam,
            urlValue,
          },
        });
      } else {
        // Normal mode: update URL directly
        console.log('[BasePickerComponent] Normal mode: Updating URL directly');
        // Serialize selections before passing to URL service
        const serialized = this.config.selection.serializer(this.selectedItems);
        console.log('[BasePickerComponent] Serialized selections:', serialized);
        this.urlParamService.updateParam(
          this.config.selection.urlParam,
          serialized
        );
      }
    } catch (error) {
      console.error('[BasePickerComponent] Error in onApply():', error);
      throw error;
    }
  }

  /**
   * Handle Clear button click
   * Context-aware: Clears state directly or sends message to main window
   */
  /**
   * Remove a single item from selection (from chip close button)
   */
  onRemoveItem(key: string): void {
    console.log('[BasePickerComponent] Removing item:', key);
    this.selectedRows.delete(key);
    this.updateSelectedItemsDisplay();
    this.cdr.markForCheck();

    // Emit selection change event with updated selections
    this.selectionChange.emit({
      pickerId: this.config.id,
      selections: this.selectedItems,
      keys: Array.from(this.selectedRows),
    });

    // Update state based on context (pop-out vs normal)
    if (this.selectedRows.size === 0) {
      // If no selections left, remove URL parameter
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
    } else {
      // Otherwise, update with remaining selections
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
  }

  onClear(): void {
    console.log('[BasePickerComponent] Clear clicked');
    this.selectedRows.clear();
    this.updateSelectedItemsDisplay();
    this.cdr.markForCheck();

    // Emit selection change event
    this.selectionChange.emit({
      pickerId: this.config.id,
      selections: [],
      keys: [],
    });

    // Update state based on context (pop-out vs normal)
    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'PICKER_CLEAR',
        payload: {
          configId: this.config.id,
          urlParam: this.config.selection.urlParam,
        },
      });
    } else {
      // Normal mode: remove URL parameter
      this.urlParamService.removeParam(this.config.selection.urlParam);
    }
  }

  /**
   * Get selection count
   */
  get selectionCount(): number {
    return this.selectedRows.size;
  }
}

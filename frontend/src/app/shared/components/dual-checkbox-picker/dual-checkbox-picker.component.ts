/**
 * Dual Checkbox Picker Component
 *
 * Implements parent-child checkbox pattern for manufacturer-model selection.
 *
 * Features:
 * - Tri-state manufacturer checkbox (unchecked/indeterminate/checked)
 * - Binary model checkbox (unchecked/checked)
 * - Bulk manufacturer selection (one click selects all models)
 * - URL-driven state management
 * - Pop-out window support
 * - Set-based selection (O(1) lookups)
 * - Config-driven (uses PickerConfig)
 *
 * Usage:
 *   <app-dual-checkbox-picker [configId]="'manufacturer-model-dual'"></app-dual-checkbox-picker>
 */

import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { StateManagementService } from '../../../core/services/state-management.service';
import { RouteStateService } from '../../../core/services/route-state.service';
import { PopOutContextService } from '../../../core/services/popout-context.service';
import { PickerConfigService } from '../../../core/services/picker-config.service';
import { ManufacturerModelResponse } from '../../../models';
import { PickerConfig } from '../../models/picker-config.model';

/**
 * Manufacturer-Model row interface
 */
interface ManufacturerModelRow {
  manufacturer: string;
  model: string;
  key: string; // "manufacturer|model"
}

/**
 * Selected item for display
 */
interface SelectedItem {
  manufacturer: string;
  model: string;
  key: string;
}

@Component({
  selector: 'app-dual-checkbox-picker',
  templateUrl: './dual-checkbox-picker.component.html',
  styleUrls: ['./dual-checkbox-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DualCheckboxPickerComponent implements OnInit, OnDestroy {
  /**
   * Configuration ID (required)
   * Example: 'manufacturer-model-dual'
   */
  @Input() configId!: string;

  /** Picker configuration (loaded from PickerConfigService) */
  config!: PickerConfig<ManufacturerModelRow>;

  /** All manufacturer-model rows */
  tableData: ManufacturerModelRow[] = [];

  /** Selection state (Set<string> for O(1) lookups) */
  selectedRows = new Set<string>();

  /** Selected items for display (with manufacturer-model labels) */
  selectedItems: SelectedItem[] = [];

  /** Loading state */
  loading = false;

  /** Destroy subject for subscription cleanup */
  private destroy$ = new Subject<void>();

  /** Pending hydration (selections to apply after data loads) */
  private pendingHydration: string[] = [];

  /** Flag indicating if data has been loaded */
  private dataLoaded = false;

  constructor(
    private apiService: ApiService,
    private stateService: StateManagementService,
    private routeState: RouteStateService,
    private popOutContext: PopOutContextService,
    private pickerConfigService: PickerConfigService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('[DualCheckboxPicker] Initializing...');

    // Load configuration
    this.config = this.pickerConfigService.getConfig(this.configId);
    if (!this.config) {
      console.error(`[DualCheckboxPicker] Config not found for ID: ${this.configId}`);
      return;
    }

    console.log('[DualCheckboxPicker] Loaded config:', this.config);

    // Load data from API
    this.loadData();

    // Subscribe to URL state for hydration
    this.subscribeToUrlState();

    // In popout mode, also subscribe to filters$ for state synchronization
    if (this.popOutContext.isInPopOut()) {
      this.subscribeToStateFilters();
    }

    console.log(
      `[DualCheckboxPicker] Initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load manufacturer-model data from API
   */
  private loadData(): void {
    this.loading = true;
    this.cdr.markForCheck();

    // Use config to determine API call
    const apiMethod = this.config.api.method;
    if (!apiMethod) {
      console.error('[DualCheckboxPicker] No API method defined in config');
      this.loading = false;
      return;
    }

    // Get params from config paramMapper
    const params = this.config.api.paramMapper ? this.config.api.paramMapper({} as any) : {};

    // Use StateManagementService wrapper for RequestCoordinator benefits
    // (deduplication, caching, retry logic)
    let apiCall$;
    if (apiMethod === 'getManufacturerModelCombinations') {
      apiCall$ = this.stateService.fetchManufacturerModelData(params.page, params.size);
    } else {
      // Fallback for other API methods (should add wrappers for these too)
      console.warn(`[DualCheckboxPicker] API method '${apiMethod}' not wrapped in RequestCoordinator`);
      apiCall$ = (this.apiService as any)[apiMethod](params.page, params.size);
    }

    apiCall$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        console.log('[DualCheckboxPicker] Data loaded:', response);

        // Transform response using config responseTransformer
        const transformed = this.config.api.responseTransformer(response);
        this.tableData = transformed.results;

        this.dataLoaded = true;
        this.loading = false;

        // Apply pending hydration if any
        if (this.pendingHydration.length > 0) {
          this.hydrateSelections(this.pendingHydration);
          this.pendingHydration = [];
        }

        this.cdr.markForCheck();
      },
      error: (error: any) => {
        console.error('[DualCheckboxPicker] Failed to load data:', error);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Subscribe to URL state changes for selection hydration
   */
  private subscribeToUrlState(): void {
    this.routeState.watchParam(this.config.selection.urlParam).pipe(
      takeUntil(this.destroy$)
    ).subscribe((urlValue: string | null) => {
      console.log(`[DualCheckboxPicker] URL param ${this.config.selection.urlParam} changed:`, urlValue);

      // Parse selections from URL using config deserializer
      const selections = urlValue ? this.config.selection.deserializer(urlValue) : [];

      // Convert to keys using config keyGenerator
      const keys = selections.map((sel) => this.config.row.keyGenerator(sel));

      if (this.dataLoaded) {
        this.hydrateSelections(keys);
      } else {
        this.pendingHydration = keys;
      }

      this.cdr.markForCheck();
    });
  }

  /**
   * Subscribe to state filters for popout mode
   */
  private subscribeToStateFilters(): void {
    this.stateService.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((filters) => {
      console.log('[DualCheckboxPicker] Filters updated in popout:', filters);

      // Extract selections from filters using config's URL param
      const selections = (filters as any)[this.config.selection.urlParam] || [];

      // Convert to keys using config keyGenerator
      const keys = selections.map((sel: any) => this.config.row.keyGenerator(sel));

      if (this.dataLoaded) {
        this.hydrateSelections(keys);
      } else {
        this.pendingHydration = keys;
      }

      this.cdr.markForCheck();
    });
  }


  /**
   * Hydrate selections from keys
   */
  private hydrateSelections(keys: string[]): void {
    console.log('[DualCheckboxPicker] Hydrating selections:', keys);

    this.selectedRows.clear();
    keys.forEach((key: string) => this.selectedRows.add(key));

    this.updateSelectedItemsDisplay();
    this.cdr.markForCheck();
  }

  /**
   * Get all rows for a specific manufacturer
   */
  getAllRowsForManufacturer(manufacturer: string): ManufacturerModelRow[] {
    return this.tableData.filter((row: ManufacturerModelRow) => row.manufacturer === manufacturer);
  }

  /**
   * Get manufacturer checkbox state (tri-state logic)
   * Returns object with checked and indeterminate flags
   *
   * NOTE: PrimeNG p-checkbox doesn't support [indeterminate] input directly.
   * We need to use CSS classes for visual indeterminate state.
   */
  getManufacturerCheckboxState(manufacturer: string): {
    checked: boolean;
    indeterminate: boolean;
  } {
    const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);
    if (manufacturerRows.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const checkedCount = manufacturerRows.filter((row: ManufacturerModelRow) =>
      this.selectedRows.has(row.key)
    ).length;

    return {
      checked: checkedCount === manufacturerRows.length,
      indeterminate: checkedCount > 0 && checkedCount < manufacturerRows.length
    };
  }

  /**
   * Check if a row is selected
   */
  isRowSelected(row: ManufacturerModelRow): boolean {
    return this.selectedRows.has(row.key);
  }

  /**
   * Handle manufacturer checkbox change (parent checkbox)
   * Toggles ALL models for that manufacturer
   */
  onManufacturerCheckboxChange(manufacturer: string, event: any): void {
    const checked = event.checked;
    console.log(`[DualCheckboxPicker] Manufacturer checkbox changed: ${manufacturer} = ${checked}`);

    const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);

    manufacturerRows.forEach((row: ManufacturerModelRow) => {
      if (checked) {
        this.selectedRows.add(row.key);  // Add ALL models
      } else {
        this.selectedRows.delete(row.key);  // Remove ALL models
      }
    });

    this.updateSelectedItemsDisplay();
    this.cdr.markForCheck();
  }

  /**
   * Handle model checkbox change (child checkbox)
   * Toggles ONLY that specific model
   */
  onModelCheckboxChange(manufacturer: string, model: string, event: any): void {
    const checked = event.checked;
    const key = `${manufacturer}|${model}`;
    console.log(`[DualCheckboxPicker] Model checkbox changed: ${key} = ${checked}`);

    if (checked) {
      this.selectedRows.add(key);  // Add ONLY this model
    } else {
      this.selectedRows.delete(key);  // Remove ONLY this model
    }

    this.updateSelectedItemsDisplay();
    this.cdr.markForCheck();
  }

  /**
   * Update selected items display array
   * Converts Set<string> to SelectedItem[] for rendering chips
   */
  private updateSelectedItemsDisplay(): void {
    this.selectedItems = Array.from(this.selectedRows).map((key: string) => {
      const [manufacturer, model] = key.split('|');
      return { manufacturer, model, key };
    });

    console.log(`[DualCheckboxPicker] Selected items updated: ${this.selectedItems.length} items`);
  }

  /**
   * Remove a specific model from selection (from chip close button)
   */
  onRemoveModel(item: SelectedItem): void {
    console.log('[DualCheckboxPicker] Removing model:', item.key);
    this.selectedRows.delete(item.key);
    this.updateSelectedItemsDisplay();
    this.cdr.markForCheck();
  }

  /**
   * Clear all selections
   */
  onClear(): void {
    console.log('[DualCheckboxPicker] Clearing all selections');
    this.selectedRows.clear();
    this.updateSelectedItemsDisplay();

    // Update state
    if (this.popOutContext.isInPopOut()) {
      // Send PICKER_CLEAR message to main window
      this.popOutContext.sendMessage({
        type: 'PICKER_CLEAR',
        payload: {
          configId: this.config.id,
          urlParam: this.config.selection.urlParam
        }
      });
    } else {
      // Remove URL parameter directly (URL-driven state management)
      this.routeState.removeParam(this.config.selection.urlParam);
    }

    this.cdr.markForCheck();
  }

  /**
   * Apply selections (update URL and state)
   */
  onApply(): void {
    console.log('[DualCheckboxPicker] Applying selections:', this.selectedItems);

    // Serialize selections to URL format using config
    const urlValue = this.config.selection.serializer(this.selectedItems);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: Send PICKER_SELECTION_CHANGE message to main window
      this.popOutContext.sendMessage({
        type: 'PICKER_SELECTION_CHANGE',
        payload: {
          configId: this.config.id,
          urlParam: this.config.selection.urlParam,
          urlValue: urlValue
        }
      });
    } else {
      // Normal mode: Update URL directly (URL-driven state management)
      // URL change → RouteStateService emits → StateManagementService updates → Components re-hydrate
      this.routeState.updateParams({
        [this.config.selection.urlParam]: urlValue
      });
    }

    this.cdr.markForCheck();
  }

  /**
   * Get unique manufacturers for rendering
   * (Used to avoid rendering duplicate manufacturer rows)
   */
  getUniqueManufacturers(): string[] {
    const manufacturers = new Set<string>();
    this.tableData.forEach((row: ManufacturerModelRow) => manufacturers.add(row.manufacturer));
    return Array.from(manufacturers).sort();
  }

  /**
   * Get models for a specific manufacturer
   */
  getModelsForManufacturer(manufacturer: string): ManufacturerModelRow[] {
    return this.tableData.filter((row: ManufacturerModelRow) => row.manufacturer === manufacturer);
  }
}

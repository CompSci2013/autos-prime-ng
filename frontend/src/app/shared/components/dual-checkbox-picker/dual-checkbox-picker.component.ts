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
   * Get manufacturer checkbox state (binary pattern - no tri-state)
   * Returns checked boolean only
   *
   * NOTE: Parent checkbox always matches child checkbox state within the same row
   * (no intermediate/tri-state state for flat table pattern)
   */
  getManufacturerCheckboxState(manufacturer: string): boolean {
    const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);
    if (manufacturerRows.length === 0) {
      return false;
    }

    // For binary pattern: ALL rows of a manufacturer must be checked for parent to be checked
    return manufacturerRows.every((row: ManufacturerModelRow) =>
      this.selectedRows.has(row.key)
    );
  }

  /**
   * Check if a row is selected
   */
  isRowSelected(row: ManufacturerModelRow): boolean {
    return this.selectedRows.has(row.key);
  }

  /**
   * Handle manufacturer checkbox change (parent checkbox)
   * Binary pattern: When ANY row of a manufacturer is clicked, toggle ALL rows of that manufacturer
   *
   * Example with 3 Ford rows:
   * - All unchecked, click parent on row 1 → ALL 3 rows check
   * - All checked, click parent on row 3 → ALL 3 rows uncheck
   * - Row 1 checked, row 2 unchecked, row 3 unchecked, click parent on row 2 → ALL 3 rows toggle to checked
   */
  onManufacturerCheckboxChange(manufacturer: string, event: any): void {
    const checked = event.checked;
    console.log(`[DualCheckboxPicker] Manufacturer checkbox changed: ${manufacturer} = ${checked}`);

    const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);

    // Binary pattern: Toggle ALL rows of this manufacturer
    manufacturerRows.forEach((row: ManufacturerModelRow) => {
      if (checked) {
        this.selectedRows.add(row.key);  // Add ALL models of this manufacturer
      } else {
        this.selectedRows.delete(row.key);  // Remove ALL models of this manufacturer
      }
    });

    this.updateSelectedItemsDisplay();
    this.persistSelectionToUrl();
    this.cdr.markForCheck();
  }

  /**
   * Handle model checkbox change (child checkbox)
   * Binary pattern: Toggles ONLY that specific model (and its parent checkbox)
   *
   * Example: If row 2 of Ford is unchecked and we click its child checkbox,
   * only row 2's parent and child toggle. Other Ford rows unchanged.
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
    this.persistSelectionToUrl();
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
   * Persist current selection to URL
   * Helper method called after any selection change
   */
  private persistSelectionToUrl(): void {
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
      this.routeState.updateParams({
        [this.config.selection.urlParam]: urlValue
      });
    }
  }

  /**
   * Remove a specific model from selection (from chip close button)
   */
  onRemoveModel(item: SelectedItem): void {
    console.log('[DualCheckboxPicker] Removing model:', item.key);
    this.selectedRows.delete(item.key);
    this.updateSelectedItemsDisplay();
    this.persistSelectionToUrl();
    this.cdr.markForCheck();
  }

  /**
   * Clear all selections
   */
  onClear(): void {
    console.log('[DualCheckboxPicker] Clearing all selections');
    this.selectedRows.clear();
    this.updateSelectedItemsDisplay();
    this.persistSelectionToUrl();
    this.cdr.markForCheck();
  }

  /**
   * Apply selections (update URL and state)
   * Note: With real-time updates, this is mostly for explicit apply button if needed
   */
  onApply(): void {
    console.log('[DualCheckboxPicker] Applying selections:', this.selectedItems);
    this.persistSelectionToUrl();
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

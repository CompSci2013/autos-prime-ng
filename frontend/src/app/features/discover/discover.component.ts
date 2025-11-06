import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
import { UrlParamService } from '../../core/services/url-param.service';
import { GridTransferService } from '../../core/services/grid-transfer.service';
import { PanelPopoutService } from '../../core/services/panel-popout.service';
import { ManufacturerModelSelection } from '../../models';
import { SearchFilters } from '../../models/search-filters.model';
import { VehicleStatistics } from '../../models/vehicle-statistics.model';
import { WorkspacePanel } from '../../models/workspace-panel.model';
import { GridConfig } from '../../models/grid-config.model';
import { GridsterConfig, GridType, CompactType } from 'angular-gridster2';
import { QueryFilter } from '../filters/query-control/query-control.component';

/**
 * DiscoverPageComponent - AUTOS with Grid Workspace
 *
 * Features dual-grid workspace with drag-and-drop panels
 * Moved from Workshop (experimental design promoted to main page)
 */
@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrls: ['./discover.component.scss'],
})
export class DiscoverComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Grid configurations (array for N grids)
  grids: GridConfig[] = [];

  // Panel collapse states (keyed by grid ID) - for panels within grids
  panelCollapseStates: Map<string, boolean> = new Map();

  // Grid container collapse states (keyed by grid ID) - for entire grid containers
  gridCollapseStates: Map<string, boolean> = new Map();

  // State passed to picker
  pickerClearTrigger = 0;
  pickerInitialSelections: ManufacturerModelSelection[] = [];

  // Current filters from state
  currentFilters: SearchFilters = {};

  // Demo vehicle ID for VIN picker (context-aware demo)
  demoVehicleId = 'synth-buick-enclave-2008';

  constructor(
    private stateService: StateManagementService,
    private urlParams: UrlParamService,
    private gridTransfer: GridTransferService,
    private popoutService: PanelPopoutService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeGrids();
    this.loadGridState();
    this.loadGridCollapseStates();
    this.subscribeToGridChanges();
    this.subscribeToStateFilters();
  }

  private initializeGrids(): void {
    // Define grid configurations (array index = Grid Number - 1)
    const gridDefinitions = [
      { id: 'grid-1', name: 'Query Control', borderColor: '#1451faff' },      // Grid 1: grids[0]
      { id: 'grid-2', name: 'Model Picker', borderColor: '#52c41a' },         // Grid 2: grids[1]
      { id: 'grid-3', name: 'Vehicle Results', borderColor: '#fa8c16' },      // Grid 3: grids[2]
      { id: 'grid-4', name: 'Plotly Histograms', borderColor: '#722ed1' },    // Grid 4: grids[3]
    ];

    this.grids = gridDefinitions.map((def) =>
      this.createGridConfig(def.id, def.name, def.borderColor)
    );
  }

  private createGridConfig(
    id: string,
    name: string,
    borderColor: string
  ): GridConfig {
    const baseConfig: GridsterConfig = {
      gridType: GridType.Fit,
      compactType: CompactType.None,
      margin: 10,
      outerMargin: false, // No outer margin - containers provide spacing
      outerMarginTop: 0, // Explicitly no top margin
      outerMarginRight: 0,
      outerMarginBottom: 0,
      outerMarginLeft: 0,
      useTransformPositioning: true,
      mobileBreakpoint: 640,
      minCols: 1,
      maxCols: 100,
      minRows: 1,
      maxRows: 100,
      maxItemCols: 100,
      minItemCols: 4, // Minimum 2 columns (210px) to prevent panels becoming too narrow
      maxItemRows: 100,
      minItemRows: 4, // Minimum 4 rows
      maxItemArea: 2500,
      minItemArea: 4, // Minimum area 2x2 = 4 grid units
      defaultItemCols: 1,
      defaultItemRows: 1,
      fixedColWidth: 105,
      fixedRowHeight: 105,
      enableEmptyCellClick: false,
      enableEmptyCellContextMenu: false,
      enableEmptyCellDrop: true,
      enableEmptyCellDrag: false,
      enableOccupiedCellDrop: false,
      emptyCellDragMaxCols: 50,
      emptyCellDragMaxRows: 50,
      ignoreMarginInRow: false,
      draggable: {
        enabled: true,
        ignoreContentClass: 'no-drag',
        ignoreContent: false,
        dragHandleClass: 'drag-handle',
        stop: (item, gridsterItem, event) =>
          this.onDragStop(id, item, gridsterItem, event),
        start: undefined,
      },
      resizable: {
        enabled: true,
      },
      swap: false,
      pushItems: true,
      disablePushOnDrag: false,
      disablePushOnResize: false,
      pushDirections: { north: true, east: true, south: true, west: true },
      pushResizeItems: false,
      displayGrid: 'none', // Disable grid lines during drag/resize
      disableWindowResize: false,
      disableWarnings: false,
      scrollToNewItems: false,
      emptyCellDropCallback: (event, item) => this.onGridDrop(id, event, item),
      itemChangeCallback: (item, itemComponent) =>
        this.onGridChange(id, item, itemComponent),
      itemResizeCallback: undefined,
    };

    return {
      id,
      name,
      borderColor,
      options: baseConfig,
      items: [],
    };
  }

  private loadGridState(): void {
    // Always initialize with fixed default panels (no localStorage for panel placement)
    // Grid 1 (grids[0]): Query Control
    this.grids[0].items = [
      {
        cols: 12,
        rows: 6,
        y: 0,
        x: 0,
        id: 'query-control-1',
        panelType: 'query-control',
      },
    ];

    // Grid 2 (grids[1]): Model Picker
    this.grids[1].items = [
      {
        cols: 12,
        rows: 16,
        y: 0,
        x: 0,
        id: 'picker-1',
        panelType: 'picker',
      },
    ];

    // Grid 3 (grids[2]): Vehicle Results
    this.grids[2].items = [
      {
        cols: 12,
        rows: 32, // Increased to accommodate taller tables (100 rows)
        y: 0,
        x: 0,
        id: 'results-1',
        panelType: 'results',
      },
    ];

    // Grid 4 (grids[3]): Plotly Histograms (Original) and Individual Charts (New)
    this.grids[3].items = [
      {
        cols: 12,
        rows: 12,
        y: 0,
        x: 0,
        id: 'plotly-charts-1',
        panelType: 'plotly-charts',
      },
      {
        cols: 6,
        rows: 6,
        y: 12,
        x: 0,
        id: 'manufacturer-chart-1',
        panelType: 'manufacturer-chart',
      },
      {
        cols: 6,
        rows: 6,
        y: 12,
        x: 6,
        id: 'year-chart-1',
        panelType: 'year-chart',
      },
      {
        cols: 6,
        rows: 6,
        y: 18,
        x: 0,
        id: 'models-chart-1',
        panelType: 'models-chart',
      },
      {
        cols: 6,
        rows: 6,
        y: 18,
        x: 6,
        id: 'body-class-chart-1',
        panelType: 'body-class-chart',
      },
    ];

    // Initialize collapse states
    this.grids.forEach((grid) => {
      this.panelCollapseStates.set(grid.id, false);
    });

    // Sync to transfer service
    const gridsMap = new Map<string, WorkspacePanel[]>();
    this.grids.forEach((grid) => {
      gridsMap.set(grid.id, grid.items);
    });
    this.gridTransfer.setGrids(gridsMap);
  }

  private subscribeToGridChanges(): void {
    this.gridTransfer.grids$
      .pipe(takeUntil(this.destroy$))
      .subscribe((gridsMap) => {
        this.grids.forEach((grid) => {
          grid.items = gridsMap.get(grid.id) || [];
        });
        this.saveGridState();
      });
  }

  private subscribeToStateFilters(): void {
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        console.log('Discover: Filters updated from URL:', filters);

        this.currentFilters = filters;

        if (filters.modelCombos && filters.modelCombos.length > 0) {
          this.pickerInitialSelections = [...filters.modelCombos];
        } else {
          this.pickerInitialSelections = [];
        }
      });
  }

  private saveGridState(): void {
    const state: { [gridId: string]: WorkspacePanel[] } = {};
    this.grids.forEach((grid) => {
      state[grid.id] = grid.items;
    });
    localStorage.setItem('autos-discover-grid-state', JSON.stringify(state));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Drag & Drop Handlers
  onDragStop(
    sourceGridId: string,
    item: WorkspacePanel,
    gridsterItem: any,
    event: MouseEvent
  ): void {
    const targetGridId = this.detectTargetGrid(event);

    if (targetGridId && targetGridId !== sourceGridId) {
      // Cross-grid drop detected
      this.gridTransfer.transferItem(item, sourceGridId, targetGridId);
    }
  }

  private detectTargetGrid(event: MouseEvent): string | null {
    const x = event.clientX;
    const y = event.clientY;

    // Check if mouse is over any grid section header
    for (const grid of this.grids) {
      const gridContainer = document.querySelector(`[data-grid-id="${grid.id}"]`);
      if (!gridContainer) continue;

      // Find the grid-section-header within the same grid-section parent
      const gridSection = gridContainer.closest('.grid-section');
      if (!gridSection) continue;

      const headerEl = gridSection.querySelector('.grid-section-header');
      if (!headerEl) continue;

      const rect = headerEl.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        // Mouse is over this grid's header
        return grid.id;
      }
    }

    return null;
  }

  onGridDrop(gridId: string, event: MouseEvent, item: WorkspacePanel): void {
    console.log(`Item dropped on grid ${gridId}:`, item);
  }

  onGridChange(gridId: string, item: WorkspacePanel, gridsterItem: any): void {
    this.saveGridState();
  }

  // Panel Actions
  removePanel(item: WorkspacePanel, gridId: string): void {
    this.gridTransfer.removeItem(gridId, item.id!);
  }

  addPanel(gridId: string, panelType: 'picker' | 'results'): void {
    const newItem: WorkspacePanel = {
      cols: 2,
      rows: 2,
      y: 0,
      x: 0,
      id: `${gridId}-${panelType}-${Date.now()}`,
      panelType,
    };

    this.gridTransfer.addItem(gridId, newItem);
  }

  // Helper to get collapse state for a grid
  getPanelCollapseState(gridId: string): boolean {
    return this.panelCollapseStates.get(gridId) || false;
  }

  // Helper to toggle collapse state for a grid
  togglePanelCollapse(gridId: string): void {
    const currentState = this.panelCollapseStates.get(gridId) || false;
    this.panelCollapseStates.set(gridId, !currentState);
  }

  // Pop-out panel to new window
  popOutPanel(gridId: string, panel: WorkspacePanel): void {
    this.popoutService.popOutPanel(gridId, panel);
  }

  onPickerSelectionChange(selections: ManufacturerModelSelection[]): void {
    console.log('Discover: Picker selections changed:', selections);
    this.stateService.updateFilters({
      modelCombos: selections.length > 0 ? selections : undefined,
    });
  }

  onClearAll(): void {
    console.log('Discover: Clear all triggered');
    this.pickerClearTrigger++;
    // Use updateFilters to clear modelCombos and trigger a fresh fetch
    // This matches the picker's Clear button behavior
    this.stateService.updateFilters({
      modelCombos: undefined, // Remove filter (triggers fetch for all vehicles)
      manufacturer: undefined,
      model: undefined,
      yearMin: undefined,
      yearMax: undefined,
      bodyClass: undefined,
      dataSource: undefined,
    });
  }

  onFilterAdd(filter: QueryFilter): void {
    console.log('Discover: Query filter added:', filter);

    const updates: Partial<SearchFilters> = {};

    // Map filter to SearchFilters properties
    if (filter.type === 'range') {
      // Handle range filters (year)
      if (filter.field === 'year') {
        if (filter.rangeMin !== undefined) {
          updates.yearMin = filter.rangeMin;
        }
        if (filter.rangeMax !== undefined) {
          updates.yearMax = filter.rangeMax;
        }
      }
    } else if (filter.type === 'multiselect') {
      // Handle multiselect filters (manufacturer, model, bodyClass, dataSource)
      if (filter.field === 'manufacturer') {
        if (filter.values && filter.values.length > 0) {
          // Join multiple manufacturers with comma
          updates.manufacturer = filter.values.join(',');
        } else {
          // Clear manufacturer filter when array is empty
          updates.manufacturer = undefined;
        }
      } else if (filter.field === 'model') {
        if (filter.values && filter.values.length > 0) {
          // Join multiple models with comma
          updates.model = filter.values.join(',');
        } else {
          // Clear model filter when array is empty
          updates.model = undefined;
        }
      } else if (filter.field === 'bodyClass') {
        if (filter.values && filter.values.length > 0) {
          // Join multiple body classes with comma
          updates.bodyClass = filter.values.join(',');
        } else {
          // Clear body class filter when array is empty
          updates.bodyClass = undefined;
        }
      } else if (filter.field === 'dataSource') {
        if (filter.values && filter.values.length > 0) {
          // Join multiple data sources with comma
          updates.dataSource = filter.values.join(',');
        } else {
          // Clear data source filter when array is empty
          updates.dataSource = undefined;
        }
      }
    } else {
      // Handle string/number filters
      if (filter.field === 'manufacturer') {
        updates.manufacturer = filter.value as string;
      } else if (filter.field === 'model') {
        updates.model = filter.value as string;
      } else if (filter.field === 'body_class') {
        updates.bodyClass = filter.value as string;
      } else if (filter.field === 'data_source') {
        updates.dataSource = filter.value as string;
      }
    }

    this.stateService.updateFilters(updates);
  }

  onFilterRemove(event: {
    field: string;
    updates: Partial<SearchFilters>;
  }): void {
    console.log('Discover: Query filter removed:', event.field);
    this.stateService.updateFilters(event.updates);
  }

  /**
   * Handle highlight removal from Query Control
   * Removes h_* URL parameters based on field
   */
  onHighlightRemove(field: string): void {
    console.log('Discover: Highlight removed:', field);

    const paramsToRemove: string[] = [];

    if (field === 'h_year') {
      paramsToRemove.push('h_yearMin', 'h_yearMax');
    } else if (field === 'h_manufacturer') {
      paramsToRemove.push('h_manufacturer');
    } else if (field === 'h_bodyClass') {
      paramsToRemove.push('h_bodyClass');
    }

    // Remove h_* parameters from URL using UrlParamService
    this.urlParams.removeParams(paramsToRemove);
  }

  /**
   * Clear all highlights
   * Removes all h_* URL parameters
   */
  onClearHighlights(): void {
    console.log('Discover: Clearing all highlights');

    // UrlParamService has a dedicated method for this
    this.urlParams.clearAllHighlights();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.currentFilters.modelCombos &&
      this.currentFilters.modelCombos.length > 0
    );
  }

  get selectionCount(): number {
    return this.currentFilters.modelCombos?.length || 0;
  }

  // ===== Histogram Charts Support =====

  get statistics(): VehicleStatistics | null {
    // Get statistics from state service
    const state = this.stateService.currentState;
    return state?.statistics || null;
  }

  get selectedManufacturer(): string | null {
    return this.stateService.currentState?.selectedManufacturer || null;
  }

  get selectedYearRange(): string | null {
    const filters = this.currentFilters;
    if (filters.yearMin && filters.yearMax) {
      // Find matching year range
      const ranges = [
        '1960-1969',
        '1970-1979',
        '1980-1989',
        '1990-1999',
        '2000-2009',
        '2010-2019',
        '2020-2025',
      ];

      for (const range of ranges) {
        const [min, max] = range.split('-').map(Number);
        if (filters.yearMin === min && filters.yearMax === max) {
          return range;
        }
      }
    }
    return null;
  }

  // ===== Grid Container Collapse Management =====

  /**
   * Load grid collapse states from localStorage
   * Sets smart defaults: Charts collapsed, Query Control + Picker + Results expanded
   */
  private loadGridCollapseStates(): void {
    const saved = localStorage.getItem('autos-discover-grid-collapse');

    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.grids.forEach((grid) => {
          this.gridCollapseStates.set(grid.id, state[grid.id] || false);
        });
      } catch (error) {
        console.error('Error loading grid collapse state:', error);
        this.setDefaultCollapseStates();
      }
    } else {
      this.setDefaultCollapseStates();
    }
  }

  /**
   * Set smart default collapse states
   * Query Control (grid-4), Picker (grid-5), Results (grid-6): Expanded
   * Bottom Charts (grid-2), Plotly Histograms (grid-3): Collapsed
   */
  private setDefaultCollapseStates(): void {
    this.grids.forEach((grid) => {
      // Default: expand functional grids, collapse chart grids
      const collapsed = grid.id === 'grid-4' || false;
      this.gridCollapseStates.set(grid.id, collapsed);
    });
  }

  /**
   * Save grid collapse states to localStorage
   */
  private saveGridCollapseStates(): void {
    const state: { [gridId: string]: boolean } = {};
    this.gridCollapseStates.forEach((collapsed, gridId) => {
      state[gridId] = collapsed;
    });
    localStorage.setItem('autos-discover-grid-collapse', JSON.stringify(state));
  }

  /**
   * Check if a grid is collapsed
   */
  isGridCollapsed(gridId: string): boolean {
    return this.gridCollapseStates.get(gridId) || false;
  }

  /**
   * Toggle grid collapse state
   */
  toggleGridCollapse(gridId: string): void {
    const currentState = this.gridCollapseStates.get(gridId) || false;
    this.gridCollapseStates.set(gridId, !currentState);
    this.saveGridCollapseStates();
  }

  /**
   * Collapse all grids
   */
  collapseAllGrids(): void {
    this.grids.forEach((grid) => {
      this.gridCollapseStates.set(grid.id, true);
    });
    this.saveGridCollapseStates();
  }

  /**
   * Expand all grids
   */
  expandAllGrids(): void {
    this.grids.forEach((grid) => {
      this.gridCollapseStates.set(grid.id, false);
    });
    this.saveGridCollapseStates();
  }

  /**
   * Get grid name for display
   */
  getGridName(gridId: string): string {
    const grid = this.grids.find((g) => g.id === gridId);
    return grid?.name || gridId;
  }

  getGridHeaderLabel(gridId: string): string {
    const grid = this.grids.find((g) => g.id === gridId);
    if (!grid || !grid.items || grid.items.length === 0) {
      return ''; // Blank label when no controls present
    }

    // Get the first item's panel type
    const firstItem = grid.items[0];
    const panelType = firstItem.panelType;

    if (!panelType) {
      return 'Panel';
    }

    // Map panel types to readable labels
    const labelMap: { [key: string]: string } = {
      'picker': 'Model Picker',
      'results': 'Vehicle Results',
      'query-control': 'Query Control',
      'plotly-charts': 'Interactive Charts (Plotly)',
      'static-parabola': 'Static Parabola Chart'
    };

    return labelMap[panelType] || 'Panel';
  }
}

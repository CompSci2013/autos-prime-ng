import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { StateManagementService } from '../../core/services/state-management.service';
import { RouteStateService } from '../../core/services/route-state.service';
import { SearchFilters } from '../../models/search-filters.model';
import { QueryFilter } from '../filters/query-control/query-control.component';

/**
 * Panel configuration for drag/drop reordering
 */
interface PanelConfig {
  id: string;
  title: string;
  collapsed: boolean;
}

/**
 * DiscoverComponent - Vehicle Discovery Page
 *
 * Simplified page showing Query Control, Model Picker, Results, and Charts
 * in collapsible panels without grid layout complexity.
 *
 * Features:
 * - Drag/drop panel reordering (Angular CDK)
 * - Panel order persisted to localStorage
 */
@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrls: ['./discover.component.scss'],
})
export class DiscoverComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly PANEL_ORDER_KEY = 'discover-panel-order';

  // Current filters from state
  currentFilters: SearchFilters = {};

  // Selection count for display
  selectionCount = 0;
  hasActiveFilters = false;

  // Panel order configuration
  panels: PanelConfig[] = [
    { id: 'query-control', title: 'Query Control', collapsed: false },
    { id: 'model-picker', title: 'Model Picker', collapsed: false },
    { id: 'vin-browser', title: 'VIN Browser', collapsed: false },
    { id: 'vehicle-results', title: 'Vehicle Results', collapsed: false },
    { id: 'interactive-charts', title: 'Interactive Charts', collapsed: false },
  ];

  // Track popped-out panels (MOVE semantics)
  poppedOutPanels: Set<string> = new Set();
  private popoutWindows: Map<string, { window: Window; channel: BroadcastChannel; checkInterval: any }> = new Map();

  constructor(
    private stateService: StateManagementService,
    private routeState: RouteStateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPanelOrder();
    this.subscribeToStateFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up all popout windows and channels
    this.popoutWindows.forEach(({ window, channel, checkInterval }) => {
      clearInterval(checkInterval);
      channel.close();
      if (window && !window.closed) {
        window.close();
      }
    });
    this.popoutWindows.clear();
  }

  /**
   * Subscribe to state filter changes
   */
  private subscribeToStateFilters(): void {
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        console.log('Discover: Filters updated from URL:', filters);
        this.currentFilters = filters;
        this.updateSelectionCount();
        this.cdr.markForCheck();
      });
  }

  /**
   * Update selection count based on current filters
   */
  private updateSelectionCount(): void {
    const modelCombos = this.currentFilters.modelCombos || [];
    this.selectionCount = modelCombos.length;
    this.hasActiveFilters = this.selectionCount > 0;
  }

  /**
   * Handle filter additions from Query Control
   */
  onFilterAdd(filter: QueryFilter): void {
    console.log('Discover: Filter added:', filter);

    const updates: Partial<SearchFilters> = {};

    if (filter.type === 'multiselect' && filter.values) {
      // Join array values into comma-separated string
      const valueString = filter.values.join(',');
      updates[filter.field as keyof SearchFilters] = valueString as any;
    } else if (filter.type === 'range') {
      if (filter.field === 'year') {
        updates.yearMin = filter.rangeMin;
        updates.yearMax = filter.rangeMax;
      }
    } else if (filter.value !== undefined) {
      updates[filter.field as keyof SearchFilters] = filter.value as any;
    }

    console.log('Discover: Updating filters with:', updates);
    this.stateService.updateFilters(updates);
  }

  /**
   * Handle filter removals from Query Control
   */
  onFilterRemove(event: { field: string; updates: Partial<SearchFilters> }): void {
    console.log('Discover: Filter removed:', event);
    this.stateService.updateFilters(event.updates);
  }

  /**
   * Handle highlight removals from Query Control
   */
  onHighlightRemove(field: string): void {
    console.log('Discover: Highlight removed:', field);
    // Highlights use h_* prefix in URL, so remove that parameter
    this.routeState.removeParam(field);
  }

  /**
   * Handle clear highlights from Query Control
   */
  onClearHighlights(): void {
    console.log('Discover: Clear highlights');
    // Remove all h_* parameters from URL
    const params = this.routeState.getCurrentParams();
    const highlightKeys = Object.keys(params).filter(key => key.startsWith('h_'));

    // Create new params object without highlight keys
    const newParams = { ...params };
    highlightKeys.forEach(key => delete newParams[key]);

    this.routeState.setParams(newParams);
  }

  /**
   * Clear all filters
   */
  onClearAll(): void {
    this.stateService.clearAllFilters();
  }

  // ========== DRAG/DROP PANEL REORDERING ==========

  /**
   * Handle panel drop event (reorder panels)
   */
  onPanelDrop(event: CdkDragDrop<PanelConfig[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      moveItemInArray(this.panels, event.previousIndex, event.currentIndex);
      this.savePanelOrder();
      console.log('Panel order updated:', this.panels.map(p => p.id));
    }
  }

  /**
   * Load panel order from localStorage
   */
  private loadPanelOrder(): void {
    try {
      const savedOrder = localStorage.getItem(this.PANEL_ORDER_KEY);
      if (savedOrder) {
        const panelIds: string[] = JSON.parse(savedOrder);

        // Reorder panels based on saved order
        const reorderedPanels: PanelConfig[] = [];
        panelIds.forEach(id => {
          const panel = this.panels.find(p => p.id === id);
          if (panel) {
            reorderedPanels.push(panel);
          }
        });

        // Add any new panels that weren't in saved order (future-proofing)
        this.panels.forEach(panel => {
          if (!reorderedPanels.find(p => p.id === panel.id)) {
            reorderedPanels.push(panel);
          }
        });

        this.panels = reorderedPanels;
        console.log('Panel order loaded from localStorage:', this.panels.map(p => p.id));
      }
    } catch (error) {
      console.error('Failed to load panel order:', error);
    }
  }

  /**
   * Save panel order to localStorage
   */
  private savePanelOrder(): void {
    try {
      const panelIds = this.panels.map(p => p.id);
      localStorage.setItem(this.PANEL_ORDER_KEY, JSON.stringify(panelIds));
      console.log('Panel order saved to localStorage');
    } catch (error) {
      console.error('Failed to save panel order:', error);
    }
  }

  /**
   * Reset panel order to default
   */
  resetPanelOrder(): void {
    this.panels = [
      { id: 'query-control', title: 'Query Control', collapsed: false },
      { id: 'model-picker', title: 'Model Picker', collapsed: false },
      { id: 'vin-browser', title: 'VIN Browser', collapsed: false },
      { id: 'vehicle-results', title: 'Vehicle Results', collapsed: false },
      { id: 'interactive-charts', title: 'Interactive Charts', collapsed: false },
    ];
    this.savePanelOrder();
    console.log('Panel order reset to default');
  }

  // ========== PANEL POPOUT FUNCTIONALITY ==========

  /**
   * Pop out a panel to a new window (MOVE semantics)
   * Opens panel in a separate window with BroadcastChannel communication
   * Panel is removed from main page until pop-out window is closed
   */
  popOutPanel(panelId: string): void {
    // Map panel IDs to panel types for the popout route
    const panelTypeMap: Record<string, string> = {
      'query-control': 'query-control',
      'model-picker': 'picker',
      'vin-browser': 'picker',
      'vehicle-results': 'results',
      'interactive-charts': 'plotly-charts',
    };

    const panelType = panelTypeMap[panelId];
    if (!panelType) {
      console.error('Unknown panel ID:', panelId);
      return;
    }

    // Build popout URL
    const gridId = 'discover'; // Grid identifier for BroadcastChannel
    const url = `/panel/${gridId}/${panelId}/${panelType}`;

    // Window features (size, position)
    const features = [
      'width=1200',
      'height=800',
      'left=100',
      'top=100',
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
      'resizable=yes',
      'scrollbars=yes'
    ].join(',');

    // Open pop-out window
    const popoutWindow = window.open(url, `panel-${panelId}`, features);

    if (!popoutWindow) {
      console.error('Failed to open pop-out window. Check if popups are blocked.');
      return;
    }

    // MOVE SEMANTICS: Mark panel as popped out (removed from main page)
    this.poppedOutPanels.add(panelId);
    console.log(`Panel ${panelId} popped out to new window (MOVE semantics)`);

    // Set up BroadcastChannel for communication
    const channel = new BroadcastChannel(`panel-${panelId}`);

    // Listen for messages from pop-out
    channel.onmessage = (event) => {
      if (event.data.type === 'PANEL_READY') {
        console.log(`Pop-out panel ${panelId} is ready, sending initial state`);

        // Send current state to pop-out
        const currentState = this.stateService.getCurrentState();
        channel.postMessage({
          type: 'STATE_UPDATE',
          state: currentState
        });
      } else if (event.data.type === 'PICKER_SELECTION_CHANGE') {
        // BasePickerComponent sends this new message type with URL param info
        console.log('Picker selection change from pop-out:', event.data.payload);
        // BasePicker sends { configId, urlParam, urlValue }
        // For manufacturer-model picker: urlParam = 'modelCombos', urlValue = 'Ford:F-150,Chevy:Corvette'
        if (event.data.payload && event.data.payload.urlParam && event.data.payload.urlValue !== undefined) {
          const updates: any = {};
          const urlParam = event.data.payload.urlParam;
          const urlValue = event.data.payload.urlValue;

          // Parse URL value based on param type
          // modelCombos needs to be an array of objects {manufacturer, model}
          if (urlParam === 'modelCombos' && urlValue) {
            // Parse comma-separated string: 'Ford:F-150,Chevy:Corvette'
            // Into array of objects: [{manufacturer: 'Ford', model: 'F-150'}, ...]
            updates[urlParam] = urlValue.split(',').map((combo: string) => {
              const [manufacturer, model] = combo.split(':');
              return { manufacturer, model };
            });
          } else {
            updates[urlParam] = urlValue || undefined;
          }

          this.stateService.updateFilters(updates);
        }
      } else if (event.data.type === 'SELECTION_CHANGE') {
        // Legacy: Handle model selection change from popped-out picker
        console.log('Selection change from pop-out picker (legacy):', event.data.data);
        this.stateService.updateFilters({
          modelCombos: event.data.data.length > 0 ? event.data.data : undefined,
        });
      } else if (event.data.type === 'CLEAR_ALL') {
        // Handle clear all from popped-out picker
        console.log('Clear all from pop-out picker');
        this.stateService.resetFilters();
      } else if (event.data.type === 'FILTER_ADD') {
        // Handle filter add from pop-out
        console.log('Filter add from pop-out:', event.data.payload);
        this.onFilterAdd(event.data.payload);
      } else if (event.data.type === 'FILTER_REMOVE') {
        // Handle filter remove from pop-out
        console.log('Filter remove from pop-out:', event.data.payload);
        this.onFilterRemove(event.data.payload);
      }
    };

    // Subscribe to state changes and broadcast to pop-out
    this.stateService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        if (popoutWindow && !popoutWindow.closed) {
          channel.postMessage({
            type: 'STATE_UPDATE',
            state: state
          });
        }
      });

    // Check periodically if pop-out window is closed (MOVE semantics restoration)
    const checkInterval = setInterval(() => {
      if (popoutWindow.closed) {
        console.log(`Pop-out window for ${panelId} closed, restoring panel to main page`);
        this.poppedOutPanels.delete(panelId);
        this.popoutWindows.delete(panelId);
        channel.close();
        clearInterval(checkInterval);
        this.cdr.markForCheck(); // Trigger UI update
      }
    }, 500);

    // Store window reference and cleanup handlers
    this.popoutWindows.set(panelId, {
      window: popoutWindow,
      channel,
      checkInterval
    });
  }

  /**
   * Check if a panel is currently popped out
   */
  isPanelPoppedOut(panelId: string): boolean {
    return this.poppedOutPanels.has(panelId);
  }
}

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
    { id: 'vehicle-results', title: 'Vehicle Results', collapsed: false },
    { id: 'interactive-charts', title: 'Interactive Charts', collapsed: false },
  ];

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
      { id: 'vehicle-results', title: 'Vehicle Results', collapsed: false },
      { id: 'interactive-charts', title: 'Interactive Charts', collapsed: false },
    ];
    this.savePanelOrder();
    console.log('Panel order reset to default');
  }
}

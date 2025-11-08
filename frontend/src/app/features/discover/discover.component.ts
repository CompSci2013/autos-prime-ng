import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
import { RouteStateService } from '../../core/services/route-state.service';
import { SearchFilters } from '../../models/search-filters.model';
import { QueryFilter } from '../filters/query-control/query-control.component';

/**
 * DiscoverComponent - Vehicle Discovery Page
 *
 * Simplified page showing Query Control, Model Picker, Results, and Charts
 * in collapsible panels without grid layout complexity.
 */
@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrls: ['./discover.component.scss'],
})
export class DiscoverComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Current filters from state
  currentFilters: SearchFilters = {};

  // Selection count for display
  selectionCount = 0;
  hasActiveFilters = false;

  constructor(
    private stateService: StateManagementService,
    private routeState: RouteStateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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
}

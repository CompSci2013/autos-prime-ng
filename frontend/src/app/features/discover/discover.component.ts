import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
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
    // QueryControlComponent already updates state directly
  }

  /**
   * Handle filter removals from Query Control
   */
  onFilterRemove(event: { field: string; updates: Partial<SearchFilters> }): void {
    console.log('Discover: Filter removed:', event);
    // QueryControlComponent already updates state directly
  }

  /**
   * Handle highlight removals from Query Control
   */
  onHighlightRemove(field: string): void {
    console.log('Discover: Highlight removed:', field);
    // QueryControlComponent already updates state directly
  }

  /**
   * Handle clear highlights from Query Control
   */
  onClearHighlights(): void {
    console.log('Discover: Clear highlights');
    // QueryControlComponent already updates state directly
  }

  /**
   * Clear all filters
   */
  onClearAll(): void {
    this.stateService.clearAllFilters();
  }
}

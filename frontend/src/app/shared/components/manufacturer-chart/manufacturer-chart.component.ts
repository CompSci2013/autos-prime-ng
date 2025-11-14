import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VehicleStatistics } from '../../../models/vehicle-statistics.model';
import { HighlightFilters } from '../../../models/search-filters.model';
// EXPERIMENT: Swap StateManagementService with VehicleResourceManagementService
// import { StateManagementService } from '../../../core/services/state-management.service';
import { VehicleResourceManagementService } from '../../../core/services/vehicle-resource-management.factory';
import { UrlParamService } from '../../../core/services/url-param.service';
import { PopOutContextService } from '../../../core/services/popout-context.service';
import { ManufacturerChartDataSource } from '../../data-sources/manufacturer-chart.data-source';

/**
 * ManufacturerChartComponent
 *
 * Displays manufacturer distribution as a bar chart using BaseChartComponent.
 * Minimal wrapper that provides ManufacturerChartDataSource and handles click events.
 *
 * Composition pattern (Milestone 003 style):
 * - Delegates rendering to BaseChartComponent
 * - Provides chart-specific data source
 * - Handles user interactions (click → filter/highlight)
 */
@Component({
  selector: 'app-manufacturer-chart',
  template: `
    <app-base-chart
      [dataSource]="dataSource"
      [statistics]="statistics"
      [highlights]="highlights"
      [selectedValue]="selectedManufacturer"
      (chartClick)="onChartClick($event)">
    </app-base-chart>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class ManufacturerChartComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data source for BaseChartComponent
  dataSource = new ManufacturerChartDataSource();

  // State from StateManagementService
  statistics: VehicleStatistics | null = null;
  highlights: HighlightFilters = {};
  selectedManufacturer: string | null = null;

  constructor(
    // EXPERIMENT: Using VehicleResourceManagementService instead of StateManagementService
    private stateService: VehicleResourceManagementService,
    private urlParamService: UrlParamService,
    private popOutContext: PopOutContextService
  ) {}

  ngOnInit(): void {
    console.log(`[ManufacturerChart] Initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`);

    // Subscribe to statistics
    this.stateService.statistics$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(stats => {
      this.statistics = stats;
    });

    // Subscribe to highlights
    this.stateService.highlights$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(highlights => {
      this.highlights = highlights;
    });

    // Subscribe to selected manufacturer (for visual highlighting)
    this.stateService.state$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(state => {
      this.selectedManufacturer = state.selectedManufacturer || null;
    });
  }

  onChartClick(event: {value: string, isHighlightMode: boolean}): void {
    const manufacturer = event.value;

    if (event.isHighlightMode) {
      // Highlight mode: Set h_manufacturer parameter
      console.log(`[ManufacturerChart] Setting highlight: ${manufacturer}`);
      this.urlParamService.setHighlightParam('manufacturer', manufacturer);
    } else {
      // Filter mode: Set manufacturer filter
      console.log(`[ManufacturerChart] Setting filter: ${manufacturer}`);

      if (this.popOutContext.isInPopOut()) {
        // In pop-out: Send message to main window
        this.popOutContext.sendMessage({
          type: 'set-manufacturer-filter',
          payload: { manufacturer: manufacturer }
        });
      } else {
        // In main window: Update state directly
        this.stateService.updateFilters({ manufacturer });
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

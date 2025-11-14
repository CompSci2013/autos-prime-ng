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
import { YearChartDataSource } from '../../data-sources/year-chart.data-source';

/**
 * YearChartComponent
 *
 * Displays year distribution as a bar chart using BaseChartComponent.
 * Supports Box Select for year range filtering.
 */
@Component({
  selector: 'app-year-chart',
  template: `
    <app-base-chart
      [dataSource]="dataSource"
      [statistics]="statistics"
      [highlights]="highlights"
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
export class YearChartComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  dataSource = new YearChartDataSource();

  statistics: VehicleStatistics | null = null;
  highlights: HighlightFilters = {};

  constructor(
    // EXPERIMENT: Using VehicleResourceManagementService instead of StateManagementService
    private stateService: VehicleResourceManagementService,
    private urlParamService: UrlParamService,
    private popOutContext: PopOutContextService
  ) {}

  ngOnInit(): void {
    console.log(`[YearChart] Initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`);

    this.stateService.statistics$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(stats => {
      this.statistics = stats;
    });

    this.stateService.highlights$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(highlights => {
      this.highlights = highlights;
    });
  }

  onChartClick(event: {value: string, isHighlightMode: boolean}): void {
    const yearValue = event.value;

    // Parse year or year range
    let yearMin: number;
    let yearMax: number;

    if (yearValue.includes('-')) {
      const [min, max] = yearValue.split('-').map(y => parseInt(y, 10));
      yearMin = min;
      yearMax = max;
    } else {
      yearMin = yearMax = parseInt(yearValue, 10);
    }

    if (event.isHighlightMode) {
      // Highlight mode: Set h_yearMin/h_yearMax parameters
      console.log(`[YearChart] Setting highlight: ${yearMin}-${yearMax}`);
      this.urlParamService.setHighlightRange({
        yearMin,
        yearMax
      });
    } else {
      // Filter mode: Set year range filter
      console.log(`[YearChart] Setting filter: ${yearMin}-${yearMax}`);

      if (this.popOutContext.isInPopOut()) {
        this.popOutContext.sendMessage({
          type: 'set-year-filter',
          payload: { yearMin, yearMax }
        });
      } else {
        this.stateService.updateFilters({ yearMin, yearMax });
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

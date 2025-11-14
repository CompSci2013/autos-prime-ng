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
import { BodyClassChartDataSource } from '../../data-sources/body-class-chart.data-source';

/**
 * BodyClassChartComponent
 *
 * Displays body class distribution as a bar chart using BaseChartComponent.
 */
@Component({
  selector: 'app-body-class-chart',
  template: `
    <app-base-chart
      [dataSource]="dataSource"
      [statistics]="statistics"
      [highlights]="highlights"
      [selectedValue]="selectedBodyClass"
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
export class BodyClassChartComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  dataSource = new BodyClassChartDataSource();

  statistics: VehicleStatistics | null = null;
  highlights: HighlightFilters = {};
  selectedBodyClass: string | null = null;

  constructor(
    // EXPERIMENT: Using VehicleResourceManagementService instead of StateManagementService
    private stateService: VehicleResourceManagementService,
    private urlParamService: UrlParamService,
    private popOutContext: PopOutContextService
  ) {}

  ngOnInit(): void {
    console.log(`[BodyClassChart] Initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`);

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

    this.stateService.state$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(state => {
      this.selectedBodyClass = state.filters?.bodyClass || null;
    });
  }

  onChartClick(event: {value: string, isHighlightMode: boolean}): void {
    const bodyClass = event.value;

    if (event.isHighlightMode) {
      // Highlight mode: Set h_bodyClass parameter
      console.log(`[BodyClassChart] Setting highlight: ${bodyClass}`);
      this.urlParamService.setHighlightParam('bodyClass', bodyClass);
    } else {
      // Filter mode: Set bodyClass filter
      console.log(`[BodyClassChart] Setting filter: ${bodyClass}`);

      if (this.popOutContext.isInPopOut()) {
        this.popOutContext.sendMessage({
          type: 'set-body-class-filter',
          payload: { bodyClass: bodyClass }
        });
      } else {
        this.stateService.updateFilters({ bodyClass });
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

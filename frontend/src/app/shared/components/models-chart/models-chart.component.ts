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
import { ModelsChartDataSource } from '../../data-sources/models-chart.data-source';

/**
 * ModelsChartComponent
 *
 * Displays model distribution grouped by manufacturer using BaseChartComponent.
 */
@Component({
  selector: 'app-models-chart',
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
export class ModelsChartComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  dataSource = new ModelsChartDataSource();

  statistics: VehicleStatistics | null = null;
  highlights: HighlightFilters = {};

  constructor(
    // EXPERIMENT: Using VehicleResourceManagementService instead of StateManagementService
    private stateService: VehicleResourceManagementService,
    private urlParamService: UrlParamService,
    private popOutContext: PopOutContextService
  ) {}

  ngOnInit(): void {
    console.log(`[ModelsChart] Initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`);

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
    const modelValue = event.value; // Format: "Ford:F-150"

    if (event.isHighlightMode) {
      // Highlight mode: Set h_model parameter
      console.log(`[ModelsChart] Setting highlight: ${modelValue}`);
      this.urlParamService.setHighlightParam('model', modelValue);
    } else {
      // Filter mode: Set model filter
      console.log(`[ModelsChart] Setting filter: ${modelValue}`);

      if (this.popOutContext.isInPopOut()) {
        this.popOutContext.sendMessage({
          type: 'set-model-filter',
          payload: { model: modelValue }
        });
      } else {
        this.stateService.updateFilters({ model: modelValue });
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as Plotly from 'plotly.js-dist-min';
import { VehicleStatistics } from '../../../models/vehicle-statistics.model';
import { HighlightFilters } from '../../../models/search-filters.model';
import { PopOutContextService } from '../../../core/services/popout-context.service';
import { StateManagementService } from '../../../core/services/state-management.service';
import { UrlParamService } from '../../../core/services/url-param.service';

/**
 * PlotlyHistogramComponent
 *
 * Interactive histogram charts using Plotly.js
 * Displays 4 charts: Manufacturer, Models, Year Range, Body Class
 *
 * POP-OUT AWARE: This component adapts its behavior based on context:
 * - Normal mode: Subscribes to StateManagementService, charts are informational only
 * - Pop-out mode: Same subscription, sends user interactions to main window via PopOutContextService
 *
 * The component is completely self-contained and requires no inputs/outputs.
 */
@Component({
  selector: 'app-plotly-histogram',
  templateUrl: './plotly-histogram.component.html',
  styleUrls: ['./plotly-histogram.component.scss'],
})
export class PlotlyHistogramComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private viewInitialized = false;

  // State from StateManagementService
  statistics: VehicleStatistics | null = null;
  selectedManufacturer: string | null = null;
  selectedYearRange: string | null = null;
  selectedBodyClass: string | null = null;

  // Highlight mode state
  private isHighlightModeActive = false;
  private currentHighlights: HighlightFilters = {};

  @ViewChild('manufacturerChart', { static: false }) manufacturerChartEl!: ElementRef;
  @ViewChild('modelsChart', { static: false }) modelsChartEl!: ElementRef;
  @ViewChild('yearRangeChart', { static: false }) yearRangeChartEl!: ElementRef;
  @ViewChild('bodyClassChart', { static: false }) bodyClassChartEl!: ElementRef;

  private plotlyConfig: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    // Enable lasso and rectangular selection tools
  };

  constructor(
    private popOutContext: PopOutContextService,
    private stateService: StateManagementService,
    private urlParamService: UrlParamService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Keyboard event listeners for highlight mode
   * Hold 'h' key while using Box Select to create highlights instead of filters
   */
  @HostListener('document:keydown.h')
  onHighlightKeyDown(): void {
    // Prevent repeated keydown events when holding key
    if (this.isHighlightModeActive) return;

    this.isHighlightModeActive = true;
    console.log('[PlotlyHistogram] 🟦 Highlight mode ACTIVATED - Box Select will create highlights');
  }

  @HostListener('document:keyup.h')
  onHighlightKeyUp(): void {
    this.isHighlightModeActive = false;
    console.log('[PlotlyHistogram] Highlight mode DEACTIVATED - Box Select will create filters');
  }

  ngOnInit(): void {
    console.log(`[PlotlyHistogram] Initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`);

    // Subscribe to state changes
    this.stateService.statistics$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((stats: VehicleStatistics | null) => {
      console.log('[PlotlyHistogram] Statistics updated:', !!stats);
      this.statistics = stats;
      this.renderCharts();
    });

    this.stateService.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      console.log('[PlotlyHistogram] Filters updated:', filters);

      // Update selected values for chart highlighting
      this.selectedManufacturer = filters.manufacturer || null;
      this.selectedYearRange = filters.yearMin && filters.yearMax
        ? `${filters.yearMin}-${filters.yearMax}`
        : null;
      this.selectedBodyClass = filters.bodyClass || null;

      this.renderCharts();
    });

    // Subscribe to highlights (UI-only state, doesn't affect API calls)
    this.stateService.highlights$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(highlights => {
      console.log('[PlotlyHistogram] 🟦 Highlights updated:', highlights);
      this.currentHighlights = highlights;
      this.renderCharts();
    });
  }

  ngAfterViewInit(): void {
    // Mark view as initialized and render charts if we have data
    // Use requestAnimationFrame to ensure DOM is fully laid out with dimensions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.viewInitialized = true;
        console.log('[PlotlyHistogram] View initialized, rendering charts');
        this.renderCharts();
        this.cdr.detectChanges();
      });
    });
  }

  ngOnDestroy(): void {
    // Clean up Plotly instances (only if elements exist)
    if (this.manufacturerChartEl?.nativeElement) {
      Plotly.purge(this.manufacturerChartEl.nativeElement);
    }
    if (this.modelsChartEl?.nativeElement) {
      Plotly.purge(this.modelsChartEl.nativeElement);
    }
    if (this.yearRangeChartEl?.nativeElement) {
      Plotly.purge(this.yearRangeChartEl.nativeElement);
    }
    if (this.bodyClassChartEl?.nativeElement) {
      Plotly.purge(this.bodyClassChartEl.nativeElement);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  private renderCharts(): void {
    // Don't render until view is initialized and we have data
    if (!this.viewInitialized || !this.statistics) {
      console.log('[PlotlyHistogram] Not ready to render:', {
        viewInitialized: this.viewInitialized,
        hasStatistics: !!this.statistics
      });
      return;
    }

    // Check if ViewChild elements are set
    console.log('[PlotlyHistogram] ViewChild status:', {
      manufacturerChart: !!this.manufacturerChartEl?.nativeElement,
      modelsChart: !!this.modelsChartEl?.nativeElement,
      yearRangeChart: !!this.yearRangeChartEl?.nativeElement,
      bodyClassChart: !!this.bodyClassChartEl?.nativeElement
    });

    // Check if chart containers have dimensions (important for pop-out windows)
    if (this.manufacturerChartEl?.nativeElement) {
      const rect = this.manufacturerChartEl.nativeElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.log('[PlotlyHistogram] Elements not sized yet, retrying in 100ms');
        setTimeout(() => this.renderCharts(), 100);
        return;
      }
    } else {
      console.log('[PlotlyHistogram] manufacturerChartEl not set, retrying in 100ms');
      setTimeout(() => this.renderCharts(), 100);
      return;
    }

    console.log('[PlotlyHistogram] Rendering all charts');
    this.renderManufacturerChart();
    this.renderModelsChart();
    this.renderYearRangeChart();
    this.renderBodyClassChart();
  }

  private renderManufacturerChart(): void {
    if (!this.statistics?.byManufacturer || !this.manufacturerChartEl?.nativeElement) return;

    const el = this.manufacturerChartEl.nativeElement;
    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);

    console.log('[PlotlyHistogram] Manufacturer chart element dimensions:', {
      isPopOut: this.popOutContext.isInPopOut(),
      boundingRect: { width: rect.width, height: rect.height },
      computedStyle: {
        width: computed.width,
        height: computed.height,
        display: computed.display,
        visibility: computed.visibility
      },
      offsetDimensions: { width: el.offsetWidth, height: el.offsetHeight }
    });

    const entries = Object.entries(this.statistics.byManufacturer);

    // Check if data has segmented format ({total, highlighted})
    const isSegmented = entries.length > 0 &&
      typeof entries[0][1] === 'object' &&
      'total' in entries[0][1];

    let traces: Plotly.Data[];

    if (isSegmented) {
      // Segmented statistics: render stacked bars
      const sorted = entries
        .sort((a, b) => ((b[1] as any).total || 0) - ((a[1] as any).total || 0))
        .slice(0, 20);

      const labels = sorted.map(([label]) => label);
      const highlightedCounts = sorted.map(([, stats]: [string, any]) => stats.highlighted || 0);
      const nonHighlightedCounts = sorted.map(([, stats]: [string, any]) =>
        (stats.total || 0) - (stats.highlighted || 0)
      );

      traces = [
        {
          x: labels,
          y: highlightedCounts,
          type: 'bar',
          name: 'Highlighted',
          marker: {
            color: '#1890ff',
            line: { color: '#096dd9', width: 2 }
          },
          hovertemplate: '<b>%{x}</b><br>Highlighted: %{y}<extra></extra>',
        },
        {
          x: labels,
          y: nonHighlightedCounts,
          type: 'bar',
          name: 'Other',
          marker: {
            color: '#d9d9d9',
            line: { color: '#bfbfbf', width: 2 }
          },
          hovertemplate: '<b>%{x}</b><br>Other: %{y}<extra></extra>',
        }
      ];
    } else {
      // Legacy format: render single-color bars
      const data = entries
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 20);

      traces = [{
        x: data.map(([label]) => label),
        y: data.map(([, count]) => count as number),
        type: 'bar',
        marker: {
          color: data.map(([label]) =>
            label === this.selectedManufacturer ? '#28a745' : '#4a90e2'
          ),
          line: {
            color: data.map(([label]) =>
              label === this.selectedManufacturer ? '#218838' : '#357abd'
            ),
            width: 2,
          },
        },
        hovertemplate: '<b>%{x}</b><br>Count: %{y}<extra></extra>',
      }];
    }

    // Explicitly calculate width from container (workaround for pop-out window issues)
    const containerWidth = el.offsetWidth || el.parentElement?.offsetWidth || 600;

    const layout: Partial<Plotly.Layout> = {
      title: {
        text: 'Manufacturers',
        font: { size: 18, family: 'Arial, sans-serif' },
        xref: 'paper',
        x: 0.5,
      },
      xaxis: { title: 'Manufacturer' },
      yaxis: { title: 'Count' },
      width: containerWidth,
      height: 400,
      margin: { t: 60, r: 20, b: 100, l: 60 },
      barmode: isSegmented ? 'stack' : undefined,
      showlegend: isSegmented,
    };

    const config = {
      ...this.plotlyConfig,
      responsive: true,
    };

    console.log('[PlotlyHistogram] Calling Plotly.react() for manufacturer chart with explicit width:', containerWidth);
    // Use react() for better handling of updates, especially in pop-out windows
    Plotly.react(el, traces, layout, config).then(() => {
      console.log('[PlotlyHistogram] Manufacturer chart Plotly.react() completed');
      // Force resize after render (important for pop-out windows)
      if (this.popOutContext.isInPopOut()) {
        setTimeout(() => {
          console.log('[PlotlyHistogram] Calling Plotly.Plots.resize() for manufacturer chart');
          Plotly.Plots.resize(el);
        }, 100);
      }
    }).catch(err => {
      console.error('[PlotlyHistogram] Error rendering manufacturer chart:', err);
    });

    // Add click handler - context-aware
    el.on('plotly_click', (data: any) => {
      const label = data.points[0].x;
      this.onManufacturerClick(label);
    });

    // Add selection handler for box/lasso select
    el.on('plotly_selected', (data: any) => {
      if (data && data.points && data.points.length > 0) {
        const selectedManufacturers: string[] = [...new Set<string>(data.points.map((point: any) => point.x as string))];
        this.onManufacturerSelect(selectedManufacturers);
      }
    });
  }

  private renderModelsChart(): void {
    if (!this.statistics?.modelsByManufacturer || !this.modelsChartEl?.nativeElement) return;

    const selectedMfr = this.selectedManufacturer;
    const dataPoints: Array<[string, number | {total: number, highlighted: number}]> = [];

    // Check if data has segmented format
    let isSegmented = false;

    Object.entries(this.statistics.modelsByManufacturer).forEach(
      ([manufacturer, models]) => {
        if (selectedMfr && manufacturer !== selectedMfr) return;

        Object.entries(models).forEach(([model, count]) => {
          if (typeof count === 'object' && 'total' in count) {
            isSegmented = true;
          }
          dataPoints.push([`${manufacturer} ${model}`, count]);
        });
      }
    );

    let traces: Plotly.Data[];

    if (isSegmented) {
      // Segmented statistics: render stacked bars
      const sorted = dataPoints
        .sort((a, b) => {
          const aTotal = typeof a[1] === 'object' ? a[1].total : a[1];
          const bTotal = typeof b[1] === 'object' ? b[1].total : b[1];
          return bTotal - aTotal;
        })
        .slice(0, 20);

      const labels = sorted.map(([label]) => label);
      const highlightedCounts = sorted.map(([, stats]) =>
        typeof stats === 'object' ? stats.highlighted || 0 : 0
      );
      const nonHighlightedCounts = sorted.map(([, stats]) => {
        if (typeof stats === 'object') {
          return (stats.total || 0) - (stats.highlighted || 0);
        }
        return stats;
      });

      traces = [
        {
          x: labels,
          y: highlightedCounts,
          type: 'bar',
          name: 'Highlighted',
          marker: {
            color: '#1890ff',
            line: { color: '#096dd9', width: 2 }
          },
          hovertemplate: '<b>%{x}</b><br>Highlighted: %{y}<extra></extra>',
        },
        {
          x: labels,
          y: nonHighlightedCounts,
          type: 'bar',
          name: 'Other',
          marker: {
            color: '#d9d9d9',
            line: { color: '#bfbfbf', width: 2 }
          },
          hovertemplate: '<b>%{x}</b><br>Other: %{y}<extra></extra>',
        }
      ];
    } else {
      // Legacy format: render single-color bars
      const sorted = dataPoints
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 20);

      traces = [{
        x: sorted.map(([label]) => label),
        y: sorted.map(([, count]) => count as number),
        type: 'bar',
        marker: {
          color: '#52c41a',
          line: { color: '#389e0d', width: 2 },
        },
        hovertemplate: '<b>%{x}</b><br>Count: %{y}<extra></extra>',
      }];
    }

    // Explicitly calculate width from container
    const el = this.modelsChartEl.nativeElement;
    const containerWidth = el.offsetWidth || el.parentElement?.offsetWidth || 600;

    const layout: Partial<Plotly.Layout> = {
      title: {
        text: 'Models',
        font: { size: 18, family: 'Arial, sans-serif' },
        xref: 'paper',
        x: 0.5,
      },
      xaxis: { title: 'Model', tickangle: -45 },
      yaxis: { title: 'Count' },
      width: containerWidth,
      height: 400,
      margin: { t: 60, r: 20, b: 150, l: 60 },
      barmode: isSegmented ? 'stack' : undefined,
      showlegend: isSegmented,
    };

    const config = {
      ...this.plotlyConfig,
      responsive: true,
    };

    console.log('[PlotlyHistogram] Calling Plotly.react() for models chart with explicit width:', containerWidth);
    // Use react() for better handling of updates, especially in pop-out windows
    Plotly.react(el, traces, layout, config).then(() => {
      console.log('[PlotlyHistogram] Models chart Plotly.react() completed');
      // Force resize after render (important for pop-out windows)
      if (this.popOutContext.isInPopOut()) {
        setTimeout(() => {
          console.log('[PlotlyHistogram] Calling Plotly.Plots.resize() for models chart');
          Plotly.Plots.resize(el);
        }, 100);
      }
    }).catch(err => {
      console.error('[PlotlyHistogram] Error rendering models chart:', err);
    });

    // Add click handler - context-aware
    el.on('plotly_click', (data: any) => {
      const label = data.points[0].x; // "Manufacturer Model"
      this.onModelClick(label);
    });

    // Add selection handler for box/lasso select
    el.on('plotly_selected', (data: any) => {
      if (data && data.points && data.points.length > 0) {
        const selectedModels: string[] = [...new Set<string>(data.points.map((point: any) => point.x as string))];
        this.onModelSelect(selectedModels);
      }
    });
  }

  private renderYearRangeChart(): void {
    if (!this.statistics?.byYearRange || !this.yearRangeChartEl?.nativeElement) return;

    const el = this.yearRangeChartEl.nativeElement;

    // Sort years and extract data
    const entries = Object.entries(this.statistics.byYearRange).sort((a, b) =>
      parseInt(a[0], 10) - parseInt(b[0], 10)
    );

    // Check if data has segmented format ({total, highlighted})
    const isSegmented = entries.length > 0 &&
      typeof entries[0][1] === 'object' &&
      'total' in entries[0][1];

    let traces: Plotly.Data[];

    if (isSegmented) {
      // Segmented statistics: render stacked bars
      const years = entries.map(([year]) => parseInt(year, 10));
      const highlightedCounts = entries.map(([, stats]: [string, any]) => stats.highlighted || 0);
      const nonHighlightedCounts = entries.map(([, stats]: [string, any]) =>
        (stats.total || 0) - (stats.highlighted || 0)
      );

      traces = [
        // Highlighted portion (bottom of stack, blue)
        {
          x: years,
          y: highlightedCounts,
          type: 'bar',
          name: 'Highlighted',
          marker: {
            color: '#1890ff',
            line: { color: '#096dd9', width: 1 }
          },
          hovertemplate: '<b>%{x}</b><br>Highlighted: %{y}<extra></extra>',
        },
        // Non-highlighted portion (top of stack, gray)
        {
          x: years,
          y: nonHighlightedCounts,
          type: 'bar',
          name: 'Other',
          marker: {
            color: '#d9d9d9',
            line: { color: '#bfbfbf', width: 1 }
          },
          hovertemplate: '<b>%{x}</b><br>Other: %{y}<extra></extra>',
        }
      ];
    } else {
      // Legacy format: render single-color bars
      const data = entries.map(([year, count]) => [parseInt(year, 10), count as number]);
      const selectedYear = this.selectedYearRange?.includes('-')
        ? null
        : parseInt(this.selectedYearRange || '', 10);

      traces = [{
        x: data.map(([year]) => year),
        y: data.map(([, count]) => count),
        type: 'bar',
        marker: {
          color: data.map(([year]) => year === selectedYear ? '#ff7f0e' : '#2ca02c'),
          line: {
            color: data.map(([year]) => year === selectedYear ? '#d06200' : '#1f7521'),
            width: 1,
          },
        },
        hovertemplate: '<b>%{x}</b><br>Count: %{y}<extra></extra>',
      }];
    }

    // Explicitly calculate width from container
    const containerWidth = el.offsetWidth || el.parentElement?.offsetWidth || 600;

    const layout: Partial<Plotly.Layout> = {
      title: {
        text: 'Year',
        font: { size: 18, family: 'Arial, sans-serif' },
        xref: 'paper',
        x: 0.5,
      },
      xaxis: {
        title: 'Year',
        type: 'linear',
        dtick: 5  // Show tick every 5 years
      },
      yaxis: { title: 'Count' },
      width: containerWidth,
      height: 400,
      margin: { t: 60, r: 20, b: 60, l: 60 },
      barmode: isSegmented ? 'stack' : undefined,  // Stack bars when segmented
      showlegend: isSegmented,  // Show legend for stacked bars
    };

    const config = {
      ...this.plotlyConfig,
      responsive: true,
    };

    console.log('[PlotlyHistogram] Calling Plotly.react() for year chart with explicit width:', containerWidth);
    // Use react() for better handling of updates, especially in pop-out windows
    Plotly.react(el, traces, layout, config).then(() => {
      console.log('[PlotlyHistogram] Year chart Plotly.react() completed');
      // Force resize after render (important for pop-out windows)
      if (this.popOutContext.isInPopOut()) {
        setTimeout(() => {
          console.log('[PlotlyHistogram] Calling Plotly.Plots.resize() for year chart');
          Plotly.Plots.resize(el);
        }, 100);
      }
    }).catch(err => {
      console.error('[PlotlyHistogram] Error rendering year chart:', err);
    });

    // Add click handler - context-aware
    el.on('plotly_click', (data: any) => {
      const year = data.points[0].x;
      this.onYearClick(year);
    });

    // Add selection handler for box/lasso select - updates yearMin/yearMax
    el.on('plotly_selected', (data: any) => {
      if (data && data.points && data.points.length > 0) {
        const selectedYears = data.points.map((point: any) => point.x);
        const yearMin = Math.min(...selectedYears);
        const yearMax = Math.max(...selectedYears);
        this.onYearRangeSelect(yearMin, yearMax);
      }
    });
  }

  private renderBodyClassChart(): void {
    if (!this.statistics?.byBodyClass || !this.bodyClassChartEl?.nativeElement) return;

    const entries = Object.entries(this.statistics.byBodyClass);

    // Check if data has segmented format ({total, highlighted})
    const isSegmented = entries.length > 0 &&
      typeof entries[0][1] === 'object' &&
      'total' in entries[0][1];

    let traces: Plotly.Data[];

    if (isSegmented) {
      // Segmented statistics: render stacked bars
      const sorted = entries
        .sort((a, b) => ((b[1] as any).total || 0) - ((a[1] as any).total || 0))
        .slice(0, 15);

      const labels = sorted.map(([label]) => label);
      const highlightedCounts = sorted.map(([, stats]: [string, any]) => stats.highlighted || 0);
      const nonHighlightedCounts = sorted.map(([, stats]: [string, any]) =>
        (stats.total || 0) - (stats.highlighted || 0)
      );

      traces = [
        {
          x: labels,
          y: highlightedCounts,
          type: 'bar',
          name: 'Highlighted',
          marker: {
            color: '#1890ff',
            line: { color: '#096dd9', width: 2 }
          },
          hovertemplate: '<b>%{x}</b><br>Highlighted: %{y}<extra></extra>',
        },
        {
          x: labels,
          y: nonHighlightedCounts,
          type: 'bar',
          name: 'Other',
          marker: {
            color: '#d9d9d9',
            line: { color: '#bfbfbf', width: 2 }
          },
          hovertemplate: '<b>%{x}</b><br>Other: %{y}<extra></extra>',
        }
      ];
    } else {
      // Legacy format: render single-color bars
      const data = entries
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 15);

      traces = [{
        x: data.map(([label]) => label),
        y: data.map(([, count]) => count as number),
        type: 'bar',
        marker: {
          color: data.map(([label]) =>
            label === this.selectedBodyClass ? '#9467bd' : '#d62728'
          ),
          line: {
            color: data.map(([label]) =>
              label === this.selectedBodyClass ? '#6e459e' : '#a51d1e'
            ),
            width: 2,
          },
        },
        hovertemplate: '<b>%{x}</b><br>Count: %{y}<extra></extra>',
      }];
    }

    // Explicitly calculate width from container
    const el = this.bodyClassChartEl.nativeElement;
    const containerWidth = el.offsetWidth || el.parentElement?.offsetWidth || 600;

    const layout: Partial<Plotly.Layout> = {
      title: {
        text: 'Body Class',
        font: { size: 18, family: 'Arial, sans-serif' },
        xref: 'paper',
        x: 0.5,
      },
      xaxis: { title: 'Body Class', tickangle: -45 },
      yaxis: { title: 'Count' },
      width: containerWidth,
      height: 400,
      margin: { t: 60, r: 20, b: 100, l: 60 },
      barmode: isSegmented ? 'stack' : undefined,
      showlegend: isSegmented,
    };

    const config = {
      ...this.plotlyConfig,
      responsive: true,
    };

    console.log('[PlotlyHistogram] Calling Plotly.react() for body class chart with explicit width:', containerWidth);
    // Use react() for better handling of updates, especially in pop-out windows
    Plotly.react(el, traces, layout, config).then(() => {
      console.log('[PlotlyHistogram] Body class chart Plotly.react() completed');
      // Force resize after render (important for pop-out windows)
      if (this.popOutContext.isInPopOut()) {
        setTimeout(() => {
          console.log('[PlotlyHistogram] Calling Plotly.Plots.resize() for body class chart');
          Plotly.Plots.resize(el);
        }, 100);
      }
    }).catch(err => {
      console.error('[PlotlyHistogram] Error rendering body class chart:', err);
    });

    // Add click handler - context-aware
    el.on('plotly_click', (data: any) => {
      const label = data.points[0].x;
      this.onBodyClassClick(label);
    });

    // Add selection handler for box/lasso select
    el.on('plotly_selected', (data: any) => {
      if (data && data.points && data.points.length > 0) {
        const selectedBodyClasses: string[] = [...new Set<string>(data.points.map((point: any) => point.x as string))];
        this.onBodyClassSelect(selectedBodyClasses);
      }
    });
  }

  // Context-aware event handlers
  private onManufacturerClick(manufacturer: string): void {
    // Check if highlight mode is active
    if (this.isHighlightModeActive) {
      console.log(`[PlotlyHistogram] 🟦 Manufacturer HIGHLIGHTED: ${manufacturer}`);
      this.urlParamService.setHighlightParam('manufacturer', manufacturer);
      return;
    }

    console.log(`[PlotlyHistogram] Manufacturer clicked: ${manufacturer}`);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'MANUFACTURER_CLICK',
        payload: manufacturer
      });
    } else {
      // Normal mode: charts are informational only (no action)
      console.log('[PlotlyHistogram] Chart click in normal mode (no action)');
    }
  }

  private onYearClick(year: number): void {
    // Check if highlight mode is active
    if (this.isHighlightModeActive) {
      console.log(`[PlotlyHistogram] 🟦 Year HIGHLIGHTED: ${year}`);
      this.urlParamService.setHighlightRange({
        yearMin: year.toString(),
        yearMax: year.toString()
      });
      return;
    }

    console.log(`[PlotlyHistogram] Year clicked: ${year}`);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      // Set both yearMin and yearMax to the same value for single year selection
      this.popOutContext.sendMessage({
        type: 'YEAR_RANGE_CLICK',
        payload: { yearMin: year, yearMax: year }
      });
    } else {
      // Normal mode: charts are informational only (no action)
      console.log('[PlotlyHistogram] Chart click in normal mode (no action)');
    }
  }

  private onYearRangeSelect(yearMin: number, yearMax: number): void {
    // Check if highlight mode is active
    if (this.isHighlightModeActive) {
      console.log(`[PlotlyHistogram] 🟦 Year range HIGHLIGHTED: ${yearMin} - ${yearMax}`);

      // Set highlight parameters (UI-only, doesn't trigger API calls)
      this.urlParamService.setHighlightRange({
        yearMin: yearMin.toString(),
        yearMax: yearMax.toString()
      });
      return;
    }

    // Normal mode: create filters (triggers API calls)
    console.log(`[PlotlyHistogram] Year range FILTERED: ${yearMin} - ${yearMax}`);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'YEAR_RANGE_SELECT',
        payload: { yearMin, yearMax }
      });
    } else {
      // Normal mode: update filters directly via StateManagementService
      this.stateService.updateFilters({
        yearMin,
        yearMax
      });
    }
  }

  private onBodyClassClick(bodyClass: string): void {
    // Check if highlight mode is active
    if (this.isHighlightModeActive) {
      console.log(`[PlotlyHistogram] 🟦 Body class HIGHLIGHTED: ${bodyClass}`);
      this.urlParamService.setHighlightParam('bodyClass', bodyClass);
      return;
    }

    console.log(`[PlotlyHistogram] Body class clicked: ${bodyClass}`);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'BODY_CLASS_CLICK',
        payload: bodyClass
      });
    } else {
      // Normal mode: charts are informational only (no action)
      console.log('[PlotlyHistogram] Chart click in normal mode (no action)');
    }
  }

  private onManufacturerSelect(manufacturers: string[]): void {
    // Check if highlight mode is active
    if (this.isHighlightModeActive) {
      console.log(`[PlotlyHistogram] 🟦 Manufacturers HIGHLIGHTED:`, manufacturers);
      // For multiple manufacturers, use comma-separated string
      this.urlParamService.setHighlightParam('manufacturer', manufacturers.join(','));
      return;
    }

    console.log(`[PlotlyHistogram] Manufacturers SELECTED:`, manufacturers);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'MANUFACTURER_SELECT',
        payload: manufacturers
      });
    } else {
      // Normal mode: update filters directly via StateManagementService
      // For now, only support single manufacturer selection
      if (manufacturers.length === 1) {
        this.stateService.updateFilters({
          manufacturer: manufacturers[0]
        });
      }
    }
  }

  private onModelClick(modelLabel: string): void {
    // Check if highlight mode is active
    if (this.isHighlightModeActive) {
      console.log(`[PlotlyHistogram] 🟦 Model HIGHLIGHTED: ${modelLabel}`);
      // Parse "Manufacturer Model" format
      const parts = modelLabel.split(' ');
      const manufacturer = parts[0];
      const model = parts.slice(1).join(' ');
      this.urlParamService.setHighlightParam('modelCombos', `${manufacturer}:${model}`);
      return;
    }

    console.log(`[PlotlyHistogram] Model clicked: ${modelLabel}`);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'MODEL_CLICK',
        payload: modelLabel
      });
    } else {
      // Normal mode: charts are informational only (no action)
      console.log('[PlotlyHistogram] Chart click in normal mode (no action)');
    }
  }

  private onModelSelect(modelLabels: string[]): void {
    // Check if highlight mode is active
    if (this.isHighlightModeActive) {
      console.log(`[PlotlyHistogram] 🟦 Models HIGHLIGHTED:`, modelLabels);
      // Parse "Manufacturer Model" format and convert to modelCombos format
      const modelCombos = modelLabels.map(label => {
        const parts = label.split(' ');
        const manufacturer = parts[0];
        const model = parts.slice(1).join(' ');
        return `${manufacturer}:${model}`;
      });
      this.urlParamService.setHighlightParam('modelCombos', modelCombos.join(','));
      return;
    }

    console.log(`[PlotlyHistogram] Models SELECTED:`, modelLabels);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'MODEL_SELECT',
        payload: modelLabels
      });
    } else {
      // Normal mode: update filters directly via StateManagementService
      // Parse "Manufacturer Model" format and convert to modelCombos
      const modelCombos = modelLabels.map(label => {
        const parts = label.split(' ');
        const manufacturer = parts[0];
        const model = parts.slice(1).join(' ');
        return { manufacturer, model };
      });
      this.stateService.updateFilters({
        modelCombos
      });
    }
  }

  private onBodyClassSelect(bodyClasses: string[]): void {
    // Check if highlight mode is active
    if (this.isHighlightModeActive) {
      console.log(`[PlotlyHistogram] 🟦 Body classes HIGHLIGHTED:`, bodyClasses);
      // For multiple body classes, use comma-separated string
      this.urlParamService.setHighlightParam('bodyClass', bodyClasses.join(','));
      return;
    }

    console.log(`[PlotlyHistogram] Body classes SELECTED:`, bodyClasses);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'BODY_CLASS_SELECT',
        payload: bodyClasses
      });
    } else {
      // Normal mode: update filters directly via StateManagementService
      // For now, only support single body class selection
      if (bodyClasses.length === 1) {
        this.stateService.updateFilters({
          bodyClass: bodyClasses[0]
        });
      }
    }
  }
}

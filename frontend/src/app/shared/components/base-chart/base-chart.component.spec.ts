import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangeDetectorRef, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';

import { BaseChartComponent } from './base-chart.component';
import { ChartDataSource, ChartData } from '../../models/chart-data-source.model';
import { PopOutContextService } from '../../../core/services/popout-context.service';
import { VehicleStatistics } from '../../../models/vehicle-statistics.model';
import { HighlightFilters } from '../../../models/search-filters.model';
import * as Plotly from 'plotly.js-dist-min';

// Mock Plotly.js
const mockPlotlyElement = {
  on: jasmine.createSpy('on'),
};

describe('BaseChartComponent', () => {
  let component: BaseChartComponent;
  let fixture: ComponentFixture<BaseChartComponent>;
  let mockPopOutContext: jasmine.SpyObj<PopOutContextService>;
  let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;
  let mockDataSource: jasmine.SpyObj<ChartDataSource>;

  const mockStatistics: VehicleStatistics = {
    byManufacturer: { Ford: 100, Chevrolet: 80 },
    modelsByManufacturer: { Ford: { 'F-150': 50 }, Chevrolet: { 'Corvette': 30 } },
    byYearRange: { '2020-2021': 35 },
    byBodyClass: { Pickup: 50, Sports: 30 },
    totalCount: 180,
  };

  const mockChartData: ChartData = {
    traces: [
      {
        x: ['Ford', 'Chevrolet'],
        y: [100, 80],
        type: 'bar',
      },
    ],
    layout: {
      title: 'Test Chart',
      xaxis: { title: 'Manufacturer' },
      yaxis: { title: 'Count' },
    },
  };

  beforeEach(() => {
    mockPopOutContext = jasmine.createSpyObj('PopOutContextService', ['isInPopOut']);
    mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck', 'detectChanges']);

    mockDataSource = jasmine.createSpyObj('ChartDataSource', [
      'transform',
      'getTitle',
      'handleClick',
    ]);
    mockDataSource.getTitle.and.returnValue('Test Chart');
    mockDataSource.transform.and.returnValue(mockChartData);
    mockDataSource.handleClick.and.returnValue('Ford');

    // Mock Plotly.js
    spyOn(Plotly, 'react').and.returnValue(Promise.resolve(mockPlotlyElement as any));
    spyOn(Plotly, 'purge');
    spyOn(Plotly.Plots, 'resize');

    TestBed.configureTestingModule({
      declarations: [BaseChartComponent],
      providers: [
        { provide: PopOutContextService, useValue: mockPopOutContext },
        { provide: ChangeDetectorRef, useValue: mockCdr },
      ],
    });

    fixture = TestBed.createComponent(BaseChartComponent);
    component = fixture.componentInstance;
    component.dataSource = mockDataSource;
  });

  // ========== Component Initialization ==========

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.statistics).toBeNull();
      expect(component.highlights).toEqual({});
      expect(component.selectedValue).toBeNull();
      expect(component['viewInitialized']).toBe(false);
      expect(component['plotlyInitialized']).toBe(false);
    });

    it('should set viewInitialized flag after view init', () => {
      component.ngAfterViewInit();

      expect(component['viewInitialized']).toBe(true);
    });

    it('should not render before view init', () => {
      component['viewInitialized'] = false;
      component.statistics = mockStatistics;

      component['renderChart']();

      expect(Plotly.react).not.toHaveBeenCalled();
    });
  });

  // ========== Chart Rendering ==========

  describe('Chart Rendering', () => {
    beforeEach(() => {
      // Mock chart container
      component.chartContainer = {
        nativeElement: {
          offsetWidth: 800,
          on: jasmine.createSpy('on'),
        },
      } as any;
      component['viewInitialized'] = true;
    });

    it('should render chart with data source', fakeAsync(() => {
      component.statistics = mockStatistics;

      component['renderChart']();
      tick();

      expect(mockDataSource.transform).toHaveBeenCalledWith(
        mockStatistics,
        {},
        null,
        800
      );
      expect(Plotly.react).toHaveBeenCalledWith(
        component.chartContainer.nativeElement,
        mockChartData.traces,
        mockChartData.layout,
        jasmine.any(Object)
      );
    }));

    it('should not render without data source', () => {
      component.dataSource = null as any;

      component['renderChart']();

      expect(Plotly.react).not.toHaveBeenCalled();
    });

    it('should not render without chart container', () => {
      component.chartContainer = null as any;

      component['renderChart']();

      expect(Plotly.react).not.toHaveBeenCalled();
    });

    it('should handle null chart data from data source', () => {
      mockDataSource.transform.and.returnValue(null);
      spyOn(console, 'log');

      component['renderChart']();

      expect(console.log).toHaveBeenCalledWith('[BaseChart] No chart data to render');
      expect(Plotly.react).not.toHaveBeenCalled();
    });

    it('should use parent element width if offsetWidth is 0', fakeAsync(() => {
      component.chartContainer = {
        nativeElement: {
          offsetWidth: 0,
          parentElement: { offsetWidth: 1000 },
          on: jasmine.createSpy('on'),
        },
      } as any;

      component['renderChart']();
      tick();

      expect(mockDataSource.transform).toHaveBeenCalledWith(
        null,
        {},
        null,
        1000
      );
    }));

    it('should default to 600px width if no width available', fakeAsync(() => {
      component.chartContainer = {
        nativeElement: {
          offsetWidth: 0,
          parentElement: null,
          on: jasmine.createSpy('on'),
        },
      } as any;

      component['renderChart']();
      tick();

      expect(mockDataSource.transform).toHaveBeenCalledWith(
        null,
        {},
        null,
        600
      );
    }));

    it('should set plotlyInitialized flag after successful render', fakeAsync(() => {
      component['renderChart']();
      tick();

      expect(component['plotlyInitialized']).toBe(true);
    }));

    it('should handle Plotly rendering errors', fakeAsync(() => {
      (Plotly.react as jasmine.Spy).and.returnValue(
        Promise.reject(new Error('Plotly error'))
      );
      spyOn(console, 'error');

      component['renderChart']();
      tick();

      expect(console.error).toHaveBeenCalledWith(
        '[BaseChart] Error rendering Test Chart chart:',
        jasmine.any(Error)
      );
    }));

    it('should resize chart in pop-out windows', fakeAsync(() => {
      mockPopOutContext.isInPopOut.and.returnValue(true);

      component['renderChart']();
      tick();
      tick(150); // Wait for setTimeout

      expect(Plotly.Plots.resize).toHaveBeenCalledWith(
        component.chartContainer.nativeElement
      );
    }));

    it('should not resize chart in main window', fakeAsync(() => {
      mockPopOutContext.isInPopOut.and.returnValue(false);

      component['renderChart']();
      tick();
      tick(150);

      expect(Plotly.Plots.resize).not.toHaveBeenCalled();
    }));
  });

  // ========== ngOnChanges Lifecycle ==========

  describe('ngOnChanges Lifecycle', () => {
    beforeEach(() => {
      component.chartContainer = {
        nativeElement: {
          offsetWidth: 800,
          on: jasmine.createSpy('on'),
        },
      } as any;
      component['viewInitialized'] = true;
    });

    it('should re-render when statistics change', fakeAsync(() => {
      component.statistics = mockStatistics;

      component.ngOnChanges();
      tick();

      expect(Plotly.react).toHaveBeenCalled();
    }));

    it('should re-render when highlights change', fakeAsync(() => {
      component.highlights = { manufacturer: 'Ford' };

      component.ngOnChanges();
      tick();

      expect(Plotly.react).toHaveBeenCalled();
    }));

    it('should re-render when selectedValue changes', fakeAsync(() => {
      component.selectedValue = 'Chevrolet';

      component.ngOnChanges();
      tick();

      expect(Plotly.react).toHaveBeenCalled();
    }));

    it('should not render before view initialization', () => {
      component['viewInitialized'] = false;

      component.ngOnChanges();

      expect(Plotly.react).not.toHaveBeenCalled();
    });
  });

  // ========== Chart Click Events ==========

  describe('Chart Click Events', () => {
    beforeEach(fakeAsync(() => {
      component.chartContainer = {
        nativeElement: {
          offsetWidth: 800,
          on: jasmine.createSpy('on'),
        },
      } as any;
      component['viewInitialized'] = true;
      component['renderChart']();
      tick();
    }));

    it('should setup plotly_click handler', () => {
      const nativeElement = component.chartContainer.nativeElement;
      expect(nativeElement.on).toHaveBeenCalledWith('plotly_click', jasmine.any(Function));
    });

    it('should emit chartClick event when chart is clicked', () => {
      const emitSpy = spyOn(component.chartClick, 'emit');
      const clickHandler = (component.chartContainer.nativeElement.on as jasmine.Spy).calls
        .argsFor(0)[1];

      clickHandler({ points: [{ x: 'Ford' }] });

      expect(mockDataSource.handleClick).toHaveBeenCalledWith({ points: [{ x: 'Ford' }] });
      expect(emitSpy).toHaveBeenCalledWith({
        value: 'Ford',
        isHighlightMode: false,
      });
    });

    it('should include highlight mode in click event', () => {
      component['isHighlightModeActive'] = true;
      const emitSpy = spyOn(component.chartClick, 'emit');
      const clickHandler = (component.chartContainer.nativeElement.on as jasmine.Spy).calls
        .argsFor(0)[1];

      clickHandler({ points: [{ x: 'Ford' }] });

      expect(emitSpy).toHaveBeenCalledWith({
        value: 'Ford',
        isHighlightMode: true,
      });
    });

    it('should not emit if data source returns null', () => {
      mockDataSource.handleClick.and.returnValue(null);
      const emitSpy = spyOn(component.chartClick, 'emit');
      const clickHandler = (component.chartContainer.nativeElement.on as jasmine.Spy).calls
        .argsFor(0)[1];

      clickHandler({ points: [{ x: 'Unknown' }] });

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  // ========== Box/Lasso Selection Events ==========

  describe('Box/Lasso Selection Events', () => {
    beforeEach(fakeAsync(() => {
      component.chartContainer = {
        nativeElement: {
          offsetWidth: 800,
          on: jasmine.createSpy('on'),
        },
      } as any;
      component['viewInitialized'] = true;
      component['renderChart']();
      tick();
    }));

    it('should setup plotly_selected handler', () => {
      const nativeElement = component.chartContainer.nativeElement;
      expect(nativeElement.on).toHaveBeenCalledWith('plotly_selected', jasmine.any(Function));
    });

    it('should emit chartClick event on box select', () => {
      mockDataSource.handleClick.and.returnValue('2018-2022');
      const emitSpy = spyOn(component.chartClick, 'emit');
      const selectHandler = (component.chartContainer.nativeElement.on as jasmine.Spy).calls
        .argsFor(1)[1];

      selectHandler({
        range: { x: [2018, 2022] },
        points: [{ x: 2018 }, { x: 2019 }, { x: 2020 }],
      });

      expect(mockDataSource.handleClick).toHaveBeenCalledWith({
        range: { x: [2018, 2022] },
        points: [{ x: 2018 }, { x: 2019 }, { x: 2020 }],
      });
      expect(emitSpy).toHaveBeenCalledWith({
        value: '2018-2022',
        isHighlightMode: false,
      });
    });

    it('should not emit if selection data is empty', () => {
      const emitSpy = spyOn(component.chartClick, 'emit');
      const selectHandler = (component.chartContainer.nativeElement.on as jasmine.Spy).calls
        .argsFor(1)[1];

      selectHandler({ points: [] });

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit if data source returns null for selection', () => {
      mockDataSource.handleClick.and.returnValue(null);
      const emitSpy = spyOn(component.chartClick, 'emit');
      const selectHandler = (component.chartContainer.nativeElement.on as jasmine.Spy).calls
        .argsFor(1)[1];

      selectHandler({ range: { x: [2018, 2022] }, points: [{ x: 2018 }] });

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  // ========== Keyboard Event Handlers ==========

  describe('Keyboard Event Handlers', () => {
    it('should activate highlight mode on h key down', () => {
      spyOn(console, 'log');

      component.onHighlightKeyDown();

      expect(component['isHighlightModeActive']).toBe(true);
      expect(console.log).toHaveBeenCalledWith('[BaseChart] 🟦 Highlight mode ACTIVATED');
    });

    it('should not re-activate if already active', () => {
      component['isHighlightModeActive'] = true;
      const consoleSpy = spyOn(console, 'log');

      component.onHighlightKeyDown();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should deactivate highlight mode on h key up', () => {
      component['isHighlightModeActive'] = true;
      spyOn(console, 'log');

      component.onHighlightKeyUp();

      expect(component['isHighlightModeActive']).toBe(false);
      expect(console.log).toHaveBeenCalledWith('[BaseChart] Highlight mode DEACTIVATED');
    });
  });

  // ========== Window Resize Handler ==========

  describe('Window Resize Handler', () => {
    it('should re-render chart on window resize if plotly initialized', fakeAsync(() => {
      component.chartContainer = {
        nativeElement: {
          offsetWidth: 800,
          on: jasmine.createSpy('on'),
        },
      } as any;
      component['viewInitialized'] = true;
      component['plotlyInitialized'] = true;

      component.onWindowResize();
      tick();

      expect(Plotly.react).toHaveBeenCalled();
    }));

    it('should not re-render if plotly not initialized', () => {
      component['plotlyInitialized'] = false;

      component.onWindowResize();

      expect(Plotly.react).not.toHaveBeenCalled();
    });
  });

  // ========== Component Cleanup ==========

  describe('Component Cleanup', () => {
    it('should purge Plotly chart on destroy', () => {
      component.chartContainer = {
        nativeElement: document.createElement('div'),
      } as any;
      component['plotlyInitialized'] = true;

      component.ngOnDestroy();

      expect(Plotly.purge).toHaveBeenCalledWith(component.chartContainer.nativeElement);
    });

    it('should not purge if plotly not initialized', () => {
      component.chartContainer = {
        nativeElement: document.createElement('div'),
      } as any;
      component['plotlyInitialized'] = false;

      component.ngOnDestroy();

      expect(Plotly.purge).not.toHaveBeenCalled();
    });

    it('should not purge if chart container is null', () => {
      component.chartContainer = null as any;
      component['plotlyInitialized'] = true;

      component.ngOnDestroy();

      expect(Plotly.purge).not.toHaveBeenCalled();
    });

    it('should complete destroy$ subject', () => {
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  // ========== Plotly Configuration ==========

  describe('Plotly Configuration', () => {
    it('should use correct Plotly config', fakeAsync(() => {
      component.chartContainer = {
        nativeElement: {
          offsetWidth: 800,
          on: jasmine.createSpy('on'),
        },
      } as any;
      component['viewInitialized'] = true;

      component['renderChart']();
      tick();

      const config = (Plotly.react as jasmine.Spy).calls.mostRecent().args[3];
      expect(config.responsive).toBe(true);
      expect(config.displayModeBar).toBe(true);
      expect(config.displaylogo).toBe(false);
    }));
  });
});

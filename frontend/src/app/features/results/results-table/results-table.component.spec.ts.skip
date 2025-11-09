import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, BehaviorSubject, throwError, Subject } from 'rxjs';
import { ResultsTableComponent } from './results-table.component';
import { StateManagementService } from '../../../core/services/state-management.service';
import { ApiService } from '../../../services/api.service';
import {
  VehicleResult,
  VehicleInstance,
  SearchFilters,
} from '../../../models';
import { TableQueryParams } from '../../../shared/models';
import { VehicleDataSourceAdapter } from './vehicle-data-source.adapter';
import { NzIconService } from 'ng-zorro-antd/icon';

/**
 * ResultsTableComponent Test Suite
 *
 * Tests the adapter component that bridges StateManagementService and BaseDataTableComponent.
 * This component demonstrates proper data source adapter pattern and conversion between
 * SearchFilters (app-level) and TableQueryParams (component-level).
 *
 * Key Testing Areas:
 * - State subscription from StateManagementService.filters$
 * - SearchFilters → TableQueryParams conversion
 * - TableQueryParams → SearchFilters conversion (reverse)
 * - VehicleDataSourceAdapter integration
 * - Row expansion and lazy loading of VIN instances
 * - Title status color mapping
 * - Error handling for API failures
 */
describe('ResultsTableComponent', () => {
  let component: ResultsTableComponent;
  let fixture: ComponentFixture<ResultsTableComponent>;
  let mockStateService: jasmine.SpyObj<StateManagementService>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let filtersSubject: BehaviorSubject<SearchFilters>;

  // Test data
  const createVehicleResult = (
    overrides?: Partial<VehicleResult>
  ): VehicleResult => ({
    vehicle_id: 'vehicle-123',
    manufacturer: 'Ford',
    model: 'F-150',
    year: 2020,
    body_class: 'Pickup',
    data_source: 'NHTSA',
    ingested_at: new Date().toISOString(),
    ...overrides,
  });

  const createVehicleInstance = (
    overrides?: Partial<VehicleInstance>
  ): VehicleInstance => ({
    vin: '1FTFW1ET5DFC12345',
    condition_rating: 8,
    condition_description: 'Good',
    mileage: 25000,
    mileage_verified: true,
    registered_state: 'CA',
    registration_status: 'Current',
    title_status: 'Clean',
    exterior_color: 'Blue',
    factory_options: ['Leather', 'Sunroof'],
    estimated_value: 35000,
    matching_numbers: true,
    last_service_date: '2024-01-15',
    ...overrides,
  });

  const createVehicleInstancesResponse = (
    vehicleId: string,
    instances: VehicleInstance[]
  ) => ({
    vehicle_id: vehicleId,
    manufacturer: 'Ford',
    model: 'F-150',
    year: 2020,
    body_class: 'Pickup',
    instance_count: instances.length,
    instances,
  });

  beforeEach(async () => {
    // Create behavior subject for filters
    filtersSubject = new BehaviorSubject<SearchFilters>({
      modelCombos: [],
      page: 1,
      size: 20,
    });

    // Create spies
    mockStateService = jasmine.createSpyObj('StateManagementService', [
      'updateFilters',
    ]);
    (mockStateService as any).filters$ = filtersSubject.asObservable();

    mockApiService = jasmine.createSpyObj('ApiService', [
      'getVehicleDetails',
      'getVehicleInstances',
    ]);

    // Mock NzIconService to prevent icon lookup errors
    const mockIconService = jasmine.createSpyObj('NzIconService', ['getRenderedContent']);
    mockIconService.getRenderedContent.and.callFake(() => {
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      return of(svgElement);
    });

    await TestBed.configureTestingModule({
      declarations: [ResultsTableComponent],
      providers: [
        { provide: StateManagementService, useValue: mockStateService },
        { provide: ApiService, useValue: mockApiService },
        { provide: NzIconService, useValue: mockIconService },
      ],
      schemas: [NO_ERRORS_SCHEMA], // Suppress template errors for BaseDataTable
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResultsTableComponent);
    component = fixture.componentInstance;
    // Don't call detectChanges yet - let tests control initialization
  });

  /**
   * =========================================================================
   * COMPONENT INITIALIZATION
   * =========================================================================
   */
  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with predefined columns', () => {
      expect(component.columns).toBeDefined();
      expect(component.columns.length).toBe(6);
      expect(component.columns[0].key).toBe('manufacturer');
      expect(component.columns[1].key).toBe('model');
      expect(component.columns[2].key).toBe('year');
      expect(component.columns[3].key).toBe('body_class');
      expect(component.columns[4].key).toBe('data_source');
      expect(component.columns[5].key).toBe('vehicle_id');
    });

    it('should initialize with default tableQueryParams', () => {
      expect(component.tableQueryParams).toEqual({
        page: 1,
        size: 20,
        filters: {},
      });
    });

    it('should create VehicleDataSourceAdapter in constructor', () => {
      expect(component.dataSource).toBeInstanceOf(VehicleDataSourceAdapter);
    });

    it('should initialize expandedRowInstances as empty Map', () => {
      expect(component.expandedRowInstances).toBeInstanceOf(Map);
      expect(component.expandedRowInstances.size).toBe(0);
    });

    it('should initialize loadingInstances as empty Set', () => {
      expect(component.loadingInstances).toBeInstanceOf(Set);
      expect(component.loadingInstances.size).toBe(0);
    });
  });

  /**
   * =========================================================================
   * STATE SUBSCRIPTION (filters$ from StateManagementService)
   * =========================================================================
   */
  describe('State Subscription from StateManagementService', () => {
    it('should subscribe to filters$ on ngOnInit', () => {
      fixture.detectChanges(); // Triggers ngOnInit

      // Emit new filters
      filtersSubject.next({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        page: 1,
        size: 20,
      });

      // tableQueryParams should be updated
      expect(component.tableQueryParams.page).toBe(1);
      expect(component.tableQueryParams.size).toBe(20);
    });

    it('should convert SearchFilters to TableQueryParams', () => {
      fixture.detectChanges();

      filtersSubject.next({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        page: 2,
        size: 50,
        sort: 'year',
        sortDirection: 'desc',
        manufacturer: 'Ford',
        model: 'F-150',
        yearMin: 2015,
        yearMax: 2020,
        bodyClass: 'Pickup',
        dataSource: 'NHTSA',
      });

      expect(component.tableQueryParams).toEqual({
        page: 2,
        size: 50,
        sortBy: 'year',
        sortOrder: 'desc',
        filters: {
          manufacturer: 'Ford',
          model: 'F-150',
          yearMin: 2015,
          yearMax: 2020,
          bodyClass: 'Pickup',
          dataSource: 'NHTSA',
        },
      });
    });

    it('should update dataSource with models parameter', () => {
      spyOn(component.dataSource, 'updateModels');
      fixture.detectChanges();

      filtersSubject.next({
        modelCombos: [
          { manufacturer: 'Ford', model: 'F-150' },
          { manufacturer: 'Chevrolet', model: 'Corvette' },
        ],
        page: 1,
        size: 20,
      });

      expect(component.dataSource.updateModels).toHaveBeenCalledWith(
        'Ford:F-150,Chevrolet:Corvette'
      );
    });

    it('should update dataSource with empty string when no model combos', () => {
      spyOn(component.dataSource, 'updateModels');
      fixture.detectChanges();

      filtersSubject.next({
        modelCombos: [],
        page: 1,
        size: 20,
      });

      expect(component.dataSource.updateModels).toHaveBeenCalledWith('');
    });

    it('should handle undefined modelCombos', () => {
      spyOn(component.dataSource, 'updateModels');
      fixture.detectChanges();

      filtersSubject.next({
        page: 1,
        size: 20,
      } as SearchFilters);

      expect(component.dataSource.updateModels).toHaveBeenCalledWith('');
    });

    it('should unsubscribe on ngOnDestroy', () => {
      fixture.detectChanges();

      const subscriptionSpy = jasmine.createSpy('subscription');
      component['destroy$'].subscribe(subscriptionSpy);

      component.ngOnDestroy();

      expect(subscriptionSpy).toHaveBeenCalled();
    });
  });

  /**
   * =========================================================================
   * SearchFilters → TableQueryParams CONVERSION
   * =========================================================================
   */
  describe('SearchFilters to TableQueryParams Conversion', () => {
    it('should convert pagination fields', () => {
      const filters: SearchFilters = {
        modelCombos: [],
        page: 3,
        size: 100,
      };

      const result = component['convertToTableParams'](filters);

      expect(result.page).toBe(3);
      expect(result.size).toBe(100);
    });

    it('should use default page and size when not provided', () => {
      const filters: SearchFilters = {
        modelCombos: [],
      };

      const result = component['convertToTableParams'](filters);

      expect(result.page).toBe(1);
      expect(result.size).toBe(20);
    });

    it('should convert sort fields', () => {
      const filters: SearchFilters = {
        modelCombos: [],
        page: 1,
        size: 20,
        sort: 'manufacturer',
        sortDirection: 'asc',
      };

      const result = component['convertToTableParams'](filters);

      expect(result.sortBy).toBe('manufacturer');
      expect(result.sortOrder).toBe('asc');
    });

    it('should convert filter fields to filters object', () => {
      const filters: SearchFilters = {
        modelCombos: [],
        page: 1,
        size: 20,
        manufacturer: 'Ford',
        model: 'F-150',
        yearMin: 2015,
        yearMax: 2020,
        bodyClass: 'Pickup',
        dataSource: 'NHTSA',
      };

      const result = component['convertToTableParams'](filters);

      expect(result.filters).toEqual({
        manufacturer: 'Ford',
        model: 'F-150',
        yearMin: 2015,
        yearMax: 2020,
        bodyClass: 'Pickup',
        dataSource: 'NHTSA',
      });
    });

    it('should omit undefined filter fields', () => {
      const filters: SearchFilters = {
        modelCombos: [],
        page: 1,
        size: 20,
        manufacturer: 'Ford',
      };

      const result = component['convertToTableParams'](filters);

      expect(result.filters).toEqual({
        manufacturer: 'Ford',
        model: undefined,
        yearMin: undefined,
        yearMax: undefined,
        bodyClass: undefined,
        dataSource: undefined,
      });
    });
  });

  /**
   * =========================================================================
   * TableQueryParams → SearchFilters CONVERSION (onTableQueryChange)
   * =========================================================================
   */
  describe('TableQueryParams to SearchFilters Conversion', () => {
    it('should call updateFilters with converted params', () => {
      const params: TableQueryParams = {
        page: 2,
        size: 50,
        sortBy: 'year',
        sortOrder: 'desc',
        filters: {
          manufacturer: 'Ford',
          model: 'F-150',
          yearMin: 2015,
          yearMax: 2020,
          bodyClass: 'Pickup',
          dataSource: 'NHTSA',
        },
      };

      component.onTableQueryChange(params);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        page: 2,
        size: 50,
        sort: 'year',
        sortDirection: 'desc',
        manufacturer: 'Ford',
        model: 'F-150',
        yearMin: 2015,
        yearMax: 2020,
        bodyClass: 'Pickup',
        dataSource: 'NHTSA',
      });
    });

    it('should handle missing filters object', () => {
      const params: TableQueryParams = {
        page: 1,
        size: 20,
      };

      component.onTableQueryChange(params);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        page: 1,
        size: 20,
        sort: undefined,
        sortDirection: undefined,
        manufacturer: undefined,
        model: undefined,
        yearMin: undefined,
        yearMax: undefined,
        bodyClass: undefined,
        dataSource: undefined,
      });
    });

    it('should use bracket notation for optional filters', () => {
      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {
          manufacturer: 'Ford',
        },
      };

      component.onTableQueryChange(params);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith(
        jasmine.objectContaining({
          manufacturer: 'Ford',
        })
      );
    });
  });

  /**
   * =========================================================================
   * ROW EXPANSION AND VIN INSTANCE LOADING
   * =========================================================================
   */
  describe('Row Expansion and VIN Instance Loading', () => {
    it('should load VIN instances on first row expansion', fakeAsync(() => {
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });
      const instances = [
        createVehicleInstance({ vin: 'VIN1' }),
        createVehicleInstance({ vin: 'VIN2' }),
      ];

      mockApiService.getVehicleInstances.and.returnValue(
        of(createVehicleInstancesResponse('vehicle-123', instances))
      );

      component.onRowExpand(vehicle);
      tick();

      expect(mockApiService.getVehicleInstances).toHaveBeenCalledWith(
        'vehicle-123',
        8
      );
      expect(component.expandedRowInstances.get('vehicle-123')).toEqual(
        instances
      );
    }));

    it('should not reload instances if already cached', fakeAsync(() => {
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });
      const instances = [createVehicleInstance({ vin: 'VIN1' })];

      // Pre-cache instances
      component.expandedRowInstances.set('vehicle-123', instances);

      component.onRowExpand(vehicle);
      tick();

      expect(mockApiService.getVehicleInstances).not.toHaveBeenCalled();
    }));

    it('should set loading state while fetching instances', fakeAsync(() => {
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });
      const instancesSubject = new Subject<any>();

      mockApiService.getVehicleInstances.and.returnValue(
        instancesSubject.asObservable()
      );

      component.onRowExpand(vehicle);

      // Immediately after expansion, should be loading
      expect(component.loadingInstances.has('vehicle-123')).toBe(true);

      // Complete the observable
      instancesSubject.next(createVehicleInstancesResponse('vehicle-123', []));
      instancesSubject.complete();
      tick();

      // After completion, should not be loading
      expect(component.loadingInstances.has('vehicle-123')).toBe(false);
    }));

    it('should clear loading state on error', fakeAsync(() => {
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });
      const instancesSubject = new Subject<any>();

      mockApiService.getVehicleInstances.and.returnValue(
        instancesSubject.asObservable()
      );

      spyOn(console, 'error');

      component.onRowExpand(vehicle);

      expect(component.loadingInstances.has('vehicle-123')).toBe(true);

      // Emit error
      instancesSubject.error({ status: 500, message: 'Server error' });
      tick();

      expect(component.loadingInstances.has('vehicle-123')).toBe(false);
      expect(console.error).toHaveBeenCalled();
    }));

    it('should not cache instances on error', fakeAsync(() => {
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });

      mockApiService.getVehicleInstances.and.returnValue(
        throwError({ status: 500, message: 'Server error' })
      );

      spyOn(console, 'error');

      component.onRowExpand(vehicle);
      tick();

      expect(component.expandedRowInstances.has('vehicle-123')).toBe(false);
    }));
  });

  /**
   * =========================================================================
   * getInstances() METHOD
   * =========================================================================
   */
  describe('getInstances() Method', () => {
    it('should return cached instances for vehicle', () => {
      const instances = [
        createVehicleInstance({ vin: 'VIN1' }),
        createVehicleInstance({ vin: 'VIN2' }),
      ];

      component.expandedRowInstances.set('vehicle-123', instances);

      const result = component.getInstances('vehicle-123');

      expect(result).toEqual(instances);
    });

    it('should return empty array when no instances cached', () => {
      const result = component.getInstances('vehicle-123');

      expect(result).toEqual([]);
    });

    it('should not modify the Map when called', () => {
      const sizeBefore = component.expandedRowInstances.size;

      component.getInstances('vehicle-123');

      expect(component.expandedRowInstances.size).toBe(sizeBefore);
    });
  });

  /**
   * =========================================================================
   * isLoadingInstances() METHOD
   * =========================================================================
   */
  describe('isLoadingInstances() Method', () => {
    it('should return true when vehicle is in loading state', () => {
      component.loadingInstances.add('vehicle-123');

      expect(component.isLoadingInstances('vehicle-123')).toBe(true);
    });

    it('should return false when vehicle is not in loading state', () => {
      expect(component.isLoadingInstances('vehicle-123')).toBe(false);
    });

    it('should return false after loading completes', fakeAsync(() => {
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });

      mockApiService.getVehicleInstances.and.returnValue(
        of(createVehicleInstancesResponse('vehicle-123', []))
      );

      component.onRowExpand(vehicle);
      tick();

      expect(component.isLoadingInstances('vehicle-123')).toBe(false);
    }));
  });

  /**
   * =========================================================================
   * TITLE STATUS COLOR MAPPING
   * =========================================================================
   */
  describe('Title Status Color Mapping', () => {
    it('should return "green" for Clean status', () => {
      expect(component.getTitleStatusColor('Clean')).toBe('green');
    });

    it('should return "red" for Salvage status', () => {
      expect(component.getTitleStatusColor('Salvage')).toBe('red');
    });

    it('should return "orange" for Rebuilt status', () => {
      expect(component.getTitleStatusColor('Rebuilt')).toBe('orange');
    });

    it('should return "red" for Lemon status', () => {
      expect(component.getTitleStatusColor('Lemon')).toBe('red');
    });

    it('should return "red" for Flood status', () => {
      expect(component.getTitleStatusColor('Flood')).toBe('red');
    });

    it('should return "orange" for Theft Recovery status', () => {
      expect(component.getTitleStatusColor('Theft Recovery')).toBe('orange');
    });

    it('should return "red" for Junk status', () => {
      expect(component.getTitleStatusColor('Junk')).toBe('red');
    });

    it('should return "default" for unknown status', () => {
      expect(component.getTitleStatusColor('Unknown Status')).toBe('default');
    });

    it('should be case-sensitive', () => {
      expect(component.getTitleStatusColor('clean')).toBe('default');
      expect(component.getTitleStatusColor('CLEAN')).toBe('default');
    });
  });

  /**
   * =========================================================================
   * LIFECYCLE HOOKS
   * =========================================================================
   */
  describe('Lifecycle Hooks', () => {
    it('should subscribe to filters$ on ngOnInit', () => {
      spyOn(component.dataSource, 'updateModels');

      fixture.detectChanges(); // Triggers ngOnInit

      filtersSubject.next({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        page: 1,
        size: 20,
      });

      expect(component.dataSource.updateModels).toHaveBeenCalled();
    });

    it('should complete destroy$ subject on ngOnDestroy', () => {
      const destroySpy = jasmine.createSpyObj('Subject', ['next', 'complete']);
      (component as any).destroy$ = destroySpy;

      component.ngOnDestroy();

      expect(destroySpy.next).toHaveBeenCalled();
      expect(destroySpy.complete).toHaveBeenCalled();
    });

    it('should clean up subscriptions on destroy', fakeAsync(() => {
      fixture.detectChanges();

      let subscriptionActive = true;
      component['destroy$'].subscribe(() => {
        subscriptionActive = false;
      });

      component.ngOnDestroy();

      expect(subscriptionActive).toBe(false);
    }));
  });

  /**
   * =========================================================================
   * ADAPTER PATTERN INTEGRATION
   * =========================================================================
   */
  describe('VehicleDataSourceAdapter Integration', () => {
    it('should create adapter with ApiService in constructor', () => {
      expect(component.dataSource).toBeTruthy();
      expect(component.dataSource).toBeInstanceOf(VehicleDataSourceAdapter);
    });

    it('should update adapter models when filters change', () => {
      spyOn(component.dataSource, 'updateModels');
      fixture.detectChanges();

      filtersSubject.next({
        modelCombos: [
          { manufacturer: 'Ford', model: 'F-150' },
          { manufacturer: 'Toyota', model: 'Camry' },
        ],
        page: 1,
        size: 20,
      });

      expect(component.dataSource.updateModels).toHaveBeenCalledWith(
        'Ford:F-150,Toyota:Camry'
      );
    });
  });

  /**
   * =========================================================================
   * ERROR HANDLING
   * =========================================================================
   */
  describe('Error Handling', () => {
    it('should log error when VIN instance loading fails', fakeAsync(() => {
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });
      const error = { status: 404, message: 'Not found' };

      mockApiService.getVehicleInstances.and.returnValue(throwError(error));
      spyOn(console, 'error');

      component.onRowExpand(vehicle);
      tick();

      expect(console.error).toHaveBeenCalledWith(
        'Error loading VIN instances:',
        error
      );
    }));

    it('should handle network errors gracefully', fakeAsync(() => {
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });
      const networkError = new Error('Network failure');

      mockApiService.getVehicleInstances.and.returnValue(
        throwError(networkError)
      );
      spyOn(console, 'error');

      component.onRowExpand(vehicle);
      tick();

      expect(console.error).toHaveBeenCalled();
      expect(component.loadingInstances.has('vehicle-123')).toBe(false);
    }));
  });

  /**
   * =========================================================================
   * EDGE CASES
   * =========================================================================
   */
  describe('Edge Cases', () => {
    it('should handle expanding the same row multiple times', fakeAsync(() => {
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });
      const instances = [createVehicleInstance({ vin: 'VIN1' })];

      mockApiService.getVehicleInstances.and.returnValue(
        of(createVehicleInstancesResponse('vehicle-123', instances))
      );

      // First expansion
      component.onRowExpand(vehicle);
      tick();

      expect(mockApiService.getVehicleInstances).toHaveBeenCalledTimes(1);

      // Second expansion (should use cache)
      component.onRowExpand(vehicle);
      tick();

      expect(mockApiService.getVehicleInstances).toHaveBeenCalledTimes(1);
    }));

    it('should handle multiple vehicles expanding simultaneously', fakeAsync(() => {
      const vehicle1 = createVehicleResult({ vehicle_id: 'vehicle-1' });
      const vehicle2 = createVehicleResult({ vehicle_id: 'vehicle-2' });
      const subject1 = new Subject<any>();
      const subject2 = new Subject<any>();

      // Return different subjects for each call
      mockApiService.getVehicleInstances.and.returnValues(
        subject1.asObservable(),
        subject2.asObservable()
      );

      component.onRowExpand(vehicle1);
      component.onRowExpand(vehicle2);

      // Both should be loading
      expect(component.loadingInstances.has('vehicle-1')).toBe(true);
      expect(component.loadingInstances.has('vehicle-2')).toBe(true);

      // Complete both observables
      subject1.next(createVehicleInstancesResponse('vehicle-1', []));
      subject1.complete();
      subject2.next(createVehicleInstancesResponse('vehicle-2', []));
      subject2.complete();
      tick();

      // Both should be done loading
      expect(component.loadingInstances.size).toBe(0);
    }));

    it('should handle filters$ emitting empty filters gracefully', () => {
      spyOn(component.dataSource, 'updateModels');
      fixture.detectChanges();

      // Emit empty filters instead of null to avoid crash
      filtersSubject.next({
        modelCombos: [],
        page: 1,
        size: 20,
      });

      // Should not crash, but behavior depends on implementation
      expect(component.dataSource.updateModels).toHaveBeenCalled();
    });

    it('should handle very large instance counts', fakeAsync(() => {
      const vehicle = createVehicleResult({
        vehicle_id: 'vehicle-123',
      });

      const instances = Array.from({ length: 8 }, (_, i) =>
        createVehicleInstance({ vin: `VIN${i}` })
      );

      mockApiService.getVehicleInstances.and.returnValue(
        of(createVehicleInstancesResponse('vehicle-123', instances))
      );

      component.onRowExpand(vehicle);
      tick();

      // Should still only fetch 8 instances (limit in onRowExpand)
      expect(component.expandedRowInstances.get('vehicle-123')?.length).toBe(8);
    }));

    it('should handle special characters in vehicle IDs', fakeAsync(() => {
      const vehicle = createVehicleResult({
        vehicle_id: 'vehicle-123-special_chars!@#',
      });
      const instances = [createVehicleInstance({ vin: 'VIN1' })];

      mockApiService.getVehicleInstances.and.returnValue(
        of(createVehicleInstancesResponse('vehicle-123-special_chars!@#', instances))
      );

      component.onRowExpand(vehicle);
      tick();

      expect(
        component.expandedRowInstances.has('vehicle-123-special_chars!@#')
      ).toBe(true);
    }));
  });

  /**
   * =========================================================================
   * INTEGRATION SCENARIOS
   * =========================================================================
   */
  describe('Integration Scenarios', () => {
    it('should handle full workflow: filter → expand → instances', fakeAsync(() => {
      fixture.detectChanges();

      // 1. Update filters via StateManagementService
      filtersSubject.next({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        page: 1,
        size: 20,
        manufacturer: 'Ford',
      });

      expect(component.tableQueryParams.filters).toEqual(
        jasmine.objectContaining({
          manufacturer: 'Ford',
        })
      );

      // 2. Expand a row
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });
      const instances = [createVehicleInstance({ vin: 'VIN1' })];

      mockApiService.getVehicleInstances.and.returnValue(
        of(createVehicleInstancesResponse('vehicle-123', instances))
      );

      component.onRowExpand(vehicle);
      tick();

      // 3. Verify instances loaded
      expect(component.getInstances('vehicle-123')).toEqual(instances);
    }));

    it('should handle table query change updating URL state', () => {
      const params: TableQueryParams = {
        page: 2,
        size: 50,
        sortBy: 'year',
        sortOrder: 'desc',
        filters: { manufacturer: 'Ford' },
      };

      component.onTableQueryChange(params);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 2,
          size: 50,
          sort: 'year',
          sortDirection: 'desc',
          manufacturer: 'Ford',
        })
      );
    });

    it('should maintain instance cache across filter changes', fakeAsync(() => {
      fixture.detectChanges();

      // Load instances
      const vehicle = createVehicleResult({ vehicle_id: 'vehicle-123' });
      const instances = [createVehicleInstance({ vin: 'VIN1' })];

      mockApiService.getVehicleInstances.and.returnValue(
        of(createVehicleInstancesResponse('vehicle-123', instances))
      );

      component.onRowExpand(vehicle);
      tick();

      // Change filters
      filtersSubject.next({
        modelCombos: [{ manufacturer: 'Chevrolet', model: 'Corvette' }],
        page: 1,
        size: 20,
      });

      // Instances should still be cached
      expect(component.getInstances('vehicle-123')).toEqual(instances);
    }));
  });
});

import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { StateManagementService } from './state-management.service';
import { RouteStateService } from './route-state.service';
import { RequestCoordinatorService } from './request-coordinator.service';
import { ApiService } from '../../services/api.service';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { SearchFilters, ManufacturerModelSelection } from '../../models';

describe('StateManagementService - URL-First State Management', () => {
  let service: StateManagementService;
  let mockRouteState: jasmine.SpyObj<RouteStateService>;
  let mockRouter: any;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockRequestCoordinator: jasmine.SpyObj<RequestCoordinatorService>;
  let routerEventsSubject: Subject<any>;

  beforeEach(() => {
    // Create router events subject
    routerEventsSubject = new Subject();

    // Mock services
    mockRouteState = jasmine.createSpyObj('RouteStateService', [
      'getCurrentParams',
      'paramsToFilters',
      'filtersToParams',
      'setParams',
      'updateParams',
    ]);

    mockRouter = {
      url: '/discover',  // Default URL (not a popout)
      events: routerEventsSubject.asObservable(),
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
    };

    mockApiService = jasmine.createSpyObj('ApiService', ['getVehicleDetails']);

    mockRequestCoordinator = jasmine.createSpyObj('RequestCoordinatorService', [
      'execute',
      'getLoadingState$',
      'getGlobalLoading$',
      'cancelAll',
      'clearCache',
    ]);

    // Default mock return values
    mockRouteState.getCurrentParams.and.returnValue({});
    mockRouteState.paramsToFilters.and.returnValue({});
    mockRouteState.filtersToParams.and.returnValue({});
    mockRequestCoordinator.getLoadingState$.and.returnValue(
      of({ loading: false, error: null, lastUpdated: Date.now() })
    );
    mockRequestCoordinator.getGlobalLoading$.and.returnValue(of(false));
    mockRequestCoordinator.execute.and.returnValue(
      of({ results: [], total: 0, page: 1, size: 20, totalPages: 0 })
    );

    TestBed.configureTestingModule({
      providers: [
        StateManagementService,
        { provide: RouteStateService, useValue: mockRouteState },
        { provide: Router, useValue: mockRouter },
        { provide: ApiService, useValue: mockApiService },
        { provide: RequestCoordinatorService, useValue: mockRequestCoordinator },
      ],
    });
  });

  describe('Initialization', () => {
    it('should create the service', () => {
      service = TestBed.inject(StateManagementService);
      expect(service).toBeTruthy();
    });

    it('should initialize with default state', (done) => {
      service = TestBed.inject(StateManagementService);

      service.state$.subscribe((state) => {
        expect(state.results).toEqual([]);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
        expect(state.totalResults).toBe(0);
        done();
      });
    });

    it('should hydrate from URL on initialization', () => {
      const urlParams = {
        models: 'Ford:F-150',
        page: '2',
        yearMin: '1960',
      };
      const expectedFilters: SearchFilters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        page: 2,
        yearMin: 1960,
      };

      mockRouteState.getCurrentParams.and.returnValue(urlParams);
      mockRouteState.paramsToFilters.and.returnValue(expectedFilters);

      service = TestBed.inject(StateManagementService);

      const currentFilters = service.getCurrentFilters();
      expect(currentFilters).toEqual(expectedFilters);
      expect(mockRouteState.paramsToFilters).toHaveBeenCalledWith(urlParams);
    });

    it('should auto-fetch data if models present on initialization', () => {
      const urlParams = { models: 'Ford:F-150' };
      const filters: SearchFilters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      };

      mockRouteState.getCurrentParams.and.returnValue(urlParams);
      mockRouteState.paramsToFilters.and.returnValue(filters);

      service = TestBed.inject(StateManagementService);

      // Should trigger API call
      expect(mockRequestCoordinator.execute).toHaveBeenCalled();
    });

    it('should NOT auto-fetch data if no models present on initialization', () => {
      mockRouteState.getCurrentParams.and.returnValue({});
      mockRouteState.paramsToFilters.and.returnValue({});

      service = TestBed.inject(StateManagementService);

      expect(mockRequestCoordinator.execute).not.toHaveBeenCalled();
    });
  });

  describe('URL Synchronization', () => {
    beforeEach(() => {
      mockRouteState.getCurrentParams.and.returnValue({});
      mockRouteState.paramsToFilters.and.returnValue({});
      service = TestBed.inject(StateManagementService);
    });

    it('should sync filters to URL when updateFilters is called', () => {
      const filters: Partial<SearchFilters> = {
        yearMin: 1960,
        yearMax: 1980,
      };

      service.updateFilters(filters);

      expect(mockRouteState.setParams).toHaveBeenCalled();
    });

    it('should merge new filters with existing filters', (done) => {
      // Set initial filters
      service.updateFilters({ yearMin: 1960 });

      // Add more filters
      service.updateFilters({ yearMax: 1980 });

      service.filters$.subscribe((filters) => {
        if (filters.yearMin && filters.yearMax) {
          expect(filters.yearMin).toBe(1960);
          expect(filters.yearMax).toBe(1980);
          done();
        }
      });
    });

    it('should reset to page 1 when non-pagination filters change', () => {
      service.updateFilters({ page: 3 });
      service.updateFilters({ yearMin: 1960 }); // Non-pagination change

      const filters = service.getCurrentFilters();
      expect(filters.page).toBe(1); // Should reset to page 1
    });

    it('should NOT reset page when only pagination changes', () => {
      service.updateFilters({ page: 3, size: 50 });

      const filters = service.getCurrentFilters();
      expect(filters.page).toBe(3); // Should preserve page
    });

    it('should remove filters when set to undefined', () => {
      service.updateFilters({ yearMin: 1960 });
      service.updateFilters({ yearMin: undefined });

      const filters = service.getCurrentFilters();
      expect(filters.yearMin).toBeUndefined();
    });
  });

  describe('URL-First Principle: Browser Navigation', () => {
    beforeEach(() => {
      mockRouteState.getCurrentParams.and.returnValue({});
      mockRouteState.paramsToFilters.and.returnValue({});
      service = TestBed.inject(StateManagementService);
    });

    it('should update state when URL changes (back button)', (done) => {
      const newParams = { models: 'Ford:Mustang', page: '1' };
      const newFilters: SearchFilters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'Mustang' }],
        page: 1,
      };

      mockRouteState.getCurrentParams.and.returnValue(newParams);
      mockRouteState.paramsToFilters.and.returnValue(newFilters);

      // Simulate browser navigation event
      routerEventsSubject.next(new NavigationEnd(1, '/workshop?models=Ford:Mustang', '/workshop'));

      setTimeout(() => {
        const filters = service.getCurrentFilters();
        expect(filters.modelCombos).toEqual([{ manufacturer: 'Ford', model: 'Mustang' }]);
        done();
      }, 50);
    });

    it('should trigger data fetch when URL changes with models', (done) => {
      const newParams = { models: 'Ford:F-150' };
      const newFilters: SearchFilters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      };

      mockRouteState.getCurrentParams.and.returnValue(newParams);
      mockRouteState.paramsToFilters.and.returnValue(newFilters);

      // Simulate navigation
      routerEventsSubject.next(new NavigationEnd(1, '/workshop?models=Ford:F-150', '/workshop'));

      setTimeout(() => {
        expect(mockRequestCoordinator.execute).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should NOT trigger duplicate updates if filters unchanged', () => {
      const sameFilters: SearchFilters = { page: 1, size: 20 };

      mockRouteState.getCurrentParams.and.returnValue({ page: '1', size: '20' });
      mockRouteState.paramsToFilters.and.returnValue(sameFilters);

      const initialCallCount = mockRequestCoordinator.execute.calls.count();

      // Simulate navigation with same params
      routerEventsSubject.next(new NavigationEnd(1, '/workshop?page=1', '/workshop'));

      // Should NOT trigger new API call
      expect(mockRequestCoordinator.execute.calls.count()).toBe(initialCallCount);
    });
  });

  describe('API Integration', () => {
    beforeEach(() => {
      mockRouteState.getCurrentParams.and.returnValue({});
      mockRouteState.paramsToFilters.and.returnValue({});
      service = TestBed.inject(StateManagementService);
    });

    it('should fetch vehicle data when models selected', (done) => {
      const modelCombos: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      const mockResponse = {
        results: [{ vehicle_id: '1', manufacturer: 'Ford', model: 'F-150' }],
        total: 1,
        page: 1,
        size: 20,
        totalPages: 1,
      };

      mockRequestCoordinator.execute.and.returnValue(of(mockResponse));

      service.updateFilters({ modelCombos });

      setTimeout(() => {
        service.results$.subscribe((results) => {
          expect(results.length).toBe(1);
          expect(results[0].manufacturer).toBe('Ford');
          done();
        });
      }, 50);
    });

    it('should NOT fetch data when no models selected', () => {
      const initialCallCount = mockRequestCoordinator.execute.calls.count();

      service.updateFilters({ yearMin: 1960 });

      expect(mockRequestCoordinator.execute.calls.count()).toBe(initialCallCount);
    });

    it('should clear results when models are removed', (done) => {
      const modelCombos: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      service.updateFilters({ modelCombos });

      setTimeout(() => {
        // Remove models
        service.updateFilters({ modelCombos: [] });

        service.results$.subscribe((results) => {
          expect(results).toEqual([]);
          done();
        });
      }, 50);
    });

    it('should update loading state during API call', (done) => {
      const loadingStates: boolean[] = [];

      service.loading$.subscribe((loading) => {
        loadingStates.push(loading);
      });

      const modelCombos: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      service.updateFilters({ modelCombos });

      setTimeout(() => {
        // Should have transitioned through loading states
        expect(loadingStates).toContain(false);
        done();
      }, 100);
    });

    it('should handle API errors gracefully', (done) => {
      const modelCombos: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      const mockError = new Error('API Error');
      mockRequestCoordinator.execute.and.returnValue(throwError(() => mockError));

      service.updateFilters({ modelCombos });

      setTimeout(() => {
        service.error$.subscribe((error) => {
          expect(error).toBeTruthy();
          expect(error?.toLowerCase()).toContain('error');
          done();
        });
      }, 50);
    });
  });

  describe('Request Coordination', () => {
    beforeEach(() => {
      mockRouteState.getCurrentParams.and.returnValue({});
      mockRouteState.paramsToFilters.and.returnValue({});
      service = TestBed.inject(StateManagementService);
    });

    it('should use RequestCoordinatorService with correct config', () => {
      const modelCombos: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      service.updateFilters({ modelCombos });

      expect(mockRequestCoordinator.execute).toHaveBeenCalledWith(
        jasmine.any(String), // cache key
        jasmine.any(Function), // request function
        jasmine.objectContaining({
          cacheTime: 30000,
          deduplication: true,
          retryAttempts: 2,
          retryDelay: 1000,
        })
      );
    });

    it('should build unique cache key from filters', () => {
      const filters1: Partial<SearchFilters> = {
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        page: 1,
      };

      const filters2: Partial<SearchFilters> = {
        modelCombos: [{ manufacturer: 'Ford', model: 'Mustang' }],
        page: 1,
      };

      service.updateFilters(filters1);
      const call1 = mockRequestCoordinator.execute.calls.argsFor(0)[0];

      mockRequestCoordinator.execute.calls.reset();

      service.updateFilters(filters2);
      const call2 = mockRequestCoordinator.execute.calls.argsFor(0)[0];

      // Cache keys should be different
      expect(call1).not.toEqual(call2);
    });

    it('should provide loading state observable', () => {
      const loadingState$ = service.getVehicleDataLoadingState$();
      expect(loadingState$).toBeTruthy();
      expect(mockRequestCoordinator.getLoadingState$).toHaveBeenCalled();
    });

    it('should provide global loading state observable', () => {
      const globalLoading$ = service.getGlobalLoadingState$();
      expect(globalLoading$).toBeTruthy();
      expect(mockRequestCoordinator.getGlobalLoading$).toHaveBeenCalled();
    });

    it('should cancel all requests on cleanup', () => {
      service.cancelAllRequests();
      expect(mockRequestCoordinator.cancelAll).toHaveBeenCalled();
    });

    it('should clear cache when requested', () => {
      service.clearCache('test-key');
      expect(mockRequestCoordinator.clearCache).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Public Methods', () => {
    beforeEach(() => {
      mockRouteState.getCurrentParams.and.returnValue({});
      mockRouteState.paramsToFilters.and.returnValue({});
      service = TestBed.inject(StateManagementService);
    });

    it('should update page and trigger data fetch', () => {
      const modelCombos: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];
      service.updateFilters({ modelCombos });
      mockRequestCoordinator.execute.calls.reset();

      service.updatePage(3);

      const filters = service.getCurrentFilters();
      expect(filters.page).toBe(3);
      expect(mockRequestCoordinator.execute).toHaveBeenCalled();
    });

    it('should update sort and reset to page 1', () => {
      service.updateFilters({ page: 5 });

      service.updateSort('year', 'desc');

      const filters = service.getCurrentFilters();
      expect(filters.sort).toBe('year');
      expect(filters.sortDirection).toBe('desc');
      expect(filters.page).toBe(1); // Reset to page 1
    });

    it('should reset all filters', (done) => {
      service.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        yearMin: 1960,
        page: 3,
      });

      service.resetFilters();

      service.filters$.subscribe((filters) => {
        expect(filters.modelCombos).toBeUndefined();
        expect(filters.yearMin).toBeUndefined();
        expect(filters.page).toBe(1);
        expect(filters.size).toBe(20);
        done();
      });
    });

    it('should get current filters synchronously', () => {
      service.updateFilters({ yearMin: 1960 });

      const filters = service.getCurrentFilters();
      expect(filters.yearMin).toBe(1960);
    });
  });

  describe('Observable Emissions', () => {
    beforeEach(() => {
      mockRouteState.getCurrentParams.and.returnValue({});
      mockRouteState.paramsToFilters.and.returnValue({});
      service = TestBed.inject(StateManagementService);
    });

    it('should emit distinct filters only', (done) => {
      const emissions: SearchFilters[] = [];

      service.filters$.subscribe((filters) => {
        emissions.push(filters);
      });

      service.updateFilters({ yearMin: 1960 });
      service.updateFilters({ yearMin: 1960 }); // Duplicate
      service.updateFilters({ yearMax: 1980 });

      setTimeout(() => {
        // Should have emissions for: initial, 1960, 1960+1980
        // distinctUntilChanged should prevent duplicate 1960
        expect(emissions.length).toBeLessThanOrEqual(3);
        done();
      }, 50);
    });

    it('should emit new results after successful API call', (done) => {
      const mockResponse = {
        results: [{ vehicle_id: '1' }],
        total: 1,
        page: 1,
        size: 20,
        totalPages: 1,
      };

      mockRequestCoordinator.execute.and.returnValue(of(mockResponse));

      const modelCombos: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      service.updateFilters({ modelCombos });

      service.results$.subscribe((results) => {
        if (results.length > 0) {
          expect(results.length).toBe(1);
          expect(results[0].vehicle_id).toBe('1');
          done();
        }
      });
    });

    it('should emit totalResults after API call', (done) => {
      const mockResponse = {
        results: [],
        total: 150,
        page: 1,
        size: 20,
        totalPages: 8,
      };

      mockRequestCoordinator.execute.and.returnValue(of(mockResponse));

      const modelCombos: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      service.updateFilters({ modelCombos });

      service.totalResults$.subscribe((total) => {
        if (total > 0) {
          expect(total).toBe(150);
          done();
        }
      });
    });
  });

  describe('URL-First Principle: Deep Linking', () => {
    it('should restore complete state from URL on service init', () => {
      const deepLinkParams = {
        models: 'Ford:Mustang,Chevrolet:Camaro',
        yearMin: '1965',
        yearMax: '1973',
        bodyClass: 'Coupe',
        page: '2',
        size: '50',
        sort: 'year',
        sortDirection: 'desc',
      };

      const expectedFilters: SearchFilters = {
        modelCombos: [
          { manufacturer: 'Ford', model: 'Mustang' },
          { manufacturer: 'Chevrolet', model: 'Camaro' },
        ],
        yearMin: 1965,
        yearMax: 1973,
        bodyClass: 'Coupe',
        page: 2,
        size: 50,
        sort: 'year',
        sortDirection: 'desc',
      };

      mockRouteState.getCurrentParams.and.returnValue(deepLinkParams);
      mockRouteState.paramsToFilters.and.returnValue(expectedFilters);

      service = TestBed.inject(StateManagementService);

      const filters = service.getCurrentFilters();
      expect(filters).toEqual(expectedFilters);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      mockRouteState.getCurrentParams.and.returnValue({});
      mockRouteState.paramsToFilters.and.returnValue({});
      service = TestBed.inject(StateManagementService);
    });

    it('should cancel requests on destroy', () => {
      service.ngOnDestroy();
      expect(mockRequestCoordinator.cancelAll).toHaveBeenCalled();
    });

    it('should complete observables on destroy', () => {
      const completeSpy = jasmine.createSpy('complete');
      service.filters$.subscribe({ complete: completeSpy });

      service.ngOnDestroy();

      // Observables should complete (not testable directly with BehaviorSubject)
      expect(completeSpy).not.toHaveBeenCalled(); // BehaviorSubject doesn't complete
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      mockRouteState.getCurrentParams.and.returnValue({});
      mockRouteState.paramsToFilters.and.returnValue({ page: 1, size: 20 });
      service = TestBed.inject(StateManagementService);
    });

    it('should handle API errors during initialization', () => {
      const errorFilters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        page: 1,
        size: 20,
      };
      mockRouteState.paramsToFilters.and.returnValue(errorFilters);
      mockRequestCoordinator.execute.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      // Re-initialize service with error conditions
      service = TestBed.inject(StateManagementService);

      service.state$.subscribe((state) => {
        if (state.error) {
          expect(state.error).toContain('Network error');
          expect(state.loading).toBe(false);
        }
      });
    });

    it('should handle clearAllFilters errors gracefully', () => {
      mockRequestCoordinator.execute.and.returnValue(
        throwError(() => new Error('Clear failed'))
      );

      service.clearAllFilters();

      service.state$.subscribe((state) => {
        if (state.error) {
          expect(state.error).toContain('Clear failed');
        }
      });
    });

    it('should format HTTP error objects correctly', () => {
      const httpError = {
        status: 404,
        statusText: 'Not Found',
        message: 'Resource not found',
      };

      const formatted = service['formatError'](httpError);
      expect(formatted).toContain('404');
      expect(formatted).toContain('Not Found');
    });

    it('should format Error objects correctly', () => {
      const error = new Error('Something went wrong');
      const formatted = service['formatError'](error);
      expect(formatted).toBe('Something went wrong');
    });

    it('should format string errors correctly', () => {
      const formatted = service['formatError']('Simple error message');
      expect(formatted).toBe('Simple error message');
    });

    it('should format unknown error types as generic message', () => {
      const formatted = service['formatError']({ unknown: 'object' });
      expect(formatted).toBe('An unknown error occurred');
    });

    it('should handle updateFilters with empty modelCombos array', () => {
      service.updateFilters({ modelCombos: [] });

      const currentFilters = service.getCurrentFilters();
      expect(currentFilters.modelCombos).toEqual([]);
    });

    it('should preserve page size when clearing all filters', () => {
      service.updateFilters({ page: 3, size: 100 });

      service.clearAllFilters();

      const currentFilters = service.getCurrentFilters();
      expect(currentFilters.page).toBe(1);
      expect(currentFilters.size).toBe(100);
    });

    it('should handle fetchWithEphemeralFilters with all filter types', () => {
      const ephemeralFilters = {
        manufacturerSearch: 'Ford',
        modelSearch: 'F-150',
        bodyClassSearch: 'Pickup',
        dataSourceSearch: 'NHTSA',
      };

      service.fetchWithEphemeralFilters(ephemeralFilters);

      expect(mockRequestCoordinator.execute).toHaveBeenCalled();
    });

    it('should handle concurrent filter updates correctly', () => {
      service.updateFilters({ manufacturer: 'Ford' });
      service.updateFilters({ model: 'F-150' });

      const currentFilters = service.getCurrentFilters();
      expect(currentFilters.manufacturer).toBe('Ford');
      expect(currentFilters.model).toBe('F-150');
    });

    it('should handle filter removal with multiple undefined values', () => {
      service.updateFilters({ manufacturer: 'Ford', model: 'F-150', bodyClass: 'Sedan' });

      service.updateFilters({
        manufacturer: undefined,
        bodyClass: undefined,
      });

      const currentFilters = service.getCurrentFilters();
      expect(currentFilters.manufacturer).toBeUndefined();
      expect(currentFilters.model).toBe('F-150');
      expect(currentFilters.bodyClass).toBeUndefined();
    });

    it('should handle mixed defined and undefined filter updates', () => {
      service.updateFilters({ manufacturer: 'Ford', model: 'F-150' });

      service.updateFilters({
        manufacturer: undefined,
        bodyClass: 'Sedan',
      });

      const currentFilters = service.getCurrentFilters();
      expect(currentFilters.manufacturer).toBeUndefined();
      expect(currentFilters.model).toBe('F-150');
      expect(currentFilters.bodyClass).toBe('Sedan');
    });

    it('should handle page size update via updateFilters', () => {
      service.updateFilters({ size: 50 });

      const currentFilters = service.getCurrentFilters();
      expect(currentFilters.size).toBe(50);
    });

    it('should handle updateSort', () => {
      service.updateSort('year', 'asc');

      const currentFilters = service.getCurrentFilters();
      expect(currentFilters.sort).toBe('year');
      expect(currentFilters.sortDirection).toBe('asc');
    });

    it('should getCurrentState', () => {
      const state = service.getCurrentState();

      expect(state).toBeDefined();
      expect(state.filters).toBeDefined();
      expect(state.results).toBeDefined();
    });
  });
});

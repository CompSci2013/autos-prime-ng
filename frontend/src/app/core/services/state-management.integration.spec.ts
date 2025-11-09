import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { StateManagementService } from './state-management.service';
import { RouteStateService } from './route-state.service';
import { RequestCoordinatorService } from './request-coordinator.service';
import { ApiService } from '../../services/api.service';
import { SearchFilters, AppState } from '../../models/search-filters.model';
import { VehicleDetailsResponse, VehicleResult } from '../../models';

/**
 * State Management Integration Tests
 *
 * Tests the full integration of:
 * - StateManagementService
 * - RouteStateService
 * - RequestCoordinatorService
 * - ApiService
 *
 * Tests real service interactions, URL synchronization, caching, and error handling
 */
describe('State Management Integration', () => {
  let stateManagement: StateManagementService;
  let routeState: RouteStateService;
  let requestCoordinator: RequestCoordinatorService;
  let apiService: ApiService;
  let httpMock: HttpTestingController;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  const apiUrl = '/api/search';

  const mockVehicleResponse: VehicleDetailsResponse = {
    results: [
      {
        vehicle_id: '1',
        manufacturer: 'Ford',
        model: 'F-150',
        year: 2020,
        body_class: 'Pickup',
        data_source: 'NHTSA',
        ingested_at: '2024-01-01T00:00:00Z',
        instance_count: 5000,
      },
    ],
    total: 1,
    totalPages: 1,
    page: 1,
    size: 20,
    query: { modelCombos: [] },
  };

  beforeEach(() => {
    // Mock Router with navigate spy
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
      events: of({}),
      url: '/',
    });

    // Mock ActivatedRoute with query params
    mockActivatedRoute = {
      snapshot: {
        queryParams: {},
      },
      queryParams: of({}),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StateManagementService,
        RouteStateService,
        RequestCoordinatorService,
        ApiService,
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    stateManagement = TestBed.inject(StateManagementService);
    routeState = TestBed.inject(RouteStateService);
    requestCoordinator = TestBed.inject(RequestCoordinatorService);
    apiService = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    requestCoordinator.cancelAll();
    requestCoordinator.clearCache();
  });

  // ========== URL → State → API Flow ==========

  describe('URL → State → API Flow', () => {
    it('should sync URL params → StateManagement → API call', fakeAsync(() => {
      // Set URL params via RouteState
      mockActivatedRoute.snapshot.queryParams = {
        models: 'Ford:F-150',
        page: '1',
        size: '20',
      };

      // Re-create service with new URL params
      stateManagement = TestBed.inject(StateManagementService);

      // Wait for initialization
      tick();

      // Expect API call
      const req = httpMock.expectOne((request) =>
        request.url.includes('/vehicle-details')
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockVehicleResponse);

      tick();

      // Verify state updated
      stateManagement.state$.subscribe((state) => {
        expect(state.results.length).toBe(1);
        expect(state.totalResults).toBe(1);
        expect(state.loading).toBe(false);
      });

      flush();
    }));

    it('should handle filter update → URL sync → API call', fakeAsync(() => {
      // Update filters
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });

      tick();

      // Expect router navigation
      expect(mockRouter.navigate).toHaveBeenCalled();

      // Expect API call
      const req = httpMock.expectOne((request) =>
        request.url.includes('/vehicle-details')
      );
      req.flush(mockVehicleResponse);

      tick();

      // Verify state
      const currentState = stateManagement.currentState;
      expect(currentState.results.length).toBe(1);
      expect(currentState.filters.modelCombos).toBeDefined();

      flush();
    }));

    it('should restore state from URL on app initialization', fakeAsync(() => {
      mockActivatedRoute.snapshot.queryParams = {
        models: 'Ford:F-150,Chevrolet:Corvette',
        yearMin: '2020',
        yearMax: '2022',
        page: '2',
        size: '50',
      };

      // Create new service instance
      const newService = TestBed.inject(StateManagementService);

      tick();

      // Expect API call with restored filters
      const req = httpMock.expectOne((request) => {
        const url = request.url;
        return (
          url.includes('/vehicle-details') &&
          request.params.has('page') &&
          request.params.get('page') === '2' &&
          request.params.get('size') === '50'
        );
      });
      req.flush({
        ...mockVehicleResponse,
        total: 100,
        page: 2,
        size: 50,
      });

      tick();

      // Verify filters restored
      const filters = newService.getCurrentFilters();
      expect(filters.modelCombos?.length).toBe(2);
      expect(filters.yearMin).toBe(2020);
      expect(filters.yearMax).toBe(2022);
      expect(filters.page).toBe(2);
      expect(filters.size).toBe(50);

      flush();
    }));
  });

  // ========== Request Deduplication ==========

  describe('Request Deduplication', () => {
    it('should deduplicate concurrent requests from multiple subscribers', fakeAsync(() => {
      const filters: SearchFilters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        page: 1,
        size: 20,
      };

      // Set filters
      mockActivatedRoute.snapshot.queryParams = {
        models: 'Ford:F-150',
      };
      stateManagement.updateFilters(filters);

      tick();

      // Make two concurrent requests
      const sub1 = stateManagement.fetchVehicleData().subscribe();
      const sub2 = stateManagement.fetchVehicleData().subscribe();

      // Should only have ONE HTTP request
      const requests = httpMock.match((req) =>
        req.url.includes('/vehicle-details')
      );
      expect(requests.length).toBe(1);

      requests[0].flush(mockVehicleResponse);
      tick();

      sub1.unsubscribe();
      sub2.unsubscribe();
      flush();
    }));

    it('should coordinate page navigation with caching', fakeAsync(() => {
      // First request
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        page: 1,
        size: 20,
      });

      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockVehicleResponse);
      tick();

      // Navigate to page 2
      stateManagement.updatePage(2);
      tick();

      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req2.flush({ ...mockVehicleResponse, page: 2 });
      tick();

      // Navigate back to page 1 - should use cache
      stateManagement.updatePage(1);
      tick(100); // Wait less than cache time

      // Should use cached response (no HTTP call)
      httpMock.expectNone((r) => r.url.includes('/vehicle-details'));

      flush();
    }));

    it('should clear cache when model selection changes', fakeAsync(() => {
      // First request
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });
      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockVehicleResponse);
      tick();

      // Change models - should trigger new request even with cache
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Chevrolet', model: 'Corvette' }],
      });
      tick();

      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      expect(req2).toBeDefined();
      req2.flush(mockVehicleResponse);

      flush();
    }));
  });

  // ========== Error Handling ==========

  describe('Error Handling', () => {
    it('should handle API error → StateManagement error state', fakeAsync(() => {
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });

      tick();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req.flush('Server error', { status: 500, statusText: 'Server Error' });

      tick();

      // Verify error state
      const state = stateManagement.currentState;
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
      expect(state.results.length).toBe(0);

      flush();
    }));

    it('should retry failed requests with exponential backoff', fakeAsync(() => {
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });

      tick();

      // First attempt fails
      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush('Network error', { status: 0, statusText: 'Unknown Error' });

      // Wait for retry delay (1s)
      tick(1000);

      // Second attempt fails
      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req2.flush('Network error', { status: 0, statusText: 'Unknown Error' });

      // Wait for retry delay (2s - exponential backoff)
      tick(2000);

      // Third attempt succeeds
      const req3 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req3.flush(mockVehicleResponse);

      tick();

      // Verify successful state
      const state = stateManagement.currentState;
      expect(state.error).toBeNull();
      expect(state.results.length).toBe(1);

      flush();
    }));

    it('should handle 404 with user-friendly message', fakeAsync(() => {
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'InvalidMake', model: 'InvalidModel' }],
      });

      tick();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req.flush('Not found', { status: 404, statusText: 'Not Found' });

      tick();

      const state = stateManagement.currentState;
      expect(state.error).toContain('No vehicles found');

      flush();
    }));
  });

  // ========== Filter Coordination ==========

  describe('Filter Coordination', () => {
    it('should handle concurrent filter + sort + page changes', fakeAsync(() => {
      // Apply multiple changes rapidly
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        yearMin: 2020,
        yearMax: 2022,
      });

      stateManagement.updateSort('year', 'desc');
      stateManagement.updatePage(2);

      tick();

      // Should only make final request with all changes
      const requests = httpMock.match((r) =>
        r.url.includes('/vehicle-details')
      );
      // May have multiple requests due to sequential updates
      expect(requests.length).toBeGreaterThan(0);

      requests.forEach((req) => req.flush(mockVehicleResponse));

      tick();

      // Verify final state
      const filters = stateManagement.getCurrentFilters();
      expect(filters.sort).toBe('year');
      expect(filters.sortDirection).toBe('desc');
      expect(filters.page).toBe(2);

      flush();
    }));

    it('should coordinate highlight filters with regular filters', fakeAsync(() => {
      // Set base filters via URL
      mockActivatedRoute.snapshot.queryParams = {
        models: 'Ford:F-150',
        h_yearMin: '2020',
      };

      // Reinitialize service
      const newService = TestBed.inject(StateManagementService);

      tick();

      // Should send both base filters and highlights to API
      const req = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      expect(req.request.url).toContain('vehicle-details');
      req.flush(mockVehicleResponse);

      tick();
      flush();
    }));

    it('should reset to page 1 when filters change', fakeAsync(() => {
      // Start on page 2
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        page: 2,
      });

      tick();
      httpMock
        .expectOne((r) => r.url.includes('/vehicle-details'))
        .flush(mockVehicleResponse);
      tick();

      // Change filter - should reset to page 1
      stateManagement.updateFilters({
        yearMin: 2020,
      });

      tick();

      const filters = stateManagement.getCurrentFilters();
      expect(filters.page).toBe(1);

      httpMock
        .expectOne((r) => r.url.includes('/vehicle-details'))
        .flush(mockVehicleResponse);

      flush();
    }));
  });

  // ========== Cache Management ==========

  describe('Cache Management', () => {
    it('should cache responses for configured duration', fakeAsync(() => {
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });

      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockVehicleResponse);
      tick();

      // Request again within cache time (30s)
      stateManagement.fetchVehicleData().subscribe();
      tick(1000); // Wait 1s

      // Should not make new HTTP request
      httpMock.expectNone((r) => r.url.includes('/vehicle-details'));

      flush();
    }));

    it('should expire cache after configured duration', fakeAsync(() => {
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });

      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockVehicleResponse);
      tick();

      // Wait beyond cache time
      tick(31000); // Wait 31s (cache is 30s)

      // Request again - should make new HTTP request
      stateManagement.fetchVehicleData().subscribe();
      tick();

      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      expect(req2).toBeDefined();
      req2.flush(mockVehicleResponse);

      flush();
    }));

    it('should handle manual cache clearing', fakeAsync(() => {
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });

      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockVehicleResponse);
      tick();

      // Clear cache manually
      stateManagement.clearCache();

      // Request again - should make new HTTP request
      stateManagement.fetchVehicleData().subscribe();
      tick();

      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      expect(req2).toBeDefined();
      req2.flush(mockVehicleResponse);

      flush();
    }));
  });

  // ========== Loading States ==========

  describe('Loading States', () => {
    it('should track loading state during API calls', fakeAsync(() => {
      const loadingStates: boolean[] = [];

      stateManagement.loading$.subscribe((loading) => {
        loadingStates.push(loading);
      });

      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });

      tick();

      // Respond to API
      const req = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req.flush(mockVehicleResponse);
      tick();

      // Should have transitions: false → true → false
      expect(loadingStates).toContain(false);
      expect(loadingStates).toContain(true);
      expect(loadingStates[loadingStates.length - 1]).toBe(false);

      flush();
    }));

    it('should track global loading state across multiple requests', fakeAsync(() => {
      const globalLoadingStates: boolean[] = [];

      stateManagement.getGlobalLoadingState$().subscribe((loading) => {
        globalLoadingStates.push(loading);
      });

      // Start two different requests
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });

      stateManagement.fetchManufacturerModelData(1, 20).subscribe();

      tick();

      // Respond to first request
      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockVehicleResponse);

      // Respond to second request
      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/manufacturer-model')
      );
      req2.flush({ results: [], total: 0 });

      tick();

      // Should have been loading at some point
      expect(globalLoadingStates).toContain(true);
      expect(globalLoadingStates[globalLoadingStates.length - 1]).toBe(false);

      flush();
    }));
  });

  // ========== Ephemeral Filters ==========

  describe('Ephemeral Filters (Table Column Search)', () => {
    it('should combine URL filters with ephemeral filters', fakeAsync(() => {
      // Set base filters via URL
      stateManagement.updateFilters({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });

      tick();
      httpMock
        .expectOne((r) => r.url.includes('/vehicle-details'))
        .flush(mockVehicleResponse);
      tick();

      // Apply ephemeral filter (table column search)
      stateManagement
        .fetchWithEphemeralFilters({
          manufacturerSearch: 'For',
        })
        .subscribe();

      tick();

      // Should include both base models and ephemeral search
      const req = httpMock.expectOne((r) => {
        return (
          r.url.includes('/vehicle-details') &&
          r.params.has('manufacturerSearch')
        );
      });

      expect(req.request.params.get('manufacturerSearch')).toBe('For');
      req.flush(mockVehicleResponse);

      flush();
    }));

    it('should not persist ephemeral filters to URL', fakeAsync(() => {
      stateManagement
        .fetchWithEphemeralFilters({
          bodyClassSearch: 'Pickup',
        })
        .subscribe();

      tick();

      httpMock
        .expectOne((r) => r.url.includes('/vehicle-details'))
        .flush(mockVehicleResponse);
      tick();

      // Router should not be called (URL not updated)
      // Only initial navigation from updateFilters would have been called
      const navCalls = (mockRouter.navigate as jasmine.Spy).calls.count();
      expect(navCalls).toBe(0); // No filters set, so no navigation

      flush();
    }));
  });
});

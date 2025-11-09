import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { RequestCoordinatorService } from './request-coordinator.service';
import { ApiService } from '../../services/api.service';

/**
 * Data Loading and Caching Integration Tests
 *
 * Tests the integration of:
 * - RequestCoordinatorService (deduplication, caching, retry)
 * - ApiService (HTTP requests)
 *
 * Tests request coordination, cache behavior, retry logic, and error handling
 */
describe('Data Loading and Caching Integration', () => {
  let requestCoordinator: RequestCoordinatorService;
  let apiService: ApiService;
  let httpMock: HttpTestingController;

  const apiUrl = '/api/search';

  const mockResponse = {
    results: [{
      vehicle_id: '1',
      manufacturer: 'Ford',
      model: 'F-150',
      year: 2020,
      body_class: 'Pickup',
      data_source: 'NHTSA',
      ingested_at: '2024-01-01T00:00:00Z',
      instance_count: 5000,
    }],
    total: 1,
    totalPages: 1,
    page: 1,
    size: 20,
    query: { modelCombos: [] },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RequestCoordinatorService, ApiService],
    });

    requestCoordinator = TestBed.inject(RequestCoordinatorService);
    apiService = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    requestCoordinator.cancelAll();
    requestCoordinator.clearCache();
  });

  // ========== Request Deduplication ==========

  describe('Request Deduplication', () => {
    it('should deduplicate parallel identical requests', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      // Execute same request twice in parallel
      const sub1 = requestCoordinator
        .execute('test-key', requestFn, { deduplication: true })
        .subscribe();

      const sub2 = requestCoordinator
        .execute('test-key', requestFn, { deduplication: true })
        .subscribe();

      tick();

      // Should only have ONE HTTP request
      const requests = httpMock.match((req) =>
        req.url.includes('/vehicle-details')
      );
      expect(requests.length).toBe(1);

      requests[0].flush(mockResponse);
      tick();

      sub1.unsubscribe();
      sub2.unsubscribe();
      flush();
    }));

    it('should allow concurrent requests with different keys', fakeAsync(() => {
      const requestFn1 = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);
      const requestFn2 = () =>
        apiService.getVehicleDetails('Chevrolet:Corvette', 1, 20);

      // Execute different requests in parallel
      requestCoordinator
        .execute('key1', requestFn1, { deduplication: true })
        .subscribe();

      requestCoordinator
        .execute('key2', requestFn2, { deduplication: true })
        .subscribe();

      tick();

      // Should have TWO HTTP requests (different keys)
      const requests = httpMock.match((req) =>
        req.url.includes('/vehicle-details')
      );
      expect(requests.length).toBe(2);

      requests.forEach((req) => req.flush(mockResponse));
      tick();
      flush();
    }));

    it('should not deduplicate when deduplication disabled', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      // Execute same request twice with deduplication disabled
      requestCoordinator
        .execute('test-key', requestFn, { deduplication: false })
        .subscribe();

      requestCoordinator
        .execute('test-key', requestFn, { deduplication: false })
        .subscribe();

      tick();

      // Should have TWO HTTP requests (deduplication disabled)
      const requests = httpMock.match((req) =>
        req.url.includes('/vehicle-details')
      );
      expect(requests.length).toBe(2);

      requests.forEach((req) => req.flush(mockResponse));
      tick();
      flush();
    }));

    it('should allow new request after in-flight completes', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      // First request
      requestCoordinator
        .execute('test-key', requestFn, { deduplication: true })
        .subscribe();

      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockResponse);
      tick();

      // Second request (after first completes)
      requestCoordinator
        .execute('test-key', requestFn, { deduplication: true })
        .subscribe();

      tick();

      // Should have second HTTP request
      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      expect(req2).toBeDefined();
      req2.flush(mockResponse);

      flush();
    }));
  });

  // ========== Response Caching ==========

  describe('Response Caching', () => {
    it('should cache responses and serve from cache', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      // First request - should hit API
      requestCoordinator
        .execute('cache-key', requestFn, { cacheTime: 30000 })
        .subscribe();

      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockResponse);
      tick();

      // Second request within cache time - should use cache
      requestCoordinator
        .execute('cache-key', requestFn, { cacheTime: 30000 })
        .subscribe((response) => {
          expect(response).toEqual(mockResponse);
        });

      tick();

      // Should NOT make second HTTP request
      httpMock.expectNone((r) => r.url.includes('/vehicle-details'));

      flush();
    }));

    it('should expire cache after configured duration', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      // First request
      requestCoordinator
        .execute('cache-key', requestFn, { cacheTime: 5000 })
        .subscribe();

      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockResponse);
      tick();

      // Wait for cache to expire
      tick(6000); // Wait 6s (cache is 5s)

      // Second request after cache expiration - should hit API
      requestCoordinator
        .execute('cache-key', requestFn, { cacheTime: 5000 })
        .subscribe();

      tick();

      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      expect(req2).toBeDefined();
      req2.flush(mockResponse);

      flush();
    }));

    it('should not cache when cacheTime is 0', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      // First request
      requestCoordinator
        .execute('no-cache-key', requestFn, { cacheTime: 0 })
        .subscribe();

      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockResponse);
      tick();

      // Second request - should hit API (no caching)
      requestCoordinator
        .execute('no-cache-key', requestFn, { cacheTime: 0 })
        .subscribe();

      tick();

      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      expect(req2).toBeDefined();
      req2.flush(mockResponse);

      flush();
    }));

    it('should handle manual cache clearing', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      // First request
      requestCoordinator
        .execute('clear-key', requestFn, { cacheTime: 30000 })
        .subscribe();

      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockResponse);
      tick();

      // Clear cache manually
      requestCoordinator.clearCache('clear-key');

      // Second request - should hit API (cache cleared)
      requestCoordinator
        .execute('clear-key', requestFn, { cacheTime: 30000 })
        .subscribe();

      tick();

      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      expect(req2).toBeDefined();
      req2.flush(mockResponse);

      flush();
    }));

    it('should cache different responses for different keys', fakeAsync(() => {
      const requestFn1 = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);
      const requestFn2 = () =>
        apiService.getVehicleDetails('Chevrolet:Corvette', 1, 20);

      const mockResponse2 = {
        ...mockResponse,
        results: [{
          vehicle_id: '2',
          manufacturer: 'Chevrolet',
          model: 'Corvette',
          year: 2021,
          body_class: 'Sports Car',
          data_source: 'NHTSA',
          ingested_at: '2024-01-01T00:00:00Z',
          instance_count: 2000,
        }]
      };

      // First request
      requestCoordinator
        .execute('key1', requestFn1, { cacheTime: 30000 })
        .subscribe();

      tick();

      const req1 = httpMock.expectOne((r) =>
        r.url.includes('Ford:F-150')
      );
      req1.flush(mockResponse);
      tick();

      // Second request (different key)
      requestCoordinator
        .execute('key2', requestFn2, { cacheTime: 30000 })
        .subscribe();

      tick();

      const req2 = httpMock.expectOne((r) =>
        r.url.includes('Chevrolet:Corvette')
      );
      req2.flush(mockResponse2);
      tick();

      // Request both again - should use cached responses
      requestCoordinator
        .execute('key1', requestFn1, { cacheTime: 30000 })
        .subscribe((response) => {
          expect(response.results[0].vehicle_id).toBe('1');
        });

      requestCoordinator
        .execute('key2', requestFn2, { cacheTime: 30000 })
        .subscribe((response) => {
          expect(response.results[0].vehicle_id).toBe('2');
        });

      tick();

      // Should not make new HTTP requests
      httpMock.expectNone((r) => r.url.includes('/vehicle-details'));

      flush();
    }));
  });

  // ========== Retry Logic ==========

  describe('Retry Logic with Exponential Backoff', () => {
    it('should retry failed requests with exponential backoff', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      requestCoordinator
        .execute('retry-key', requestFn, {
          retryAttempts: 2,
          retryDelay: 1000,
        })
        .subscribe({
          next: () => {},
          error: () => {},
        });

      tick();

      // First attempt fails
      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush('Error', { status: 500, statusText: 'Server Error' });

      // Wait for first retry delay (1s)
      tick(1000);

      // Second attempt fails
      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req2.flush('Error', { status: 500, statusText: 'Server Error' });

      // Wait for second retry delay (2s - exponential backoff)
      tick(2000);

      // Third attempt succeeds
      const req3 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req3.flush(mockResponse);

      tick();
      flush();
    }));

    it('should stop retrying after max attempts', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      let errorCaught = false;

      requestCoordinator
        .execute('retry-key', requestFn, {
          retryAttempts: 2,
          retryDelay: 1000,
        })
        .subscribe({
          next: () => {},
          error: () => {
            errorCaught = true;
          },
        });

      tick();

      // All attempts fail
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne((r) =>
          r.url.includes('/vehicle-details')
        );
        req.flush('Error', { status: 500, statusText: 'Server Error' });
        tick(Math.pow(2, i) * 1000); // Exponential backoff
      }

      expect(errorCaught).toBe(true);
      flush();
    }));

    it('should not retry when retryAttempts is 0', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      requestCoordinator
        .execute('no-retry-key', requestFn, { retryAttempts: 0 })
        .subscribe({
          next: () => {},
          error: () => {},
        });

      tick();

      // Single attempt
      const req = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      tick(5000); // Wait a while

      // Should not retry
      httpMock.expectNone((r) => r.url.includes('/vehicle-details'));

      flush();
    }));
  });

  // ========== Loading State Tracking ==========

  describe('Loading State Tracking', () => {
    it('should track loading state for specific request', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      const loadingStates: boolean[] = [];

      requestCoordinator
        .getLoadingState$('state-key')
        .subscribe((state) => {
          loadingStates.push(state.loading);
        });

      requestCoordinator
        .execute('state-key', requestFn)
        .subscribe();

      tick();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req.flush(mockResponse);
      tick();

      // Should transition: false → true → false
      expect(loadingStates).toContain(false);
      expect(loadingStates).toContain(true);
      expect(loadingStates[loadingStates.length - 1]).toBe(false);

      flush();
    }));

    it('should track global loading state across multiple requests', fakeAsync(() => {
      const requestFn1 = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);
      const requestFn2 = () =>
        apiService.getManufacturerModelCombinations(1, 20);

      let globalLoading = false;

      requestCoordinator.getGlobalLoading$().subscribe((loading) => {
        globalLoading = loading;
      });

      // Start first request
      requestCoordinator.execute('key1', requestFn1).subscribe();
      tick();

      expect(globalLoading).toBe(true);

      // Start second request
      requestCoordinator.execute('key2', requestFn2).subscribe();
      tick();

      expect(globalLoading).toBe(true);

      // Complete first request
      const req1 = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req1.flush(mockResponse);
      tick();

      expect(globalLoading).toBe(true); // Still one active

      // Complete second request
      const req2 = httpMock.expectOne((r) =>
        r.url.includes('/manufacturer-model')
      );
      req2.flush({ results: [], total: 0 });
      tick();

      expect(globalLoading).toBe(false); // All complete

      flush();
    }));

    it('should track error state for failed requests', fakeAsync(() => {
      const requestFn = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);

      let errorState: Error | null = null;

      requestCoordinator
        .getLoadingState$('error-key')
        .subscribe((state) => {
          errorState = state.error;
        });

      requestCoordinator
        .execute('error-key', requestFn, { retryAttempts: 0 })
        .subscribe({
          next: () => {},
          error: () => {},
        });

      tick();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/vehicle-details')
      );
      req.flush('Server error', {
        status: 500,
        statusText: 'Server Error',
      });
      tick();

      expect(errorState).toBeTruthy();

      flush();
    }));
  });

  // ========== Request Cancellation ==========

  describe('Request Cancellation', () => {
    it('should cancel all active requests', fakeAsync(() => {
      const requestFn1 = () =>
        apiService.getVehicleDetails('Ford:F-150', 1, 20);
      const requestFn2 = () =>
        apiService.getVehicleDetails('Chevrolet:Corvette', 1, 20);

      // Start two requests
      requestCoordinator.execute('key1', requestFn1).subscribe({
        next: () => {},
        error: () => {},
      });

      requestCoordinator.execute('key2', requestFn2).subscribe({
        next: () => {},
        error: () => {},
      });

      tick();

      // Cancel all
      requestCoordinator.cancelAll();

      // Global loading should be reset
      expect(requestCoordinator.isAnyLoading()).toBe(false);

      // Clean up pending requests
      httpMock
        .match((r) => r.url.includes('/vehicle-details'))
        .forEach((req) => req.flush(mockResponse));

      flush();
    }));
  });
});

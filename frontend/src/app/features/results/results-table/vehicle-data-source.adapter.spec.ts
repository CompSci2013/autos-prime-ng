import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { VehicleDataSourceAdapter } from './vehicle-data-source.adapter';
import { ApiService } from '../../../services/api.service';
import { RequestCoordinatorService } from '../../../core/services/request-coordinator.service';
import { TableQueryParams } from '../../../shared/models/table-data-source.model';
import { VehicleResult } from '../../../models/vehicle-result.model';

describe('VehicleDataSourceAdapter', () => {
  let adapter: VehicleDataSourceAdapter;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockRequestCoordinator: jasmine.SpyObj<RequestCoordinatorService>;

  const mockVehicleResults: VehicleResult[] = [
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
    {
      vehicle_id: '2',
      manufacturer: 'Chevrolet',
      model: 'Corvette',
      year: 2021,
      body_class: 'Sports Car',
      data_source: 'NHTSA',
      ingested_at: '2024-01-01T00:00:00Z',
      instance_count: 2000,
    },
  ];

  beforeEach(() => {
    mockApiService = jasmine.createSpyObj('ApiService', ['getVehicleDetails']);
    mockRequestCoordinator = jasmine.createSpyObj('RequestCoordinatorService', ['execute']);

    adapter = new VehicleDataSourceAdapter(mockApiService, mockRequestCoordinator);
  });

  // ========== Constructor and Initialization ==========

  describe('Constructor and Initialization', () => {
    it('should create', () => {
      expect(adapter).toBeTruthy();
    });

    it('should initialize with empty modelsParam', () => {
      expect(adapter.getModels()).toBe('');
    });
  });

  // ========== fetch() Method ==========

  describe('fetch() Method', () => {
    it('should fetch vehicle details via RequestCoordinator', (done) => {
      const mockApiResponse = {
        results: mockVehicleResults,
        total: 2,
        totalPages: 1,
        query: { modelCombos: [] },
        page: 1,
        size: 20,
      };

      mockRequestCoordinator.execute.and.returnValue(of(mockApiResponse));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      adapter.fetch(params).subscribe((response) => {
        expect(response.results).toEqual(mockVehicleResults);
        expect(response.total).toBe(2);
        expect(response.page).toBe(1);
        expect(response.size).toBe(20);
        expect(response.totalPages).toBe(1); // ceil(2/20)
        done();
      });

      expect(mockRequestCoordinator.execute).toHaveBeenCalled();
    });

    it('should calculate totalPages correctly', (done) => {
      const mockApiResponse = {
        results: mockVehicleResults,
        total: 100,
        totalPages: 5,
        query: { modelCombos: [] },
        page: 1,
        size: 20,
      };

      mockRequestCoordinator.execute.and.returnValue(of(mockApiResponse));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      adapter.fetch(params).subscribe((response) => {
        expect(response.totalPages).toBe(5); // ceil(100/20)
        done();
      });
    });

    it('should pass modelsParam to API', (done) => {
      const mockApiResponse = {
        results: mockVehicleResults,
        total: 2,
        totalPages: 1,
        query: { modelCombos: [] },
        page: 1,
        size: 20,
      };

      mockRequestCoordinator.execute.and.callFake((key, fn) => fn());
      mockApiService.getVehicleDetails.and.returnValue(of(mockApiResponse));

      adapter.updateModels('Ford:F-150,Chevrolet:Corvette');

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      adapter.fetch(params).subscribe(() => {
        expect(mockApiService.getVehicleDetails).toHaveBeenCalledWith(
          'Ford:F-150,Chevrolet:Corvette',
          1,
          20,
          {},
          {},
          undefined,
          undefined
        );
        done();
      });
    });

    it('should pass filters to API', (done) => {
      const mockApiResponse = {
        results: mockVehicleResults,
        total: 2,
        totalPages: 1,
        query: { modelCombos: [] },
        page: 1,
        size: 20,
      };

      mockRequestCoordinator.execute.and.callFake((key, fn) => fn());
      mockApiService.getVehicleDetails.and.returnValue(of(mockApiResponse));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {
          manufacturer: 'Ford',
          yearMin: 2015,
          yearMax: 2020,
        },
      };

      adapter.fetch(params).subscribe(() => {
        expect(mockApiService.getVehicleDetails).toHaveBeenCalledWith(
          '',
          1,
          20,
          {
            manufacturer: 'Ford',
            yearMin: 2015,
            yearMax: 2020,
          },
          {},
          undefined,
          undefined
        );
        done();
      });
    });

    it('should pass sort parameters to API', (done) => {
      const mockApiResponse = {
        results: mockVehicleResults,
        total: 2,
        totalPages: 1,
        query: { modelCombos: [] },
        page: 1,
        size: 20,
      };

      mockRequestCoordinator.execute.and.callFake((key, fn) => fn());
      mockApiService.getVehicleDetails.and.returnValue(of(mockApiResponse));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
        sortBy: 'manufacturer',
        sortOrder: 'desc',
      };

      adapter.fetch(params).subscribe(() => {
        expect(mockApiService.getVehicleDetails).toHaveBeenCalledWith(
          '',
          1,
          20,
          {},
          {},
          'manufacturer',
          'desc'
        );
        done();
      });
    });

    it('should use RequestCoordinator with correct options', () => {
      const mockApiResponse = {
        results: mockVehicleResults,
        total: 2,
        totalPages: 1,
        query: { modelCombos: [] },
        page: 1,
        size: 20,
      };

      mockRequestCoordinator.execute.and.returnValue(of(mockApiResponse));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      adapter.fetch(params).subscribe();

      const executeCall = mockRequestCoordinator.execute.calls.mostRecent();
      const options = executeCall.args[2];

      expect(options).toBeDefined();
      expect(options?.cacheTime).toBe(30000);
      expect(options?.deduplication).toBe(true);
      expect(options?.retryAttempts).toBe(2);
      expect(options?.retryDelay).toBe(1000);
    });

    it('should handle empty modelsParam (returns all vehicles)', (done) => {
      const mockApiResponse = {
        results: mockVehicleResults,
        total: 4887,
        totalPages: 245,
        query: { modelCombos: [] },
        page: 1,
        size: 20,
      };

      mockRequestCoordinator.execute.and.callFake((key, fn) => fn());
      mockApiService.getVehicleDetails.and.returnValue(of(mockApiResponse));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      adapter.fetch(params).subscribe((response) => {
        expect(mockApiService.getVehicleDetails).toHaveBeenCalledWith(
          '', // Empty models param
          1,
          20,
          {},
          {},
          undefined,
          undefined
        );
        expect(response.total).toBe(4887);
        done();
      });
    });
  });

  // ========== Cache Key Generation ==========

  describe('Cache Key Generation', () => {
    it('should generate deterministic cache keys', () => {
      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: { manufacturer: 'Ford' },
      };

      mockRequestCoordinator.execute.and.returnValue(
        of({ results: [], total: 0, page: 1, size: 20 })
      );

      adapter.fetch(params).subscribe();

      const call1 = mockRequestCoordinator.execute.calls.mostRecent();
      const key1 = call1.args[0];

      // Fetch again with same params
      adapter.fetch(params).subscribe();

      const call2 = mockRequestCoordinator.execute.calls.mostRecent();
      const key2 = call2.args[0];

      expect(key1).toBe(key2); // Same params = same key
    });

    it('should generate different keys for different params', () => {
      mockRequestCoordinator.execute.and.returnValue(
        of({ results: [], total: 0, page: 1, size: 20 })
      );

      const params1: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      const params2: TableQueryParams = {
        page: 2,
        size: 20,
        filters: {},
      };

      adapter.fetch(params1).subscribe();
      const key1 = mockRequestCoordinator.execute.calls.mostRecent().args[0];

      adapter.fetch(params2).subscribe();
      const key2 = mockRequestCoordinator.execute.calls.mostRecent().args[0];

      expect(key1).not.toBe(key2);
    });

    it('should sort model combos for deterministic keys', () => {
      mockRequestCoordinator.execute.and.returnValue(
        of({ results: [], total: 0, page: 1, size: 20 })
      );

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      // Set models in different order
      adapter.updateModels('Chevrolet:Corvette,Ford:F-150');
      adapter.fetch(params).subscribe();
      const key1 = mockRequestCoordinator.execute.calls.mostRecent().args[0];

      adapter.updateModels('Ford:F-150,Chevrolet:Corvette');
      adapter.fetch(params).subscribe();
      const key2 = mockRequestCoordinator.execute.calls.mostRecent().args[0];

      expect(key1).toBe(key2); // Keys should be identical (sorted internally)
    });

    it('should include all filter types in cache key', () => {
      mockRequestCoordinator.execute.and.returnValue(
        of({ results: [], total: 0, page: 1, size: 20 })
      );

      const params1: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {
          manufacturer: 'Ford',
          model: 'F-150',
          yearMin: 2015,
          yearMax: 2020,
          bodyClass: 'Pickup',
          dataSource: 'NHTSA',
          manufacturerSearch: 'For',
          modelSearch: 'F-1',
          bodyClassSearch: 'Pick',
          dataSourceSearch: 'NHS',
        },
      };

      const params2: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {
          manufacturer: 'Ford',
          model: 'F-150',
          yearMin: 2015,
          yearMax: 2020,
          bodyClass: 'Pickup',
          dataSource: 'NHTSA',
          manufacturerSearch: 'For',
          modelSearch: 'F-1',
          bodyClassSearch: 'Pick',
          // Missing dataSourceSearch
        },
      };

      adapter.fetch(params1).subscribe();
      const key1 = mockRequestCoordinator.execute.calls.mostRecent().args[0];

      adapter.fetch(params2).subscribe();
      const key2 = mockRequestCoordinator.execute.calls.mostRecent().args[0];

      expect(key1).not.toBe(key2); // Different filters = different keys
    });

    it('should generate base64-encoded keys', () => {
      mockRequestCoordinator.execute.and.returnValue(
        of({ results: [], total: 0, page: 1, size: 20 })
      );

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      adapter.fetch(params).subscribe();

      const key = mockRequestCoordinator.execute.calls.mostRecent().args[0] as string;

      expect(key).toMatch(/^vehicle-details:[A-Za-z0-9+/=]+$/); // Base64 pattern
    });
  });

  // ========== updateModels() and getModels() ==========

  describe('updateModels() and getModels()', () => {
    it('should update models parameter', () => {
      adapter.updateModels('Ford:F-150');

      expect(adapter.getModels()).toBe('Ford:F-150');
    });

    it('should update models with multiple entries', () => {
      adapter.updateModels('Ford:F-150,Chevrolet:Corvette,Toyota:Camry');

      expect(adapter.getModels()).toBe('Ford:F-150,Chevrolet:Corvette,Toyota:Camry');
    });

    it('should clear models parameter', () => {
      adapter.updateModels('Ford:F-150');
      adapter.updateModels('');

      expect(adapter.getModels()).toBe('');
    });
  });

  // ========== Error Handling ==========

  describe('Error Handling', () => {
    it('should propagate errors from RequestCoordinator', (done) => {
      const error = new Error('Network error');
      mockRequestCoordinator.execute.and.returnValue(throwError(() => error));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      adapter.fetch(params).subscribe({
        next: () => fail('Should have errored'),
        error: (err) => {
          expect(err.message).toBe('Network error');
          done();
        },
      });
    });

    it('should propagate HTTP errors', (done) => {
      const httpError = { status: 500, statusText: 'Internal Server Error' };
      mockRequestCoordinator.execute.and.returnValue(throwError(() => httpError));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      adapter.fetch(params).subscribe({
        next: () => fail('Should have errored'),
        error: (err) => {
          expect(err.status).toBe(500);
          done();
        },
      });
    });
  });

  // ========== Edge Cases ==========

  describe('Edge Cases', () => {
    it('should handle undefined filters gracefully', (done) => {
      const mockApiResponse = {
        results: mockVehicleResults,
        total: 2,
        totalPages: 1,
        query: { modelCombos: [] },
        page: 1,
        size: 20,
      };

      mockRequestCoordinator.execute.and.callFake((key, fn) => fn());
      mockApiService.getVehicleDetails.and.returnValue(of(mockApiResponse));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        // filters: undefined (omitted)
      };

      adapter.fetch(params).subscribe((response) => {
        expect(mockApiService.getVehicleDetails).toHaveBeenCalledWith(
          '',
          1,
          20,
          {},
          {},
          undefined,
          undefined
        );
        done();
      });
    });

    it('should handle totalPages calculation with zero size', (done) => {
      const mockApiResponse = {
        results: [],
        total: 0,
        totalPages: 0,
        query: { modelCombos: [] },
        page: 1,
        size: 20,
      };

      mockRequestCoordinator.execute.and.returnValue(of(mockApiResponse));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      adapter.fetch(params).subscribe((response) => {
        expect(response.totalPages).toBe(0); // ceil(0/20)
        done();
      });
    });

    it('should handle fractional totalPages', (done) => {
      const mockApiResponse = {
        results: mockVehicleResults,
        total: 45,
        totalPages: 3,
        query: { modelCombos: [] },
        page: 1,
        size: 20,
      };

      mockRequestCoordinator.execute.and.returnValue(of(mockApiResponse));

      const params: TableQueryParams = {
        page: 1,
        size: 20,
        filters: {},
      };

      adapter.fetch(params).subscribe((response) => {
        expect(response.totalPages).toBe(3); // ceil(45/20) = 3
        done();
      });
    });
  });
});

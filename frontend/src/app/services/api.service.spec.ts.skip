import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding requests
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should use correct API URL from environment', () => {
      expect((service as any).apiUrl).toBe(environment.apiUrl);
    });
  });

  describe('getManufacturerModelCombinations', () => {
    it('should make GET request to correct endpoint', () => {
      service.getManufacturerModelCombinations().subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.includes('/manufacturer-model-combinations')
      );
      expect(req.request.method).toBe('GET');
      req.flush({ data: [] });
    });

    it('should include default pagination parameters', () => {
      service.getManufacturerModelCombinations().subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.includes('/manufacturer-model-combinations')
      );
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('size')).toBe('20');
      req.flush({ data: [] });
    });

    it('should include custom pagination parameters', () => {
      service.getManufacturerModelCombinations(3, 50).subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.includes('/manufacturer-model-combinations')
      );
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('size')).toBe('50');
      req.flush({ data: [] });
    });

    it('should include search parameter when provided', () => {
      service.getManufacturerModelCombinations(1, 20, 'ford').subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.includes('/manufacturer-model-combinations')
      );
      expect(req.request.params.get('search')).toBe('ford');
      req.flush({ data: [] });
    });

    it('should not include search parameter when empty', () => {
      service.getManufacturerModelCombinations(1, 20, '').subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.includes('/manufacturer-model-combinations')
      );
      expect(req.request.params.has('search')).toBe(false);
      req.flush({ data: [] });
    });

    it('should return manufacturer model data', (done) => {
      const mockData = {
        total: 1,
        page: 1,
        size: 20,
        totalPages: 1,
        data: [
          {
            manufacturer: 'Ford',
            count: 25000,
            models: [{ model: 'F-150', count: 25000 }],
          },
        ],
      };

      service.getManufacturerModelCombinations().subscribe((response) => {
        expect(response).toEqual(mockData);
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/manufacturer-model-combinations')
      );
      req.flush(mockData);
    });

    it('should handle HTTP errors', (done) => {
      service.getManufacturerModelCombinations().subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        },
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/manufacturer-model-combinations')
      );
      req.flush('Server error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getVehicleDetails', () => {
    it('should make GET request to correct endpoint', () => {
      service.getVehicleDetails('Ford:F-150').subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.method).toBe('GET');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should include required models parameter', () => {
      service.getVehicleDetails('Ford:F-150,Ford:Mustang').subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('models')).toBe('Ford:F-150,Ford:Mustang');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should include default pagination parameters', () => {
      service.getVehicleDetails('Ford:F-150').subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('size')).toBe('20');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should include custom pagination parameters', () => {
      service.getVehicleDetails('Ford:F-150', 3, 50).subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('size')).toBe('50');
      req.flush({ results: [], total: 0, page: 3, size: 50, totalPages: 2 });
    });

    it('should include manufacturer filter when provided', () => {
      service.getVehicleDetails('Ford:F-150', 1, 20, { manufacturer: 'Ford' }).subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('manufacturer')).toBe('Ford');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should include model filter when provided', () => {
      service.getVehicleDetails('Ford:F-150', 1, 20, { model: 'F-150' }).subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('model')).toBe('F-150');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should include year range filters when provided', () => {
      service.getVehicleDetails('Ford:F-150', 1, 20, { yearMin: 1965, yearMax: 1973 }).subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('yearMin')).toBe('1965');
      expect(req.request.params.get('yearMax')).toBe('1973');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should include bodyClass filter when provided', () => {
      service.getVehicleDetails('Ford:F-150', 1, 20, { bodyClass: 'Pickup' }).subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('bodyClass')).toBe('Pickup');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should include dataSource filter when provided', () => {
      service.getVehicleDetails('Ford:F-150', 1, 20, { dataSource: 'NHTSA' }).subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('dataSource')).toBe('NHTSA');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should include all filters when provided', () => {
      const filters = {
        manufacturer: 'Ford',
        model: 'Mustang',
        yearMin: 1965,
        yearMax: 1973,
        bodyClass: 'Coupe',
        dataSource: 'NHTSA',
      };

      service.getVehicleDetails('Ford:Mustang', 1, 20, filters).subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('manufacturer')).toBe('Ford');
      expect(req.request.params.get('model')).toBe('Mustang');
      expect(req.request.params.get('yearMin')).toBe('1965');
      expect(req.request.params.get('yearMax')).toBe('1973');
      expect(req.request.params.get('bodyClass')).toBe('Coupe');
      expect(req.request.params.get('dataSource')).toBe('NHTSA');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should not include undefined filter parameters', () => {
      const filters = {
        manufacturer: 'Ford',
        model: undefined,
      };

      service.getVehicleDetails('Ford:F-150', 1, 20, filters).subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.has('manufacturer')).toBe(true);
      expect(req.request.params.has('model')).toBe(false);
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should include sorting parameters when provided', () => {
      service.getVehicleDetails('Ford:F-150', 1, 20, undefined, 'year', 'desc').subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('sortBy')).toBe('year');
      expect(req.request.params.get('sortOrder')).toBe('desc');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should not include sorting when not provided', () => {
      service.getVehicleDetails('Ford:F-150').subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.has('sortBy')).toBe(false);
      expect(req.request.params.has('sortOrder')).toBe(false);
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should return vehicle details data', (done) => {
      const mockData = {
        total: 1,
        page: 1,
        size: 20,
        totalPages: 1,
        query: {
          modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        },
        results: [
          {
            vehicle_id: 'v1',
            manufacturer: 'Ford',
            model: 'F-150',
            year: 2020,
            body_class: 'Pickup',
            data_source: 'NHTSA',
            ingested_at: new Date().toISOString(),
          },
        ],
      };

      service.getVehicleDetails('Ford:F-150').subscribe((response) => {
        expect(response).toEqual(mockData);
        done();
      });

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      req.flush(mockData);
    });

    it('should handle HTTP errors', (done) => {
      service.getVehicleDetails('Ford:F-150').subscribe({
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        },
      });

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getVehicleInstances', () => {
    const vehicleId = 'abc123';

    it('should make GET request to correct endpoint with vehicle ID', () => {
      service.getVehicleInstances(vehicleId).subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.includes(`/vehicles/${vehicleId}/instances`)
      );
      expect(req.request.method).toBe('GET');
      req.flush({ instances: [] });
    });

    it('should include default count parameter', () => {
      service.getVehicleInstances(vehicleId).subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.includes(`/vehicles/${vehicleId}/instances`)
      );
      expect(req.request.params.get('count')).toBe('8');
      req.flush({ instances: [] });
    });

    it('should include custom count parameter', () => {
      service.getVehicleInstances(vehicleId, 20).subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.includes(`/vehicles/${vehicleId}/instances`)
      );
      expect(req.request.params.get('count')).toBe('20');
      req.flush({ instances: [] });
    });

    it('should return vehicle instances data', (done) => {
      const mockData = {
        vehicle_id: vehicleId,
        manufacturer: 'Ford',
        model: 'F-150',
        year: 2020,
        body_class: 'Pickup',
        instance_count: 1,
        instances: [
          {
            vin: 'ABC123DEF456GHI78',
            condition_rating: 9,
            condition_description: 'Excellent',
            mileage: 45000,
            mileage_verified: true,
            registered_state: 'CA',
            registration_status: 'Current',
            title_status: 'Clean',
            exterior_color: 'Blue',
            factory_options: ['Premium Package'],
            estimated_value: 28500,
            matching_numbers: true,
            last_service_date: '2020-06-15',
          },
        ],
      };

      service.getVehicleInstances(vehicleId).subscribe((response) => {
        expect(response).toEqual(mockData);
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes(`/vehicles/${vehicleId}/instances`)
      );
      req.flush(mockData);
    });

    it('should handle HTTP errors', (done) => {
      service.getVehicleInstances(vehicleId).subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        },
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes(`/vehicles/${vehicleId}/instances`)
      );
      req.flush('Server error', { status: 500, statusText: 'Server Error' });
    });

    it('should handle different vehicle IDs', () => {
      const vehicleId1 = 'abc123';
      const vehicleId2 = 'xyz789';

      service.getVehicleInstances(vehicleId1).subscribe();
      service.getVehicleInstances(vehicleId2).subscribe();

      const req1 = httpMock.expectOne((request) =>
        request.url.includes(`/vehicles/${vehicleId1}/instances`)
      );
      const req2 = httpMock.expectOne((request) =>
        request.url.includes(`/vehicles/${vehicleId2}/instances`)
      );

      expect(req1.request.url).toContain(vehicleId1);
      expect(req2.request.url).toContain(vehicleId2);

      req1.flush({ instances: [] });
      req2.flush({ instances: [] });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty models parameter', () => {
      service.getVehicleDetails('').subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('models')).toBe('');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });

    it('should handle zero page and size', () => {
      service.getManufacturerModelCombinations(0, 0).subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.includes('/manufacturer-model-combinations')
      );
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('0');
      req.flush({ data: [] });
    });

    it('should handle very large page numbers', () => {
      service.getVehicleDetails('Ford:F-150', 99999, 100).subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('page')).toBe('99999');
      expect(req.request.params.get('size')).toBe('100');
      req.flush({ results: [], total: 0, page: 99999, size: 100, totalPages: 0 });
    });

    it('should handle special characters in search', () => {
      service.getManufacturerModelCombinations(1, 20, 'Ford & Chevy').subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.includes('/manufacturer-model-combinations')
      );
      // URL encoding handled by HttpParams
      expect(req.request.params.get('search')).toBe('Ford & Chevy');
      req.flush({ data: [] });
    });

    it('should handle yearMin of 0', () => {
      service.getVehicleDetails('Ford:F-150', 1, 20, { yearMin: 0 }).subscribe();

      const req = httpMock.expectOne((request) => request.url.includes('/vehicles/details'));
      expect(req.request.params.get('yearMin')).toBe('0');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', () => {
      service.getManufacturerModelCombinations().subscribe();
      service.getVehicleDetails('Ford:F-150').subscribe();
      service.getVehicleInstances('abc123').subscribe();

      const requests = httpMock.match(() => true);
      expect(requests.length).toBe(3);

      requests[0].flush({ data: [] });
      requests[1].flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
      requests[2].flush({ instances: [] });
    });

    it('should handle same request multiple times', () => {
      service.getVehicleDetails('Ford:F-150').subscribe();
      service.getVehicleDetails('Ford:F-150').subscribe();

      const requests = httpMock.match((request) => request.url.includes('/vehicles/details'));
      expect(requests.length).toBe(2); // Should make 2 separate requests

      requests.forEach((req) => {
        req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
      });
    });
  });
});

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
    httpMock.verify(); // Ensure no outstanding HTTP requests
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('getManufacturerModelCombinations()', () => {
    it('should fetch manufacturer-model combinations with default parameters', () => {
      const mockResponse = {
        data: [{ manufacturer: "Ford", count: 1, models: [{ model: "F-150", count: 1 }] }],
        total: 1,
        page: 1,
        size: 20,
        totalPages: 1,
      };

      service.getManufacturerModelCombinations().subscribe((response) => {
        expect(response).toBe(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/manufacturer-model-combinations?page=1&size=20`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include search parameter when provided', () => {
      const mockResponse = { results: [], total: 0 };

      service.getManufacturerModelCombinations(1, 20, 'Ford').subscribe();

      const req = httpMock.expectOne(
        `${apiUrl}/manufacturer-model-combinations?page=1&size=20&search=Ford`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should use custom baseUrl when provided', () => {
      const customUrl = 'https://custom-api.com/api';
      const mockResponse = { results: [], total: 0 };

      service.getManufacturerModelCombinations(1, 20, '', customUrl).subscribe();

      const req = httpMock.expectOne(
        `${customUrl}/manufacturer-model-combinations?page=1&size=20`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle custom page and size', () => {
      const mockResponse = { results: [], total: 0 };

      service.getManufacturerModelCombinations(3, 50).subscribe();

      const req = httpMock.expectOne(
        `${apiUrl}/manufacturer-model-combinations?page=3&size=50`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getVehicleDetails()', () => {
    it('should fetch vehicle details with models parameter', () => {
      const mockResponse = {
        results: [],
        total: 0,
        page: 1,
        size: 20,
        totalPages: 0,
        query: { modelCombos: [] },
      };
      const models = 'Ford:F-150,Chevrolet:Corvette';

      service.getVehicleDetails(models).subscribe((response) => {
        expect(response).toBe(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/vehicles/details?page=1&size=20&models=${encodeURIComponent(models)}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should omit models parameter when empty string', () => {
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };

      service.getVehicleDetails('').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/vehicles/details?page=1&size=20`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include all field-specific search filters', () => {
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };
      const filters = {
        manufacturerSearch: 'Ford',
        modelSearch: 'F-150',
        bodyClassSearch: 'Pickup',
        dataSourceSearch: 'NHTSA',
      };

      service.getVehicleDetails('Ford:F-150', 1, 20, filters).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url.includes('/vehicles/details') &&
          request.params.has('manufacturerSearch') &&
          request.params.get('manufacturerSearch') === 'Ford' &&
          request.params.get('modelSearch') === 'F-150' &&
          request.params.get('bodyClassSearch') === 'Pickup' &&
          request.params.get('dataSourceSearch') === 'NHTSA'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include all Query Control filters', () => {
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };
      const filters = {
        manufacturer: 'Ford',
        model: 'Mustang',
        yearMin: 1965,
        yearMax: 1973,
        bodyClass: 'Coupe',
        dataSource: 'NHTSA',
      };

      service.getVehicleDetails('', 1, 20, filters).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url.includes('/vehicles/details') &&
          request.params.get('manufacturer') === 'Ford' &&
          request.params.get('model') === 'Mustang' &&
          request.params.get('yearMin') === '1965' &&
          request.params.get('yearMax') === '1973' &&
          request.params.get('bodyClass') === 'Coupe' &&
          request.params.get('dataSource') === 'NHTSA'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include highlight parameters', () => {
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };
      const highlights = {
        yearMin: 1960,
        yearMax: 1980,
        manufacturer: 'Ford',
        modelCombos: 'Ford:F-150',
        bodyClass: 'Pickup',
      };

      service.getVehicleDetails('Ford:F-150', 1, 20, undefined, highlights).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url.includes('/vehicles/details') &&
          request.params.get('h_yearMin') === '1960' &&
          request.params.get('h_yearMax') === '1980' &&
          request.params.get('h_manufacturer') === 'Ford' &&
          request.params.get('h_modelCombos') === 'Ford:F-150' &&
          request.params.get('h_bodyClass') === 'Pickup'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include sort parameters', () => {
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };

      service
        .getVehicleDetails('Ford:F-150', 1, 20, undefined, undefined, 'year', 'desc')
        .subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url.includes('/vehicles/details') &&
          request.params.get('sortBy') === 'year' &&
          request.params.get('sortOrder') === 'desc'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should use custom baseUrl when provided', () => {
      const customUrl = 'https://custom-api.com/api';
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };

      service
        .getVehicleDetails(
          'Ford:F-150',
          1,
          20,
          undefined,
          undefined,
          undefined,
          undefined,
          customUrl
        )
        .subscribe();

      const req = httpMock.expectOne(
        `${customUrl}/vehicles/details?page=1&size=20&models=Ford%3AF-150`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle yearMin and yearMax as 0', () => {
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };
      const filters = { yearMin: 0, yearMax: 0 };

      service.getVehicleDetails('', 1, 20, filters).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url.includes('/vehicles/details') &&
          request.params.get('yearMin') === '0' &&
          request.params.get('yearMax') === '0'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getVehicleInstances()', () => {
    it('should fetch vehicle instances with default count', () => {
      const mockResponse = {
        vehicle_id: 'abc123',
        manufacturer: 'Ford',
        model: 'F-150',
        year: 2020,
        body_class: 'Pickup',
        instance_count: 5000,
        instances: []
      };
      const vehicleId = 'abc123';

      service.getVehicleInstances(vehicleId).subscribe((response) => {
        expect(response).toBe(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/vehicles/${vehicleId}/instances?count=8`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should use custom count when provided', () => {
      const mockResponse = { vehicle_id: 'abc123', instances: [] };
      const vehicleId = 'abc123';

      service.getVehicleInstances(vehicleId, 25).subscribe();

      const req = httpMock.expectOne(
        `${apiUrl}/vehicles/${vehicleId}/instances?count=25`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should use custom baseUrl when provided', () => {
      const customUrl = 'https://custom-api.com/api';
      const mockResponse = { vehicle_id: 'abc123', instances: [] };
      const vehicleId = 'abc123';

      service.getVehicleInstances(vehicleId, 8, customUrl).subscribe();

      const req = httpMock.expectOne(
        `${customUrl}/vehicles/${vehicleId}/instances?count=8`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getAllVins()', () => {
    it('should fetch all VINs with default parameters', () => {
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };

      service.getAllVins().subscribe((response) => {
        expect(response).toBe(mockResponse);
      });

      const req = httpMock.expectOne(
        `${apiUrl}/vins?page=1&size=20&sortBy=vin&sortOrder=asc`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include all filter parameters', () => {
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };
      const filters = {
        manufacturer: 'Ford',
        model: 'F-150',
        yearMin: 2010,
        yearMax: 2020,
        bodyClass: 'Pickup',
        mileageMin: 10000,
        mileageMax: 50000,
        valueMin: 20000,
        valueMax: 40000,
        vin: '1FTFW1E',
        conditionDescription: 'Excellent',
        registeredState: 'CA',
        exteriorColor: 'Red',
      };

      service.getAllVins(1, 20, filters).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url.includes('/vins') &&
          request.params.get('manufacturer') === 'Ford' &&
          request.params.get('model') === 'F-150' &&
          request.params.get('yearMin') === '2010' &&
          request.params.get('yearMax') === '2020' &&
          request.params.get('bodyClass') === 'Pickup' &&
          request.params.get('mileageMin') === '10000' &&
          request.params.get('mileageMax') === '50000' &&
          request.params.get('valueMin') === '20000' &&
          request.params.get('valueMax') === '40000' &&
          request.params.get('vin') === '1FTFW1E' &&
          request.params.get('conditionDescription') === 'Excellent' &&
          request.params.get('registeredState') === 'CA' &&
          request.params.get('exteriorColor') === 'Red'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should use custom sort parameters', () => {
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };

      service.getAllVins(1, 20, undefined, 'year', 'desc').subscribe();

      const req = httpMock.expectOne(
        `${apiUrl}/vins?page=1&size=20&sortBy=year&sortOrder=desc`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should use custom baseUrl when provided', () => {
      const customUrl = 'https://custom-api.com/api';
      const mockResponse = { results: [], total: 0, page: 1, size: 20 };

      service.getAllVins(1, 20, undefined, 'vin', 'asc', customUrl).subscribe();

      const req = httpMock.expectOne(
        `${customUrl}/vins?page=1&size=20&sortBy=vin&sortOrder=asc`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getFilterOptions()', () => {
    it('should fetch filter options without parameters', () => {
      const mockResponse = { data: [] };
      const fieldName = 'manufacturers';

      service.getFilterOptions(fieldName).subscribe((response) => {
        expect(response).toBe(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/filters/${fieldName}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include search parameter when provided', () => {
      const mockResponse = { data: [] };

      service.getFilterOptions('manufacturers', 'Ford').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/filters/manufacturers?search=Ford`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include limit parameter when provided', () => {
      const mockResponse = { data: [] };

      service.getFilterOptions('manufacturers', undefined, 500).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/filters/manufacturers?limit=500`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include both search and limit parameters', () => {
      const mockResponse = { data: [] };

      service.getFilterOptions('models', 'Mustang', 100).subscribe();

      const req = httpMock.expectOne(
        `${apiUrl}/filters/models?search=Mustang&limit=100`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('Convenience Methods', () => {
    describe('getDistinctManufacturers()', () => {
      it('should fetch distinct manufacturers', () => {
        const mockResponse = { manufacturers: ['Ford', 'Chevrolet'] };

        service.getDistinctManufacturers().subscribe((response) => {
          expect(response).toBe(mockResponse);
        });

        const req = httpMock.expectOne(`${apiUrl}/filters/manufacturers`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
      });

      it('should pass search parameter to getFilterOptions', () => {
        const mockResponse = { manufacturers: ['Ford'] };

        service.getDistinctManufacturers('Ford').subscribe();

        const req = httpMock.expectOne(`${apiUrl}/filters/manufacturers?search=Ford`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
      });

      it('should pass limit parameter to getFilterOptions', () => {
        const mockResponse = { manufacturers: [] };

        service.getDistinctManufacturers(undefined, 50).subscribe();

        const req = httpMock.expectOne(`${apiUrl}/filters/manufacturers?limit=50`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
      });
    });

    describe('getDistinctModels()', () => {
      it('should fetch distinct models', () => {
        const mockResponse = { models: ['F-150', 'Mustang'] };

        service.getDistinctModels().subscribe((response) => {
          expect(response).toBe(mockResponse);
        });

        const req = httpMock.expectOne(`${apiUrl}/filters/models`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
      });

      it('should pass search parameter to getFilterOptions', () => {
        const mockResponse = { models: ['Mustang'] };

        service.getDistinctModels('Mustang').subscribe();

        const req = httpMock.expectOne(`${apiUrl}/filters/models?search=Mustang`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
      });
    });

    describe('getDistinctBodyClasses()', () => {
      it('should fetch distinct body classes', () => {
        const mockResponse = { body_classes: ['Pickup', 'Sedan', 'SUV'] };

        service.getDistinctBodyClasses().subscribe((response) => {
          expect(response).toBe(mockResponse);
        });

        const req = httpMock.expectOne(`${apiUrl}/filters/body-classes`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
      });
    });

    describe('getDistinctDataSources()', () => {
      it('should fetch distinct data sources', () => {
        const mockResponse = { data_sources: ['NHTSA', 'EPA'] };

        service.getDistinctDataSources().subscribe((response) => {
          expect(response).toBe(mockResponse);
        });

        const req = httpMock.expectOne(`${apiUrl}/filters/data-sources`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
      });
    });

    describe('getYearRange()', () => {
      it('should fetch year range', () => {
        const mockResponse = { min: 1920, max: 2024 };

        service.getYearRange().subscribe((response) => {
          expect(response).toBe(mockResponse);
        });

        const req = httpMock.expectOne(`${apiUrl}/filters/year-range`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate HTTP errors from getManufacturerModelCombinations', () => {
      const errorMessage = 'Server error';

      service.getManufacturerModelCombinations().subscribe({
        next: () => fail('should have failed with 500 error'),
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne(
        `${apiUrl}/manufacturer-model-combinations?page=1&size=20`
      );
      req.flush(errorMessage, { status: 500, statusText: 'Server Error' });
    });

    it('should propagate HTTP errors from getVehicleDetails', () => {
      service.getVehicleDetails('Ford:F-150').subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/vehicles/details')
      );
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('should propagate HTTP errors from getVehicleInstances', () => {
      service.getVehicleInstances('invalid-id').subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/vehicles/invalid-id/instances')
      );
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });
});

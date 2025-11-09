import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { RouteStateService } from './route-state.service';
import { SearchFilters } from '../../models/search-filters.model';
import { BehaviorSubject } from 'rxjs';

describe('RouteStateService - URL-First State Management', () => {
  let service: RouteStateService;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let queryParamsSubject: BehaviorSubject<Params>;

  beforeEach(() => {
    // Create query params subject
    queryParamsSubject = new BehaviorSubject<Params>({});

    // Create mock router
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    // Create mock activated route
    mockActivatedRoute = {
      snapshot: {
        queryParams: {},
      },
      queryParams: queryParamsSubject.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        RouteStateService,
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    service = TestBed.inject(RouteStateService);
  });

  describe('Initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize queryParams$ observable', (done) => {
      service.queryParams$.subscribe((params) => {
        expect(params).toEqual({});
        done();
      });
    });

    it('should emit initial query params from route', (done) => {
      const initialParams = { page: '1', models: 'Ford:F-150' };
      mockActivatedRoute.snapshot.queryParams = initialParams;
      queryParamsSubject.next(initialParams);

      service.queryParams$.subscribe((params) => {
        expect(params).toEqual(initialParams);
        done();
      });
    });
  });

  describe('Reading URL Parameters', () => {
    beforeEach(() => {
      const params = {
        models: 'Ford:F-150,Chevrolet:Corvette',
        page: '2',
        size: '50',
        yearMin: '1960',
        yearMax: '1980',
      };
      mockActivatedRoute.snapshot.queryParams = params;
      queryParamsSubject.next(params); // Emit to observable so watchParam gets initial value
    });

    it('should get current params synchronously', () => {
      const params = service.getCurrentParams();
      expect(params['models']).toBe('Ford:F-150,Chevrolet:Corvette');
      expect(params['page']).toBe('2');
    });

    it('should get single param by key', () => {
      const models = service.getParam('models');
      expect(models).toBe('Ford:F-150,Chevrolet:Corvette');
    });

    it('should return null for non-existent param', () => {
      const missing = service.getParam('nonExistent');
      expect(missing).toBeNull();
    });

    it('should watch specific param changes', (done) => {
      const values: (string | null)[] = [];

      service.watchParam('page').subscribe((value) => {
        values.push(value);
        if (values.length === 3) {
          expect(values).toEqual(['2', '3', null]);
          done();
        }
      });

      // Emit changes
      queryParamsSubject.next({ ...mockActivatedRoute.snapshot.queryParams, page: '3' });
      mockActivatedRoute.snapshot.queryParams.page = '3';

      setTimeout(() => {
        queryParamsSubject.next({ models: 'Ford:F-150' }); // page removed
        mockActivatedRoute.snapshot.queryParams = { models: 'Ford:F-150' };
      }, 10);
    });

    it('should emit distinct values only when watching param', (done) => {
      const values: string[] = [];

      service.watchParam('page').subscribe((value) => {
        if (value) values.push(value);
      });

      queryParamsSubject.next({ page: '1' });
      queryParamsSubject.next({ page: '1' }); // Duplicate
      queryParamsSubject.next({ page: '2' });

      setTimeout(() => {
        expect(values).toEqual(['2', '1', '2']); // Initial '2' from beforeEach, then '1', then '2' (duplicate '1' filtered by distinctUntilChanged)
        done();
      }, 50);
    });
  });

  describe('Writing URL Parameters', () => {
    it('should update params (merge mode)', () => {
      mockActivatedRoute.snapshot.queryParams = { page: '1', size: '20' };

      service.updateParams({ page: '2' });

      expect(mockRouter.navigate).toHaveBeenCalledWith([], {
        relativeTo: mockActivatedRoute,
        queryParams: { page: '2' },
        queryParamsHandling: 'merge',
        replaceUrl: false,
      });
    });

    it('should set params (replace mode)', () => {
      mockActivatedRoute.snapshot.queryParams = { page: '1', size: '20' };

      service.setParams({ models: 'Ford:F-150' });

      expect(mockRouter.navigate).toHaveBeenCalledWith([], {
        relativeTo: mockActivatedRoute,
        queryParams: { models: 'Ford:F-150' },
        queryParamsHandling: '',
        replaceUrl: false,
      });
    });

    it('should support replaceUrl option', () => {
      service.updateParams({ page: '3' }, true);

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({ replaceUrl: true })
      );
    });

    it('should remove specific param', () => {
      mockActivatedRoute.snapshot.queryParams = {
        page: '1',
        size: '20',
        models: 'Ford:F-150',
      };

      service.removeParam('models');

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({
          queryParams: jasmine.objectContaining({
            page: '1',
            size: '20',
          }),
        })
      );
    });

    it('should clear all params', () => {
      mockActivatedRoute.snapshot.queryParams = {
        page: '1',
        models: 'Ford:F-150',
      };

      service.clearAllParams();

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({
          queryParams: {},
          replaceUrl: true,
        })
      );
    });
  });

  describe('URL-First Principle: Filters to Params Conversion', () => {
    it('should convert model combinations to URL format', () => {
      const filters = {
        modelCombos: [
          { manufacturer: 'Ford', model: 'F-150' },
          { manufacturer: 'Chevrolet', model: 'Corvette' },
        ],
      };

      const params = service.filtersToParams(filters);

      expect(params['models']).toBe('Ford:F-150,Chevrolet:Corvette');
    });

    it('should convert column filters to params', () => {
      const filters = {
        manufacturer: 'Ford',
        model: 'Mustang',
        bodyClass: 'Coupe',
        dataSource: 'NHTSA',
      };

      const params = service.filtersToParams(filters);

      expect(params['manufacturer']).toBe('Ford');
      expect(params['model']).toBe('Mustang');
      expect(params['bodyClass']).toBe('Coupe');
      expect(params['dataSource']).toBe('NHTSA');
    });

    it('should convert year range to params', () => {
      const filters = {
        yearMin: 1960,
        yearMax: 1980,
      };

      const params = service.filtersToParams(filters);

      expect(params['yearMin']).toBe('1960');
      expect(params['yearMax']).toBe('1980');
    });

    it('should convert pagination to params', () => {
      const filters = {
        page: 3,
        size: 50,
      };

      const params = service.filtersToParams(filters);

      expect(params['page']).toBe('3');
      expect(params['size']).toBe('50');
    });

    it('should convert sorting to params', () => {
      const filters = {
        sort: 'year',
        sortDirection: 'desc' as 'asc' | 'desc',
      };

      const params = service.filtersToParams(filters);

      expect(params['sort']).toBe('year');
      expect(params['sortDirection']).toBe('desc');
    });

    it('should handle text search', () => {
      const filters = {
        q: 'sports car',
      };

      const params = service.filtersToParams(filters);

      expect(params['q']).toBe('sports car');
    });

    it('should handle complex filter combination', () => {
      const filters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'Mustang' }],
        yearMin: 1965,
        yearMax: 1970,
        bodyClass: 'Coupe',
        page: 2,
        size: 20,
        sort: 'year',
        sortDirection: 'asc' as 'asc' | 'desc',
      };

      const params = service.filtersToParams(filters);

      expect(params['models']).toBe('Ford:Mustang');
      expect(params['yearMin']).toBe('1965');
      expect(params['yearMax']).toBe('1970');
      expect(params['bodyClass']).toBe('Coupe');
      expect(params['page']).toBe('2');
      expect(params['size']).toBe('20');
      expect(params['sort']).toBe('year');
      expect(params['sortDirection']).toBe('asc');
    });

    it('should omit undefined/null values', () => {
      const filters: SearchFilters = {
        page: 1,
      };

      const params = service.filtersToParams(filters);

      expect(params['models']).toBeUndefined();
      expect(params['yearMin']).toBeUndefined();
      expect(params['page']).toBe('1');
    });
  });

  describe('URL-First Principle: Params to Filters Conversion', () => {
    it('should parse model combinations from URL', () => {
      const params = {
        models: 'Ford:F-150,Chevrolet:Corvette,Ford:Mustang',
      };

      const filters = service.paramsToFilters(params);

      expect(filters.modelCombos).toEqual([
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Chevrolet', model: 'Corvette' },
        { manufacturer: 'Ford', model: 'Mustang' },
      ]);
    });

    it('should parse column filters from URL', () => {
      const params = {
        manufacturer: 'Ford',
        model: 'Mustang',
        bodyClass: 'Coupe',
        dataSource: 'NHTSA',
      };

      const filters = service.paramsToFilters(params);

      expect(filters.manufacturer).toBe('Ford');
      expect(filters.model).toBe('Mustang');
      expect(filters.bodyClass).toBe('Coupe');
      expect(filters.dataSource).toBe('NHTSA');
    });

    it('should parse year range from URL', () => {
      const params = {
        yearMin: '1960',
        yearMax: '1980',
      };

      const filters = service.paramsToFilters(params);

      expect(filters.yearMin).toBe(1960);
      expect(filters.yearMax).toBe(1980);
    });

    it('should parse pagination from URL', () => {
      const params = {
        page: '5',
        size: '100',
      };

      const filters = service.paramsToFilters(params);

      expect(filters.page).toBe(5);
      expect(filters.size).toBe(100);
    });

    it('should parse sorting from URL', () => {
      const params = {
        sort: 'manufacturer',
        sortDirection: 'desc',
      };

      const filters = service.paramsToFilters(params);

      expect(filters.sort).toBe('manufacturer');
      expect(filters.sortDirection).toBe('desc');
    });

    it('should parse text search from URL', () => {
      const params = {
        q: 'vintage car',
      };

      const filters = service.paramsToFilters(params);

      expect(filters.q).toBe('vintage car');
    });

    it('should handle empty params', () => {
      const params = {};

      const filters = service.paramsToFilters(params);

      // Even with empty params, pagination defaults are added for consistent cache keys
      expect(filters).toEqual({ page: 1, size: 20 });
    });
  });

  describe('URL-First Principle: Round-Trip Conversion (Idempotency)', () => {
    it('should maintain data integrity through filters→params→filters', () => {
      const originalFilters = {
        modelCombos: [
          { manufacturer: 'Ford', model: 'F-150' },
          { manufacturer: 'Chevrolet', model: 'Corvette' },
        ],
        yearMin: 1960,
        yearMax: 1980,
        bodyClass: 'Pickup',
        page: 3,
        size: 50,
        sort: 'year',
        sortDirection: 'desc' as 'asc' | 'desc',
      };

      // Convert to params and back
      const params = service.filtersToParams(originalFilters);
      const reconstructedFilters = service.paramsToFilters(params);

      expect(reconstructedFilters).toEqual(originalFilters);
    });

    it('should maintain data integrity through params→filters→params', () => {
      const originalParams = {
        models: 'Ford:F-150,Chevrolet:Corvette',
        yearMin: '1960',
        yearMax: '1980',
        page: '2',
        size: '20',
        sort: 'year',
        sortDirection: 'asc',
      };

      // Convert to filters and back
      const filters = service.paramsToFilters(originalParams);
      const reconstructedParams = service.filtersToParams(filters);

      expect(reconstructedParams).toEqual(originalParams);
    });
  });

  describe('URL-First Principle: Shareable URLs', () => {
    it('should create bookmarkable URL from search state', () => {
      const filters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'Mustang' }],
        yearMin: 1965,
        yearMax: 1973,
        bodyClass: 'Coupe',
        page: 1,
        size: 20,
      };

      const params = service.filtersToParams(filters);

      // This URL should be shareable/bookmarkable
      expect(params['models']).toBe('Ford:Mustang');
      expect(params['yearMin']).toBe('1965');
      expect(params['yearMax']).toBe('1973');
      expect(params['bodyClass']).toBe('Coupe');
      expect(params['page']).toBe('1');
      expect(params['size']).toBe('20');
    });

    it('should reconstruct exact state from shared URL', () => {
      // Simulate user pasting this URL
      const sharedUrlParams = {
        models: 'Ford:Mustang,Chevrolet:Camaro',
        yearMin: '1965',
        yearMax: '1973',
        bodyClass: 'Coupe',
        page: '2',
        size: '50',
        sort: 'year',
        sortDirection: 'desc',
      };

      const filters = service.paramsToFilters(sharedUrlParams);

      // User should see exact same data as person who shared the URL
      expect(filters.modelCombos).toEqual([
        { manufacturer: 'Ford', model: 'Mustang' },
        { manufacturer: 'Chevrolet', model: 'Camaro' },
      ]);
      expect(filters.yearMin).toBe(1965);
      expect(filters.yearMax).toBe(1973);
      expect(filters.bodyClass).toBe('Coupe');
      expect(filters.page).toBe(2);
      expect(filters.size).toBe(50);
      expect(filters.sort).toBe('year');
      expect(filters.sortDirection).toBe('desc');
    });
  });

  describe('URL-First Principle: Browser Navigation Support', () => {
    it('should emit new params when user clicks back button', (done) => {
      const history: Params[] = [];

      service.queryParams$.subscribe((params) => {
        history.push(params);
      });

      // Simulate navigation history
      queryParamsSubject.next({ page: '1' });
      queryParamsSubject.next({ page: '2' });
      queryParamsSubject.next({ page: '3' });

      // Simulate back button (browser restores previous URL)
      queryParamsSubject.next({ page: '2' });

      setTimeout(() => {
        expect(history.length).toBeGreaterThan(3);
        expect(history[history.length - 1]).toEqual({ page: '2' });
        done();
      }, 50);
    });
  });
});

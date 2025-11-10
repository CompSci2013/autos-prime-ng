import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ManufacturerModelResponse, VehicleDetailsResponse, VehicleInstancesResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getManufacturerModelCombinations(
    page: number = 1,
    size: number = 20,
    search: string = '',
    baseUrl?: string
  ): Observable<ManufacturerModelResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) {
      params = params.set('search', search);
    }

    const apiBase = baseUrl || this.apiUrl;
    return this.http.get<ManufacturerModelResponse>(
      `${apiBase}/manufacturer-model-combinations`,
      { params }
    );
  }

  getVehicleDetails(
    models: string,
    page: number = 1,
    size: number = 20,
    filters?: {
      // Pattern 2: Field-specific search parameters (table column filters - partial matching)
      manufacturerSearch?: string;
      modelSearch?: string;
      bodyClassSearch?: string;
      dataSourceSearch?: string;
      // Query Control selections (exact matching)
      manufacturer?: string;
      model?: string;
      yearMin?: number;
      yearMax?: number;
      bodyClass?: string;
      dataSource?: string;
    },
    highlights?: {
      // Highlight parameters for segmented statistics
      yearMin?: number;
      yearMax?: number;
      manufacturer?: string;
      modelCombos?: string;
      bodyClass?: string;
    },
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    baseUrl?: string
  ): Observable<VehicleDetailsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    // Only set models param if not empty (empty = return all vehicles)
    if (models && models.trim() !== '') {
      params = params.set('models', models);
    }

    // Add filter parameters if provided
    if (filters) {
      // Pattern 2: Field-specific search parameters (table column filters - partial matching)
      if (filters.manufacturerSearch) {
        params = params.set('manufacturerSearch', filters.manufacturerSearch);
      }
      if (filters.modelSearch) {
        params = params.set('modelSearch', filters.modelSearch);
      }
      if (filters.bodyClassSearch) {
        params = params.set('bodyClassSearch', filters.bodyClassSearch);
      }
      if (filters.dataSourceSearch) {
        params = params.set('dataSourceSearch', filters.dataSourceSearch);
      }

      // Query Control filters (exact matching)
      if (filters.manufacturer) {
        params = params.set('manufacturer', filters.manufacturer);
      }
      if (filters.model) {
        params = params.set('model', filters.model);
      }
      if (filters.yearMin !== undefined) {
        params = params.set('yearMin', filters.yearMin.toString());
      }
      if (filters.yearMax !== undefined) {
        params = params.set('yearMax', filters.yearMax.toString());
      }
      if (filters.bodyClass) {
        params = params.set('bodyClass', filters.bodyClass);
      }
      if (filters.dataSource) {
        params = params.set('dataSource', filters.dataSource);
      }
    }

    // Add highlight parameters if provided (for segmented statistics)
    if (highlights) {
      if (highlights.yearMin !== undefined) {
        params = params.set('h_yearMin', highlights.yearMin.toString());
      }
      if (highlights.yearMax !== undefined) {
        params = params.set('h_yearMax', highlights.yearMax.toString());
      }
      if (highlights.manufacturer) {
        params = params.set('h_manufacturer', highlights.manufacturer);
      }
      if (highlights.modelCombos) {
        params = params.set('h_modelCombos', highlights.modelCombos);
      }
      if (highlights.bodyClass) {
        params = params.set('h_bodyClass', highlights.bodyClass);
      }
    }

    // Add sort parameters if provided
    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }
    if (sortOrder) {
      params = params.set('sortOrder', sortOrder);
    }

    const apiBase = baseUrl || this.apiUrl;
    return this.http.get<VehicleDetailsResponse>(
      `${apiBase}/vehicles/details`,
      { params }
    );
  }

  getVehicleInstances(
    vehicleId: string,
    count: number = 8,
    baseUrl?: string
  ): Observable<VehicleInstancesResponse> {
    let params = new HttpParams().set('count', count.toString());

    const apiBase = baseUrl || this.apiUrl;
    return this.http.get<VehicleInstancesResponse>(
      `${apiBase}/vehicles/${vehicleId}/instances`,
      { params }
    );
  }

  /**
   * Get all VINs with filtering and pagination
   *
   * @param page - Page number (1-indexed)
   * @param size - Results per page
   * @param filters - Optional filters (manufacturer, model, yearMin/Max, bodyClass, mileageMin/Max, valueMin/Max)
   * @param sortBy - Field to sort by (default: vin)
   * @param sortOrder - Sort order (asc/desc, default: asc)
   */
  getAllVins(
    page: number = 1,
    size: number = 20,
    filters?: {
      manufacturer?: string;
      model?: string;
      yearMin?: number;
      yearMax?: number;
      bodyClass?: string;
      mileageMin?: number;
      mileageMax?: number;
      valueMin?: number;
      valueMax?: number;
      vin?: string;
      conditionDescription?: string;
      registeredState?: string;
      exteriorColor?: string;
    },
    sortBy: string = 'vin',
    sortOrder: 'asc' | 'desc' = 'asc',
    baseUrl?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    if (filters) {
      if (filters.manufacturer) params = params.set('manufacturer', filters.manufacturer);
      if (filters.model) params = params.set('model', filters.model);
      if (filters.yearMin) params = params.set('yearMin', filters.yearMin.toString());
      if (filters.yearMax) params = params.set('yearMax', filters.yearMax.toString());
      if (filters.bodyClass) params = params.set('bodyClass', filters.bodyClass);
      if (filters.mileageMin) params = params.set('mileageMin', filters.mileageMin.toString());
      if (filters.mileageMax) params = params.set('mileageMax', filters.mileageMax.toString());
      if (filters.valueMin) params = params.set('valueMin', filters.valueMin.toString());
      if (filters.valueMax) params = params.set('valueMax', filters.valueMax.toString());
      if (filters.vin) params = params.set('vin', filters.vin);
      if (filters.conditionDescription) params = params.set('conditionDescription', filters.conditionDescription);
      if (filters.registeredState) params = params.set('registeredState', filters.registeredState);
      if (filters.exteriorColor) params = params.set('exteriorColor', filters.exteriorColor);
    }

    const apiBase = baseUrl || this.apiUrl;
    return this.http.get<any>(`${apiBase}/vins`, { params });
  }

  // ========== FILTER ENDPOINTS ==========

  /**
   * Unified filter options endpoint
   * @param fieldName - 'manufacturers', 'models', 'body-classes', 'data-sources', or 'year-range'
   * @param search - Optional search term for filtering (currently supported for manufacturers)
   * @param limit - Optional limit for number of results (default: 1000)
   * @returns Observable with field-specific response format
   */
  getFilterOptions(fieldName: string, search?: string, limit?: number): Observable<any> {
    let params = new HttpParams();

    if (search) {
      params = params.set('search', search);
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<any>(
      `${this.apiUrl}/filters/${fieldName}`,
      { params: params }
    );
  }

  /**
   * Convenience method: Get distinct manufacturers
   * @param search - Optional search term for filtering manufacturers
   * @param limit - Optional limit for number of results (default: 1000)
   */
  getDistinctManufacturers(search?: string, limit?: number): Observable<{ manufacturers: string[] }> {
    return this.getFilterOptions('manufacturers', search, limit);
  }

  /**
   * Convenience method: Get distinct models
   * @param search - Optional search term for filtering models
   * @param limit - Optional limit for number of results (default: 1000)
   */
  getDistinctModels(search?: string, limit?: number): Observable<{ models: string[] }> {
    return this.getFilterOptions('models', search, limit);
  }

  /**
   * Convenience method: Get distinct body classes
   */
  getDistinctBodyClasses(): Observable<{ body_classes: string[] }> {
    return this.getFilterOptions('body-classes');
  }

  /**
   * Convenience method: Get distinct data sources
   */
  getDistinctDataSources(): Observable<{ data_sources: string[] }> {
    return this.getFilterOptions('data-sources');
  }

  /**
   * Convenience method: Get year range
   */
  getYearRange(): Observable<{ min: number; max: number }> {
    return this.getFilterOptions('year-range');
  }
}

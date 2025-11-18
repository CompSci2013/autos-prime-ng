/**
 * Vehicle-specific adapters for ResourceManagementService
 *
 * These adapters allow the generic ResourceManagementService to work
 * with the vehicle domain (SearchFilters, VehicleDetails, etc.)
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Params } from '@angular/router';
import { ApiService } from '../../services/api.service';
import {
  SearchFilters,
  HighlightFilters,
} from '../../models/search-filters.model';
import { ManufacturerModelSelection, VehicleDetailsResponse } from '../../models';
import {
  ApiAdapter,
  ApiResponse,
  CacheKeyBuilder,
  FilterUrlMapper,
} from './resource-management.types';

/**
 * Vehicle API Adapter
 * Translates generic API calls to vehicle-specific API service calls
 */
@Injectable({
  providedIn: 'root',
})
export class VehicleApiAdapter
  implements ApiAdapter<SearchFilters, any>
{
  constructor(private apiService: ApiService) {}

  /**
   * Fetch vehicle data based on filters
   */
  fetchData(
    filters: SearchFilters,
    highlights?: HighlightFilters
  ): Observable<ApiResponse<any>> {
    // Build models param (empty string if no models selected)
    const modelsParam =
      filters.modelCombos && filters.modelCombos.length > 0
        ? this.buildModelsParam(filters.modelCombos)
        : '';

    // Build filter params for API
    const filterParams = this.buildFilterParams(filters);

    // Call API service
    return this.apiService
      .getVehicleDetails(
        modelsParam,
        filters.page || 1,
        filters.size || 20,
        filterParams,
        highlights || {},
        filters.sort,
        filters.sortDirection
      )
      .pipe(
        map((response: VehicleDetailsResponse) => ({
          results: response.results,
          total: response.total,
          statistics: response.statistics,
        }))
      );
  }

  /**
   * Fetch manufacturer-model combinations
   */
  fetchRelatedData(page: number = 1, size: number = 1000): Observable<any> {
    return this.apiService.getManufacturerModelCombinations(page, size);
  }

  /**
   * Fetch vehicle instances (VINs)
   */
  fetchInstances(vehicleId: string, count: number = 8): Observable<any> {
    return this.apiService.getVehicleInstances(vehicleId, count);
  }

  // ========== PRIVATE HELPERS ==========

  /**
   * Build models parameter string for API
   * Format: "Ford:F-150,Ford:Mustang,Chevrolet:Corvette"
   */
  private buildModelsParam(modelCombos: ManufacturerModelSelection[]): string {
    return modelCombos.map((c) => `${c.manufacturer}:${c.model}`).join(',');
  }

  /**
   * Build filter parameters object for API
   */
  private buildFilterParams(filters: SearchFilters): any {
    const params: any = {};

    // Field-specific search parameters (partial matching)
    if (filters.manufacturerSearch) {
      params.manufacturerSearch = filters.manufacturerSearch;
    }
    if (filters.modelSearch) {
      params.modelSearch = filters.modelSearch;
    }
    if (filters.bodyClassSearch) {
      params.bodyClassSearch = filters.bodyClassSearch;
    }
    if (filters.dataSourceSearch) {
      params.dataSourceSearch = filters.dataSourceSearch;
    }

    // Column filters (exact matching)
    if (filters.manufacturer) {
      params.manufacturer = filters.manufacturer;
    }
    if (filters.model) {
      params.model = filters.model;
    }
    if (filters.bodyClass) {
      params.bodyClass = filters.bodyClass;
    }
    if (filters.dataSource) {
      params.dataSource = filters.dataSource;
    }

    // Year range filters
    if (filters.yearMin !== undefined && filters.yearMin !== null) {
      params.yearMin = filters.yearMin;
    }
    if (filters.yearMax !== undefined && filters.yearMax !== null) {
      params.yearMax = filters.yearMax;
    }

    // Other filters
    if (filters.bodyStyle) {
      params.bodyStyle = filters.bodyStyle;
    }
    if (filters.q) {
      params.q = filters.q;
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }
}

/**
 * Vehicle Cache Key Builder
 * Builds deterministic cache keys for request deduplication
 */
@Injectable({
  providedIn: 'root',
})
export class VehicleCacheKeyBuilder
  implements CacheKeyBuilder<SearchFilters>
{
  /**
   * Build unique cache key from filter state AND highlights
   */
  buildKey(
    prefix: string,
    filters: SearchFilters,
    highlights: HighlightFilters = {}
  ): string {
    // Create deterministic key from filters AND highlights
    const filterString = JSON.stringify({
      modelCombos: filters.modelCombos?.sort((a, b) =>
        `${a.manufacturer}:${a.model}`.localeCompare(
          `${b.manufacturer}:${b.model}`
        )
      ),
      page: filters.page,
      size: filters.size,
      sort: filters.sort,
      sortDirection: filters.sortDirection,
      yearMin: filters.yearMin,
      yearMax: filters.yearMax,
      bodyStyle: filters.bodyStyle,
      q: filters.q,
      // Field-specific search parameters
      manufacturerSearch: filters.manufacturerSearch,
      modelSearch: filters.modelSearch,
      bodyClassSearch: filters.bodyClassSearch,
      dataSourceSearch: filters.dataSourceSearch,
      // Column filters
      manufacturer: filters.manufacturer,
      model: filters.model,
      bodyClass: filters.bodyClass,
      dataSource: filters.dataSource,
      // Highlights
      h_yearMin: highlights.yearMin,
      h_yearMax: highlights.yearMax,
      h_manufacturer: highlights.manufacturer,
      h_modelCombos: highlights.modelCombos,
      h_bodyClass: highlights.bodyClass,
    });

    // Use encodeURIComponent for URL-safe key (supports Unicode)
    return `${prefix}:${encodeURIComponent(filterString)}`;
  }
}

/**
 * Vehicle Filter URL Mapper
 * Converts between vehicle SearchFilters and URL parameters
 */
@Injectable({
  providedIn: 'root',
})
export class VehicleFilterMapper implements FilterUrlMapper<SearchFilters> {
  /**
   * Convert SearchFilters to URL params
   * Format: ?modelCombos=Ford:F-150,Ford:Mustang,Chevrolet:Corvette
   */
  filtersToParams(filters: SearchFilters): Params {
    const params: Params = {};

    // Handle manufacturer-model combinations
    if (filters.modelCombos && filters.modelCombos.length > 0) {
      params['modelCombos'] = filters.modelCombos
        .map((c) => `${c.manufacturer}:${c.model}`)
        .join(',');
    }

    // NOTE: Table column filters (manufacturerSearch, modelSearch, etc.) are NOT in URL
    // They are ephemeral and handled via fetchWithEphemeralFilters()

    // Column filters (Query Control - exact matching)
    if (filters.manufacturer) params['manufacturer'] = filters.manufacturer;
    if (filters.model) params['model'] = filters.model;
    if (filters.bodyClass) params['bodyClass'] = filters.bodyClass;
    if (filters.dataSource) params['dataSource'] = filters.dataSource;

    // Text search
    if (filters.q) params['q'] = filters.q;

    // Year range
    if (filters.yearMin !== undefined && filters.yearMin !== null) {
      params['yearMin'] = String(filters.yearMin);
    }
    if (filters.yearMax !== undefined && filters.yearMax !== null) {
      params['yearMax'] = String(filters.yearMax);
    }

    // Body style (legacy)
    if (filters.bodyStyle) params['bodyStyle'] = filters.bodyStyle;

    // Pagination
    if (filters.page) params['page'] = String(filters.page);
    if (filters.size) params['size'] = String(filters.size);

    // Sorting
    if (filters.sort) params['sort'] = filters.sort;
    if (filters.sortDirection) params['sortDirection'] = filters.sortDirection;

    return params;
  }

  /**
   * Convert URL params to SearchFilters
   * Parse: ?modelCombos=Ford:F-150,Ford:Mustang
   */
  paramsToFilters(params: Params): SearchFilters {
    const filters: SearchFilters = {};

    // Handle manufacturer-model combinations from URL
    if (params['modelCombos']) {
      const modelsArray = params['modelCombos']
        .split(',')
        .map((combo: string) => {
          const parts = combo.split(':');
          if (parts.length !== 2) {
            console.warn(`[VehicleFilterMapper] Invalid modelCombo format: "${combo}"`);
            return null;
          }
          const [manufacturer, model] = parts;
          if (!manufacturer?.trim() || !model?.trim()) {
            console.warn(`[VehicleFilterMapper] Empty value in modelCombo: "${combo}"`);
            return null;
          }
          return { manufacturer: manufacturer.trim(), model: model.trim() };
        })
        .filter(Boolean); // Remove nulls
      filters.modelCombos = modelsArray as any;
    }

    // NOTE: Table column filters (manufacturerSearch, modelSearch, etc.) are NOT in URL
    // They are ephemeral and handled separately

    // Column filters (Query Control - exact matching)
    if (params['manufacturer']) filters.manufacturer = params['manufacturer'];
    if (params['model']) filters.model = params['model'];
    if (params['bodyClass']) filters.bodyClass = params['bodyClass'];
    if (params['dataSource']) filters.dataSource = params['dataSource'];

    // Text search
    if (params['q']) filters.q = params['q'];

    // Year range
    if (params['yearMin']) filters.yearMin = parseInt(params['yearMin'], 10);
    if (params['yearMax']) filters.yearMax = parseInt(params['yearMax'], 10);

    // Body style (legacy)
    if (params['bodyStyle']) filters.bodyStyle = params['bodyStyle'];

    // Pagination (with defaults to ensure consistent cache keys)
    filters.page = params['page'] ? parseInt(params['page'], 10) : 1;
    filters.size = params['size'] ? parseInt(params['size'], 10) : 20;

    // Sorting
    if (params['sort']) filters.sort = params['sort'];
    if (params['sortDirection']) {
      filters.sortDirection = params['sortDirection'] as 'asc' | 'desc';
    }

    return filters;
  }
}

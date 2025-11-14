/**
 * Vehicle-specific adapters for ResourceManagementService
 *
 * These adapters allow the generic ResourceManagementService to work
 * with the vehicle domain (SearchFilters, VehicleDetails, etc.)
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

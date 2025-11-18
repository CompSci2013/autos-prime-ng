/**
 * Factory for creating a Vehicle-specific ResourceManagementService
 *
 * This factory provides a configured ResourceManagementService<SearchFilters, any>
 * that can be used as a drop-in replacement for StateManagementService.
 */

import { Injectable, Provider } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ResourceManagementService } from './resource-management.service';
import { UrlStateService } from './url-state.service';
import { RequestCoordinatorService } from './request-coordinator.service';
import {
  VehicleApiAdapter,
  VehicleCacheKeyBuilder,
  VehicleFilterMapper,
} from './vehicle-resource-adapters';
import { SearchFilters } from '../../models/search-filters.model';

/**
 * Factory function to create a Vehicle-specific ResourceManagementService
 */
export function createVehicleResourceManagementService(
  urlState: UrlStateService,
  router: Router,
  route: ActivatedRoute,
  requestCoordinator: RequestCoordinatorService,
  filterMapper: VehicleFilterMapper,
  apiAdapter: VehicleApiAdapter,
  cacheKeyBuilder: VehicleCacheKeyBuilder
): ResourceManagementService<SearchFilters, any> {
  return new ResourceManagementService<SearchFilters, any>(
    urlState,
    router,
    route,
    requestCoordinator,
    {
      filterMapper: filterMapper,
      apiAdapter: apiAdapter,
      cacheKeyBuilder: cacheKeyBuilder,
      defaultFilters: {
        page: 1,
        size: 20,
      },
      cacheTime: 30000, // 30 seconds
      supportsHighlights: true,
      highlightPrefix: 'h_',
    }
  );
}

/**
 * Injectable wrapper for the factory
 * This allows DI to work properly
 *
 * Provides backward compatibility with StateManagementService API
 */
@Injectable({
  providedIn: 'root',
})
export class VehicleResourceManagementService extends ResourceManagementService<
  SearchFilters,
  any
> {
  constructor(
    urlState: UrlStateService,
    router: Router,
    route: ActivatedRoute,
    requestCoordinator: RequestCoordinatorService,
    filterMapper: VehicleFilterMapper,
    private apiAdapter: VehicleApiAdapter,
    cacheKeyBuilder: VehicleCacheKeyBuilder
  ) {
    super(urlState, router, route, requestCoordinator, {
      filterMapper: filterMapper,
      apiAdapter: apiAdapter,
      cacheKeyBuilder: cacheKeyBuilder,
      defaultFilters: {
        page: 1,
        size: 20,
      },
      cacheTime: 30000,
      supportsHighlights: true,
      highlightPrefix: 'h_',
    });
  }

  // ====================================================================
  // Backward Compatibility Methods (StateManagementService API)
  // ====================================================================

  /**
   * Reset all filters (alias for clearAllFilters)
   */
  resetFilters(): void {
    this.clearAllFilters();
  }

  /**
   * Fetch vehicle data (alias for fetchData)
   */
  fetchVehicleData() {
    return this.fetchData();
  }

  /**
   * Fetch with ephemeral filters (table search filters not in URL)
   */
  fetchWithEphemeralFilters(ephemeralFilters: {
    manufacturerSearch?: string;
    modelSearch?: string;
    bodyClassSearch?: string;
    dataSourceSearch?: string;
    yearMin?: number;
    yearMax?: number;
  }) {
    // Get current URL-based filters
    const urlFilters = this.getCurrentFilters();

    // Combine URL filters with ephemeral filters
    const combinedFilters: any = {
      ...urlFilters,
      ...ephemeralFilters
    };

    // Use apiAdapter directly to fetch with combined filters
    return this.apiAdapter.fetchData(combinedFilters);
  }

  /**
   * Fetch manufacturer-model data (alias for fetchRelatedData)
   */
  fetchManufacturerModelData(page: number = 1, size: number = 1000) {
    return this.fetchRelatedData(page, size);
  }

  /**
   * Fetch vehicle instances (alias for fetchInstances)
   */
  fetchVehicleInstances(vehicleId: string, count: number = 8) {
    return this.fetchInstances(vehicleId, count);
  }
}

/**
 * Provider for VehicleResourceManagementService
 * Use this in app.module.ts providers array
 */
export const VEHICLE_RESOURCE_MANAGEMENT_PROVIDER: Provider = {
  provide: VehicleResourceManagementService,
  useFactory: createVehicleResourceManagementService,
  deps: [
    UrlStateService,
    Router,
    ActivatedRoute,
    RequestCoordinatorService,
    VehicleFilterMapper,
    VehicleApiAdapter,
    VehicleCacheKeyBuilder,
  ],
};

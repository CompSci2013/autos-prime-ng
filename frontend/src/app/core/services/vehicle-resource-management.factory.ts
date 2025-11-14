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
import { FilterUrlMapperService } from './filter-url-mapper.service';
import { RequestCoordinatorService } from './request-coordinator.service';
import {
  VehicleApiAdapter,
  VehicleCacheKeyBuilder,
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
  filterMapper: FilterUrlMapperService,
  apiAdapter: VehicleApiAdapter,
  cacheKeyBuilder: VehicleCacheKeyBuilder
): ResourceManagementService<SearchFilters, any> {
  return new ResourceManagementService<SearchFilters, any>(
    urlState,
    router,
    route,
    requestCoordinator,
    {
      filterMapper: {
        filtersToParams: (filters) => filterMapper.filtersToParams(filters),
        paramsToFilters: (params) => filterMapper.paramsToFilters(params),
      },
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
    filterMapper: FilterUrlMapperService,
    apiAdapter: VehicleApiAdapter,
    cacheKeyBuilder: VehicleCacheKeyBuilder
  ) {
    super(urlState, router, route, requestCoordinator, {
      filterMapper: {
        filtersToParams: (filters) => filterMapper.filtersToParams(filters),
        paramsToFilters: (params) => filterMapper.paramsToFilters(params),
      },
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
    FilterUrlMapperService,
    VehicleApiAdapter,
    VehicleCacheKeyBuilder,
  ],
};

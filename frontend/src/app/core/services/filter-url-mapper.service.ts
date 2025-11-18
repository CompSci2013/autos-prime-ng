import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { SearchFilters } from '../../models/search-filters.model';

/**
 * FilterUrlMapperService
 *
 * @deprecated Use VehicleFilterMapper from './vehicle-resource-adapters' instead.
 * This service violates the generic architecture principle by being tightly coupled
 * to the vehicle domain. The new VehicleFilterMapper implements the generic
 * FilterUrlMapper<TFilters> interface and follows the adapter pattern.
 *
 * Migration guide:
 * ```typescript
 * // Old (deprecated):
 * import { FilterUrlMapperService } from '@app/core/services';
 * constructor(private filterMapper: FilterUrlMapperService) {}
 *
 * // New (recommended):
 * import { VehicleFilterMapper } from '@app/core/services';
 * constructor(private filterMapper: VehicleFilterMapper) {}
 * ```
 *
 * This service will be removed in a future version.
 */
@Injectable({
  providedIn: 'root',
})
export class FilterUrlMapperService {
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
            console.warn(`[FilterUrlMapper] Invalid modelCombo format: "${combo}"`);
            return null;
          }
          const [manufacturer, model] = parts;
          if (!manufacturer?.trim() || !model?.trim()) {
            console.warn(`[FilterUrlMapper] Empty value in modelCombo: "${combo}"`);
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

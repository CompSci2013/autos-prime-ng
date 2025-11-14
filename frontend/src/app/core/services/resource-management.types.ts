import { Observable } from 'rxjs';
import { Params } from '@angular/router';

/**
 * Generic application state for resource management
 */
export interface ResourceState<TFilters, TData> {
  filters: TFilters;
  results: TData[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  statistics?: any;
  highlights?: any;
  selectedManufacturer?: string | null;
}

/**
 * Filter URL Mapper Interface
 * Handles conversion between domain filters and URL parameters
 */
export interface FilterUrlMapper<TFilters> {
  /**
   * Convert domain filters to URL parameters
   */
  filtersToParams(filters: TFilters): Params;

  /**
   * Convert URL parameters to domain filters
   */
  paramsToFilters(params: Params): TFilters;
}

/**
 * API Adapter Interface
 * Abstracts API calls for different resource types
 */
export interface ApiAdapter<TFilters, TData> {
  /**
   * Fetch main resource data based on filters
   * @param filters - Domain-specific filters
   * @param highlights - Optional highlight filters
   * @returns Observable of response with results and metadata
   */
  fetchData(
    filters: TFilters,
    highlights?: any
  ): Observable<ApiResponse<TData>>;

  /**
   * Fetch related resource data (optional - for pickers)
   * @param page - Page number
   * @param size - Page size
   * @returns Observable of related data
   */
  fetchRelatedData?(page: number, size: number): Observable<any>;

  /**
   * Fetch instances of a specific resource (optional)
   * @param resourceId - ID of the resource
   * @param count - Number of instances to fetch
   * @returns Observable of instances
   */
  fetchInstances?(resourceId: string, count: number): Observable<any>;
}

/**
 * Generic API response structure
 */
export interface ApiResponse<TData> {
  results: TData[];
  total: number;
  statistics?: any;
}

/**
 * Cache Key Builder Interface
 * Builds unique cache keys for request deduplication
 */
export interface CacheKeyBuilder<TFilters> {
  /**
   * Build a unique cache key from filters and highlights
   * @param prefix - Cache key prefix (e.g., 'vehicle-details')
   * @param filters - Domain filters
   * @param highlights - Optional highlights
   * @returns Unique cache key string
   */
  buildKey(prefix: string, filters: TFilters, highlights?: any): string;
}

/**
 * Resource Management Configuration
 * Passed to ResourceManagementService constructor
 */
export interface ResourceManagementConfig<TFilters, TData> {
  /**
   * Filter URL mapper for this resource type
   */
  filterMapper: FilterUrlMapper<TFilters>;

  /**
   * API adapter for this resource type
   */
  apiAdapter: ApiAdapter<TFilters, TData>;

  /**
   * Cache key builder for this resource type
   */
  cacheKeyBuilder: CacheKeyBuilder<TFilters>;

  /**
   * Default filter values
   */
  defaultFilters: TFilters;

  /**
   * Cache time in milliseconds (default: 30000)
   */
  cacheTime?: number;

  /**
   * Enable highlights support (default: false)
   */
  supportsHighlights?: boolean;

  /**
   * Highlight parameter prefix (default: 'h_')
   */
  highlightPrefix?: string;
}

/**
 * Picker Configuration Models
 *
 * Generic, reusable picker configuration system that supports:
 * - Flat and nested data structures (via valuePath)
 * - Client-side and server-side pagination
 * - URL-driven state management
 * - Type-safe configuration with generics
 *
 * Follows BaseDataTable pattern from Milestone 003.
 */

import { TableColumn } from './table-column.model';
import { TableQueryParams, TableResponse } from './table-data-source.model';

/**
 * Extended TableColumn with valuePath support for nested data access
 *
 * Examples:
 * - Flat: valuePath: 'vin'
 * - Nested: valuePath: 'registration.state'
 * - Deep nested: valuePath: 'vehicle.condition.description'
 * - Array notation: valuePath: ['vehicle', 'condition', 'description']
 * - Function: valuePath: (row) => `${row.state} - ${row.status}`
 */
export interface PickerColumnConfig<T = any> extends Omit<TableColumn<T>, 'key'> {
  /** Column key (for internal reference) */
  key: string;

  /**
   * Path to value in source data (supports nested access)
   * - string: Dot notation ('registration.state')
   * - string[]: Array notation (['registration', 'state'])
   * - function: Custom accessor ((row) => row.registration.state)
   * If omitted, defaults to key
   */
  valuePath?: string | string[] | ((row: any) => any);
}

/**
 * API configuration for picker data fetching
 *
 * Supports two modes:
 * - Mode A: ApiService method (backward compatible)
 * - Mode B: Direct HTTP (new, preferred for plugin architecture)
 */
export interface PickerApiConfig<T = any> {
  /**
   * OPTION A: Use ApiService method (backward compatible)
   * Dynamically calls apiService[method](...args)
   *
   * Example: method: 'getAllVins'
   */
  method?: string;

  /**
   * Optional custom API base URL
   * Works with both modes (method and http)
   * If not specified, defaults to environment.apiUrl
   *
   * Examples:
   * - undefined (default): Uses environment.apiUrl
   * - 'http://localhost:4000/api': Custom local API
   * - 'https://external-service.com/api': External service
   */
  baseUrl?: string;

  /**
   * OPTION B: Direct HTTP call (new, preferred)
   * Makes HTTP request directly without ApiService
   *
   * Example:
   * http: {
   *   method: 'GET',
   *   endpoint: '/engines',
   *   headers: { 'X-API-Key': 'secret' }
   * }
   */
  http?: {
    /** HTTP method (GET, POST, PUT, DELETE) */
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';

    /**
     * Endpoint path (relative or full URL)
     * - Relative: '/engines' → combined with baseUrl
     * - Full URL: 'https://api.example.com/engines' → used as-is
     */
    endpoint: string;

    /** Optional custom headers (e.g., authentication) */
    headers?: Record<string, string>;
  };

  /**
   * Optional parameter mapping function
   * Transforms picker query params to API-specific parameters
   *
   * Example (client-side pagination):
   *   paramMapper: () => ({ page: 1, size: 100 }) // Load all at once
   *
   * Example (server-side pagination):
   *   paramMapper: (params) => ({ page: params.page, size: params.size })
   */
  paramMapper?: (params: TableQueryParams) => any;

  /**
   * Response transformer
   * Converts API response to standardized TableResponse<T>
   *
   * Responsibilities:
   * - Transform nested data to flat rows (or keep nested and use valuePath)
   * - Map API field names to picker field names
   * - Calculate pagination metadata (total, totalPages)
   */
  responseTransformer: (response: any) => TableResponse<T>;
}

/**
 * Row key configuration
 * Keys are used for selection tracking (Set<string> pattern)
 */
export interface PickerRowConfig<T = any> {
  /**
   * Generate unique key for a row
   * Example: (row) => row.vin
   * Example: (row) => `${row.manufacturer}|${row.model}`
   */
  keyGenerator: (row: T) => string;

  /**
   * Parse key back to partial row data (for hydration)
   * Example: (key) => ({ vin: key })
   * Example: (key) => {
   *   const [manufacturer, model] = key.split('|');
   *   return { manufacturer, model };
   * }
   */
  keyParser: (key: string) => Partial<T>;
}

/**
 * Selection state configuration
 * Controls how selections are persisted to URL and hydrated
 *
 * Architecture:
 * - keyGenerator/keyParser: Lightweight key format for selection tracking
 * - serializer/deserializer: Full object format for complex selections
 * - urlParam: URL parameter name
 *
 * Example with manufacturer-model:
 *   keyGenerator: (item) => `${item.manufacturer}|${item.model}`
 *   keyParser: (key) => {
 *     const [m, mo] = key.split('|');
 *     return { manufacturer: m, model: mo };
 *   }
 *   serializer: (items) => items.map(i => `${i.manufacturer}:${i.model}`).join(',')
 *   deserializer: (url) => url.split(',').map(p => {
 *     const [m, mo] = p.split(':');
 *     return { manufacturer: m, model: mo };
 *   })
 */
export interface PickerSelectionConfig<T = any> {
  /**
   * URL parameter name where selections are stored
   * Example: 'modelCombos', 'selectedVins'
   */
  urlParam: string;

  /**
   * Serialize selections to URL format
   * Example: (selections) => selections.map(s => s.vin).join(',')
   * Example: (selections) => selections.map(s => `${s.manufacturer}:${s.model}`).join(',')
   */
  serializer: (selections: T[]) => string;

  /**
   * Deserialize selections from URL format
   * Example: (urlValue) => urlValue.split(',').map(vin => ({ vin }))
   */
  deserializer: (urlValue: string) => T[];

  /**
   * OPTIONAL: Generate unique key for a selection (for internal tracking)
   * Used by selection helpers for efficient Set<string> based tracking
   * If not provided, serializer output is used as key
   *
   * Example: (item) => `${item.manufacturer}|${item.model}`
   * Example: (item) => item.vin
   */
  keyGenerator?: (item: T) => string;

  /**
   * OPTIONAL: Parse key back to partial row data (for hydration)
   * Inverse of keyGenerator - reconstructs item from key
   * Required if keyGenerator is provided
   *
   * Example: (key) => {
   *   const [manufacturer, model] = key.split('|');
   *   return { manufacturer, model };
   * }
   */
  keyParser?: (key: string) => Partial<T>;
}

/**
 * Client-side filtering configuration
 * Only used when pagination.mode = 'client'
 */
export interface PickerFilterConfig<T = any> {
  /**
   * Map of column key to filter function
   * Example: {
   *   manufacturer: (row, value) => row.manufacturer.toLowerCase().includes(value.toLowerCase()),
   *   model: (row, value) => row.model.toLowerCase().includes(value.toLowerCase())
   * }
   */
  filters: Record<string, (row: T, value: any) => boolean>;
}

/**
 * Client-side sorting configuration
 * Only used when pagination.mode = 'client'
 */
export interface PickerSortingConfig<T = any> {
  /**
   * Map of column key to comparator function
   * Example: {
   *   manufacturer: (a, b) => a.manufacturer.localeCompare(b.manufacturer),
   *   count: (a, b) => a.count - b.count
   * }
   */
  comparators: Record<string, (a: T, b: T) => number>;
}

/**
 * Data caching configuration
 */
export interface PickerCachingConfig {
  /**
   * Whether to cache data in memory after first load
   * Only applicable for client-side pagination
   */
  enabled: boolean;

  /**
   * Cache TTL in milliseconds
   * 0 = cache forever until reset
   */
  ttl: number;
}

/**
 * Pagination configuration
 */
export interface PickerPaginationConfig {
  /**
   * Pagination mode
   * - 'client': Load all data once, paginate in memory (fast, good for <1000 rows)
   * - 'server': Request each page from API (scalable, required for large datasets)
   */
  mode: 'client' | 'server';

  /** Default page size */
  defaultPageSize: number;

  /** Available page size options for user selection */
  pageSizeOptions: number[];
}

/**
 * Generic picker configuration
 * Type parameter T represents the row data type
 *
 * Example:
 *   const config: PickerConfig<PickerFlatRow> = { ... }
 */
export interface PickerConfig<T = any> {
  /** Unique identifier for this picker configuration */
  id: string;

  /** Human-readable display name */
  displayName: string;

  /** Column definitions for the table (with valuePath support) */
  columns: PickerColumnConfig<T>[];

  /** API endpoint configuration */
  api: PickerApiConfig<T>;

  /** Row key configuration */
  row: PickerRowConfig<T>;

  /** Selection state configuration */
  selection: PickerSelectionConfig<T>;

  /** Pagination mode */
  pagination: PickerPaginationConfig;

  /** Optional: Client-side filtering configuration */
  filtering?: PickerFilterConfig<T>;

  /** Optional: Client-side sorting configuration */
  sorting?: PickerSortingConfig<T>;

  /** Optional: Data caching strategy */
  caching?: PickerCachingConfig;
}

/**
 * Picker selection event
 * Emitted when user applies or clears selections
 */
export interface PickerSelectionEvent<T = any> {
  /** Picker configuration ID */
  pickerId: string;

  /** Selected items */
  selections: T[];

  /** Selection keys (for efficient comparison) */
  keys: string[];
}

/**
 * Helper utility to get nested value from object
 * Supports dot notation, array notation, and function accessors
 *
 * Examples:
 *   getNestedValue(obj, 'registration.state') // Dot notation
 *   getNestedValue(obj, ['registration', 'state']) // Array notation
 *   getNestedValue(obj, (o) => o.registration.state) // Function
 *
 * @param obj Source object
 * @param path Path to value (dot notation, array, or function)
 * @param defaultValue Default value if path not found
 * @returns Value at path or defaultValue
 */
export function getNestedValue(
  obj: any,
  path: string | string[] | ((obj: any) => any),
  defaultValue: any = undefined
): any {
  if (!obj) return defaultValue;

  // Function accessor
  if (typeof path === 'function') {
    try {
      return path(obj);
    } catch (e) {
      console.warn('Error executing value accessor function:', e);
      return defaultValue;
    }
  }

  // Array notation
  if (Array.isArray(path)) {
    return path.reduce((current, key) => current?.[key], obj) ?? defaultValue;
  }

  // Dot notation (string)
  if (typeof path === 'string') {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
  }

  return defaultValue;
}

/**
 * Helper utility to resolve column value using valuePath
 *
 * @param row Source row data
 * @param column Column configuration with valuePath
 * @returns Resolved value for the column
 */
export function resolveColumnValue<T>(row: T, column: PickerColumnConfig<T>): any {
  // If valuePath is specified, use it
  if (column.valuePath !== undefined) {
    return getNestedValue(row, column.valuePath);
  }

  // Otherwise, default to column.key
  return getNestedValue(row, column.key);
}

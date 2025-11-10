// models/search-filters.model.ts
import { ManufacturerModelSelection } from './index';
import { VehicleStatistics } from './vehicle-statistics.model';

export interface SearchFilters {
  // Text search
  q?: string;

  // Table column filters (Pattern 2: Field-specific partial matching)
  manufacturerSearch?: string;  // Partial match on manufacturer field only
  modelSearch?: string;          // Partial match on model field only
  bodyClassSearch?: string;      // Partial match on body_class field only
  dataSourceSearch?: string;     // Partial match on data_source field only

  // Manufacturer-Model combinations (from picker)
  modelCombos?: ManufacturerModelSelection[];

  // Pagination
  page?: number;
  size?: number;

  // Sorting
  sort?: string;
  sortDirection?: 'asc' | 'desc';

  // Column-level filters (exact matching from Query Control)
  manufacturer?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  bodyClass?: string;
  dataSource?: string;
  vehicleID?: string;
  bodyStyle?: string; // Keep for backwards compatibility
}

/**
 * Highlight Filters
 *
 * UI-only state for data highlighting (doesn't affect API calls)
 * Corresponds to URL parameters with 'h_' prefix (e.g., h_yearMin, h_yearMax)
 *
 * Purpose: Visual emphasis of data subsets without modifying base search filters
 */
export interface HighlightFilters {
  // Year range highlighting
  yearMin?: number;       // h_yearMin
  yearMax?: number;       // h_yearMax

  // Manufacturer highlighting (comma-separated list)
  manufacturer?: string;  // h_manufacturer

  // Model highlighting (comma-separated list)
  model?: string;         // h_model
  modelCombos?: string;   // h_modelCombos (Manufacturer:Model format, comma-separated)

  // Body class highlighting (comma-separated list)
  bodyClass?: string;     // h_bodyClass

  // Future: Additional dimensions
  stateCode?: string;     // h_stateCode
  conditionMin?: number;  // h_conditionMin
  conditionMax?: number;  // h_conditionMax
}

export interface AppState {
  filters: SearchFilters;
  highlights?: HighlightFilters;  // NEW: Highlight state (UI-only)
  results: any[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  statistics?: VehicleStatistics; // Statistics for histogram charts
  selectedManufacturer?: string | null; // Currently selected manufacturer in histogram
}

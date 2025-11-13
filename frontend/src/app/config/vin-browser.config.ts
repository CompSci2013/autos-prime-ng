/**
 * VIN Browser Configuration
 *
 * Features:
 * - Browse ALL VINs (not context-specific)
 * - Server-side pagination (~1,835 total VINs)
 * - Filtering by manufacturer, model, year, body class, mileage, value
 * - No caching (data updates frequently)
 * - URL param: selectedVinsBrowser
 * - PLUGIN ARCHITECTURE: Uses direct HTTP mode (no ApiService method needed!)
 */

import { PickerConfig } from '../shared/models/picker-config.model';
import { VinPickerRow } from './vin-picker.config';

export const VIN_BROWSER_CONFIG: PickerConfig<VinPickerRow> = {
  id: 'vin-browser',
  displayName: 'VIN Browser',

  columns: [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '12%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'manufacturer',
    },
    {
      key: 'model',
      label: 'Model',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'model',
    },
    {
      key: 'year',
      label: 'Year',
      sortable: true,
      filterable: true,
      filterType: 'number',
      hideable: true,
      valuePath: 'year',
    },
    {
      key: 'body_class',
      label: 'Body Class',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'body_class',
    },
    {
      key: 'vin',
      label: 'VIN',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'vin',
    },
    {
      key: 'mileage',
      label: 'Mileage',
      sortable: true,
      filterable: true,
      filterType: 'number-range',
      hideable: true,
      valuePath: 'mileage',
      formatter: (value) => value?.toLocaleString() || '-',
      rangeConfig: {
        min: 0,
        max: 300000,
        step: 5000,
        marks: {
          0: '0',
          75000: '75K',
          150000: '150K',
          225000: '225K',
          300000: '300K',
        },
      },
    },
    {
      key: 'estimated_value',
      label: 'Est. Value',
      sortable: true,
      filterable: true,
      filterType: 'number-range',
      hideable: true,
      valuePath: 'estimated_value',
      formatter: (value) => (value ? `$${value.toLocaleString()}` : '-'),
      rangeConfig: {
        min: 0,
        max: 200000,
        step: 5000,
        marks: {
          0: '$0',
          50000: '$50K',
          100000: '$100K',
          150000: '$150K',
          200000: '$200K',
        },
      },
    },
    {
      key: 'condition_description',
      label: 'Condition',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'condition_description',
    },
    {
      key: 'registered_state',
      label: 'State',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'registered_state',
    },
    {
      key: 'exterior_color',
      label: 'Color',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'exterior_color',
    },
  ],

  api: {
    // PLUGIN ARCHITECTURE: Direct HTTP mode (no ApiService method needed!)
    http: {
      method: 'GET',
      endpoint: '/vins',
    },
    paramMapper: (params) => {
      // Map column filter keys (snake_case) to API parameters (camelCase)
      const mappedFilters: any = {};
      if (params.filters) {
        // Direct mappings
        if (params.filters['manufacturer'])
          mappedFilters.manufacturer = params.filters['manufacturer'];
        if (params.filters['model'])
          mappedFilters.model = params.filters['model'];
        if (params.filters['year'])
          mappedFilters.yearMin = mappedFilters.yearMax =
            params.filters['year'];
        if (params.filters['vin']) mappedFilters.vin = params.filters['vin'];

        // Range filters: Use individual min/max values
        if (params.filters['mileageMin'] !== undefined)
          mappedFilters.mileageMin = params.filters['mileageMin'];
        if (params.filters['mileageMax'] !== undefined)
          mappedFilters.mileageMax = params.filters['mileageMax'];
        if (params.filters['estimated_valueMin'] !== undefined)
          mappedFilters.valueMin = params.filters['estimated_valueMin'];
        if (params.filters['estimated_valueMax'] !== undefined)
          mappedFilters.valueMax = params.filters['estimated_valueMax'];

        // Snake_case to camelCase mappings
        if (params.filters['body_class'])
          mappedFilters.bodyClass = params.filters['body_class'];
        if (params.filters['condition_description'])
          mappedFilters.conditionDescription =
            params.filters['condition_description'];
        if (params.filters['registered_state'])
          mappedFilters.registeredState = params.filters['registered_state'];
        if (params.filters['exterior_color'])
          mappedFilters.exteriorColor = params.filters['exterior_color'];
      }

      return {
        page: params.page || 1,
        size: params.size || 20,
        ...mappedFilters, // Spread filters to top level (backend expects flat structure)
        sortBy: params.sortBy || 'vin',
        sortOrder: params.sortOrder || 'asc',
      };
    },
    responseTransformer: (response: any) => {
      // API returns { total, instances, pagination }
      const rows: VinPickerRow[] = response.instances.map((instance: any) => ({
        vin: instance.vin,
        manufacturer: instance.manufacturer,
        model: instance.model,
        year: instance.year,
        body_class: instance.body_class,
        vehicle_id: instance.vehicle_id,
        condition_rating: instance.condition_rating,
        condition_description: instance.condition_description,
        mileage: instance.mileage,
        mileage_verified: instance.mileage_verified,
        registered_state: instance.registered_state,
        registration_status: instance.registration_status,
        title_status: instance.title_status,
        exterior_color: instance.exterior_color,
        factory_options: instance.factory_options,
        estimated_value: instance.estimated_value,
        matching_numbers: instance.matching_numbers,
        last_service_date: instance.last_service_date,
        key: instance.vin,
      }));

      return {
        results: rows,
        total: response.total, // Total VINs across all pages
        page: response.pagination.page,
        size: response.pagination.size,
        totalPages: response.pagination.totalPages,
      };
    },
  },

  row: {
    keyGenerator: (row) => row.vin,
    keyParser: (key) => ({ vin: key, key } as Partial<VinPickerRow>),
  },

  selection: {
    urlParam: 'selectedVinsBrowser',
    serializer: (selections) => selections.map((s) => s.vin).join(','),
    deserializer: (urlValue) => {
      if (!urlValue) return [];
      return urlValue.split(',').map(
        (vin) =>
          ({
            vin,
            key: vin,
          } as VinPickerRow)
      );
    },
  },

  filtering: {
    filters: {
      manufacturer: (row, value) =>
        row.manufacturer?.toLowerCase().includes(String(value).toLowerCase()) ??
        false,
      model: (row, value) =>
        row.model?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
      year: (row, value) => {
        const numValue = Number(value);
        return isNaN(numValue) ? true : row.year === numValue;
      },
      body_class: (row, value) =>
        row.body_class?.toLowerCase().includes(String(value).toLowerCase()) ??
        false,
      vin: (row, value) =>
        row.vin?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
      mileage: (row, value) => {
        const numValue = Number(value);
        return isNaN(numValue) ? true : row.mileage === numValue;
      },
      estimated_value: (row, value) => {
        const numValue = Number(value);
        return isNaN(numValue) ? true : row.estimated_value === numValue;
      },
      condition_description: (row, value) =>
        row.condition_description
          ?.toLowerCase()
          .includes(String(value).toLowerCase()) ?? false,
      registered_state: (row, value) =>
        row.registered_state
          ?.toLowerCase()
          .includes(String(value).toLowerCase()) ?? false,
      exterior_color: (row, value) =>
        row.exterior_color
          ?.toLowerCase()
          .includes(String(value).toLowerCase()) ?? false,
    },
  },

  sorting: {
    comparators: {
      manufacturer: (a, b) =>
        (a.manufacturer ?? '').localeCompare(b.manufacturer ?? ''),
      model: (a, b) => (a.model ?? '').localeCompare(b.model ?? ''),
      year: (a, b) => (a.year ?? 0) - (b.year ?? 0),
      body_class: (a, b) =>
        (a.body_class ?? '').localeCompare(b.body_class ?? ''),
      vin: (a, b) => a.vin.localeCompare(b.vin),
      mileage: (a, b) => a.mileage - b.mileage,
      estimated_value: (a, b) => a.estimated_value - b.estimated_value,
      condition_description: (a, b) =>
        a.condition_description.localeCompare(b.condition_description),
      registered_state: (a, b) =>
        a.registered_state.localeCompare(b.registered_state),
      exterior_color: (a, b) =>
        a.exterior_color.localeCompare(b.exterior_color),
    },
  },

  caching: {
    enabled: false, // VIN data updates frequently, don't cache
    ttl: 0,
  },

  pagination: {
    mode: 'server', // ✅ Server-side: ~1,835 VINs total
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};

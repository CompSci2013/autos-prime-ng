/**
 * Dual Checkbox Picker Configuration
 *
 * Features:
 * - Parent-child checkbox pattern (manufacturer → models)
 * - Tri-state manufacturer checkbox (unchecked/indeterminate/checked)
 * - Binary model checkbox (unchecked/checked)
 * - Client-side pagination (loads all ~200 combinations at once)
 * - Data caching enabled (rarely changes)
 * - URL param: modelCombos
 *
 * Limitations:
 * - Custom template renders parent-child checkboxes (not config-driven)
 * - No sorting/filtering UI (specialized UX pattern)
 * - Column config used only for data structure, not rendering
 *
 * Note: Uses same API endpoint and data structure as manufacturer-model-picker,
 * but renders with parent-child checkbox UX instead of single checkbox per row.
 */

import { PickerConfig } from '../shared/models/picker-config.model';

/**
 * Manufacturer-Model Picker Row Interface
 * (Shared with manufacturer-model-picker.config.ts)
 */
export interface ManufacturerModelPickerRow {
  manufacturer: string;
  model: string;
  count: number;
  key: string; // "Manufacturer|Model"
}

export const DUAL_CHECKBOX_PICKER_CONFIG: PickerConfig<ManufacturerModelPickerRow> =
  {
    id: 'manufacturer-model-dual',
    displayName: 'Manufacturer & Model Picker (Dual Checkbox)',

    columns: [
      {
        key: 'manufacturer',
        label: 'Manufacturer',
        width: '50%',
        sortable: false, // Parent-child checkbox UX doesn't support sorting
        filterable: false, // Parent-child checkbox UX doesn't support filtering
        filterType: 'text',
        hideable: false,
      },
      {
        key: 'model',
        label: 'Model',
        width: '35%',
        sortable: false, // Parent-child checkbox UX doesn't support sorting
        filterable: false, // Parent-child checkbox UX doesn't support filtering
        filterType: 'text',
        hideable: false,
      },
      {
        key: 'count',
        label: 'Count',
        width: '15%',
        sortable: false, // Not displayed in dual picker template
        filterable: false,
        hideable: false,
      },
    ],

    api: {
      method: 'getManufacturerModelCombinations',
      paramMapper: () => ({
        page: 1,
        size: 100, // Load all at once for client-side filtering
      }),
      responseTransformer: (response: any) => {
        // Transform hierarchical API response to flat rows
        console.log(
          '[DUAL PICKER CONFIG] responseTransformer called with:',
          response
        );

        // Defensive check
        if (!response || !response.data) {
          console.error(
            '[DUAL PICKER CONFIG] Invalid response structure:',
            response
          );
          return { results: [], total: 0, page: 1, size: 0, totalPages: 0 };
        }

        const flatRows: ManufacturerModelPickerRow[] = [];
        response.data.forEach((mfr: any) => {
          mfr.models.forEach((model: any) => {
            flatRows.push({
              manufacturer: mfr.manufacturer,
              model: model.model,
              count: model.count,
              key: `${mfr.manufacturer}|${model.model}`,
            });
          });
        });

        // Sort by manufacturer, then model
        flatRows.sort((a, b) => {
          const mfrCompare = a.manufacturer.localeCompare(b.manufacturer);
          return mfrCompare !== 0 ? mfrCompare : a.model.localeCompare(b.model);
        });

        return {
          results: flatRows,
          total: flatRows.length,
          page: 1,
          size: flatRows.length,
          totalPages: 1,
        };
      },
    },

    row: {
      keyGenerator: (row) => {
        if (!row || !row.manufacturer || !row.model) {
          console.warn(
            '[DUAL PICKER CONFIG] keyGenerator called with invalid row:',
            row
          );
          return 'invalid-key';
        }
        return `${row.manufacturer}|${row.model}`;
      },
      keyParser: (key) => {
        const [manufacturer, model] = key.split('|');
        return {
          manufacturer,
          model,
          key,
        } as Partial<ManufacturerModelPickerRow>;
      },
    },

    selection: {
      urlParam: 'modelCombos',
      serializer: (selections) => {
        return selections.map((s) => `${s.manufacturer}:${s.model}`).join(',');
      },
      deserializer: (urlValue) => {
        if (!urlValue) return [];
        return urlValue
          .split(',')
          .filter((combo) => combo && combo.includes(':')) // Filter out empty/invalid combos
          .map((combo) => {
            const [manufacturer, model] = combo.split(':');
            // Skip if either is missing
            if (!manufacturer || !model) {
              console.warn('[DUAL PICKER CONFIG] Invalid combo in URL:', combo);
              return null;
            }
            return {
              manufacturer,
              model,
              count: 0,
              key: `${manufacturer}|${model}`,
            } as ManufacturerModelPickerRow;
          })
          .filter((item) => item !== null) as ManufacturerModelPickerRow[]; // Remove nulls
      },
    },

    filtering: {
      filters: {
        manufacturer: (row, value) =>
          row.manufacturer.toLowerCase().includes(String(value).toLowerCase()),
        model: (row, value) =>
          row.model.toLowerCase().includes(String(value).toLowerCase()),
      },
    },

    sorting: {
      comparators: {
        manufacturer: (a, b) => a.manufacturer.localeCompare(b.manufacturer),
        model: (a, b) => a.model.localeCompare(b.model),
        count: (a, b) => a.count - b.count,
      },
    },

    caching: {
      enabled: true,
      ttl: 0, // Cache forever (manufacturer-model data rarely changes)
    },

    pagination: {
      mode: 'client', // ✅ Client-side: Load all ~200 combinations once
      defaultPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
    },
  };

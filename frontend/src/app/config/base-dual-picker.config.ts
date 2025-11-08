/**
 * Base Dual Picker Configuration (EXPERIMENTAL)
 *
 * Demonstrates proper config-driven parent-child picker architecture:
 * - Uses BaseDataTable (inherits sorting, filtering, column management)
 * - Parent-child grouping (manufacturer → models)
 * - Tri-state parent checkbox (unchecked/indeterminate/checked)
 * - Binary child checkbox (unchecked/checked)
 * - All BaseDataTable features work (sort, filter, column actions)
 * - Fully config-driven rendering
 *
 * This is the CORRECT implementation pattern - dual-checkbox-picker.component
 * was the initial prototype that didn't follow config-driven architecture.
 */

import { PickerConfig } from '../shared/models/picker-config.model';

/**
 * Manufacturer-Model Picker Row Interface
 * (Same structure as dual-checkbox-picker)
 */
export interface ManufacturerModelPickerRow {
  manufacturer: string;
  model: string;
  count: number;
  key: string; // "Manufacturer|Model"
}

export const BASE_DUAL_PICKER_CONFIG: PickerConfig<ManufacturerModelPickerRow> =
  {
    id: 'manufacturer-model-base-dual',
    displayName: 'Manufacturer & Model Picker (Experimental Parent-Child)',

    columns: [
      {
        key: 'manufacturer',
        label: 'Manufacturer',
        width: '50%',
        sortable: true,  // ✅ Config-driven: BaseDataTable respects this
        filterable: true, // ✅ Config-driven: BaseDataTable respects this
        filterType: 'text',
        hideable: false,
      },
      {
        key: 'model',
        label: 'Model',
        width: '35%',
        sortable: true,  // ✅ Config-driven: BaseDataTable respects this
        filterable: true, // ✅ Config-driven: BaseDataTable respects this
        filterType: 'text',
        hideable: false,
      },
      {
        key: 'count',
        label: 'Count',
        width: '15%',
        sortable: true,  // ✅ Config-driven: BaseDataTable respects this
        filterable: false,
        hideable: false,
      },
    ],

    api: {
      method: 'getManufacturerModelCombinations',
      paramMapper: () => ({
        page: 1,
        size: 100, // Load all at once for client-side grouping
      }),
      responseTransformer: (response: any) => {
        console.log(
          '[BASE DUAL PICKER CONFIG] responseTransformer called with:',
          response
        );

        // Defensive check
        if (!response || !response.data) {
          console.error(
            '[BASE DUAL PICKER CONFIG] Invalid response structure:',
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
            '[BASE DUAL PICKER CONFIG] keyGenerator called with invalid row:',
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
          .filter((combo) => combo && combo.includes(':'))
          .map((combo) => {
            const [manufacturer, model] = combo.split(':');
            if (!manufacturer || !model) {
              console.warn('[BASE DUAL PICKER CONFIG] Invalid combo in URL:', combo);
              return null;
            }
            return {
              manufacturer,
              model,
              count: 0,
              key: `${manufacturer}|${model}`,
            } as ManufacturerModelPickerRow;
          })
          .filter((item) => item !== null) as ManufacturerModelPickerRow[];
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

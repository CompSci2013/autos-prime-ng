/**
 * Picker Configurations - Central Export
 *
 * This file aggregates all individual picker configurations for convenient import.
 * Each picker has its own config file for independent modification and testing.
 *
 * Usage:
 *   import { ALL_PICKER_CONFIGS } from './picker-configs';
 *   // OR import individual configs:
 *   import { MANUFACTURER_MODEL_PICKER_CONFIG } from './manufacturer-model-picker.config';
 */

// Import individual picker configurations
export { MANUFACTURER_MODEL_PICKER_CONFIG, ManufacturerModelPickerRow } from './manufacturer-model-picker.config';
export { DUAL_CHECKBOX_PICKER_CONFIG } from './dual-checkbox-picker.config';
export { BASE_DUAL_PICKER_CONFIG } from './base-dual-picker.config';
export { VIN_PICKER_CONFIG, VinPickerRow } from './vin-picker.config';
export { VIN_BROWSER_CONFIG } from './vin-browser.config';

import { PickerConfig } from '../shared/models/picker-config.model';
import { MANUFACTURER_MODEL_PICKER_CONFIG } from './manufacturer-model-picker.config';
import { DUAL_CHECKBOX_PICKER_CONFIG } from './dual-checkbox-picker.config';
import { BASE_DUAL_PICKER_CONFIG } from './base-dual-picker.config';
import { VIN_PICKER_CONFIG } from './vin-picker.config';
import { VIN_BROWSER_CONFIG } from './vin-browser.config';

/**
 * All picker configurations
 * Export as array for bulk registration
 */
export const ALL_PICKER_CONFIGS: PickerConfig<any>[] = [
  MANUFACTURER_MODEL_PICKER_CONFIG,
  DUAL_CHECKBOX_PICKER_CONFIG,
  BASE_DUAL_PICKER_CONFIG,
  VIN_PICKER_CONFIG,
  VIN_BROWSER_CONFIG,
];

/**
 * Shared type definitions for SmartShift Chrome Extension
 */

/**
 * Shift preset configuration stored in Chrome Storage
 */
export interface ShiftPreset {
  /** Unique identifier (timestamp-based) */
  id: string;
  /** Start hour (00-23) */
  startHour: string;
  /** Start minute (00, 15, 30, 45) */
  startMinute: string;
  /** End hour (00-23) */
  endHour: string;
  /** End minute (00, 15, 30, 45) */
  endMinute: string;
  /** Shift type value for the target site */
  shiftType: string;
}

/**
 * Chrome Storage data structure
 */
export interface StorageData {
  /** List of saved presets */
  presets: ShiftPreset[];
  /** Currently selected preset ID */
  activePresetId: string;
  /** Legacy data format (for migration) */
  shiftPreset?: LegacyShiftPreset;
}

/**
 * Legacy preset format for backward compatibility
 */
export interface LegacyShiftPreset {
  startHour?: string;
  startMinute?: string;
  endHour?: string;
  endMinute?: string;
  shiftType?: string;
}

/**
 * Holiday preset marker
 */
export interface HolidayPreset {
  shiftType: "HOLIDAY";
}

/**
 * Union type for all preset types
 */
export type PresetType = ShiftPreset | HolidayPreset;

/**
 * Options for modal apply operations
 */
export interface ModalApplyOptions {
  /** Retry clicking trigger button if modal doesn't appear */
  retryOnFailure?: boolean;
  /** Maximum wait time in milliseconds */
  timeout?: number;
}

/**
 * Column group for day buttons
 */
export interface ColumnGroup {
  /** Left position in pixels */
  left: number;
  /** Elements in this column */
  elements: HTMLElement[];
}

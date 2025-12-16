/**
 * Constants and magic values for SmartShift
 */

/**
 * DOM selectors for target site elements
 */
export const SELECTORS = {
  /** Apply/Request button within a shift cell */
  APPLY_BUTTON: 'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
  /** Modal dialog element */
  MODAL: "#popup, .modal",
  /** Individual shift cell container */
  SHIFT_CELL: ".staffpage-plan-list-shift",
  /** Shift type radio */
  SHIFT_TYPE_RADIO: 'input[name="popup_shift_type"]',
  /** Submit button in modal */
  SUBMIT_BUTTON: "#pupup_change",
  /** Time input selectors */
  TIME_FROM_HOUR: "#popup_from_hour",
  TIME_FROM_MINUTES: "#popup_from_minutes",
  TIME_TO_HOUR: "#popup_to_hour",
  TIME_TO_MINUTES: "#popup_to_minutes",
} as const;

/**
 * Timing constants (in milliseconds)
 */
export const TIMING = {
  /** Delay before clicking submit button */
  APPLY_DELAY: 100,
  /** Interval for checking modal visibility */
  MODAL_CHECK_INTERVAL: 100,
  /** Attempt count before retrying trigger button click */
  MODAL_RETRY_ATTEMPT: 15,
  /** Maximum attempts before timeout */
  MODAL_TIMEOUT_ATTEMPT: 50,
} as const;

/**
 * Keywords to identify holiday options in the modal
 */
export const HOLIDAY_KEYWORDS = ["希望休", "公休", "休日", "休み", "休暇", "有給", "欠勤"] as const;

/**
 * CSS class names for injected elements
 */
export const CSS_CLASSES = {
  /** Individual day button */
  DAY_BTN: "smartshift-day-btn",
  /** Day button group container */
  DAY_BTN_GROUP: "smartshift-day-btn-group",
  /** Day button holiday variant */
  DAY_BTN_HOLIDAY: "holiday",
  /** Day button preset variant */
  DAY_BTN_PRESET: "preset",
  /** Holiday apply button */
  HOLIDAY_BTN: "smartshift-holiday-btn",
  /** Shift apply button */
  SHIFT_BTN: "smartshift-btn",
} as const;

/**
 * Button emoji icons
 */
export const ICONS = {
  HOLIDAY: "🏖️",
  SHIFT: "⚡️",
} as const;

/**
 * Column grouping tolerance (in pixels)
 */
export const COLUMN_GROUP_TOLERANCE = 5;

/**
 * Column matching tolerance for day buttons (in pixels)
 */
export const COLUMN_MATCH_TOLERANCE = 10;

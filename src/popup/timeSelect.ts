/**
 * Time select UI component for popup
 */

/**
 * Time selection data
 */
export interface TimeSelection {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}

/**
 * IDs for time select elements
 */
const TIME_SELECT_IDS = {
  END_HOUR: "endHour",
  END_MINUTE: "endMinute",
  START_HOUR: "startHour",
  START_MINUTE: "startMinute",
} as const;

/**
 * Default time values
 */
const DEFAULT_TIMES = {
  END_HOUR: "18",
  END_MINUTE: "00",
  START_HOUR: "09",
  START_MINUTE: "00",
} as const;

/**
 * Generate hour options (00-23)
 */
function generateHours(): string[] {
  return Array.from({ length: 24 }, (unusedVal, i) => i.toString().padStart(2, "0"));
}

/**
 * Generate minute options (00, 15, 30, 45)
 */
function generateMinutes(): string[] {
  return ["00", "15", "30", "45"];
}

/**
 * Populate options for a select element
 */
function populateSelectOptions(id: string, values: string[]): void {
  const select = document.getElementById(id) as HTMLSelectElement | null;

  if (!select) {
    return;
  }

  values.forEach((val) => {
    const opt = document.createElement("option");

    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  });
}

/**
 * Set value for a select element
 */
function setSelectValue(id: string, value: string): void {
  const select = document.getElementById(id) as HTMLSelectElement | null;

  if (select) {
    select.value = value;
  }
}

/**
 * Populate all time select elements with options
 */
export function populateTimeSelects(): void {
  const hours = generateHours();
  const minutes = generateMinutes();

  populateSelectOptions(TIME_SELECT_IDS.START_HOUR, hours);
  populateSelectOptions(TIME_SELECT_IDS.START_MINUTE, minutes);
  populateSelectOptions(TIME_SELECT_IDS.END_HOUR, hours);
  populateSelectOptions(TIME_SELECT_IDS.END_MINUTE, minutes);

  // Set default values
  setSelectValue(TIME_SELECT_IDS.START_HOUR, DEFAULT_TIMES.START_HOUR);
  setSelectValue(TIME_SELECT_IDS.START_MINUTE, DEFAULT_TIMES.START_MINUTE);
  setSelectValue(TIME_SELECT_IDS.END_HOUR, DEFAULT_TIMES.END_HOUR);
  setSelectValue(TIME_SELECT_IDS.END_MINUTE, DEFAULT_TIMES.END_MINUTE);
}

/**
 * Get currently selected time values
 */
export function getSelectedTime(): TimeSelection {
  const getValue = (id: string): string =>
    (document.getElementById(id) as HTMLSelectElement | null)?.value || "";

  return {
    endHour: getValue(TIME_SELECT_IDS.END_HOUR),
    endMinute: getValue(TIME_SELECT_IDS.END_MINUTE),
    startHour: getValue(TIME_SELECT_IDS.START_HOUR),
    startMinute: getValue(TIME_SELECT_IDS.START_MINUTE),
  };
}

/**
 * Apply shift preset values to modal form
 */

import { clickSubmitButton } from "./modalHandler";
import { SELECTORS, TIMING } from "../../constants";

import type { ShiftPreset } from "../../types";

/**
 * Set value on a select element within modal
 */
function setSelectValue(modal: HTMLElement, id: string, value: string): boolean {
  const el = modal.querySelector(`#${id}`) as HTMLSelectElement | null;

  if (el) {
    el.value = value;
    el.dispatchEvent(new Event("change"));

    return true;
  }

  console.warn(`Element #${id} not found.`);

  return false;
}

/**
 * Apply shift preset values to the modal form and submit
 */
export function applyPresetToModal(modal: HTMLElement, preset: ShiftPreset): void {
  // Set time values
  const results = [
    setSelectValue(modal, SELECTORS.TIME_FROM_HOUR.slice(1), preset.startHour),
    setSelectValue(modal, SELECTORS.TIME_FROM_MINUTES.slice(1), preset.startMinute),
    setSelectValue(modal, SELECTORS.TIME_TO_HOUR.slice(1), preset.endHour),
    setSelectValue(modal, SELECTORS.TIME_TO_MINUTES.slice(1), preset.endMinute),
  ];

  // Check if all time inputs were set successfully
  if (results.some((r) => !r)) {
    const msg = "シフト時間の入力欄が見つかりませんでした。";

    console.error(msg);

    throw new Error("Time input elements not found");
  }

  // Set shift type radio if specified
  const typeRadio = modal.querySelector(
    `${SELECTORS.SHIFT_TYPE_RADIO}[value="${preset.shiftType}"]`,
  ) as HTMLInputElement | null;

  if (typeRadio) {
    typeRadio.checked = true;
    typeRadio.dispatchEvent(new Event("change"));
  }

  // Click submit after delay
  setTimeout(() => {
    clickSubmitButton(modal);
  }, TIMING.APPLY_DELAY);
}

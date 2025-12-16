/**
 * Apply holiday option to modal form
 */

import { clickSubmitButton } from "./modalHandler";
import { HOLIDAY_KEYWORDS, TIMING } from "../../constants";

/**
 * Find and select holiday option in the modal
 * Searches labels and select elements for holiday keywords
 */
export function applyHolidayToModal(modal: HTMLElement): void {
  let found = false;

  // First, try to find a radio button with holiday label
  const labels = Array.from(modal.querySelectorAll("label"));
  const targetLabel = labels.find((label) =>
    HOLIDAY_KEYWORDS.some((keyword) => label.innerText.includes(keyword)),
  );

  if (targetLabel) {
    const radioId = targetLabel.getAttribute("for");
    let radio: HTMLInputElement | null = null;

    if (radioId) {
      radio = modal.querySelector(`#${radioId}`) as HTMLInputElement | null;
    } else {
      radio = targetLabel.querySelector("input[type='radio']");
    }

    if (radio) {
      radio.click();
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      found = true;
    }
  }

  // If no radio found, try select elements
  if (!found) {
    const selects = Array.from(modal.querySelectorAll("select"));

    for (const select of selects) {
      const options = Array.from(select.options);
      const targetOption = options.find((opt) =>
        HOLIDAY_KEYWORDS.some((keyword) => opt.text.includes(keyword)),
      );

      if (targetOption) {
        select.value = targetOption.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        found = true;
        break;
      }
    }
  }

  // Error if no holiday option found
  if (!found) {
    console.error("Holiday element not found.");

    throw new Error("Holiday element not found");
  }

  // Click submit after delay
  setTimeout(() => {
    clickSubmitButton(modal);
  }, TIMING.APPLY_DELAY);
}

/**
 * Holiday apply button component
 */

import { CSS_CLASSES, ICONS, SELECTORS } from "../../constants";
import { applyHolidayToModal } from "../modal/holidayApplier";
import { waitForModal, waitForModalClose } from "../modal/modalHandler";

/**
 * Create a holiday apply button element
 */
function createHolidayButton(onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");

  btn.className = CSS_CLASSES.HOLIDAY_BTN;
  btn.textContent = ICONS.HOLIDAY;

  btn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onClick();
  };

  return btn;
}

/**
 * Handle holiday apply for a single cell
 */
export async function handleHolidayApply(shiftElement: HTMLElement): Promise<void> {
  const applyBtn = shiftElement.querySelector(SELECTORS.APPLY_BUTTON) as HTMLElement | null;

  if (!applyBtn) {
    return;
  }

  // Click the apply button to open modal
  applyBtn.click();

  // Wait for modal and apply holiday
  const modal = await waitForModal(applyBtn);

  applyHolidayToModal(modal);
  await waitForModalClose(modal);
}

/**
 * Inject holiday buttons into all eligible shift cells
 */
export function injectHolidayButtons(): void {
  const shifts = document.querySelectorAll(SELECTORS.SHIFT_CELL);

  shifts.forEach((shift) => {
    const el = shift as HTMLElement;

    // Skip if button already exists
    if (el.querySelector(`.${CSS_CLASSES.HOLIDAY_BTN}`)) {
      return;
    }

    // Check if apply button exists and is enabled
    const applyBtn = el.querySelector(SELECTORS.APPLY_BUTTON) as HTMLButtonElement | null;

    if (!applyBtn || applyBtn.disabled) {
      return;
    }

    // Ensure element has relative positioning
    if (window.getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

    // Create and append holiday button
    const btn = createHolidayButton(() => {
      void handleHolidayApply(el);
    });

    el.appendChild(btn);
  });
}

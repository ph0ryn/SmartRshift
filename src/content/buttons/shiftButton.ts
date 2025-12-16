/**
 * Shift apply button component
 */

import { CSS_CLASSES, ICONS, SELECTORS } from "../../constants";
import { storage } from "../../storage";
import { waitForModal, waitForModalClose } from "../modal/modalHandler";
import { applyPresetToModal } from "../modal/presetApplier";

import type { ShiftPreset } from "../../types";

/**
 * Create a shift apply button element
 */
function createShiftButton(onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");

  btn.className = CSS_CLASSES.SHIFT_BTN;
  btn.textContent = ICONS.SHIFT;

  btn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onClick();
  };

  return btn;
}

/**
 * Handle shift apply for a single cell
 */
export async function handleShiftApply(shiftElement: HTMLElement): Promise<void> {
  // Get active preset
  const preset = storage.getActivePreset();

  if (!preset) {
    alert("適用するプリセットが見つかりません。ポップアップでプリセットを選択してください。");

    throw new Error("No active preset selected");
  }

  const applyBtn = shiftElement.querySelector(SELECTORS.APPLY_BUTTON) as HTMLElement | null;

  if (!applyBtn) {
    return;
  }

  // Click the apply button to open modal
  applyBtn.click();

  // Wait for modal and apply preset
  const modal = await waitForModal(applyBtn);

  applyPresetToModal(modal, preset);
  await waitForModalClose(modal);
}

/**
 * Handle shift apply with explicit preset
 */
export async function handleShiftApplyWithPreset(
  shiftElement: HTMLElement,
  preset: ShiftPreset,
): Promise<void> {
  const applyBtn = shiftElement.querySelector(SELECTORS.APPLY_BUTTON) as HTMLElement | null;

  if (!applyBtn) {
    return;
  }

  applyBtn.click();

  const modal = await waitForModal(applyBtn);

  applyPresetToModal(modal, preset);
  await waitForModalClose(modal);
}

/**
 * Inject shift buttons into all eligible shift cells
 */
export function injectShiftButtons(): void {
  const shifts = document.querySelectorAll(SELECTORS.SHIFT_CELL);

  shifts.forEach((shift, index) => {
    const el = shift as HTMLElement;

    // Skip if button already exists
    if (el.querySelector(`.${CSS_CLASSES.SHIFT_BTN}`)) {
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

    el.dataset.smartshiftIndex = index.toString();

    // Create and append shift button
    const btn = createShiftButton(() => {
      void handleShiftApply(el);
    });

    el.appendChild(btn);
  });
}

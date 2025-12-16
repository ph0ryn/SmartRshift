/**
 * Modal handler for waiting and detecting modal dialogs
 */

import { SELECTORS, TIMING } from "../../constants";

import type { ModalApplyOptions } from "../../types";

/**
 * Get modal element from DOM
 */
function getModal(): HTMLElement | null {
  return (
    (document.getElementById("popup") as HTMLElement | null) ||
    (document.querySelector(".modal") as HTMLElement | null)
  );
}

/**
 * Check if modal is currently visible
 */
function isModalVisible(modal: HTMLElement): boolean {
  const style = window.getComputedStyle(modal);

  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

/**
 * Wait for modal to appear and become visible
 * @param triggerBtn Optional button to retry clicking if modal doesn't appear
 * @param options Modal apply options
 */
export async function waitForModal(
  triggerBtn?: HTMLElement,
  options: ModalApplyOptions = {},
): Promise<HTMLElement> {
  const { timeout = TIMING.MODAL_TIMEOUT_ATTEMPT * TIMING.MODAL_CHECK_INTERVAL } = options;

  // Check if modal is already open
  const existingModal = getModal();

  if (existingModal && isModalVisible(existingModal)) {
    return existingModal;
  }

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = Math.ceil(timeout / TIMING.MODAL_CHECK_INTERVAL);

    const checkInterval = setInterval(() => {
      attempts++;

      const modal = getModal();

      // Retry clicking trigger button after RETRY_ATTEMPT attempts
      if (attempts === TIMING.MODAL_RETRY_ATTEMPT && triggerBtn) {
        if (!modal || !isModalVisible(modal)) {
          triggerBtn.click();
        }
      }

      // Timeout
      if (attempts > maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error("Modal open timeout"));

        return;
      }

      // Check if modal is visible
      if (modal && isModalVisible(modal)) {
        clearInterval(checkInterval);
        resolve(modal);
      }
    }, TIMING.MODAL_CHECK_INTERVAL);
  });
}

/**
 * Wait for modal to close
 */
export async function waitForModalClose(modal: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    let attempts = 0;

    const checkInterval = setInterval(() => {
      attempts++;

      // Timeout - resolve anyway
      if (attempts > TIMING.MODAL_TIMEOUT_ATTEMPT) {
        clearInterval(checkInterval);
        resolve();

        return;
      }

      // Check if modal is hidden
      const isVisible =
        (modal.style.display !== "none" && modal.classList.contains("in")) ||
        window.getComputedStyle(modal).display === "block";

      if (!isVisible) {
        clearInterval(checkInterval);
        resolve();
      }
    }, TIMING.MODAL_CHECK_INTERVAL);
  });
}

/**
 * Click the submit button in the modal
 */
export function clickSubmitButton(modal: HTMLElement): void {
  const submitBtn = modal.querySelector(SELECTORS.SUBMIT_BUTTON) as HTMLElement | null;

  if (submitBtn) {
    submitBtn.click();
  } else {
    console.error("Submit button not found");
    alert("登録ボタン(#pupup_change)が見つかりませんでした。");
  }
}

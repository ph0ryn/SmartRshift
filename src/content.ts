/**
 * SmartShift Content Script - Entry Point
 *
 * Injects UI elements into the target site for quick shift management.
 */

import { injectDayButtons } from "./content/buttons/dayButtons";
import { injectHolidayButtons } from "./content/buttons/holidayButton";
import { injectShiftButtons } from "./content/buttons/shiftButton";
import { injectStyles } from "./content/styles";
import { storage } from "./storage";

console.log("SmartShift Content Script Loaded");

/**
 * Initialize SmartShift extension
 */
async function init(): Promise<void> {
  console.log("SmartShift Initializing...");

  // Initialize storage cache
  await storage.initialize();

  // Inject UI elements
  injectStyles();
  injectShiftButtons();
  injectHolidayButtons();
  injectDayButtons();
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void init());
} else {
  void init();
}

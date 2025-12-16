/**
 * SmartShift Popup - Entry Point
 *
 * Manages preset configuration and selection.
 */

import { renderPresets } from "./popup/presetList";
import { populateTimeSelects, getSelectedTime } from "./popup/timeSelect";
import { createPopupStorage } from "./storage";

import type { ShiftPreset } from "./types";

const storage = createPopupStorage();

/**
 * Load and render preset data
 */
async function loadData(): Promise<void> {
  const data = await storage.loadData();

  renderPresets(data, handleSelectPreset, handleDeletePreset);
}

/**
 * Handle preset selection
 */
function handleSelectPreset(id: string): void {
  storage.setActivePreset(id);
}

/**
 * Handle preset deletion
 */
async function handleDeletePreset(id: string): Promise<void> {
  if (!confirm("このプリセットを削除しますか？")) {
    return;
  }

  await storage.deletePreset(id);
  await loadData();
}

/**
 * Handle adding a new preset
 */
async function handleAddPreset(): Promise<void> {
  const time = getSelectedTime();

  const newPreset: ShiftPreset = {
    endHour: time.endHour,
    endMinute: time.endMinute,
    id: Date.now().toString(),
    shiftType: "1",
    startHour: time.startHour,
    startMinute: time.startMinute, // Default: attendance
  };

  await storage.addPreset(newPreset);
  await loadData();
}

/**
 * Initialize popup
 */
document.addEventListener("DOMContentLoaded", () => {
  populateTimeSelects();
  void loadData();

  document.getElementById("addBtn")?.addEventListener("click", () => {
    void handleAddPreset();
  });
});

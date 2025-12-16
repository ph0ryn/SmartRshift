/**
 * Preset list UI component for popup
 */

import type { ShiftPreset, StorageData } from "../types";

/**
 * Element IDs for preset list
 */
const ELEMENT_IDS = {
  EMPTY_STATE: "emptyState",
  PRESET_LIST: "presetList",
} as const;

/**
 * Callbacks for preset item actions
 */
interface PresetItemCallbacks {
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Create a preset item element
 */
function createPresetItem(
  preset: ShiftPreset,
  isActive: boolean,
  callbacks: PresetItemCallbacks,
): HTMLDivElement {
  const item = document.createElement("div");

  item.className = "preset-item";

  // Radio + time label
  const info = document.createElement("label");

  info.className = "preset-info";

  const radio = document.createElement("input");

  radio.type = "radio";
  radio.name = "activePreset";
  radio.value = preset.id;
  radio.checked = isActive;
  radio.onchange = () => callbacks.onSelect(preset.id);

  const time = document.createElement("span");

  time.className = "preset-time";
  time.textContent = `${preset.startHour}:${preset.startMinute} 〜 ${preset.endHour}:${preset.endMinute}`;

  info.appendChild(radio);
  info.appendChild(time);

  // Delete button
  const deleteBtn = document.createElement("button");

  deleteBtn.className = "delete-btn";
  deleteBtn.innerHTML = "&times;";
  deleteBtn.title = "削除";
  deleteBtn.onclick = () => callbacks.onDelete(preset.id);

  item.appendChild(info);
  item.appendChild(deleteBtn);

  return item;
}

/**
 * Render presets to the list element
 */
export function renderPresets(
  data: StorageData,
  onSelect: (id: string) => void,
  onDelete: (id: string) => void,
): void {
  const listEl = document.getElementById(ELEMENT_IDS.PRESET_LIST);
  const emptyState = document.getElementById(ELEMENT_IDS.EMPTY_STATE);

  if (!listEl) {
    return;
  }

  // Clear existing items
  listEl.innerHTML = "";

  // Show empty state if no presets
  if (!data.presets || data.presets.length === 0) {
    if (emptyState) {
      emptyState.style.display = "block";
    }

    return;
  }

  // Hide empty state
  if (emptyState) {
    emptyState.style.display = "none";
  }

  // Render each preset
  const callbacks: PresetItemCallbacks = { onDelete, onSelect };

  data.presets.forEach((preset) => {
    const isActive = preset.id === data.activePresetId;
    const item = createPresetItem(preset, isActive, callbacks);

    listEl.appendChild(item);
  });
}

/**
 * Day-based batch apply buttons component
 */

import { handleHolidayApply } from "./holidayButton";
import { handleShiftApply } from "./shiftButton";
import {
  COLUMN_GROUP_TOLERANCE,
  COLUMN_MATCH_TOLERANCE,
  CSS_CLASSES,
  ICONS,
  SELECTORS,
} from "../../constants";

import type { ColumnGroup } from "../../types";

/**
 * Group cells by their horizontal position (column)
 */
function groupCellsByColumn(cells: HTMLElement[]): ColumnGroup[] {
  const groups: ColumnGroup[] = [];

  cells.forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    const left = Math.round(rect.left);

    // Find existing group with similar left position
    let group = groups.find((g) => Math.abs(g.left - left) < COLUMN_GROUP_TOLERANCE);

    if (!group) {
      group = { elements: [], left };
      groups.push(group);
    }

    group.elements.push(cell);
  });

  // Sort groups by left position
  groups.sort((a, b) => a.left - b.left);

  return groups;
}

/**
 * Get cells in the same column at click time (fresh query to avoid stale elements)
 */
function getCellsInColumn(columnLeft: number): HTMLElement[] {
  const currentCells = Array.from(document.querySelectorAll(SELECTORS.SHIFT_CELL)) as HTMLElement[];

  return currentCells.filter((cell) => {
    const rect = cell.getBoundingClientRect();
    const applyBtn = cell.querySelector(SELECTORS.APPLY_BUTTON) as HTMLButtonElement | null;
    const isEnabled = applyBtn && !applyBtn.disabled;

    return isEnabled && Math.abs(Math.round(rect.left) - columnLeft) < COLUMN_MATCH_TOLERANCE;
  });
}

/**
 * Sort cells by vertical position (top to bottom)
 */
function sortByVerticalPosition(cells: HTMLElement[]): HTMLElement[] {
  return [...cells].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
}

/**
 * Create preset apply button for day column
 */
function createPresetDayButton(columnLeft: number): HTMLButtonElement {
  const btn = document.createElement("button");

  btn.className = `${CSS_CLASSES.DAY_BTN} ${CSS_CLASSES.DAY_BTN_PRESET}`;
  btn.textContent = ICONS.SHIFT;
  btn.title = "この曜日に一括適用";

  btn.onclick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const targetCells = sortByVerticalPosition(getCellsInColumn(columnLeft));
    let count = 0;

    for (const el of targetCells) {
      if (el.querySelector(`.${CSS_CLASSES.SHIFT_BTN}`)) {
        try {
          await handleShiftApply(el);
          count++;
        } catch (err) {
          console.error("Apply failed for cell", err);
        }
      }
    }

    alert(`${count}件の処理が完了しました`);
  };

  return btn;
}

/**
 * Create holiday apply button for day column
 */
function createHolidayDayButton(columnLeft: number): HTMLButtonElement {
  const btn = document.createElement("button");

  btn.className = `${CSS_CLASSES.DAY_BTN} ${CSS_CLASSES.DAY_BTN_HOLIDAY}`;
  btn.textContent = ICONS.HOLIDAY;
  btn.title = "この曜日を全て希望休に";

  btn.onclick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const targetCells = sortByVerticalPosition(getCellsInColumn(columnLeft));
    let count = 0;

    for (const el of targetCells) {
      if (el.querySelector(`.${CSS_CLASSES.SHIFT_BTN}`)) {
        try {
          await handleHolidayApply(el);
          count++;
        } catch (err) {
          console.error("Apply failed for cell", err);
        }
      }
    }

    alert(`${count}件の処理が完了しました`);
  };

  return btn;
}

/**
 * Inject day-based batch apply buttons into the topmost cell of each column
 */
export function injectDayButtons(): void {
  // Skip if already injected
  if (document.querySelector(`.${CSS_CLASSES.DAY_BTN_GROUP}`)) {
    return;
  }

  const cells = Array.from(document.querySelectorAll(SELECTORS.SHIFT_CELL)) as HTMLElement[];

  if (cells.length === 0) {
    return;
  }

  const columnGroups = groupCellsByColumn(cells);

  columnGroups.forEach((group) => {
    const [topCell] = group.elements;

    if (!topCell) {
      return;
    }

    // Create button group container
    const container = document.createElement("div");

    container.className = CSS_CLASSES.DAY_BTN_GROUP;

    // Create and append buttons
    container.appendChild(createPresetDayButton(group.left));
    container.appendChild(createHolidayDayButton(group.left));

    topCell.appendChild(container);
  });
}

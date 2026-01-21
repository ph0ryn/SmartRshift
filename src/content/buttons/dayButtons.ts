/**
 * Day-based batch apply buttons component
 */

import { handleHolidayApply } from "./holidayButton";
import { handleShiftApply } from "./shiftButton";
import { CSS_CLASSES, ICONS, SELECTORS } from "../../constants";

import type { ColumnGroup } from "../../types";

/**
 * Get day of week from cell (0-6)
 */
function getDayOfWeek(cell: HTMLElement): number | null {
  const btn = cell.querySelector(SELECTORS.APPLY_BUTTON) as HTMLButtonElement | null;

  if (!btn?.id) {
    return null;
  }

  // "shift_shinsei" = 13 characters
  const day = parseInt(btn.id.slice(13), 10);

  return Number.isNaN(day) ? null : day % 7;
}

/**
 * Group cells by day of week
 */
function groupCellsByColumn(cells: HTMLElement[]): ColumnGroup[] {
  const groups: ColumnGroup[] = [];

  cells.forEach((cell) => {
    const dayOfWeek = getDayOfWeek(cell);

    if (dayOfWeek === null) {
      return;
    }

    // Find existing group with same day of week
    let group = groups.find((g) => g.left === dayOfWeek);

    if (!group) {
      group = { elements: [], left: dayOfWeek };
      groups.push(group);
    }

    group.elements.push(cell);
  });

  // Sort groups by day of week
  groups.sort((a, b) => a.left - b.left);

  return groups;
}

/**
 * Get cells with the same day of week
 */
function getCellsInColumn(targetDayOfWeek: number): HTMLElement[] {
  const currentCells = Array.from(document.querySelectorAll(SELECTORS.SHIFT_CELL)) as HTMLElement[];

  return currentCells.filter((cell) => {
    const dayOfWeek = getDayOfWeek(cell);

    if (dayOfWeek === null) {
      return false;
    }

    const applyBtn = cell.querySelector(SELECTORS.APPLY_BUTTON) as HTMLButtonElement | null;
    const isEnabled = applyBtn && !applyBtn.classList.contains("opacity");

    return isEnabled && dayOfWeek === targetDayOfWeek;
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
function createPresetDayButton(dayOfWeek: number): HTMLButtonElement {
  const btn = document.createElement("button");

  btn.className = `${CSS_CLASSES.DAY_BTN} ${CSS_CLASSES.DAY_BTN_PRESET}`;
  btn.textContent = ICONS.SHIFT;
  btn.title = "この曜日に一括適用";

  btn.onclick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const cells = getCellsInColumn(dayOfWeek);
    const targetCells = sortByVerticalPosition(cells);
    // let count = 0;

    for (const el of targetCells) {
      if (el.querySelector(`.${CSS_CLASSES.SHIFT_BTN}`)) {
        try {
          await handleShiftApply(el);
          // count++;
        } catch (err) {
          console.error("Apply failed for cell", err);
        }
      }
    }

    // alert(`${count}件の処理が完了しました`);
  };

  return btn;
}

/**
 * Create holiday apply button for day column
 */
function createHolidayDayButton(dayOfWeek: number): HTMLButtonElement {
  const btn = document.createElement("button");

  btn.className = `${CSS_CLASSES.DAY_BTN} ${CSS_CLASSES.DAY_BTN_HOLIDAY}`;
  btn.textContent = ICONS.HOLIDAY;
  btn.title = "この曜日を全て希望休に";

  btn.onclick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const targetCells = sortByVerticalPosition(getCellsInColumn(dayOfWeek));
    // let count = 0;

    for (const el of targetCells) {
      if (el.querySelector(`.${CSS_CLASSES.SHIFT_BTN}`)) {
        try {
          await handleHolidayApply(el);
          // count++;
        } catch (err) {
          console.error("Apply failed for cell", err);
        }
      }
    }

    // alert(`${count}件の処理が完了しました`);
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
    console.error("No cells found");

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

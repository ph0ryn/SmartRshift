/**
 * CSS styles for SmartShift injected buttons
 */

import { CSS_CLASSES } from "../constants";

/**
 * CSS styles as template literal
 */
const BUTTON_STYLES = `
  .${CSS_CLASSES.SHIFT_BTN}, .${CSS_CLASSES.HOLIDAY_BTN} {
    align-items: center;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 50%;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    cursor: pointer;
    display: flex;
    font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif;
    font-size: 14px;
    height: 24px;
    justify-content: center;
    line-height: 1;
    padding: 0;
    position: absolute;
    right: 2px;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    width: 24px;
    z-index: 100;
  }

  .${CSS_CLASSES.SHIFT_BTN} {
    background: linear-gradient(135deg, #fff176 0%, #fdd835 100%);
    top: 2px;
  }

  .${CSS_CLASSES.HOLIDAY_BTN} {
    background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
    top: 30px;
  }

  .${CSS_CLASSES.DAY_BTN_GROUP} {
    display: flex;
    gap: 6px;
    justify-content: center;
    left: 0;
    pointer-events: none;
    position: absolute;
    top: -45px;
    width: 100%;
    z-index: 101;
  }

  .${CSS_CLASSES.DAY_BTN} {
    align-items: center;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 6px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.15);
    cursor: pointer;
    display: flex;
    font-size: 14px;
    height: 28px;
    justify-content: center;
    padding: 0;
    pointer-events: auto;
    transition: all 0.2s ease;
    width: 32px;
  }

  .${CSS_CLASSES.DAY_BTN}.${CSS_CLASSES.DAY_BTN_PRESET} {
    background: linear-gradient(135deg, #fff59d 0%, #fbc02d 100%);
  }

  .${CSS_CLASSES.DAY_BTN}.${CSS_CLASSES.DAY_BTN_HOLIDAY} {
    background: linear-gradient(135deg, #b2ebf2 0%, #4dd0e1 100%);
  }

  /* Hover Effects */
  .${CSS_CLASSES.SHIFT_BTN}:hover,
  .${CSS_CLASSES.HOLIDAY_BTN}:hover,
  .${CSS_CLASSES.DAY_BTN}:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.25);
    filter: brightness(1.05);
    transform: translateY(-1px) scale(1.05);
  }

  .${CSS_CLASSES.SHIFT_BTN}:active,
  .${CSS_CLASSES.HOLIDAY_BTN}:active,
  .${CSS_CLASSES.DAY_BTN}:active {
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    transform: translateY(1px) scale(0.95);
  }
`;

/**
 * Inject SmartShift styles into the document head
 */
export function injectStyles(): void {
  const style = document.createElement("style");

  style.id = "smartshift-styles";
  style.textContent = BUTTON_STYLES;
  document.head.appendChild(style);
}

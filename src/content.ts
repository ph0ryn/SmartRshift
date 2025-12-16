console.log("SmartShift Content Script Loaded");

let cachedPresets: any[] = [];
let cachedActivePresetId: string = "";

// ページ読み込み完了を待機
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function init() {
  console.log("SmartShift Initializing...");

  // キャッシュの初期化（読み取りのみ）
  chrome.storage.local.get(["presets", "activePresetId", "shiftPreset"], (items: any) => {
    cachedPresets = items.presets || [];
    cachedActivePresetId = items.activePresetId || "";

    // 旧データ互換
    if (!cachedPresets.length && items.shiftPreset) {
      cachedPresets = [items.shiftPreset];
    }

    injectButtons();
    injectDayButtons();
  });

  // 動的なDOM変更を監視
  const observer = new MutationObserver((mutations) => {
    let shouldInject = false;

    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        shouldInject = true;
      }
    });

    if (shouldInject) {
      injectButtons();
      injectDayButtons();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function injectButtons() {
  const shifts = document.querySelectorAll(".staffpage-plan-list-shift");

  shifts.forEach((shift, index) => {
    const el = shift as HTMLElement;

    // 既にボタンがある場合はスキップ
    if (el.querySelector(".smartshift-btn")) {
      return;
    }

    const applyBtn = el.querySelector(
      'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
    ) as HTMLButtonElement | null;

    if (!applyBtn || applyBtn.disabled) {
      return;
    }

    if (window.getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

    // データ属性でindexを持たせておく
    el.dataset.smartshiftIndex = index.toString();

    // シフト追加/変更ボタン (⚡️)
    const btn = document.createElement("button");

    btn.className = "smartshift-btn";
    btn.textContent = "⚡️";

    Object.assign(btn.style, {
      background: "#ffeb3b",
      border: "1px solid #999",
      borderRadius: "50%",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      cursor: "pointer",
      fontSize: "14px",
      height: "24px",
      lineHeight: "22px",
      padding: "0",
      position: "absolute",
      right: "2px",
      textAlign: "center",
      top: "2px",
      width: "24px",
      zIndex: "9999",
    });

    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      void handleShiftApply(el);
    };

    el.appendChild(btn);

    // 希望休ボタン (🏖️)
    const holidayBtn = document.createElement("button");

    holidayBtn.className = "smartshift-holiday-btn";
    holidayBtn.textContent = "🏖️";

    Object.assign(holidayBtn.style, {
      background: "#e0f7fa",
      border: "1px solid #999",
      borderRadius: "50%",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      cursor: "pointer",
      fontSize: "14px",
      height: "24px",
      lineHeight: "22px",
      padding: "0",
      position: "absolute",
      right: "2px",
      textAlign: "center",
      top: "28px", // ⚡️ボタンの下
      width: "24px",
      zIndex: "9999",
    });

    holidayBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      void handleHolidayApply(el);
    };

    el.appendChild(holidayBtn);
  });
}

// 曜日別一括ボタンの注入
function injectDayButtons() {
  if (document.querySelector(".smartshift-day-btn-group")) {
    return;
  }

  const cells = Array.from(document.querySelectorAll(".staffpage-plan-list-shift"));

  if (cells.length === 0) {
    return;
  }

  const colGroups: { left: number; elements: HTMLElement[] }[] = [];

  cells.forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    const left = Math.round(rect.left);

    let group = colGroups.find((g) => Math.abs(g.left - left) < 5);

    if (!group) {
      group = { elements: [], left };
      colGroups.push(group);
    }

    group.elements.push(cell as HTMLElement);
  });

  colGroups.sort((a, b) => a.left - b.left);

  colGroups.forEach((group) => {
    const [topCell] = group.elements;
    const rect = topCell.getBoundingClientRect();

    const pageTop = rect.top + window.scrollY;
    const pageLeft = rect.left + window.scrollX;

    const container = document.createElement("div");

    container.className = "smartshift-day-btn-group";

    Object.assign(container.style, {
      left: `${pageLeft}px`,
      position: "absolute",
      textAlign: "center",
      top: `${pageTop - 40}px`,
      width: `${rect.width}px`,
      zIndex: "10000",
    });

    const btnPreset = document.createElement("button");

    btnPreset.textContent = "⚡️";
    btnPreset.title = "この曜日に一括適用";

    Object.assign(btnPreset.style, {
      background: "#ffeb3b",
      border: "1px solid #ccc",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      height: "24px",
      marginRight: "4px",
      padding: 0,
      width: "24px",
    });

    btnPreset.onclick = async (e) => {
      e.stopPropagation();
      e.preventDefault();

      // クリック時に最新の要素を再取得（Stale Element対策）
      const currentCells = Array.from(
        document.querySelectorAll(".staffpage-plan-list-shift"),
      ) as HTMLElement[];
      const targetCells = currentCells.filter((cell) => {
        const rect = cell.getBoundingClientRect();
        // ボタンの左位置(group.left)と近いものを同じ列とみなす
        // かつ、申請ボタンが有効なもののみ対象とする
        const applyBtn = cell.querySelector(
          'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
        ) as HTMLButtonElement;
        const isEnabled = applyBtn && !applyBtn.disabled;

        return isEnabled && Math.abs(Math.round(rect.left) - group.left) < 10;
      });

      let count = 0;

      // 上から順に処理
      targetCells.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      for (const el of targetCells) {
        // ⚡️ボタンがあるセルのみを対象とする
        // (再検索してもクラス名は変わらない前提)
        if (el.querySelector(".smartshift-btn")) {
          try {
            await handleShiftApply(el);
            count++;
          } catch (e) {
            console.error("Apply failed for cell", e);
          }
        }
      }

      alert(`${count}件の処理が完了しました`);
    };

    const btnHoliday = document.createElement("button");

    btnHoliday.textContent = "🏖️";
    btnHoliday.title = "この曜日を全て希望休に";

    Object.assign(btnHoliday.style, {
      background: "#e0f7fa",
      border: "1px solid #ccc",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      height: "24px",
      padding: 0,
      width: "24px",
    });

    btnHoliday.onclick = async (e) => {
      e.stopPropagation();
      e.preventDefault();

      // クリック時に最新の要素を再取得（Stale Element対策）
      const currentCells = Array.from(
        document.querySelectorAll(".staffpage-plan-list-shift"),
      ) as HTMLElement[];
      const targetCells = currentCells.filter((cell) => {
        const rect = cell.getBoundingClientRect();
        const btn = cell.querySelector(
          'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
        ) as HTMLButtonElement;
        const isEnabled = btn && !btn.disabled;

        // 同じ列であるか判定
        return isEnabled && Math.abs(Math.round(rect.left) - group.left) < 10;
      });

      // 上から順に処理
      targetCells.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      let count = 0;

      for (const el of targetCells) {
        if (el.querySelector(".smartshift-btn")) {
          try {
            await handleHolidayApply(el);
            count++;
          } catch (e) {
            console.error("Apply failed for cell", e);
          }
        }
      }

      alert(`${count}件の処理が完了しました`);
    };

    container.appendChild(btnPreset);
    container.appendChild(btnHoliday);
    document.body.appendChild(container);
  });
}

// 個別シフト適用（Promise版）
async function handleShiftApply(shiftElement: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    let preset: any = null;

    // 1. キャッシュからActiveなものを探す
    if (cachedPresets && cachedActivePresetId) {
      preset = cachedPresets.find((p: any) => p.id === cachedActivePresetId);
    }

    // 2. なければ先頭を使う
    if (!preset && cachedPresets && cachedPresets.length > 0) {
      [preset] = cachedPresets;
    }

    // 3. それでもなければデフォルト値
    if (!preset) {
      preset = {
        endHour: "18",
        endMinute: "00",
        shiftType: "1",
        startHour: "09",
        startMinute: "00",
      };
    }

    const applyBtn = shiftElement.querySelector(
      'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
    ) as HTMLElement;

    if (!applyBtn) {
      resolve();

      return;
    }

    // UI上のボタンクリック（初回）
    applyBtn.click();

    // モーダル操作待機（ボタン要素も渡して再試行可能にする）
    waitForModalAndApply(preset, applyBtn)
      .then(() => {
        resolve();
      })
      .catch(reject);
  });
}

async function handleHolidayApply(shiftElement: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const preset = { shiftType: "HOLIDAY" };
    const applyBtn = shiftElement.querySelector(
      'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
    ) as HTMLElement;

    if (!applyBtn) {
      resolve();

      return;
    }

    applyBtn.click();
    waitForModalAndApply(preset, applyBtn).then(resolve).catch(reject);
  });
}

function waitForModalAndApply(preset: any, triggerBtn?: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const getModal = () => document.getElementById("popup") || document.querySelector(".modal");

    // 既に開いている場合の即時チェック
    const initialModal = getModal();

    if (initialModal && window.getComputedStyle(initialModal).display !== "none") {
      try {
        applyValuesToModal(initialModal as HTMLElement, preset);
        waitForModalClose(initialModal as HTMLElement, resolve);

        return;
      } catch (e) {
        console.error("Failed to apply to existing modal", e);
      }
    }

    const checkVisible = setInterval(() => {
      attempts++;

      const modal = getModal();

      // 15回（1.5秒）待ってもモーダルが出ない＆トリガーボタンがある場合、もう一度押す
      if (!modal || window.getComputedStyle(modal).display === "none") {
        if (attempts === 15 && triggerBtn) {
          triggerBtn.click();
        }

        if (attempts > 50) {
          // 5秒待ってもダメならエラー
          clearInterval(checkVisible);

          reject(new Error("Modal open timeout"));

          return;
        }

        return;
      }

      const style = window.getComputedStyle(modal);
      const isVisible =
        style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";

      if (isVisible) {
        clearInterval(checkVisible);

        try {
          applyValuesToModal(modal as HTMLElement, preset);
          waitForModalClose(modal as HTMLElement, resolve);
        } catch (e) {
          reject(e);
        }
      }
    }, 100);
  });
}

// モーダルが閉じるのを待つ
function waitForModalClose(modal: HTMLElement, resolve: () => void) {
  let attempts = 0;
  const checkHidden = setInterval(() => {
    attempts++;

    if (attempts > 50) {
      clearInterval(checkHidden);
      resolve();

      return;
    }

    const isVisible =
      (modal.style.display !== "none" && modal.classList.contains("in")) ||
      window.getComputedStyle(modal).display === "block";

    if (!isVisible) {
      clearInterval(checkHidden);
      resolve(); // 閉じたので完了
    }
  }, 100);
}

function applyValuesToModal(modal: HTMLElement, preset: any) {
  const setSelect = (id: string, value: string): boolean => {
    const el = modal.querySelector(`#${id}`) as HTMLSelectElement;

    if (el) {
      el.value = value;
      el.dispatchEvent(new Event("change"));

      return true;
    }

    console.warn(`Element #${id} not found.`);

    return false;
  };

  if (preset.shiftType === "HOLIDAY") {
    const keywords = ["希望休", "公休", "休日", "休み", "休暇", "有給", "欠勤"];
    let found = false;

    const labels = Array.from(modal.querySelectorAll("label"));
    const targetLabel = labels.find((l) => keywords.some((k) => l.innerText.includes(k)));

    if (targetLabel) {
      const radioId = targetLabel.getAttribute("for");
      let radio: HTMLInputElement | null = null;

      if (radioId) {
        radio = modal.querySelector(`#${radioId}`) as HTMLInputElement;
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

    if (!found) {
      const selects = Array.from(modal.querySelectorAll("select"));

      for (const select of selects) {
        const options = Array.from(select.options);
        const targetOption = options.find((opt) => keywords.some((k) => opt.text.includes(k)));

        if (targetOption) {
          select.value = targetOption.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          found = true;
          break;
        }
      }
    }

    if (!found) {
      console.error("Holiday element not found.");

      if (!document.hidden) {
        // ループ中はアラート出すと止まるので、コンソールのみにする？
        // いったんアラート出すが、要調整
        // alert(`「希望休」の項目が見つかりませんでした。`);
      }

      throw new Error("Holiday element not found");
    }
  } else {
    const r1 = setSelect("popup_from_hour", preset.startHour);
    const r2 = setSelect("popup_from_minutes", preset.startMinute);
    const r3 = setSelect("popup_to_hour", preset.endHour);
    const r4 = setSelect("popup_to_minutes", preset.endMinute);

    if (!r1 || !r2 || !r3 || !r4) {
      const msg = "シフト時間の入力欄が見つかりませんでした。";

      console.error(msg);

      throw new Error("Time input elements not found");
    }

    const typeRadio = modal.querySelector(
      `input[name="popup_shift_type"][value="${preset.shiftType}"]`,
    ) as HTMLInputElement;

    if (typeRadio) {
      typeRadio.checked = true;
      typeRadio.dispatchEvent(new Event("change"));
    }
  }

  setTimeout(() => {
    const submitBtn = modal.querySelector("#pupup_change") as HTMLElement;

    if (submitBtn) {
      submitBtn.click();
    } else {
      console.error("Submit button not found");
      alert("登録ボタン(#pupup_change)が見つかりませんでした。");
    }
  }, 100);
}

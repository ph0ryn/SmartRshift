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

    if (!applyBtn) {
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
      handleShiftApply(el);
    };

    el.appendChild(btn);

    // 希望休ボタン (🏖️)
    const holidayBtn = document.createElement("button");

    holidayBtn.className = "smartshift-holiday-btn";
    holidayBtn.textContent = "🏖️";

    Object.assign(holidayBtn.style, {
      position: "absolute",
      top: "28px", // ⚡️ボタンの下
      right: "2px",
      zIndex: "9999",
      background: "#e0f7fa",
      border: "1px solid #999",
      borderRadius: "50%",
      cursor: "pointer",
      fontSize: "14px",
      width: "24px",
      height: "24px",
      padding: "0",
      lineHeight: "22px",
      textAlign: "center",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    });

    holidayBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleHolidayApply(el);
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
    const topCell = group.elements[0];
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

    btnPreset.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();

      showCustomConfirm(
        `【出勤】\n${group.elements.length}件のシフトを一括適用しますか？`,
        async () => {
          let count = 0;

          for (const el of group.elements) {
            // ⚡️ボタンがあるセルのみを対象とする
            if (el.querySelector(".smartshift-btn")) {
              try {
                // awaitすることで「モーダルが開く→閉じる」まで待つ
                await handleShiftApply(el, true);
                count++;
              } catch (e) {
                console.error("Apply failed for cell", e);
              }
            }
          }

          alert(`${count}件の処理が完了しました`);
        },
      );
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

    btnHoliday.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();

      showCustomConfirm(`【希望休】\n${group.elements.length}件を一括申請しますか？`, async () => {
        let count = 0;

        for (const el of group.elements) {
          if (el.querySelector(".smartshift-btn")) {
            try {
              await handleHolidayApply(el, true);
              count++;
            } catch (e) {
              console.error("Apply failed for cell", e);
            }
          }
        }

        alert(`${count}件の処理が完了しました`);
      });
    };

    container.appendChild(btnPreset);
    container.appendChild(btnHoliday);
    document.body.appendChild(container);
  });
}

function showCustomConfirm(message: string, onConfirm: () => void) {
  const existing = document.getElementById("smartshift-confirm-dialog");

  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement("div");

  overlay.id = "smartshift-confirm-dialog";

  Object.assign(overlay.style, {
    alignItems: "center",
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    height: "100%",
    justifyContent: "center",
    left: "0",
    position: "fixed",
    top: "0",
    width: "100%",
    zIndex: "999999",
  });

  overlay.onclick = (e) => e.stopPropagation();

  const dialog = document.createElement("div");

  Object.assign(dialog.style, {
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    maxWidth: "400px",
    padding: "20px",
    textAlign: "center",
    whiteSpace: "pre-wrap",
  });

  const msgEl = document.createElement("p");

  msgEl.textContent = message;
  msgEl.style.marginBottom = "20px";
  msgEl.style.fontSize = "16px";
  msgEl.style.fontWeight = "bold";

  const btnGroup = document.createElement("div");

  btnGroup.style.display = "flex";
  btnGroup.style.justifyContent = "center";
  btnGroup.style.gap = "10px";

  const cancelBtn = document.createElement("button");

  cancelBtn.textContent = "いいえ";

  Object.assign(cancelBtn.style, {
    background: "#f3f4f6",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
    padding: "8px 16px",
  });

  cancelBtn.onclick = () => overlay.remove();

  const okBtn = document.createElement("button");

  okBtn.textContent = "はい（実行）";

  Object.assign(okBtn.style, {
    background: "#2563eb",
    border: "none",
    borderRadius: "4px",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
    padding: "8px 16px",
  });

  okBtn.onclick = () => {
    overlay.remove();
    onConfirm();
  };

  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(okBtn);

  dialog.appendChild(msgEl);
  dialog.appendChild(btnGroup);
  overlay.appendChild(dialog);

  document.body.appendChild(overlay);
}

// 個別シフト適用（Promise版）
async function handleShiftApply(shiftElement: HTMLElement, isAuto = false): Promise<void> {
  return new Promise((resolve, reject) => {
    let preset: any = null;

    if (cachedPresets && cachedActivePresetId) {
      preset = cachedPresets.find((p: any) => p.id === cachedActivePresetId);
    } else if (cachedPresets.length > 0) {
      preset = cachedPresets[0];
    } else {
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
    );

    if (!applyBtn) {
      console.warn("Shift application button not found in cell, skipping.");
      resolve();

      return;
    }

    if (!preset && !isAuto) {
      alert("プリセットが見つかりません。Popupから設定を追加して選択してください。");
      reject(new Error("No preset"));

      return;
    }

    (applyBtn as HTMLElement).click();

    // モーダル操作待機とモーダル閉塞待機を含む
    waitForModalAndApply(preset).then(resolve).catch(reject);
  });
}

async function handleHolidayApply(shiftElement: HTMLElement, isAuto = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const preset = { shiftType: "HOLIDAY" };
    const applyBtn = shiftElement.querySelector(
      'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
    );

    if (!applyBtn) {
      console.warn("Shift application button not found for holiday, skipping.");
      resolve();

      return;
    }

    (applyBtn as HTMLElement).click();
    waitForModalAndApply(preset).then(resolve).catch(reject);
  });
}

function waitForModalAndApply(preset: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById("popup");

    if (!modal) {
      setTimeout(() => waitForModalAndApply(preset).then(resolve).catch(reject), 100);

      return;
    }

    let attempts = 0;
    const checkVisible = setInterval(() => {
      attempts++;

      if (attempts > 50) {
        clearInterval(checkVisible);
        console.error("Modal open timeout");
        reject(new Error("Modal open timeout"));

        return;
      }

      const isVisible =
        (modal.style.display !== "none" && modal.classList.contains("in")) ||
        window.getComputedStyle(modal).display === "block";

      if (isVisible) {
        clearInterval(checkVisible);

        try {
          // モーダル操作を行い、送信ボタンを押す
          applyValuesToModal(modal, preset);

          // 【重要】モーダルが閉じるまで待機する
          waitForModalClose(modal, resolve, reject);
        } catch (e) {
          reject(e);
        }
      }
    }, 100);
  });
}

// モーダルが閉じるのを待つ
function waitForModalClose(modal: HTMLElement, resolve: () => void, reject: (err: any) => void) {
  let attempts = 0;
  const checkHidden = setInterval(() => {
    attempts++;

    if (attempts > 50) {
      // 5秒待っても閉じない場合はエラーとして次に進む（or 成功扱いにするか判断）
      // ここではアラートが出ている等の可能性もあるが、一旦成功として処理を進める（ループ止めたくないため）
      clearInterval(checkHidden);
      console.warn("Modal close timeout, resolving anyway.");
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

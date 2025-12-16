console.log("SmartShift Content Script Loaded");

// 連続処理のためのキューシステム
class ExecutionQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  enqueue(task: () => Promise<void>) {
    this.queue.push(task);
    this.process();
  }

  private async process() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();

      if (task) {
        try {
          await task();
        } catch (e) {
          console.error("Task failed:", e);
        }

        // タスク間に少しインターバルを置く（システムの負荷軽減とUI安定化）
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    this.isProcessing = false;
  }
}

const queue = new ExecutionQueue();

// ページ読み込み完了を待機
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function init() {
  console.log("SmartShift Initializing...");
  injectButtons();
  injectDayButtons();

  // 動的なDOM変更を監視
  const observer = new MutationObserver((mutations) => {
    let shouldInject = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldInject = true;
        break;
      }
    }

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
  // console.log(`Found ${shifts.length} shift cells.`); // ログ過多になるのでコメントアウト

  shifts.forEach((shift) => {
    const el = shift as HTMLElement;

    // 既にボタンがある場合はスキップ
    if (el.querySelector(".smartshift-btn")) {
      return;
    }

    // 申請ボタンが有効かチェック
    const applyBtn = el.querySelector(
      'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
    ) as HTMLButtonElement | null;

    // 申請ボタンがない、またはdisabledの場合はスキップ
    if (!applyBtn || applyBtn.disabled) {
      return;
    }

    if (window.getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

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

    // クリックイベントの伝播を止める（親の既存イベントを発火させないため）
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      // 単発実行もキュー経由で行うことで安全性を確保
      queue.enqueue(() => handleShiftApply(el));
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
      queue.enqueue(() => handleHolidayApply(el));
    };

    el.appendChild(holidayBtn);
  });
}

// 曜日別一括ボタンの注入
function injectDayButtons() {
  // 既に注入済みならスキップ（ラフな判定）
  if (document.querySelector(".smartshift-day-btn")) {
    return;
  }

  // カレンダーの最初の7つのセル（またはヘッダー）を探す
  // rshiftの構造依存: .staffpage-plan-list-shift がカレンダーセル
  const cells = Array.from(document.querySelectorAll(".staffpage-plan-list-shift"));

  if (cells.length === 0) {
    return;
  }

  // 最初の7つを取得（カレンダーの1行目と仮定）
  // 注意: rshiftのDOM構造によってはこれが期待通りでない可能性があるため、
  // X座標がユニークなものを抽出するロジックにするのが安全

  // ここではシンプルに、全てのセルのgetBoundingClientRectを取り、
  // left座標でグループ化する
  const colGroups: { left: number; elements: HTMLElement[] }[] = [];

  cells.forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    // 誤差吸収のため整数丸め
    const left = Math.round(rect.left);

    let group = colGroups.find((g) => Math.abs(g.left - left) < 5);

    if (!group) {
      group = { elements: [], left };
      colGroups.push(group);
    }

    group.elements.push(cell as HTMLElement);
  });

  // 左から順にソート
  colGroups.sort((a, b) => a.left - b.left);

  // 各カラムの上にボタンを配置
  colGroups.forEach((group) => {
    // その列の最初の要素（一番上）
    // elementsはDOM順なので、Y座標でのソートが必要かもしれないが、通常はDOM順で上から来る
    const topCell = group.elements[0];
    const rect = topCell.getBoundingClientRect();

    // 基準点はページ絶対座標
    const pageTop = rect.top + window.scrollY;
    const pageLeft = rect.left + window.scrollX;

    const btn = document.createElement("button");

    btn.className = "smartshift-day-btn";
    btn.textContent = "⬇️";
    btn.title = "この曜日に一括適用";

    Object.assign(btn.style, {
      position: "absolute",
      top: `${pageTop - 35}px`, // セルの35px上
      left: `${pageLeft + rect.width / 2 - 15}px`, // 中央寄せ
      zIndex: "10000",
      width: "30px",
      height: "30px",
      borderRadius: "4px",
      border: "1px solid #ccc",
      background: "#fff",
      cursor: "pointer",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    });

    btn.onclick = (e) => {
      e.stopPropagation();

      if (!confirm(`${group.elements.length}件のシフトを一括適用しますか？`)) {
        return;
      }

      group.elements.forEach((el) => {
        // 有効なセル（ボタンが出ているセル = 編集可能）のみ対象
        if (el.querySelector(".smartshift-btn")) {
          queue.enqueue(() => handleShiftApply(el));
        }
      });
    };

    document.body.appendChild(btn);
  });
}

declare const chrome: any;

// 個別シフト適用（Promise版）
async function handleShiftApply(shiftElement: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["presets", "activePresetId", "shiftPreset"], (items: any) => {
      let preset: any = null;

      if (items.presets && items.activePresetId) {
        preset = items.presets.find((p: any) => p.id === items.activePresetId);
      } else if (items.shiftPreset) {
        preset = items.shiftPreset;
      } else {
        preset = {
          endHour: "18",
          endMinute: "00",
          shiftType: "1",
          startHour: "09",
          startMinute: "00",
        };
      }

      if (!preset) {
        alert("プリセットが見つかりません。Popupから設定を追加して選択してください。");
        reject(new Error("Preset not found"));

        return;
      }

      const applyBtn = shiftElement.querySelector(
        'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
      );

      if (!applyBtn) {
        // ボタンがない（編集中など）場合はスキップ
        console.warn("Shift application button not found in cell, skipping.");
        resolve();

        return;
      }

      (applyBtn as HTMLElement).click();

      // モーダル操作待機
      waitForModalAndApply(preset).then(resolve).catch(reject);
    });
  });
}

async function handleHolidayApply(shiftElement: HTMLElement): Promise<void> {
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
        // 5秒タイムアウト
        clearInterval(checkVisible);
        console.error("Modal open timeout");
        reject(new Error("Modal open timeout"));

        return;
      }

      if (
        (modal.style.display !== "none" && modal.classList.contains("in")) ||
        window.getComputedStyle(modal).display === "block"
      ) {
        clearInterval(checkVisible);

        // 適用処理
        try {
          applyValuesToModal(modal, preset);
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    }, 100);
  });
}

function applyValuesToModal(modal: HTMLElement, preset: any) {
  const setSelect = (id: string, value: string) => {
    const el = modal.querySelector(`#${id}`) as HTMLSelectElement;

    if (el) {
      el.value = value;
      el.dispatchEvent(new Event("change"));
    }
  };

  if (preset.shiftType === "HOLIDAY") {
    // 希望休の判定キーワード
    const keywords = ["希望休", "公休", "休日", "休み", "休暇", "有給", "欠勤"];
    let found = false;

    // 1. ラジオボタン (Label検索)
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
        radio.click(); // clickも発火
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true })); // bubbles追加
        found = true;
      }
    }

    // 2. セレクトボックス (Option検索) - ラジオボタンで見つからなかった場合
    if (!found) {
      const selects = Array.from(modal.querySelectorAll("select"));

      // ShiftTypeっぽい名前のselectを探すか、あるいは全てのselectのoptionを洗う
      // ここではnameに"type"や"shift"が含まれるものを優先、あるいは全てのselectを見る
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

      alert(
        `「希望休」などの項目が自動検出できませんでした。\n検証キーワード: ${keywords.join(", ")}`,
      );

      return;
    }
  } else {
    // 通常シフト適用
    setSelect("popup_from_hour", preset.startHour);
    setSelect("popup_from_minutes", preset.startMinute);
    setSelect("popup_to_hour", preset.endHour);
    setSelect("popup_to_minutes", preset.endMinute);

    // シフトタイプ（現状は "1" = 出勤 固定）
    // もしラジオボタンなら
    const typeRadio = modal.querySelector(
      `input[name="popup_shift_type"][value="${preset.shiftType}"]`,
    ) as HTMLInputElement;

    if (typeRadio) {
      typeRadio.checked = true;
      typeRadio.dispatchEvent(new Event("change"));
    }
  }

  // 少し待ってから登録(変更)ボタンを押す(React/Vueなどイベント伝播待ち考慮)
  setTimeout(() => {
    const submitBtn = modal.querySelector("#pupup_change") as HTMLElement;

    if (submitBtn) {
      submitBtn.click();
    } else {
      console.error("Submit button not found");
    }
  }, 100);
}

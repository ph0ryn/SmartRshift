console.log("SmartShift Content Script Loaded");

type JobType = "PRESET" | "HOLIDAY";

interface Job {
  index: number;
  type: JobType;
}

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

  // ページロード時にキューに残っているジョブがあれば処理再開
  processQueue();

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

// ジョブを追加して処理開始（Storage使用）
function enqueueJobs(jobs: Job[]) {
  chrome.storage.local.get("jobQueue", (items: any) => {
    const currentQueue = items.jobQueue || [];
    const newQueue = currentQueue.concat(jobs);

    chrome.storage.local.set({ jobQueue: newQueue }, () => {
      processQueue();
    });
  });
}

// キューの処理（永続化対応）
function processQueue() {
  chrome.storage.local.get("jobQueue", (items: any) => {
    const queue: Job[] = items.jobQueue || [];

    if (queue.length === 0) {
      return;
    }

    const job = queue[0];

    // 対象要素の特定
    const shifts = document.querySelectorAll(".staffpage-plan-list-shift");
    const target = shifts[job.index] as HTMLElement;

    if (!target) {
      console.warn(`Target shift cell at index ${job.index} not found. Skipping.`);
      finishJobAndContinue(queue);

      return;
    }

    // 処理実行
    executeJob(target, job)
      .then(() => {
        // 成功した場合（保存ボタン押下後）
        // リロード待ちを行い、リロードされなければ次へ
        finishJobAndContinue(queue);
      })
      .catch((err) => {
        console.error("Job failed:", err);
        // 失敗したらスキップして次へ
        finishJobAndContinue(queue);
      });
  });
}

function finishJobAndContinue(currentQueue: Job[]) {
  // 先頭を削除して保存
  const nextQueue = currentQueue.slice(1);

  chrome.storage.local.set({ jobQueue: nextQueue }, () => {
    // まだ残っていれば、リロードされなかった場合に備えて次を実行
    if (nextQueue.length > 0) {
      // ページ遷移（リロード）を少し待つ
      // リロードされれば init() が呼ばれるので、ここのタイマーはキャンセルされる（ページ破棄される）
      setTimeout(() => {
        // ページが生きていれば次を実行
        if (!document.hidden) {
          processQueue();
        }
      }, 1500); // 少し長めに待つ
    } else {
      setTimeout(() => {
        alert("一括処理が完了しました🎉");
      }, 500);
    }
  });
}

async function executeJob(target: HTMLElement, job: Job): Promise<void> {
  if (job.type === "PRESET") {
    return handleShiftApply(target, true); // true = 自動実行モード
  } else {
    return handleHolidayApply(target, true);
  }
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

  const colGroups: { left: number; elements: HTMLElement[]; indices: number[] }[] = [];

  cells.forEach((cell, index) => {
    const rect = cell.getBoundingClientRect();
    const left = Math.round(rect.left);

    let group = colGroups.find((g) => Math.abs(g.left - left) < 5);

    if (!group) {
      group = { elements: [], indices: [], left };
      colGroups.push(group);
    }

    group.elements.push(cell as HTMLElement);
    // 元のNodeList内でのインデックスを保存
    group.indices.push(index);
  });

  colGroups.sort((a, b) => a.left - b.left);

  colGroups.forEach((group) => {
    const topCell = group.elements[0];
    const rect = topCell.getBoundingClientRect();

    const pageTop = rect.top + window.scrollY;
    const pageLeft = rect.left + window.scrollX;

    // ボタンコンテナ
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

    // 一括適用ボタン (⚡️)
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

      if (
        !confirm(
          `【出勤】\n${group.elements.length}件のシフトを一括適用しますか？\n※ページのリロードを伴います`,
        )
      ) {
        return;
      }

      const jobs: Job[] = [];

      group.elements.forEach((el, i) => {
        // ⚡️ボタンがあるセルのみを対象とする
        if (el.querySelector(".smartshift-btn")) {
          jobs.push({ index: group.indices[i], type: "PRESET" });
        }
      });

      enqueueJobs(jobs);
    };

    // 希望休一括ボタン (🏖️)
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

      if (
        !confirm(
          `【希望休】\n${group.elements.length}件を一括申請しますか？\n※ページのリロードを伴います`,
        )
      ) {
        return;
      }

      const jobs: Job[] = [];

      group.elements.forEach((el, i) => {
        // ⚡️ボタンがあるセルのみを対象とする
        if (el.querySelector(".smartshift-btn")) {
          jobs.push({ index: group.indices[i], type: "HOLIDAY" });
        }
      });

      enqueueJobs(jobs);
    };

    container.appendChild(btnPreset);
    container.appendChild(btnHoliday);
    document.body.appendChild(container);
  });
}

// 個別シフト適用（Promise版）
async function handleShiftApply(shiftElement: HTMLElement, isAuto = false): Promise<void> {
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

      const applyBtn = shiftElement.querySelector(
        'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
      );

      if (!applyBtn) {
        // ボタンがない（編集中など）場合はスキップ
        console.warn("Shift application button not found in cell, skipping.");
        resolve(); // エラーにはしない

        return;
      }

      if (!preset && !isAuto) {
        alert("プリセットが見つかりません。Popupから設定を追加して選択してください。");
        reject(new Error("No preset"));

        return;
      }

      (applyBtn as HTMLElement).click();

      // モーダル操作待機
      waitForModalAndApply(preset).then(resolve).catch(reject);
    });
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
      // まだDOMにない場合
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

      // 自動実行中はアラートを出さないほうが良いかもしれないが、エラーログは出す
      if (document.hidden) {
        // 簡易判定: バックグラウンド実行ならアラート出さない
        console.error("Failed to find holiday option in background");
      } else {
        alert(
          `「希望休」などの項目が自動検出できませんでした。\n検証キーワード: ${keywords.join(", ")}`,
        );
      }

      return;
    }
  } else {
    // 通常シフト適用
    setSelect("popup_from_hour", preset.startHour);
    setSelect("popup_from_minutes", preset.startMinute);
    setSelect("popup_to_hour", preset.endHour);
    setSelect("popup_to_minutes", preset.endMinute);

    // シフトタイプ（現状は "1" = 出勤 固定）
    const typeRadio = modal.querySelector(
      `input[name="popup_shift_type"][value="${preset.shiftType}"]`,
    ) as HTMLInputElement;

    if (typeRadio) {
      typeRadio.checked = true;
      typeRadio.dispatchEvent(new Event("change"));
    }
  }

  // 「一瞬で消える」対策：入力をユーザーが視認できるように、かつイベントの伝搬を確実にするため
  // 少し待ってから登録ボタンを押す
  setTimeout(() => {
    const submitBtn = modal.querySelector("#pupup_change") as HTMLElement;

    if (submitBtn) {
      submitBtn.click();
    } else {
      console.error("Submit button not found");
    }
  }, 500); // 500msのウェイト（前は100ms）
}

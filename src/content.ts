console.log("SmartShift Content Script Loaded");

// ページ読み込み完了を待機
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function init() {
  console.log("SmartShift Initializing...");
  injectButtons();

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
    // 既にボタンがある場合はスキップ
    if (shift.querySelector(".smartshift-btn")) {
      return;
    }

    // 申請ボタンが有効かチェック
    const applyBtn = shift.querySelector(
      'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
    ) as HTMLButtonElement | null;

    // 申請ボタンがない、またはdisabledの場合はスキップ
    if (!applyBtn || applyBtn.disabled) {
      return;
    }

    if (window.getComputedStyle(shift).position === "static") {
      shift.style.position = "relative";
    }

    const btn = document.createElement("button");

    btn.className = "smartshift-btn";
    btn.textContent = "⚡️";

    btn.style.cssText = `
      position: absolute;
      top: 2px;
      right: 2px;
      z-index: 9999;
      background: #ffeb3b;
      border: 1px solid #999;
      border-radius: 50%;
      cursor: pointer;
      font-size: 14px;
      width: 24px;
      height: 24px;
      padding: 0;
      line-height: 22px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    `;

    // クリックイベントの伝播を止める（親の既存イベントを発火させないため）
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleShiftApply(shift);
    });

    shift.appendChild(btn);
  });
}

declare const chrome: any;

// シフト適用のメインロジック
function handleShiftApply(shiftElement: Element) {
  // Storageからプリセット一覧とアクティブIDを取得
  chrome.storage.local.get(["presets", "activePresetId", "shiftPreset"], (items: any) => {
    let preset: any = null;

    // 新データ構造のチェック
    if (items.presets && items.activePresetId) {
      preset = items.presets.find((p: any) => p.id === items.activePresetId);
    }
    // フォールバック: 旧データまたはデフォルト
    else if (items.shiftPreset) {
      preset = items.shiftPreset;
    }
    // 完全なデフォルト
    else {
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

      return;
    }

    // 1. 既存の申請ボタンを探してクリック
    // ボタンは shiftElement 内にあるはずだが、構造が変わっている可能性もあるので注意深く探す
    // 直下の .staffpage-plan-list-shift-day > button ではなく、shift内容を表示しているボタン(id付き)を探す
    const applyBtn = shiftElement.querySelector(
      'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
    );

    if (!applyBtn) {
      console.error("Shift application button not found in cell.");
      alert("申請ボタンが見つかりませんでした。");

      return;
    }

    (applyBtn as HTMLElement).click();

    // 2. モーダルが開くのを待機して値をセット
    waitForModalAndApply(preset);
  });
}

function waitForModalAndApply(preset: any) {
  const modal = document.getElementById("popup");

  if (!modal) {
    // まだDOMにない場合は少し待つ
    setTimeout(() => waitForModalAndApply(preset), 100);

    return;
  }

  // モーダルが表示されているか確認（jQueryのmodal('show')などはdisplay:blockにするはず）
  // 完全に表示されるまで待つ（アニメーション考慮）
  const checkVisible = setInterval(() => {
    if (modal.style.display !== "none" && modal.classList.contains("in")) {
      // Bootstrap modal usually has 'in' class when visible
      clearInterval(checkVisible);
      applyValuesToModal(modal, preset);
    } else {
      // class 'in' がつかないタイプかもしれないので、display: block だけでもチェック
      if (window.getComputedStyle(modal).display === "block") {
        clearInterval(checkVisible);
        applyValuesToModal(modal, preset);
      }
    }
  }, 100);

  // タイムアウト設定（5秒）
  setTimeout(() => clearInterval(checkVisible), 5000);
}

function applyValuesToModal(modal: HTMLElement, preset: any) {
  // 3. 値をセット
  const setSelect = (id: string, value: string) => {
    const el = modal.querySelector(`#${id}`) as HTMLSelectElement;

    if (el) {
      el.value = value;
      el.dispatchEvent(new Event("change")); // イベント発火
    }
  };

  setSelect("popup_from_hour", preset.startHour);
  setSelect("popup_from_minutes", preset.startMinute);
  setSelect("popup_to_hour", preset.endHour);
  setSelect("popup_to_minutes", preset.endMinute);

  // シフトタイプ（出勤など）
  const typeRadio = modal.querySelector(
    `input[name="popup_shift_type"][value="${preset.shiftType}"]`,
  ) as HTMLInputElement;

  if (typeRadio) {
    typeRadio.checked = true;
    typeRadio.dispatchEvent(new Event("change"));
  }

  // 4. 保存ボタンを押す
  // 少しだけユーザーに「入力された」感を見せるか、即座に押すか。
  // 即座だと早すぎて不安になるかもしれないが、ツールなので効率優先で即座に。
  setTimeout(() => {
    const submitBtn = modal.querySelector("#pupup_change") as HTMLElement;

    if (submitBtn) {
      submitBtn.click();
    } else {
      console.error("Submit button not found");
    }
  }, 100); // わずかな遅延でJSの処理時間を確保
}

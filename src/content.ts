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

    // シフト追加/変更ボタン (⚡️)
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

    // 希望休ボタン (🏖️)
    const holidayBtn = document.createElement("button");

    holidayBtn.className = "smartshift-holiday-btn";
    holidayBtn.textContent = "🏖️";

    holidayBtn.style.cssText = `
      position: absolute;
      top: 28px; /* ⚡️ボタンの下 */
      right: 2px;
      z-index: 9999;
      background: #e0f7fa;
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

    holidayBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleHolidayApply(shift);
    });

    shift.appendChild(holidayBtn);
  });
}

declare const chrome: any;

function handleHolidayApply(shiftElement: Element) {
  const preset = {
    shiftType: "HOLIDAY",
  };

  const applyBtn = shiftElement.querySelector(
    'button[id^="shift_shinsei"], button[onclick*="fnShiftShinsei"]',
  );

  if (!applyBtn) {
    console.error("Shift application button not found in cell.");
    alert("申請ボタンが見つかりませんでした。");

    return;
  }

  (applyBtn as HTMLElement).click();
  waitForModalAndApply(preset);
}

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
    // まだモーダルDOMがない場合は少し待って再試行
    setTimeout(() => waitForModalAndApply(preset), 100);

    return;
  }

  // モーダルが表示(display: block や opacity, class="in"等)されるのを監視
  const checkVisible = setInterval(() => {
    if (modal.style.display !== "none" && modal.classList.contains("in")) {
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

  // 安全策: 5秒経っても開かなければ諦める
  setTimeout(() => clearInterval(checkVisible), 5000);
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

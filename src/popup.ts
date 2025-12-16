declare const chrome: any;

interface ShiftPreset {
  id: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  shiftType: string;
}

interface StorageData {
  presets: ShiftPreset[];
  activePresetId: string;
  shiftPreset?: any; // 旧データ用
}

// 時間の選択肢を生成
function populateTimeSelects() {
  const hours = Array.from({ length: 24 }, (unusedIdx, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  const createOptions = (id: string, values: string[]) => {
    const selector = document.getElementById(id) as HTMLSelectElement;

    if (!selector) {
      return;
    }

    values.forEach((val) => {
      const opt = document.createElement("option");

      opt.value = val;
      opt.textContent = val;
      selector.appendChild(opt);
    });
  };

  createOptions("startHour", hours);
  createOptions("startMinute", minutes);
  createOptions("endHour", hours);
  createOptions("endMinute", minutes);

  // デフォルト値をセット（少し使いやすく）
  (document.getElementById("startHour") as HTMLSelectElement).value = "09";
  (document.getElementById("endHour") as HTMLSelectElement).value = "18";
}

function renderPresets(data: StorageData) {
  const listEl = document.getElementById("presetList");
  const emptyState = document.getElementById("emptyState");

  if (!listEl) {
    return;
  }

  listEl.innerHTML = "";

  if (!data.presets || data.presets.length === 0) {
    if (emptyState) {
      emptyState.style.display = "block";
    }

    return;
  }

  if (emptyState) {
    emptyState.style.display = "none";
  }

  data.presets.forEach((preset) => {
    const item = document.createElement("div");

    item.className = "preset-item";

    // ラジオボタン + 時間表示
    const info = document.createElement("label");

    info.className = "preset-info";

    const radio = document.createElement("input");

    radio.type = "radio";
    radio.name = "activePreset";
    radio.value = preset.id;
    radio.checked = preset.id === data.activePresetId;
    radio.onchange = () => setActivePreset(preset.id);

    const time = document.createElement("span");

    time.className = "preset-time";
    time.textContent = `${preset.startHour}:${preset.startMinute} 〜 ${preset.endHour}:${preset.endMinute}`;

    info.appendChild(radio);
    info.appendChild(time);

    // 削除ボタン
    const deleteBtn = document.createElement("button");

    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = "&times;";
    deleteBtn.title = "削除";
    deleteBtn.onclick = () => deletePreset(preset.id);

    item.appendChild(info);
    item.appendChild(deleteBtn);
    listEl.appendChild(item);
  });
}

function loadData() {
  chrome.storage.local.get(null, (items: any) => {
    let data = items as StorageData;

    // マイグレーション: 旧データがある場合
    if (items.shiftPreset && (!data.presets || data.presets.length === 0)) {
      const old = items.shiftPreset;
      const newPreset: ShiftPreset = {
        endHour: old.endHour || "18",
        endMinute: old.endMinute || "00",
        id: Date.now().toString(),
        shiftType: old.shiftType || "1",
        startHour: old.startHour || "09",
        startMinute: old.startMinute || "00",
      };

      data = {
        activePresetId: newPreset.id,
        presets: [newPreset],
      };

      chrome.storage.local.set(data);
      chrome.storage.local.remove("shiftPreset"); // 旧データ削除
    } else if (!data.presets) {
      data = { activePresetId: "", presets: [] };
    }

    renderPresets(data);
  });
}

function setActivePreset(id: string) {
  chrome.storage.local.set({ activePresetId: id });
}

function addPreset() {
  const getVal = (id: string) => (document.getElementById(id) as HTMLSelectElement).value;

  const newPreset: ShiftPreset = {
    endHour: getVal("endHour"),
    endMinute: getVal("endMinute"),
    id: Date.now().toString(),
    shiftType: "1",
    startHour: getVal("startHour"),
    startMinute: getVal("startMinute"), // 現状は出勤固定
  };

  chrome.storage.local.get(null, (items: StorageData) => {
    const presets = items.presets || [];

    presets.push(newPreset);

    // 最初の1つなら自動選択
    let activeId = items.activePresetId;

    if (!activeId) {
      activeId = newPreset.id;
    }

    chrome.storage.local.set({ activePresetId: activeId, presets }, () => {
      loadData();
    });
  });
}

function deletePreset(id: string) {
  if (!confirm("このプリセットを削除しますか？")) {
    return;
  }

  chrome.storage.local.get(null, (items: StorageData) => {
    const presets = (items.presets || []).filter((p) => p.id !== id);
    let activeId = items.activePresetId;

    // 選択中のものを消したら、他の何か（なければ空）を選択状態に
    if (activeId === id) {
      activeId = presets.length > 0 ? presets[0].id : "";
    }

    chrome.storage.local.set({ activePresetId: activeId, presets }, () => {
      loadData();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateTimeSelects();
  loadData();
  document.getElementById("addBtn")?.addEventListener("click", addPreset);
});

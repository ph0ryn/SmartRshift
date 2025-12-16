declare const chrome: any;

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
}

// 設定を保存
function saveOptions() {
  const getVal = (id: string) => (document.getElementById(id) as HTMLSelectElement).value;

  const preset = {
    endHour: getVal("endHour"),
    endMinute: getVal("endMinute"),
    shiftType: "1",
    startHour: getVal("startHour"),
    startMinute: getVal("startMinute"), // 固定（出勤）
  };

  chrome.storage.local.set({ shiftPreset: preset }, () => {
    const status = document.getElementById("status");

    if (status) {
      status.textContent = "保存しました！";

      setTimeout(() => {
        status.textContent = "";
      }, 2000);
    }
  });
}

// 設定を復元
function restoreOptions() {
  chrome.storage.local.get(
    {
      shiftPreset: {
        endHour: "18",
        endMinute: "00",
        startHour: "09",
        startMinute: "00",
      },
    },
    (items) => {
      const preset = items.shiftPreset;
      const setVal = (id: string, val: string) => {
        const el = document.getElementById(id) as HTMLSelectElement;

        if (el) {
          el.value = val;
        }
      };

      setVal("startHour", preset.startHour);
      setVal("startMinute", preset.startMinute);
      setVal("endHour", preset.endHour);
      setVal("endMinute", preset.endMinute);
    },
  );
}

document.addEventListener("DOMContentLoaded", () => {
  populateTimeSelects();
  restoreOptions();
  document.getElementById("saveBtn")?.addEventListener("click", saveOptions);
});

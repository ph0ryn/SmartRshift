/**
 * Chrome Storage API wrapper with type safety
 */

import type { LegacyShiftPreset, ShiftPreset, StorageData } from "./types";

declare const chrome: {
  storage: {
    local: {
      get: (keys: string[] | null, callback: (items: Record<string, unknown>) => void) => void;
      set: (items: Record<string, unknown>, callback?: () => void) => void;
      remove: (keys: string | string[]) => void;
    };
    onChanged: {
      addListener: (
        callback: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
          namespace: string,
        ) => void,
      ) => void;
    };
  };
};

/**
 * Storage manager for type-safe Chrome Storage operations
 */
class StorageManager {
  private presets: ShiftPreset[] = [];
  private activePresetId: string = "";
  private initialized: boolean = false;

  /**
   * Initialize storage and set up change listeners
   */
  async initialize(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(["presets", "activePresetId", "shiftPreset"], (items) => {
        const presets = items.presets as ShiftPreset[] | undefined;
        const activePresetId = items.activePresetId as string | undefined;
        const legacyPreset = items.shiftPreset as LegacyShiftPreset | undefined;

        this.presets = presets || [];
        this.activePresetId = activePresetId || "";

        // Migrate legacy data if needed
        if (!this.presets.length && legacyPreset) {
          this.presets = [this.migrateLegacyPreset(legacyPreset)];
        }

        this.initialized = true;
        this.setupChangeListener();
        resolve();
      });
    });
  }

  /**
   * Set up listener for storage changes
   */
  private setupChangeListener(): void {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== "local") {
        return;
      }

      if (changes.presets?.newValue) {
        this.presets = changes.presets.newValue as ShiftPreset[];
      }

      if (changes.activePresetId?.newValue !== undefined) {
        this.activePresetId = changes.activePresetId.newValue as string;
      }
    });
  }

  /**
   * Convert legacy preset format to current format
   */
  private migrateLegacyPreset(legacy: LegacyShiftPreset): ShiftPreset {
    return {
      endHour: legacy.endHour || "18",
      endMinute: legacy.endMinute || "00",
      id: Date.now().toString(),
      shiftType: legacy.shiftType || "1",
      startHour: legacy.startHour || "09",
      startMinute: legacy.startMinute || "00",
    };
  }

  /**
   * Get the currently active preset
   */
  getActivePreset(): ShiftPreset | null {
    if (!this.activePresetId) {
      return null;
    }

    return this.presets.find((p) => p.id === this.activePresetId) || null;
  }

  /**
   * Get all presets
   */
  getAllPresets(): ShiftPreset[] {
    return [...this.presets];
  }

  /**
   * Get active preset ID
   */
  getActivePresetId(): string {
    return this.activePresetId;
  }

  /**
   * Check if storage is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Popup-specific storage operations
 */
export class PopupStorageManager {
  /**
   * Load all storage data for popup
   */
  async loadData(): Promise<StorageData> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        let data: StorageData = {
          activePresetId: (items.activePresetId as string) || "",
          presets: (items.presets as ShiftPreset[]) || [],
          shiftPreset: items.shiftPreset as LegacyShiftPreset | undefined,
        };

        // Migrate legacy data if needed
        if (data.shiftPreset && (!data.presets || data.presets.length === 0)) {
          const legacy = data.shiftPreset;
          const newPreset: ShiftPreset = {
            endHour: legacy.endHour || "18",
            endMinute: legacy.endMinute || "00",
            id: Date.now().toString(),
            shiftType: legacy.shiftType || "1",
            startHour: legacy.startHour || "09",
            startMinute: legacy.startMinute || "00",
          };

          data = {
            activePresetId: newPreset.id,
            presets: [newPreset],
          };

          chrome.storage.local.set(data as unknown as Record<string, unknown>);
          chrome.storage.local.remove("shiftPreset");
        }

        resolve(data);
      });
    });
  }

  /**
   * Set the active preset ID
   */
  setActivePreset(id: string): void {
    chrome.storage.local.set({ activePresetId: id });
  }

  /**
   * Add a new preset
   */
  async addPreset(preset: ShiftPreset): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        const presets = ((items.presets as ShiftPreset[]) || []).concat(preset);
        const activeId = (items.activePresetId as string) || preset.id;

        chrome.storage.local.set({ activePresetId: activeId, presets }, () => {
          resolve();
        });
      });
    });
  }

  /**
   * Delete a preset by ID
   */
  async deletePreset(id: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        const presets = ((items.presets as ShiftPreset[]) || []).filter((p) => p.id !== id);
        let activeId = items.activePresetId as string;

        // Select another preset if active one was deleted
        if (activeId === id) {
          activeId = presets.length > 0 ? presets[0]!.id : "";
        }

        chrome.storage.local.set({ activePresetId: activeId, presets }, () => {
          resolve();
        });
      });
    });
  }
}

/** Singleton instance for content script */
export const storage = new StorageManager();

/** Factory for popup storage manager */
export const createPopupStorage = (): PopupStorageManager => new PopupStorageManager();

import { ShieldSettings, ShieldStatistics } from './types';
import { DEFAULT_SETTINGS, DEFAULT_STATISTICS, STORAGE_KEYS } from './constants';

export class StorageService {
  public static async getSettings(): Promise<ShieldSettings> {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return { ...DEFAULT_SETTINGS };
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
  }

  public static async saveSettings(settings: Partial<ShieldSettings>): Promise<ShieldSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    }
    return updated;
  }

  public static async getStatistics(): Promise<ShieldStatistics> {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return { ...DEFAULT_STATISTICS };
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.STATISTICS);
    return { ...DEFAULT_STATISTICS, ...(result[STORAGE_KEYS.STATISTICS] || {}) };
  }

  public static async recordEvent(event: 'detected' | 'blocked' | 'recovered' | 'failed'): Promise<ShieldStatistics> {
    const stats = await this.getStatistics();
    stats[event] = (stats[event] || 0) + 1;
    stats.lastUpdated = Date.now();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.STATISTICS]: stats });
    }
    return stats;
  }

  public static async clearStatistics(): Promise<ShieldStatistics> {
    const cleared = { ...DEFAULT_STATISTICS, lastUpdated: Date.now() };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.STATISTICS]: cleared });
    }
    return cleared;
  }
}

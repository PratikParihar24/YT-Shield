import { StorageService } from '../shared/storage';
import { Logger } from '../shared/logger';
import { ExtensionMessage } from '../shared/types';

export class RuleManager {
  public static async updateRules(networkFilteringEnabled: boolean): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest) {
      Logger.warn('declarativeNetRequest API not available in this environment');
      return;
    }

    try {
      if (networkFilteringEnabled) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: ['youtube_rules'],
        });
        Logger.info('declarativeNetRequest ruleset youtube_rules enabled');
      } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: ['youtube_rules'],
        });
        Logger.info('declarativeNetRequest ruleset youtube_rules disabled');
      }
    } catch (err) {
      Logger.error('Failed to update declarativeNetRequest rulesets', err);
    }
  }
}

// Background Service Worker entry point
class ServiceWorker {
  public static init(): void {
    Logger.info('Service Worker initializing');

    // On Installed
    chrome.runtime.onInstalled.addListener(async (details) => {
      Logger.info('Extension installed/updated:', details.reason);
      const settings = await StorageService.getSettings();
      Logger.setLogging(settings.diagnosticLogging);
      await RuleManager.updateRules(settings.protectionEnabled && settings.networkFiltering);
    });

    // Message handler
    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      ServiceWorker.handleMessage(message)
        .then((response) => sendResponse(response))
        .catch((error) => {
          Logger.error('Error handling message:', error);
          sendResponse({ error: error.message });
        });
      return true; // Keep message channel open for async response
    });
  }

  private static async handleMessage(message: ExtensionMessage): Promise<unknown> {
    switch (message.type) {
      case 'GET_SETTINGS': {
        const settings = await StorageService.getSettings();
        return { type: 'SETTINGS_RESPONSE', settings };
      }

      case 'SET_PROTECTION': {
        const settings = await StorageService.saveSettings({ protectionEnabled: message.enabled });
        await RuleManager.updateRules(settings.protectionEnabled && settings.networkFiltering);
        return { type: 'SETTINGS_RESPONSE', settings };
      }

      case 'UPDATE_SETTINGS': {
        const settings = await StorageService.saveSettings(message.settings);
        if (message.settings.diagnosticLogging !== undefined) {
          Logger.setLogging(message.settings.diagnosticLogging);
        }
        if (message.settings.protectionEnabled !== undefined || message.settings.networkFiltering !== undefined) {
          await RuleManager.updateRules(settings.protectionEnabled && settings.networkFiltering);
        }
        return { type: 'SETTINGS_RESPONSE', settings };
      }

      case 'GET_STATS': {
        const stats = await StorageService.getStatistics();
        return { type: 'STATS_RESPONSE', stats };
      }

      case 'CLEAR_STATS': {
        const stats = await StorageService.clearStatistics();
        return { type: 'STATS_RESPONSE', stats };
      }

      case 'REPORT_DETECTION': {
        const stats = await StorageService.recordEvent('detected');
        Logger.info(`Detection reported for video ${message.videoId}, conf: ${message.confidence}`);
        return { success: true, stats };
      }

      case 'REPORT_RECOVERY': {
        const event = message.success ? 'recovered' : 'failed';
        const stats = await StorageService.recordEvent(event);
        Logger.info(`Recovery result: ${message.strategy} -> ${event}`);
        return { success: true, stats };
      }

      default:
        return { error: 'Unknown message type' };
    }
  }
}

ServiceWorker.init();

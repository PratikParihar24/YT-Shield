import { StorageService } from '../shared/storage';
import { ExtensionMessage, PlayerState, ShieldSettings, ShieldStatistics } from '../shared/types';

class PopupController {
  private settings: ShieldSettings | null = null;
  private stats: ShieldStatistics | null = null;
  private isYouTubeTab: boolean = false;
  private currentState: PlayerState = 'IDLE';

  // DOM Elements
  private statusDot = document.getElementById('statusDot') as HTMLElement;
  private tabStatusText = document.getElementById('tabStatusText') as HTMLElement;
  private toggleProtectionBtn = document.getElementById('toggleProtectionBtn') as HTMLButtonElement;
  private playerStateText = document.getElementById('playerStateText') as HTMLElement;
  private netFilterStatus = document.getElementById('netFilterStatus') as HTMLElement;
  private playerDetectStatus = document.getElementById('playerDetectStatus') as HTMLElement;
  private recoveryEngineStatus = document.getElementById('recoveryEngineStatus') as HTMLElement;
  private statDetected = document.getElementById('statDetected') as HTMLElement;
  private statRecovered = document.getElementById('statRecovered') as HTMLElement;
  private openSettingsBtn = document.getElementById('openSettingsBtn') as HTMLButtonElement;
  private toggleDiagnosticsBtn = document.getElementById('toggleDiagnosticsBtn') as HTMLButtonElement;
  private diagnosticsPanel = document.getElementById('diagnosticsPanel') as HTMLElement;
  private diagState = document.getElementById('diagState') as HTMLElement;
  private diagVideoId = document.getElementById('diagVideoId') as HTMLElement;
  private diagAttempts = document.getElementById('diagAttempts') as HTMLElement;
  private diagNetwork = document.getElementById('diagNetwork') as HTMLElement;

  public async init(): Promise<void> {
    this.bindEvents();
    await this.loadInitialData();
    await this.inspectCurrentTab();
  }

  private bindEvents(): void {
    this.toggleProtectionBtn.addEventListener('click', () => this.toggleProtection());
    this.openSettingsBtn.addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('src/options/options.html'));
      }
    });

    this.toggleDiagnosticsBtn.addEventListener('click', () => {
      this.diagnosticsPanel.classList.toggle('open');
    });
  }

  private async loadInitialData(): Promise<void> {
    this.settings = await StorageService.getSettings();
    this.stats = await StorageService.getStatistics();
    this.render();
  }

  private async inspectCurrentTab(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('youtube.com')) {
      this.isYouTubeTab = true;
      this.tabStatusText.textContent = 'Active on this tab';

      // Query content script for live status
      if (tab.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' } as ExtensionMessage);
          if (response && response.state) {
            this.currentState = response.state;
            this.diagVideoId.textContent = response.currentVideoId || 'None';
            this.render();
          }
        } catch {
          // Content script may not be loaded yet or page still loading
          this.currentState = 'IDLE';
        }
      }
    } else {
      this.isYouTubeTab = false;
      this.tabStatusText.textContent = 'YouTube not detected';
      this.playerStateText.textContent = 'Not active';
      this.statusDot.className = 'status-dot';
    }
  }

  private async toggleProtection(): Promise<void> {
    if (!this.settings) return;
    const newState = !this.settings.protectionEnabled;
    this.settings = await StorageService.saveSettings({ protectionEnabled: newState });

    // Inform background script to update rules
    chrome.runtime.sendMessage({
      type: 'SET_PROTECTION',
      enabled: newState,
    }).catch(() => {});

    this.render();
  }

  private render(): void {
    if (!this.settings) return;

    // Toggle Button
    this.toggleProtectionBtn.setAttribute('aria-checked', this.settings.protectionEnabled ? 'true' : 'false');
    if (this.settings.protectionEnabled) {
      this.toggleProtectionBtn.classList.add('on');
    } else {
      this.toggleProtectionBtn.classList.remove('on');
    }

    // Submodules
    this.netFilterStatus.textContent = this.settings.protectionEnabled && this.settings.networkFiltering ? 'ON' : 'OFF';
    this.playerDetectStatus.textContent = this.settings.protectionEnabled && this.settings.playerDetection ? 'ON' : 'OFF';
    this.recoveryEngineStatus.textContent = this.settings.protectionEnabled && this.settings.autoRecovery ? 'ON' : 'OFF';

    // Stats
    if (this.stats) {
      this.statDetected.textContent = this.stats.detected.toString();
      this.statRecovered.textContent = this.stats.recovered.toString();
    }

    // Tab state & status dot
    if (this.isYouTubeTab && this.settings.protectionEnabled) {
      this.statusDot.className = 'status-dot active';
      this.playerStateText.textContent = `● ${this.currentState}`;
      if (this.currentState === 'AD_DETECTED' || this.currentState === 'SUSPICIOUS') {
        this.statusDot.className = 'status-dot suspicious';
      } else if (this.currentState === 'RECOVERING') {
        this.statusDot.className = 'status-dot recovering';
      } else if (this.currentState === 'FAILED') {
        this.statusDot.className = 'status-dot error';
      }
    } else if (!this.settings.protectionEnabled) {
      this.statusDot.className = 'status-dot';
      this.playerStateText.textContent = 'Disabled';
    }

    // Diagnostics
    this.diagState.textContent = this.currentState;
    this.diagAttempts.textContent = `Limit: ${this.settings.maxAttempts}`;
    this.diagNetwork.textContent = this.settings.networkFiltering ? 'Active' : 'Disabled';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const controller = new PopupController();
  controller.init();
});

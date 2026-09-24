import { StorageService } from '../shared/storage';
import { ShieldSettings } from '../shared/types';

class OptionsController {
  private settings: ShieldSettings | null = null;

  // DOM Elements
  private optProtection = document.getElementById('optProtection') as HTMLButtonElement;
  private optPlayerDetect = document.getElementById('optPlayerDetect') as HTMLButtonElement;
  private optNetFilter = document.getElementById('optNetFilter') as HTMLButtonElement;
  private optAutoRecovery = document.getElementById('optAutoRecovery') as HTMLButtonElement;
  private optMaxAttempts = document.getElementById('optMaxAttempts') as HTMLSelectElement;
  private optLogging = document.getElementById('optLogging') as HTMLButtonElement;
  private btnClearStats = document.getElementById('btnClearStats') as HTMLButtonElement;
  private statusMessage = document.getElementById('statusMessage') as HTMLElement;

  public async init(): Promise<void> {
    this.settings = await StorageService.getSettings();
    this.bindEvents();
    this.render();
  }

  private bindEvents(): void {
    this.optProtection.addEventListener('click', () => this.toggle('protectionEnabled'));
    this.optPlayerDetect.addEventListener('click', () => this.toggle('playerDetection'));
    this.optNetFilter.addEventListener('click', () => this.toggle('networkFiltering'));
    this.optAutoRecovery.addEventListener('click', () => this.toggle('autoRecovery'));
    this.optLogging.addEventListener('click', () => this.toggle('diagnosticLogging'));

    this.optMaxAttempts.addEventListener('change', async () => {
      const val = parseInt(this.optMaxAttempts.value, 10);
      await this.updateSetting({ maxAttempts: val });
    });

    this.btnClearStats.addEventListener('click', async () => {
      await StorageService.clearStatistics();
      this.showStatus('Statistics cleared');
    });
  }

  private async toggle(key: keyof ShieldSettings): Promise<void> {
    if (!this.settings) return;
    const currentVal = !!this.settings[key];
    await this.updateSetting({ [key]: !currentVal });
  }

  private async updateSetting(partial: Partial<ShieldSettings>): Promise<void> {
    this.settings = await StorageService.saveSettings(partial);

    // Synchronize to background worker
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: partial,
    }).catch(() => {});

    this.render();
    this.showStatus('Saved');
  }

  private showStatus(msg: string): void {
    this.statusMessage.textContent = msg;
    setTimeout(() => {
      if (this.statusMessage.textContent === msg) {
        this.statusMessage.textContent = '';
      }
    }, 2000);
  }

  private render(): void {
    if (!this.settings) return;

    this.updateToggleBtn(this.optProtection, this.settings.protectionEnabled);
    this.updateToggleBtn(this.optPlayerDetect, this.settings.playerDetection);
    this.updateToggleBtn(this.optNetFilter, this.settings.networkFiltering);
    this.updateToggleBtn(this.optAutoRecovery, this.settings.autoRecovery);
    this.updateToggleBtn(this.optLogging, this.settings.diagnosticLogging);

    this.optMaxAttempts.value = this.settings.maxAttempts.toString();
  }

  private updateToggleBtn(btn: HTMLButtonElement, isOn: boolean): void {
    btn.setAttribute('aria-checked', isOn ? 'true' : 'false');
    if (isOn) {
      btn.classList.add('on');
    } else {
      btn.classList.remove('on');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const controller = new OptionsController();
  controller.init();
});

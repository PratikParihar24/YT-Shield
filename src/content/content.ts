import { AdDetector } from './detection/ad-detector';
import { RecoveryManager } from './recovery/recovery-manager';
import { PlaybackVerifier } from './recovery/playback-verifier';
import { PlayerStateMachine } from './state/player-state';
import { StorageService } from '../shared/storage';
import { Logger } from '../shared/logger';
import { YT_SELECTORS, DETECTION_THRESHOLDS } from '../shared/constants';
import { DetectionContext, ShieldSettings, PlayerState, ExtensionMessage } from '../shared/types';

class YouTubeShieldContent {
  private stateMachine: PlayerStateMachine;
  private adDetector: AdDetector;
  private recoveryManager: RecoveryManager;
  private settings: ShieldSettings | null = null;

  private currentVideoElement: HTMLVideoElement | null = null;
  private currentVideoId: string | null = null;
  private lastSavedTime: number = 0;
  private observer: MutationObserver | null = null;
  private fastPollTimer: number | null = null;

  constructor() {
    this.stateMachine = new PlayerStateMachine('IDLE');
    this.adDetector = new AdDetector();
    this.recoveryManager = new RecoveryManager();
  }

  public async init(): Promise<void> {
    Logger.info('Content script initializing on YouTube page');

    this.settings = await StorageService.getSettings();
    Logger.setLogging(this.settings.diagnosticLogging);

    // Inject global ad blocker style sheet directly into head to instantly suppress banner & promo elements
    this.injectAdStyles();

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes['yt_shield_settings']) {
        this.settings = changes['yt_shield_settings'].newValue;
        if (this.settings) {
          Logger.setLogging(this.settings.diagnosticLogging);
        }
      }
    });

    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      this.handleMessage(message)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ error: err.message }));
      return true;
    });

    // State machine updates
    this.stateMachine.onStateChange((newState) => {
      this.notifyStateChange(newState);
    });

    // Listen for SPA YouTube page navigation events
    window.addEventListener('yt-navigate-start', () => this.handleNavigationStart());
    window.addEventListener('yt-navigate-finish', () => this.handleNavigationFinish());
    window.addEventListener('popstate', () => this.handleUrlChange());

    // Initial binding
    this.handleUrlChange();
    this.setupPlayerObserver();
    this.startFastGuard();
  }

  /**
   * Inject high-priority CSS rules to suppress feed/display/banner ads,
   * while intentionally preserving player ad overlays so skip buttons remain visible and clickable.
   */
  private injectAdStyles(): void {
    const styleId = 'yt-shield-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #player-ads,
      ytd-ad-slot-renderer,
      ytd-promoted-sparkles-web-renderer,
      ytd-display-ad-renderer,
      ytd-action-companion-ad-renderer,
      ytd-in-feed-ad-layout-renderer,
      #panels ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
      ytd-banner-promo-renderer,
      ytd-statement-banner-renderer,
      #masthead-ad {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  private extractVideoId(url: string = window.location.href): string | null {
    try {
      const parsed = new URL(url);
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/')[2] || null;
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private handleNavigationStart(): void {
    Logger.debug('yt-navigate-start event received');
    this.stateMachine.transition('LOADING');
  }

  private handleNavigationFinish(): void {
    Logger.debug('yt-navigate-finish event received');
    this.handleUrlChange();
  }

  private handleUrlChange(): void {
    const videoId = this.extractVideoId();
    if (videoId !== this.currentVideoId) {
      Logger.info(`Video navigation detected: ${this.currentVideoId} -> ${videoId}`);
      this.currentVideoId = videoId;
      this.lastSavedTime = 0;
      this.recoveryManager.resetVideo(videoId);
      this.stateMachine.transition(videoId ? 'LOADING' : 'IDLE');
    }
    this.findAndBindVideoElement();
  }

  private findAndBindVideoElement(): void {
    const video = document.querySelector(YT_SELECTORS.VIDEO) as HTMLVideoElement | null;
    if (video) {
      if (video !== this.currentVideoElement) {
        this.bindVideoElement(video);
      } else if (this.stateMachine.getState() === 'IDLE' || this.stateMachine.getState() === 'LOADING') {
        this.stateMachine.transition(video.paused ? 'PAUSED' : 'PLAYING');
      }
    }
  }

  private bindVideoElement(video: HTMLVideoElement): void {
    Logger.debug('Binding HTML5 video element');
    this.currentVideoElement = video;

    video.addEventListener('timeupdate', () => {
      const player = document.querySelector(YT_SELECTORS.PLAYER_CONTAINER);
      const isAd = player?.classList.contains(YT_SELECTORS.AD_SHOWING_CLASS);
      if (!isAd && this.stateMachine.getState() === 'PLAYING') {
        this.lastSavedTime = video.currentTime;
      }
    });

    video.addEventListener('play', () => {
      if (this.stateMachine.getState() !== 'AD_DETECTED' && this.stateMachine.getState() !== 'RECOVERING') {
        this.stateMachine.transition('PLAYING');
      }
    });

    video.addEventListener('pause', () => {
      if (this.stateMachine.getState() === 'PLAYING') {
        this.stateMachine.transition('PAUSED');
      }
    });

    // Set initial playing state if video is already running
    if (!video.paused && this.stateMachine.getState() === 'IDLE') {
      this.stateMachine.transition('PLAYING');
    }

    // Run immediate check
    this.runDetectionCycle();
  }

  private setupPlayerObserver(): void {
    this.observer = new MutationObserver(() => {
      this.findAndBindVideoElement();
      this.runDetectionCycle();
    });

    const targetNode = document.getElementById('content') || document.body || document.documentElement;
    if (targetNode) {
      this.observer.observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'src'],
      });
    }
  }

  /**
   * Fast lightweight polling guard: runs every 100ms to ensure zero lag
   * in auto-skipping and accelerating any ad sequence as soon as YouTube injects it.
   */
  private startFastGuard(): void {
    this.fastPollTimer = window.setInterval(() => {
      this.findAndBindVideoElement();
      this.runDetectionCycle();
    }, 100);
  }

  private async runDetectionCycle(): Promise<void> {
    if (!this.settings?.protectionEnabled) {
      return;
    }

    const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = (document.querySelector('video') as HTMLVideoElement) || this.currentVideoElement;

    // A real video ad is active ONLY when the player container has "ad-showing" or "ad-interrupting"
    const isRealAdShowing = Boolean(
      moviePlayer?.classList.contains('ad-showing') ||
      moviePlayer?.classList.contains('ad-interrupting')
    );

    if (isRealAdShowing) {
      // 1. Try to click any skip ad button with full mouse/pointer events
      const skipSelectors = [
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button-slot button',
        'button.ytp-ad-skip-button-modern',
        '.ytp-ad-skip-button-container button',
        '.ytp-ad-skip-button-text',
        'button[class*="skip-button"]',
        '[id*="skip-button"] button',
        '.videoAdUiSkipButton',
      ];

      for (const sel of skipSelectors) {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (el) {
          try {
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          } catch {}
        }
      }

      // 2. Fast-forward the ad video to the end and mute
      if (video) {
        try {
          video.muted = true;
          video.playbackRate = 16.0;
          if (!isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
            video.currentTime = Math.max(0, video.duration - 0.1);
          }
          if (video.paused) {
            video.play().catch(() => {});
          }
        } catch {}
      }

      if (this.stateMachine.getState() !== 'AD_DETECTED') {
        this.stateMachine.transition('AD_DETECTED');
        this.reportDetection(95, []);
      }
      return;
    }

    // When ad is NOT showing:
    // ALWAYS reset the actual main video back to normal speed & unmuted!
    if (video) {
      if (video.playbackRate > 2.0) {
        video.playbackRate = 1.0;
      }
      if (this.stateMachine.getState() === 'AD_DETECTED' || this.stateMachine.getState() === 'SUSPICIOUS') {
        video.muted = false;
        this.stateMachine.transition(video.paused ? 'PAUSED' : 'PLAYING');
      } else if (this.stateMachine.getState() === 'IDLE' && !video.paused) {
        this.stateMachine.transition('PLAYING');
      }
    }
  }

  private reportDetection(confidence: number, signals: unknown[]): void {
    chrome.runtime.sendMessage({
      type: 'REPORT_DETECTION',
      confidence,
      signals,
      videoId: this.currentVideoId,
    }).catch(() => {});
  }

  private reportRecovery(success: boolean, strategy: string): void {
    chrome.runtime.sendMessage({
      type: 'REPORT_RECOVERY',
      success,
      strategy,
      videoId: this.currentVideoId,
    }).catch(() => {});
  }

  private notifyStateChange(newState: PlayerState): void {
    chrome.runtime.sendMessage({
      type: 'PLAYER_STATE_CHANGED',
      state: newState,
      videoId: this.currentVideoId,
      confidence: 0,
    }).catch(() => {});
  }

  private async handleMessage(message: ExtensionMessage): Promise<unknown> {
    if (message.type === 'GET_STATUS') {
      const stats = await StorageService.getStatistics();
      const settings = this.settings || (await StorageService.getSettings());
      return {
        type: 'STATUS_RESPONSE',
        state: this.stateMachine.getState(),
        currentVideoId: this.currentVideoId,
        confidence: 0,
        signals: [],
        stats,
        settings,
        isYouTubeTab: true,
      };
    }
    return { error: 'Unknown message' };
  }
}

// Instantiate and initialize
const shield = new YouTubeShieldContent();
shield.init().catch((err) => Logger.error('Failed to initialize YT Shield content script:', err));

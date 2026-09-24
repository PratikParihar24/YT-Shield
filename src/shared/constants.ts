import { ShieldSettings, ShieldStatistics } from './types';

export const DEFAULT_SETTINGS: ShieldSettings = {
  protectionEnabled: true,
  networkFiltering: true,
  playerDetection: true,
  autoRecovery: true,
  maxAttempts: 5,
  diagnosticLogging: false,
};

export const DEFAULT_STATISTICS: ShieldStatistics = {
  detected: 0,
  blocked: 0,
  recovered: 0,
  failed: 0,
  lastUpdated: Date.now(),
};

export const STORAGE_KEYS = {
  SETTINGS: 'yt_shield_settings',
  STATISTICS: 'yt_shield_statistics',
  EXT_VERSION: 'yt_shield_version',
} as const;

// YouTube specific selectors & heuristics (Centralized for easy updating)
export const YT_SELECTORS = {
  VIDEO: 'video',
  PLAYER_CONTAINER: '#movie_player, .html5-video-player, ytd-player #container',
  AD_MODULE: '.ytp-ad-module',
  AD_OVERLAY: '.ytp-ad-overlay-container, .ytp-ad-player-overlay, .ytp-ad-player-overlay-layout',
  AD_SHOWING_CLASS: 'ad-showing',
  AD_INTERRUPTING_CLASS: 'ad-interrupting',
  SKIP_BUTTON: [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-skip-ad-button__text',
    '.ytp-ad-skip-button-slot',
    '.ytp-ad-skip-button-slot button',
    'button.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-container button',
    '.ytp-ad-skip-button-text',
    'button.ytp-ad-skip-button-text',
    '.ytp-ad-preview-container',
    '[id*="skip-button"] button',
    '[id*="skip-button"]',
    '.videoAdUiSkipButton',
    '.ytp-ad-overlay-close-button',
    'button[class*="skip-button"]',
    '.ytp-ad-text.ytp-ad-preview-text',
  ],
  AD_BADGE: [
    '.ytp-ad-badge',
    '.ytp-ad-simple-ad-badge',
    '.ytp-ad-duration-remaining',
    '[class*="ytp-ad-badge"]',
    '.ytp-ad-text',
    '.ytp-ad-preview-text',
    '.ytp-ad-hover-text',
  ],
  PAGE_SPONSORS: [
    '#player-ads',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-display-ad-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-in-feed-ad-layout-renderer',
    '#panels ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    'ytd-banner-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytd-merch-shelf-renderer',
    '#masthead-ad',
    'ytd-ad-slot-renderer',
    '.ytd-in-feed-ad-layout-renderer',
    '#clarify-box',
    'ytd-promoted-video-renderer',
  ],
} as const;

export const CONFIDENCE_WEIGHTS = {
  AD_SHOWING_CLASS: 80,
  AD_MODULE_CHILDREN: 75,
  AD_BADGE_PRESENT: 75,
  SKIP_BUTTON_PRESENT: 85,
  UNEXPECTED_SHORT_DURATION: 70,
  VIDEO_CURRENT_TIME_JUMP: 30,
  AD_OVERLAY_ACTIVE: 70,
} as const;

export const DETECTION_THRESHOLDS = {
  SUSPICIOUS: 35,
  CONFIRMED_AD: 60,
} as const;

export const RECOVERY_LIMITS = {
  MAX_RECOVERY_ATTEMPTS: 10,
  COOLDOWN_MS: 200,
  VERIFICATION_WAIT_MS: 150,
  MAX_VERIFICATION_WAIT_MS: 800,
} as const;

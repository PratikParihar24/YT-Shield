export type PlayerState =
  | 'IDLE'
  | 'LOADING'
  | 'PLAYING'
  | 'PAUSED'
  | 'SUSPICIOUS'
  | 'AD_DETECTED'
  | 'RECOVERING'
  | 'RECOVERED'
  | 'FAILED';

export interface ShieldSettings {
  protectionEnabled: boolean;
  networkFiltering: boolean;
  playerDetection: boolean;
  autoRecovery: boolean;
  maxAttempts: number;
  diagnosticLogging: boolean;
}

export interface ShieldStatistics {
  detected: number;
  blocked: number;
  recovered: number;
  failed: number;
  lastUpdated: number;
}

export interface AdSignal {
  source: 'DOM' | 'PLAYER' | 'NAVIGATION' | 'VIDEO_STATE';
  confidence: number; // 0 to 100
  detail: string;
  timestamp: number;
}

export interface DetectionResult {
  isAd: boolean;
  confidence: number; // 0 to 100
  signals: AdSignal[];
}

export interface DetectionContext {
  videoElement: HTMLVideoElement | null;
  currentVideoId: string | null;
  currentTime: number;
  duration: number;
  isPaused: boolean;
  url: string;
}

export interface RecoveryContext {
  videoElement: HTMLVideoElement | null;
  videoId: string | null;
  savedTime: number;
  attemptNumber: number;
  maxAttempts: number;
}

export interface RecoveryResult {
  success: boolean;
  strategyName: string;
  error?: string;
}

export type ExtensionMessage =
  | { type: 'GET_STATUS' }
  | {
      type: 'STATUS_RESPONSE';
      state: PlayerState;
      currentVideoId: string | null;
      confidence: number;
      signals: AdSignal[];
      stats: ShieldStatistics;
      settings: ShieldSettings;
      isYouTubeTab: boolean;
    }
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS_RESPONSE'; settings: ShieldSettings }
  | { type: 'SET_PROTECTION'; enabled: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<ShieldSettings> }
  | { type: 'GET_STATS' }
  | { type: 'STATS_RESPONSE'; stats: ShieldStatistics }
  | { type: 'CLEAR_STATS' }
  | {
      type: 'REPORT_DETECTION';
      confidence: number;
      signals: AdSignal[];
      videoId: string | null;
    }
  | {
      type: 'REPORT_RECOVERY';
      success: boolean;
      strategy: string;
      videoId: string | null;
    }
  | {
      type: 'PLAYER_STATE_CHANGED';
      state: PlayerState;
      videoId: string | null;
      confidence: number;
    };

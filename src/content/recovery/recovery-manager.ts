import { RecoveryStrategy } from './strategy-interface';
import { PlayerRecovery } from './player-recovery';
import { NavigationRecovery } from './navigation-recovery';
import { ReloadRecovery } from './reload-recovery';
import { RecoveryContext, RecoveryResult } from '../../shared/types';
import { RECOVERY_LIMITS } from '../../shared/constants';
import { Logger } from '../../shared/logger';

export class RecoveryManager {
  private strategies: RecoveryStrategy[] = [];
  private attemptCount: number = 0;
  private lastRecoveryTime: number = 0;
  private currentVideoId: string | null = null;

  constructor() {
    // Order strategies from least disruptive to most disruptive
    this.strategies = [
      new PlayerRecovery(),
      new NavigationRecovery(),
      new ReloadRecovery(),
    ].sort((a, b) => a.disruptiveLevel - b.disruptiveLevel);
  }

  public resetVideo(videoId: string | null): void {
    if (this.currentVideoId !== videoId) {
      Logger.debug(`RecoveryManager resetting for new video: ${videoId}`);
      this.currentVideoId = videoId;
      this.attemptCount = 0;
      this.lastRecoveryTime = 0;
    }
  }

  public canAttemptRecovery(maxAttempts: number): boolean {
    const now = Date.now();
    // Loop protection: Cooldown
    if (now - this.lastRecoveryTime < RECOVERY_LIMITS.COOLDOWN_MS) {
      return false;
    }

    // Auto-reset if stuck at max attempts so we can keep trying without getting permanently frozen
    if (this.attemptCount >= maxAttempts) {
      if (now - this.lastRecoveryTime > 2000) {
        this.attemptCount = 0;
        return true;
      }
      return false;
    }

    // Session reload loop protection:
    const reloadedRecently = sessionStorage.getItem('yt_shield_reloaded');
    if (reloadedRecently && now - parseInt(reloadedRecently, 10) < 10000) {
      return false;
    }

    return true;
  }

  public async executeRecovery(
    videoElement: HTMLVideoElement | null,
    savedTime: number,
    maxAttempts: number
  ): Promise<RecoveryResult> {
    this.attemptCount++;
    this.lastRecoveryTime = Date.now();

    const context: RecoveryContext = {
      videoElement,
      videoId: this.currentVideoId,
      savedTime,
      attemptNumber: this.attemptCount,
      maxAttempts,
    };

    Logger.info(`Starting recovery attempt #${this.attemptCount} for video ${this.currentVideoId}`);

    for (const strategy of this.strategies) {
      if (strategy.canHandle(context)) {
        try {
          const result = await strategy.execute(context);
          if (result.success) {
            Logger.info(`Strategy ${strategy.name} succeeded on attempt #${this.attemptCount}`);
            return result;
          }
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          Logger.error(`Strategy ${strategy.name} threw error:`, errorMsg);
        }
      }
    }

    return {
      success: false,
      strategyName: 'None',
      error: 'All strategies failed or unhandled',
    };
  }

  public getAttemptCount(): number {
    return this.attemptCount;
  }
}

import { RecoveryStrategy } from './strategy-interface';
import { RecoveryContext, RecoveryResult } from '../../shared/types';
import { Logger } from '../../shared/logger';

/**
 * Strategy 2: Moderately disruptive (SPA seek & play re-trigger)
 * - Tries to re-trigger player playback at saved timestamp
 * - Uses YouTube's internal player API (seekTo, playVideo) if available on #movie_player
 */
export class NavigationRecovery implements RecoveryStrategy {
  public readonly name = 'NavigationRecovery';
  public readonly disruptiveLevel = 2;

  public canHandle(context: RecoveryContext): boolean {
    return context.videoId !== null && context.attemptNumber >= 2;
  }

  public async execute(context: RecoveryContext): Promise<RecoveryResult> {
    Logger.debug('Executing NavigationRecovery');

    try {
      const player = document.getElementById('movie_player') as (HTMLElement & {
        seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
        playVideo?: () => void;
        loadVideoById?: (videoId: string, startSeconds?: number) => void;
      }) | null;

      if (player && typeof player.seekTo === 'function') {
        const targetTime = Math.max(0, context.savedTime);
        player.seekTo(targetTime, true);
        if (typeof player.playVideo === 'function') {
          player.playVideo();
        }
        return {
          success: true,
          strategyName: this.name,
        };
      }

      // If movie_player API is not directly reachable from content script context:
      if (context.videoElement) {
        context.videoElement.currentTime = Math.max(0, context.savedTime);
        await context.videoElement.play().catch(() => {});
        return {
          success: true,
          strategyName: this.name,
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      Logger.warn('NavigationRecovery error:', errorMsg);
      return {
        success: false,
        strategyName: this.name,
        error: errorMsg,
      };
    }

    return {
      success: false,
      strategyName: this.name,
      error: 'Player element not accessible',
    };
  }
}

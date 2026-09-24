import { RecoveryStrategy } from './strategy-interface';
import { RecoveryContext, RecoveryResult } from '../../shared/types';
import { Logger } from '../../shared/logger';

/**
 * Strategy 3: Most disruptive (Last Resort)
 * - If ad state is stuck despite player and navigation strategies, reload the video with timestamp parameter
 * - Only permitted if attempts reach maxAttempts and loop protection permits.
 */
export class ReloadRecovery implements RecoveryStrategy {
  public readonly name = 'ReloadRecovery';
  public readonly disruptiveLevel = 3;

  public canHandle(context: RecoveryContext): boolean {
    return context.videoId !== null && context.attemptNumber >= context.maxAttempts;
  }

  public async execute(context: RecoveryContext): Promise<RecoveryResult> {
    Logger.debug('Executing ReloadRecovery');
    try {
      const url = new URL(window.location.href);
      if (context.videoId) {
        url.searchParams.set('v', context.videoId);
      }
      if (context.savedTime > 2) {
        url.searchParams.set('t', `${Math.floor(context.savedTime)}s`);
      }
      // Set session marker to avoid immediate recovery loops upon load
      sessionStorage.setItem('yt_shield_reloaded', Date.now().toString());

      window.location.replace(url.toString());
      return {
        success: true,
        strategyName: this.name,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      Logger.error('ReloadRecovery error:', errorMsg);
      return {
        success: false,
        strategyName: this.name,
        error: errorMsg,
      };
    }
  }
}

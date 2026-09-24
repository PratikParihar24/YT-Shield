import { RecoveryStrategy } from './strategy-interface';
import { RecoveryContext, RecoveryResult } from '../../shared/types';
import { YT_SELECTORS } from '../../shared/constants';
import { Logger } from '../../shared/logger';

export class PlayerRecovery implements RecoveryStrategy {
  public readonly name = 'PlayerRecovery';
  public readonly disruptiveLevel = 1;

  public canHandle(context: RecoveryContext): boolean {
    return context.videoElement !== null;
  }

  public async execute(context: RecoveryContext): Promise<RecoveryResult> {
    Logger.debug('Executing PlayerRecovery');
    // Ensure we have the most active video element in the player
    const video = (document.querySelector(YT_SELECTORS.VIDEO) as HTMLVideoElement) || context.videoElement;
    let performedAction = false;

    // 1. Try clicking skip buttons immediately (support modern custom web components)
    for (const selector of YT_SELECTORS.SKIP_BUTTON) {
      const skipButtons = document.querySelectorAll(selector);
      for (const btn of Array.from(skipButtons)) {
        const el = btn as HTMLElement;
        try {
          // If the element has a nested button or shadowRoot, click it
          const clickTarget = el.querySelector('button') || el;
          (clickTarget as HTMLElement).click();
          performedAction = true;
          Logger.debug('Clicked ad skip button:', selector);
        } catch (e) {
          Logger.warn('Failed to click skip button:', e);
        }
      }
    }

    // 2. Direct ad acceleration and instant skip
    if (video) {
      const player = document.querySelector(YT_SELECTORS.PLAYER_CONTAINER);
      const isAdShowing =
        player?.classList.contains(YT_SELECTORS.AD_SHOWING_CLASS) ||
        player?.classList.contains(YT_SELECTORS.AD_INTERRUPTING_CLASS) ||
        document.querySelector('.ytp-ad-text') !== null ||
        document.querySelector('.ytp-ad-badge') !== null ||
        document.querySelector('.ytp-ad-preview-text') !== null ||
        document.querySelector('.ytp-ad-player-overlay') !== null;

      if (isAdShowing) {
        try {
          // Mute ad audio to avoid blaring sound
          video.muted = true;

          // Accelerate to 16x speed
          video.playbackRate = 16.0;

          // Jump immediately towards the end of the ad video
          if (!isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
            video.currentTime = Math.max(0, video.duration - 0.1);
          } else {
            video.currentTime = 999999;
          }

          if (video.paused) {
            await video.play().catch(() => {});
          }
          performedAction = true;
          Logger.debug('Fast-forwarded ad video to end');
        } catch (err) {
          Logger.debug('Video acceleration error:', err);
        }
      }
    }

    // 3. Remove non-video promotional banners & companion ad containers
    for (const selector of YT_SELECTORS.PAGE_SPONSORS) {
      const elements = document.querySelectorAll(selector);
      for (const el of Array.from(elements)) {
        (el as HTMLElement).style.display = 'none';
        performedAction = true;
      }
    }

    return {
      success: performedAction || (video !== null && !video.paused),
      strategyName: this.name,
    };
  }
}

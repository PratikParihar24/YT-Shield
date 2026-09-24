import { RECOVERY_LIMITS, YT_SELECTORS } from '../../shared/constants';
import { Logger } from '../../shared/logger';

export class PlaybackVerifier {
  /**
   * Verifies that the video player is in an active, ad-free playing state.
   * Returns a promise that resolves to true if playback is verified, false otherwise.
   */
  public static async verify(videoElement: HTMLVideoElement | null): Promise<boolean> {
    if (!videoElement) return false;

    // Wait an initial short window for DOM / media pipeline to settle
    await new Promise((resolve) => setTimeout(resolve, RECOVERY_LIMITS.VERIFICATION_WAIT_MS));

    const playerContainer = document.querySelector(YT_SELECTORS.PLAYER_CONTAINER);
    const hasAdShowing = playerContainer?.classList.contains(YT_SELECTORS.AD_SHOWING_CLASS);
    const hasAdInterrupting = playerContainer?.classList.contains(YT_SELECTORS.AD_INTERRUPTING_CLASS);

    if (hasAdShowing || hasAdInterrupting) {
      Logger.debug('Playback verification failed: ad class still present on player');
      return false;
    }

    // Check if video element is progressing or not stalled on an ad
    const initialTime = videoElement.currentTime;
    await new Promise((resolve) => setTimeout(resolve, 250));

    // If video is playing and not paused, or advanced in time
    const isProgressing = videoElement.currentTime > initialTime || (!videoElement.paused && !videoElement.ended);

    Logger.debug(`Playback verification outcome: isProgressing=${isProgressing}`);
    return isProgressing;
  }
}

import { Detector } from './detector-interface';
import { DetectionContext, AdSignal } from '../../shared/types';
import { CONFIDENCE_WEIGHTS } from '../../shared/constants';

export class VideoStateDetector implements Detector {
  public readonly name = 'VideoStateDetector';

  public detect(context: DetectionContext): AdSignal[] {
    const signals: AdSignal[] = [];
    const video = context.videoElement;

    if (!video) return signals;

    // Check if video element has ad attributes or very short unexpected duration
    // For example, if video duration is less than 31 seconds while duration in metadata is long
    if (video.duration > 0 && video.duration <= 31) {
      // In YouTube, video ads often have short duration loaded on the HTML5 element
      // However, check if player has ad-showing to avoid false positives on genuine shorts
      const isShorts = window.location.pathname.startsWith('/shorts/');
      if (!isShorts) {
        // If it's a regular watch page and video duration is tiny, check if playback rate or mute changes
        const playerContainer = document.querySelector('#movie_player');
        if (playerContainer?.classList.contains('ad-showing')) {
          signals.push({
            source: 'VIDEO_STATE',
            confidence: CONFIDENCE_WEIGHTS.UNEXPECTED_SHORT_DURATION,
            detail: `Video element duration is short (${video.duration.toFixed(1)}s) during regular watch page playback`,
            timestamp: Date.now(),
          });
        }
      }
    }

    return signals;
  }
}

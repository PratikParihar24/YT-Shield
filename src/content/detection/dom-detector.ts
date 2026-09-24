import { Detector } from './detector-interface';
import { DetectionContext, AdSignal } from '../../shared/types';
import { YT_SELECTORS, CONFIDENCE_WEIGHTS } from '../../shared/constants';

export class DOMDetector implements Detector {
  public readonly name = 'DOMDetector';

  public detect(_context: DetectionContext): AdSignal[] {
    const signals: AdSignal[] = [];

    // Check skip buttons
    for (const selector of YT_SELECTORS.SKIP_BUTTON) {
      const skipBtn = document.querySelector(selector);
      if (skipBtn && (skipBtn as HTMLElement).offsetParent !== null) {
        signals.push({
          source: 'DOM',
          confidence: CONFIDENCE_WEIGHTS.SKIP_BUTTON_PRESENT,
          detail: `Skip button element visible: ${selector}`,
          timestamp: Date.now(),
        });
        break;
      }
    }

    // Check ad badges
    for (const selector of YT_SELECTORS.AD_BADGE) {
      const badge = document.querySelector(selector);
      if (badge && (badge as HTMLElement).offsetParent !== null) {
        signals.push({
          source: 'DOM',
          confidence: CONFIDENCE_WEIGHTS.AD_BADGE_PRESENT,
          detail: `Ad badge element visible: ${selector}`,
          timestamp: Date.now(),
        });
        break;
      }
    }

    // Check ad overlay container
    const adOverlay = document.querySelector(YT_SELECTORS.AD_OVERLAY);
    if (adOverlay && (adOverlay as HTMLElement).offsetParent !== null) {
      signals.push({
        source: 'DOM',
        confidence: CONFIDENCE_WEIGHTS.AD_OVERLAY_ACTIVE,
        detail: 'Ad overlay container is active in DOM',
        timestamp: Date.now(),
      });
    }

    return signals;
  }
}

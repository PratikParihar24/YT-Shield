import { Detector } from './detector-interface';
import { DetectionContext, AdSignal } from '../../shared/types';
import { YT_SELECTORS, CONFIDENCE_WEIGHTS } from '../../shared/constants';

export class PlayerDetector implements Detector {
  public readonly name = 'PlayerDetector';

  public detect(_context: DetectionContext): AdSignal[] {
    const signals: AdSignal[] = [];
    const playerContainer = document.querySelector(YT_SELECTORS.PLAYER_CONTAINER);

    if (playerContainer) {
      if (playerContainer.classList.contains(YT_SELECTORS.AD_SHOWING_CLASS)) {
        signals.push({
          source: 'PLAYER',
          confidence: CONFIDENCE_WEIGHTS.AD_SHOWING_CLASS,
          detail: 'Player container has "ad-showing" class',
          timestamp: Date.now(),
        });
      }

      if (playerContainer.classList.contains(YT_SELECTORS.AD_INTERRUPTING_CLASS)) {
        signals.push({
          source: 'PLAYER',
          confidence: CONFIDENCE_WEIGHTS.AD_SHOWING_CLASS,
          detail: 'Player container has "ad-interrupting" class',
          timestamp: Date.now(),
        });
      }
    }

    const adModule = document.querySelector(YT_SELECTORS.AD_MODULE);
    if (adModule && adModule.children.length > 0) {
      signals.push({
        source: 'PLAYER',
        confidence: CONFIDENCE_WEIGHTS.AD_MODULE_CHILDREN,
        detail: `Ad module has ${adModule.children.length} active child elements`,
        timestamp: Date.now(),
      });
    }

    return signals;
  }
}

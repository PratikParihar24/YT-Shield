import { Detector } from './detector-interface';
import { PlayerDetector } from './player-detector';
import { DOMDetector } from './dom-detector';
import { NavigationDetector } from './navigation-detector';
import { VideoStateDetector } from './video-state-detector';
import { ConfidenceEngine } from './confidence-engine';
import { DetectionContext, DetectionResult } from '../../shared/types';

export class AdDetector {
  private detectors: Detector[] = [];

  constructor() {
    this.detectors = [
      new PlayerDetector(),
      new DOMDetector(),
      new NavigationDetector(),
      new VideoStateDetector(),
    ];
  }

  public detect(context: DetectionContext): DetectionResult {
    const allSignals = [];
    for (const detector of this.detectors) {
      try {
        const signals = detector.detect(context);
        allSignals.push(...signals);
      } catch (err) {
        // Individual detector failure should not break entire detection pipeline
        console.error(`[YT Shield] Error in ${detector.name}:`, err);
      }
    }

    return ConfidenceEngine.evaluate(allSignals);
  }
}

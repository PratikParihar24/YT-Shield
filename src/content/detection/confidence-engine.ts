import { AdSignal, DetectionResult } from '../../shared/types';
import { DETECTION_THRESHOLDS } from '../../shared/constants';

export class ConfidenceEngine {
  /**
   * Combines multiple detection signals and produces an overall confidence score (0-100).
   * It uses independent signal combination (probabilistic OR-like weighting)
   * so multiple moderate signals elevate overall confidence, while avoiding simple linear overflow.
   */
  public static evaluate(signals: AdSignal[]): DetectionResult {
    if (signals.length === 0) {
      return {
        isAd: false,
        confidence: 0,
        signals: [],
      };
    }

    // Filter unique signals by detail
    const uniqueSignals: AdSignal[] = [];
    const seen = new Set<string>();
    for (const signal of signals) {
      if (!seen.has(signal.detail)) {
        seen.add(signal.detail);
        uniqueSignals.push(signal);
      }
    }

    // Probabilistic combination: 1 - product(1 - c_i)
    let nonAdProb = 1.0;
    for (const signal of uniqueSignals) {
      const prob = Math.min(Math.max(signal.confidence / 100, 0), 1);
      nonAdProb *= 1 - prob;
    }

    const calculatedConfidence = Math.min(100, Math.round((1 - nonAdProb) * 100));

    return {
      isAd: calculatedConfidence >= DETECTION_THRESHOLDS.CONFIRMED_AD,
      confidence: calculatedConfidence,
      signals: uniqueSignals,
    };
  }
}

import { describe, it, expect } from 'vitest';
import { ConfidenceEngine } from '../../src/content/detection/confidence-engine';
import { AdSignal } from '../../src/shared/types';
import { DETECTION_THRESHOLDS } from '../../src/shared/constants';

describe('ConfidenceEngine', () => {
  it('returns 0 confidence for empty signals', () => {
    const result = ConfidenceEngine.evaluate([]);
    expect(result.isAd).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.signals).toHaveLength(0);
  });

  it('correctly calculates single signal confidence', () => {
    const signal: AdSignal = {
      source: 'PLAYER',
      confidence: 50,
      detail: 'Player container has ad-showing class',
      timestamp: Date.now(),
    };

    const result = ConfidenceEngine.evaluate([signal]);
    expect(result.confidence).toBe(50);
    expect(result.isAd).toBe(false); // 50 < 70 threshold
  });

  it('combines multiple signals to reach confirmed threshold without exceeding 100', () => {
    const signals: AdSignal[] = [
      {
        source: 'PLAYER',
        confidence: 50,
        detail: 'Player container has ad-showing class',
        timestamp: Date.now(),
      },
      {
        source: 'DOM',
        confidence: 50,
        detail: 'Skip button element visible',
        timestamp: Date.now(),
      },
    ];

    // Probabilistic formula: 1 - (1 - 0.5)*(1 - 0.5) = 1 - 0.25 = 0.75 (75%)
    const result = ConfidenceEngine.evaluate(signals);
    expect(result.confidence).toBe(75);
    expect(result.isAd).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(DETECTION_THRESHOLDS.CONFIRMED_AD);
  });

  it('deduplicates identical signals by detail', () => {
    const signal: AdSignal = {
      source: 'PLAYER',
      confidence: 50,
      detail: 'Player container has ad-showing class',
      timestamp: Date.now(),
    };

    const result = ConfidenceEngine.evaluate([signal, signal, signal]);
    expect(result.confidence).toBe(50);
    expect(result.signals).toHaveLength(1);
  });
});

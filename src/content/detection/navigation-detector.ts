import { Detector } from './detector-interface';
import { DetectionContext, AdSignal } from '../../shared/types';

export class NavigationDetector implements Detector {
  public readonly name = 'NavigationDetector';

  public detect(context: DetectionContext): AdSignal[] {
    const signals: AdSignal[] = [];

    // Detect if current URL has ad parameters or is redirecting through ad link
    if (context.url.includes('googleads') || context.url.includes('/pagead/')) {
      signals.push({
        source: 'NAVIGATION',
        confidence: 80,
        detail: 'URL matches known ad navigation pattern',
        timestamp: Date.now(),
      });
    }

    return signals;
  }
}

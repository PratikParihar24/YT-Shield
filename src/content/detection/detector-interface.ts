import { DetectionContext, AdSignal } from '../../shared/types';

export interface Detector {
  readonly name: string;
  detect(context: DetectionContext): AdSignal[];
}

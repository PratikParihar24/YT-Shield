import { RecoveryContext, RecoveryResult } from '../../shared/types';

export interface RecoveryStrategy {
  readonly name: string;
  readonly disruptiveLevel: number; // 1 = least disruptive, 3 = most disruptive
  canHandle(context: RecoveryContext): boolean;
  execute(context: RecoveryContext): Promise<RecoveryResult>;
}

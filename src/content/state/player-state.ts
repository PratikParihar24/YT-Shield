import { PlayerState } from '../../shared/types';
import { Logger } from '../../shared/logger';

export type StateChangeCallback = (newState: PlayerState, oldState: PlayerState) => void;

export class PlayerStateMachine {
  private currentState: PlayerState = 'IDLE';
  private listeners: StateChangeCallback[] = [];

  // Allowed state transitions to guarantee consistency
  private allowedTransitions: Record<PlayerState, PlayerState[]> = {
    IDLE: ['LOADING', 'PLAYING', 'PAUSED', 'SUSPICIOUS', 'AD_DETECTED'],
    LOADING: ['PLAYING', 'PAUSED', 'SUSPICIOUS', 'AD_DETECTED', 'FAILED', 'IDLE'],
    PLAYING: ['PAUSED', 'LOADING', 'SUSPICIOUS', 'AD_DETECTED', 'IDLE'],
    PAUSED: ['PLAYING', 'LOADING', 'SUSPICIOUS', 'AD_DETECTED', 'IDLE'],
    SUSPICIOUS: ['AD_DETECTED', 'PLAYING', 'PAUSED', 'IDLE'],
    AD_DETECTED: ['RECOVERING', 'PLAYING', 'PAUSED', 'RECOVERED', 'FAILED', 'IDLE'],
    RECOVERING: ['RECOVERED', 'FAILED', 'AD_DETECTED', 'IDLE'],
    RECOVERED: ['PLAYING', 'PAUSED', 'SUSPICIOUS', 'AD_DETECTED', 'IDLE'],
    FAILED: ['IDLE', 'LOADING', 'PLAYING', 'PAUSED', 'RECOVERING'],
  };

  constructor(initialState: PlayerState = 'IDLE') {
    this.currentState = initialState;
  }

  public getState(): PlayerState {
    return this.currentState;
  }

  public canTransitionTo(nextState: PlayerState): boolean {
    if (this.currentState === nextState) return true;
    return this.allowedTransitions[this.currentState]?.includes(nextState) ?? false;
  }

  public transition(nextState: PlayerState): boolean {
    if (this.currentState === nextState) {
      return true;
    }

    if (!this.canTransitionTo(nextState)) {
      Logger.warn(`Invalid state transition attempted: ${this.currentState} -> ${nextState}`);
      return false;
    }

    const oldState = this.currentState;
    this.currentState = nextState;
    Logger.debug(`State transition: ${oldState} -> ${nextState}`);

    for (const listener of this.listeners) {
      try {
        listener(nextState, oldState);
      } catch (err) {
        Logger.error('Error in state change listener:', err);
      }
    }

    return true;
  }

  public onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public reset(): void {
    this.transition('IDLE');
  }
}

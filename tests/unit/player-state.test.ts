import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerStateMachine } from '../../src/content/state/player-state';

describe('PlayerStateMachine', () => {
  let fsm: PlayerStateMachine;

  beforeEach(() => {
    fsm = new PlayerStateMachine('IDLE');
  });

  it('initializes with IDLE state', () => {
    expect(fsm.getState()).toBe('IDLE');
  });

  it('allows valid transitions from IDLE to LOADING or PLAYING', () => {
    expect(fsm.canTransitionTo('LOADING')).toBe(true);
    expect(fsm.transition('LOADING')).toBe(true);
    expect(fsm.getState()).toBe('LOADING');

    expect(fsm.canTransitionTo('PLAYING')).toBe(true);
    expect(fsm.transition('PLAYING')).toBe(true);
    expect(fsm.getState()).toBe('PLAYING');
  });

  it('allows transition to AD_DETECTED and then RECOVERING', () => {
    fsm.transition('PLAYING');
    expect(fsm.transition('AD_DETECTED')).toBe(true);
    expect(fsm.getState()).toBe('AD_DETECTED');

    expect(fsm.transition('RECOVERING')).toBe(true);
    expect(fsm.getState()).toBe('RECOVERING');

    expect(fsm.transition('RECOVERED')).toBe(true);
    expect(fsm.getState()).toBe('RECOVERED');

    expect(fsm.transition('PLAYING')).toBe(true);
    expect(fsm.getState()).toBe('PLAYING');
  });

  it('blocks invalid transitions (e.g. IDLE directly to RECOVERING)', () => {
    expect(fsm.canTransitionTo('RECOVERING')).toBe(false);
    expect(fsm.transition('RECOVERING')).toBe(false);
    expect(fsm.getState()).toBe('IDLE');
  });

  it('notifies listeners on valid transitions', () => {
    const transitions: string[] = [];
    const unsubscribe = fsm.onStateChange((next, prev) => {
      transitions.push(`${prev}->${next}`);
    });

    fsm.transition('LOADING');
    fsm.transition('PLAYING');

    expect(transitions).toEqual(['IDLE->LOADING', 'LOADING->PLAYING']);

    unsubscribe();
    fsm.transition('PAUSED');
    expect(transitions.length).toBe(2);
  });
});

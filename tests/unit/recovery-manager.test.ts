import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecoveryManager } from '../../src/content/recovery/recovery-manager';
import { RECOVERY_LIMITS } from '../../src/shared/constants';

describe('RecoveryManager & Loop Protection', () => {
  let manager: RecoveryManager;

  beforeEach(() => {
    // mock sessionStorage
    const storage: Record<string, string> = {};
    global.sessionStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, val: string) => {
        storage[key] = val;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        for (const k in storage) delete storage[k];
      },
      key: () => null,
      length: 0,
    };

    manager = new RecoveryManager();
    manager.resetVideo('test_video_123');
  });

  it('allows initial recovery attempt', () => {
    expect(manager.canAttemptRecovery(3)).toBe(true);
  });

  it('prevents recovery during cooldown interval', async () => {
    // Fake execution
    await manager.executeRecovery(null, 10, 3);
    expect(manager.getAttemptCount()).toBe(1);

    // Immediate subsequent check should be throttled by cooldown
    expect(manager.canAttemptRecovery(3)).toBe(false);

    // Fast forward time past cooldown
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + RECOVERY_LIMITS.COOLDOWN_MS + 100);
    expect(manager.canAttemptRecovery(3)).toBe(true);
    vi.restoreAllMocks();
  });

  it('stops recovery once maxAttempts is reached', async () => {
    let nowTime = 100000;
    vi.spyOn(Date, 'now').mockImplementation(() => nowTime);

    // Attempt 1
    await manager.executeRecovery(null, 10, 3);
    nowTime += 4000;

    // Attempt 2
    await manager.executeRecovery(null, 10, 3);
    nowTime += 4000;

    // Attempt 3
    await manager.executeRecovery(null, 10, 3);
    nowTime += 4000;

    expect(manager.getAttemptCount()).toBe(3);
    expect(manager.canAttemptRecovery(3)).toBe(false);

    vi.restoreAllMocks();
  });

  it('resets attempt counter when videoId changes', async () => {
    await manager.executeRecovery(null, 10, 3);
    expect(manager.getAttemptCount()).toBe(1);

    manager.resetVideo('new_video_456');
    expect(manager.getAttemptCount()).toBe(0);
    expect(manager.canAttemptRecovery(3)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { pingDocker } from '../docker.js';

describe('pingDocker', () => {
  // Test env doesn't have a Docker daemon — we verify pingDocker's error
  // shape by running it for real. If the test env ever DOES have docker
  // available, this test would pass with {ok: true}, which is also fine
  // behaviourally; we'd need to update the assertion to accept either
  // shape at that point.
  it('returns a well-formed {ok, error} shape when socket is unreachable', async () => {
    const result = await pingDocker();
    expect(result).toHaveProperty('ok');
    // In the common test-env case (no docker), ok is false and error is a string
    if (result.ok === false) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    } else {
      // CI with docker available — just sanity check the success shape
      expect(result).toHaveProperty('version');
      expect(Array.isArray(result.agentImages)).toBe(true);
    }
  }, 10_000);
});

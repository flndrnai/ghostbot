import { describe, it, expect, vi } from 'vitest';

describe('pingDocker', () => {
  it('returns {ok:false} when socket is unreachable', async () => {
    vi.resetModules();
    vi.doMock('http', () => ({
      default: {
        request: (_opts, _cb) => ({
          on: (event, handler) => {
            if (event === 'error') setTimeout(() => handler(new Error('ENOENT')), 0);
          },
          end: () => {},
          write: () => {},
        }),
      },
    }));
    const { pingDocker } = await import('../docker.js');
    const result = await pingDocker();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ENOENT|ECONNREFUSED|socket/i);
  });
});

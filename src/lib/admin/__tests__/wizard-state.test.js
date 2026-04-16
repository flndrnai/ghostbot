import { describe, it, expect, vi, beforeEach } from 'vitest';

const getConfigMock = vi.fn();
const getConfigSecretMock = vi.fn();

vi.mock('../../config.js', () => ({ getConfig: getConfigMock }));
vi.mock('../../db/config.js', () => ({ getConfigSecret: getConfigSecretMock }));

beforeEach(() => {
  getConfigMock.mockReset();
  getConfigSecretMock.mockReset();
});

describe('computeStepStatus', () => {
  it('marks LLM done when provider + lastTestOk set', async () => {
    getConfigMock.mockImplementation((k) => ({
      LLM_PROVIDER: 'ollama',
      OLLAMA_BASE_URL: 'http://x',
      LLM_MODEL: 'qwen',
      ollamaLastTestOk: 'true',
    }[k] || ''));
    const { computeStepStatus } = await import('../wizard-state.js');
    const status = await computeStepStatus({ skipDocker: true });
    expect(status.llm.done).toBe(true);
    expect(status.llm.provider).toBe('ollama');
  });

  it('marks LLM not done when lastTestOk is missing', async () => {
    getConfigMock.mockImplementation((k) => ({
      LLM_PROVIDER: 'ollama',
      OLLAMA_BASE_URL: 'http://x',
    }[k] || ''));
    const { computeStepStatus } = await import('../wizard-state.js');
    const status = await computeStepStatus({ skipDocker: true });
    expect(status.llm.done).toBe(false);
  });

  it('marks GitHub done when token + test ok', async () => {
    getConfigSecretMock.mockReturnValue('ghp_xyz');
    getConfigMock.mockImplementation((k) => ({ githubLastTestOk: 'true' }[k] || ''));
    const { computeStepStatus } = await import('../wizard-state.js');
    const status = await computeStepStatus({ skipDocker: true });
    expect(status.github.done).toBe(true);
  });
});

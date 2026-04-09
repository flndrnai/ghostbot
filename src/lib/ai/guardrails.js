// Guardrails — safety rules injected into the system prompt.
// Ported from AIOS pattern. These are always active.

export const GUARDRAILS = `
## Safety Rules
- Never delete files, databases, or resources without explicit user confirmation
- Never run destructive commands (rm -rf, git push --force, git reset --hard, DROP TABLE) without confirmation
- Never expose API keys, tokens, or credentials in output
- Never commit .env files or credentials to git
- Never send emails, messages, or external communications without user confirmation
- Never post to social media without user review and approval
- When uncertain about intent, ask rather than guess
- Preserve intermediate outputs before retrying failed workflows
- Verify output format before chaining into another operation
`.trim();

/**
 * Returns the guardrails block for injection into the system prompt.
 */
export function getGuardrails() {
  return GUARDRAILS;
}

import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

export class TokenCounter extends BaseCallbackHandler {
  name = 'TokenCounter';

  constructor() {
    super();
    this.promptTokens = 0;
    this.completionTokens = 0;
    this.totalTokens = 0;
  }

  handleLLMEnd(output) {
    const usage =
      output?.llmOutput?.tokenUsage ||
      output?.llmOutput?.usage ||
      output?.llmOutput?.estimatedTokenUsage ||
      {};

    this.promptTokens += usage.promptTokens || usage.input_tokens || 0;
    this.completionTokens += usage.completionTokens || usage.output_tokens || 0;
    this.totalTokens += usage.totalTokens || (this.promptTokens + this.completionTokens);
  }
}

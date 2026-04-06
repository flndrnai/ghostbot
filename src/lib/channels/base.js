/**
 * Base channel adapter interface.
 * All platform adapters (Telegram, Slack, etc.) must implement these methods.
 */
export class ChannelAdapter {
  async receive(request) {
    throw new Error('receive() not implemented');
  }

  async acknowledge(metadata) {
    // Optional: send read receipt / reaction
  }

  startProcessingIndicator(metadata) {
    // Optional: show typing indicator
    return () => {}; // Returns stop function
  }

  async sendResponse(threadId, text, metadata) {
    throw new Error('sendResponse() not implemented');
  }

  get supportsStreaming() {
    return false;
  }
}

import { ChannelAdapter } from './base.js';
import { getConfig } from '../config.js';
import {
  sendMessage,
  sendReaction,
  sendTypingAction,
  downloadFile,
} from '../tools/telegram.js';
import { isWhisperEnabled, transcribeAudio } from '../tools/openai.js';

export class TelegramAdapter extends ChannelAdapter {
  constructor(botToken) {
    super();
    this.botToken = botToken;
  }

  async receive(request) {
    const body = await request.json();
    const message = body.message || body.edited_message;
    if (!message) return null;

    const chatId = String(message.chat.id);

    // Chat ID filtering
    const allowedChatId = getConfig('TELEGRAM_CHAT_ID');
    if (allowedChatId && chatId !== allowedChatId) {
      return null; // Silently reject
    }

    let text = message.text || message.caption || '';
    const attachments = [];

    // Voice transcription
    if (message.voice || message.audio) {
      const fileId = (message.voice || message.audio).file_id;
      if (isWhisperEnabled()) {
        try {
          const buffer = await downloadFile(this.botToken, fileId);
          if (buffer) {
            const transcript = await transcribeAudio(buffer, 'voice.ogg');
            text = transcript || text;
          }
        } catch (err) {
          console.error('[telegram] voice transcription failed:', err.message);
        }
      }
    }

    // Photo attachments
    if (message.photo?.length > 0) {
      const largest = message.photo[message.photo.length - 1];
      try {
        const buffer = await downloadFile(this.botToken, largest.file_id);
        if (buffer) {
          attachments.push({
            category: 'image',
            mimeType: 'image/jpeg',
            data: buffer,
          });
        }
      } catch {}
    }

    if (!text && attachments.length === 0) return null;

    return {
      threadId: `telegram-${chatId}`,
      text,
      attachments,
      metadata: {
        chatId,
        messageId: message.message_id,
        from: message.from,
      },
    };
  }

  async acknowledge(metadata) {
    await sendReaction(this.botToken, metadata.chatId, metadata.messageId, '👍');
  }

  startProcessingIndicator(metadata) {
    let running = true;

    const tick = async () => {
      while (running) {
        await sendTypingAction(this.botToken, metadata.chatId);
        // Random jitter: 5.5-8 seconds (Telegram expires after 5s)
        await new Promise((r) => setTimeout(r, 5500 + Math.random() * 2500));
      }
    };

    tick();
    return () => { running = false; };
  }

  async sendResponse(threadId, text, metadata) {
    await sendMessage(this.botToken, metadata.chatId, text);
  }
}

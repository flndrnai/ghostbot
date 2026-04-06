import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getAgent } from './agent.js';
import { createModel } from './model.js';
import { TokenCounter } from './token-counter.js';
import { getConfig } from '../config.js';
import { getChatById, createChat, saveMessage, updateChatTitle } from '../db/chats.js';
import { recordTokenUsage } from '../db/token-usage.js';

export async function* chatStream(chatId, userId, userMessage) {
  // Auto-create chat if needed
  let chat = getChatById(chatId);
  if (!chat) {
    createChat(userId, 'New Chat', chatId);
  }

  // Persist user message
  saveMessage(chatId, 'user', userMessage);

  // Load system prompt
  const systemPrompt = getConfig('SYSTEM_PROMPT') || 'You are GhostBot, a helpful AI assistant.';

  // Get agent and token counter
  const agent = await getAgent();
  const tokenCounter = new TokenCounter();

  let fullContent = '';

  try {
    const stream = await agent.stream(
      {
        messages: [
          new SystemMessage(systemPrompt),
          new HumanMessage(userMessage),
        ],
      },
      {
        configurable: { thread_id: chatId },
        callbacks: [tokenCounter],
        streamMode: 'messages',
      },
    );

    for await (const [chunk] of stream) {
      // AIMessageChunk — extract text content
      if (chunk.content) {
        const text = typeof chunk.content === 'string'
          ? chunk.content
          : chunk.content
              .filter((c) => c.type === 'text')
              .map((c) => c.text)
              .join('');

        if (text) {
          fullContent += text;
          yield { type: 'text-delta', content: text };
        }
      }
    }
  } catch (error) {
    const errorMsg = error.message || 'An error occurred while generating a response.';
    yield { type: 'error', content: errorMsg };
    fullContent = `Error: ${errorMsg}`;
  }

  // Persist assistant message
  if (fullContent) {
    const msg = saveMessage(chatId, 'assistant', fullContent);

    // Record token usage
    const provider = getConfig('LLM_PROVIDER') || 'ollama';
    const model = getConfig('LLM_MODEL') || '';
    recordTokenUsage({
      chatId,
      messageId: msg.id,
      provider,
      model,
      promptTokens: tokenCounter.promptTokens,
      completionTokens: tokenCounter.completionTokens,
    });
  }

  // Auto-title for new chats (fire-and-forget)
  chat = getChatById(chatId);
  if (chat && chat.title === 'New Chat' && fullContent) {
    autoTitle(chatId, userMessage).catch(() => {});
  }
}

export async function autoTitle(chatId, userMessage) {
  try {
    const model = await createModel({ maxTokens: 100 });
    const response = await model.invoke([
      new SystemMessage('Generate a concise 3-6 word title for this conversation. Respond with ONLY the title text, no quotes or formatting.'),
      new HumanMessage(userMessage),
    ]);

    const title = (typeof response.content === 'string' ? response.content : '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .slice(0, 80);

    if (title) {
      updateChatTitle(chatId, title);
    }
  } catch {
    // Silent failure — title stays as "New Chat"
  }
}

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getAgent } from './agent.js';
import { createModel } from './model.js';
import { TokenCounter } from './token-counter.js';
import { getConfig } from '../config.js';
import { getChatById, createChat, saveMessage, updateChatTitle } from '../db/chats.js';
import { recordTokenUsage } from '../db/token-usage.js';

const STREAM_TIMEOUT_MS = 30000;

export async function* chatStream(chatId, userId, userMessage) {
  let chat = getChatById(chatId);
  if (!chat) {
    createChat(userId, 'New Chat', chatId);
  }

  saveMessage(chatId, 'user', userMessage);

  const systemPrompt = getConfig('SYSTEM_PROMPT') || 'You are GhostBot, a helpful AI assistant.';

  let agent;
  try {
    agent = await getAgent();
  } catch (error) {
    yield { type: 'error', content: `Failed to initialize AI agent: ${error.message}. Check your LLM configuration in Admin > LLM Providers.` };
    return;
  }

  const tokenCounter = new TokenCounter();
  let fullContent = '';

  try {
    // Race stream against timeout to avoid hanging when LLM is unreachable
    const streamPromise = agent.stream(
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

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection to LLM timed out. Make sure your LLM provider is running and configured correctly in Admin settings.')), STREAM_TIMEOUT_MS),
    );

    const stream = await Promise.race([streamPromise, timeoutPromise]);

    for await (const [chunk] of stream) {
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
    const msg = error.message || 'An error occurred while generating a response.';
    // Make common errors more user-friendly
    let errorMsg = msg;
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      errorMsg = 'Cannot connect to LLM. If using Ollama, make sure it is running. Configure your provider in Admin > LLM Providers.';
    }
    yield { type: 'error', content: errorMsg };
    fullContent = `Error: ${errorMsg}`;
  }

  if (fullContent && !fullContent.startsWith('Error:')) {
    const savedMsg = saveMessage(chatId, 'assistant', fullContent);

    const provider = getConfig('LLM_PROVIDER') || 'ollama';
    const model = getConfig('LLM_MODEL') || '';
    recordTokenUsage({
      chatId,
      messageId: savedMsg.id,
      provider,
      model,
      promptTokens: tokenCounter.promptTokens,
      completionTokens: tokenCounter.completionTokens,
    });
  }

  chat = getChatById(chatId);
  if (chat && chat.title === 'New Chat' && fullContent && !fullContent.startsWith('Error:')) {
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
    // Silent failure
  }
}

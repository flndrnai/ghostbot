import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { createModel } from './model.js';
import { TokenCounter } from './token-counter.js';
import { getConfig } from '../config.js';
import { getChatById, createChat, saveMessage, updateChatTitle, getMessagesByChatId } from '../db/chats.js';
import { recordTokenUsage } from '../db/token-usage.js';

const STREAM_TIMEOUT_MS = 60000;
const MAX_HISTORY_MESSAGES = 30;

function toLangchainMessages(history) {
  return history.map((m) => {
    if (m.role === 'user') return new HumanMessage(m.content);
    if (m.role === 'assistant') return new AIMessage(m.content);
    return new SystemMessage(m.content);
  });
}

export async function* chatStream(chatId, userId, userMessage, clientHistory = null) {
  let chat = getChatById(chatId);
  if (!chat) {
    createChat(userId, 'New Chat', chatId);
  }

  saveMessage(chatId, 'user', userMessage);

  const systemPrompt = getConfig('SYSTEM_PROMPT') || 'You are GhostBot, a helpful AI assistant.';

  // Build message history. Prefer client-provided history (already includes the new user msg);
  // fall back to DB history for resilience.
  let history;
  if (Array.isArray(clientHistory) && clientHistory.length > 0) {
    history = clientHistory.slice(-MAX_HISTORY_MESSAGES);
  } else {
    const dbMessages = getMessagesByChatId(chatId) || [];
    history = dbMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content }));
    if (!history.length || history[history.length - 1]?.content !== userMessage) {
      history.push({ role: 'user', content: userMessage });
    }
  }

  const messages = [new SystemMessage(systemPrompt), ...toLangchainMessages(history)];

  // Build a fresh model per request so config changes apply instantly.
  let model;
  try {
    model = await createModel();
  } catch (error) {
    yield { type: 'error', content: `Failed to initialize LLM: ${error.message}. Check Admin > LLM Providers.` };
    return;
  }

  const tokenCounter = new TokenCounter();
  let fullContent = '';

  try {
    const streamPromise = model.stream(messages, { callbacks: [tokenCounter] });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection to LLM timed out. Verify your provider is reachable in Admin settings.')), STREAM_TIMEOUT_MS),
    );

    const stream = await Promise.race([streamPromise, timeoutPromise]);

    for await (const chunk of stream) {
      const raw = chunk?.content;
      if (!raw) continue;
      const text = typeof raw === 'string'
        ? raw
        : Array.isArray(raw)
          ? raw.filter((c) => c.type === 'text').map((c) => c.text).join('')
          : '';
      if (text) {
        fullContent += text;
        yield { type: 'text-delta', content: text };
      }
    }
  } catch (error) {
    const msg = error.message || 'An error occurred while generating a response.';
    let errorMsg = msg;
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
      errorMsg = 'Cannot connect to LLM. If using Ollama, verify the URL in Admin > Ollama Setup is reachable from this server.';
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

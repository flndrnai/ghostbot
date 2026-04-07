import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { createModel } from './model.js';
import { streamOllamaChat } from './ollama-client.js';
import { TokenCounter } from './token-counter.js';
import { getConfig } from '../config.js';
import { getChatById, createChat, saveMessage, updateChatTitle, getMessagesByChatId } from '../db/chats.js';
import { recordTokenUsage } from '../db/token-usage.js';

const FIRST_TOKEN_TIMEOUT_MS = 120000;  // 2 min for cold model
const MAX_HISTORY_MESSAGES = 30;

function buildHistory(clientHistory, chatId, userMessage) {
  if (Array.isArray(clientHistory) && clientHistory.length > 0) {
    return clientHistory
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content }));
  }
  const dbMessages = getMessagesByChatId(chatId) || [];
  const history = dbMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content }));
  if (!history.length || history[history.length - 1]?.content !== userMessage) {
    history.push({ role: 'user', content: userMessage });
  }
  return history;
}

export async function* chatStream(chatId, userId, userMessage, clientHistory = null) {
  let chat = getChatById(chatId);
  if (!chat) {
    createChat(userId, 'New Chat', chatId);
  }

  saveMessage(chatId, 'user', userMessage);

  const provider = getConfig('LLM_PROVIDER') || 'ollama';
  const model = getConfig('LLM_MODEL') || '';
  const systemPrompt = getConfig('SYSTEM_PROMPT') || 'You are GhostBot, a helpful AI assistant.';
  const temperature = parseFloat(getConfig('TEMPERATURE') || '0.7');

  const history = buildHistory(clientHistory, chatId, userMessage);
  const messagesForLLM = [{ role: 'system', content: systemPrompt }, ...history];

  let fullContent = '';
  let firstTokenReceived = false;

  // ========= OLLAMA PATH (direct fetch, no LangChain) =========
  if (provider === 'ollama') {
    if (!model) {
      yield { type: 'error', content: 'No Ollama model selected. Go to Admin > LLM Providers and pick a model.' };
      return;
    }
    const baseUrl = getConfig('OLLAMA_BASE_URL') || 'http://localhost:11434';

    const ctrl = new AbortController();
    const firstTokenTimer = setTimeout(() => {
      if (!firstTokenReceived) ctrl.abort();
    }, FIRST_TOKEN_TIMEOUT_MS);

    try {
      const stream = streamOllamaChat({
        baseUrl,
        model,
        messages: messagesForLLM,
        temperature,
        signal: ctrl.signal,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'text' && chunk.text) {
          if (!firstTokenReceived) {
            firstTokenReceived = true;
            clearTimeout(firstTokenTimer);
          }
          fullContent += chunk.text;
          yield { type: 'text-delta', content: chunk.text };
        }
      }
    } catch (error) {
      clearTimeout(firstTokenTimer);
      const msg = error.message || 'Unknown Ollama error';
      let userMsg = msg;
      if (msg.includes('aborted') || msg.includes('AbortError')) {
        userMsg = `Ollama did not respond within ${FIRST_TOKEN_TIMEOUT_MS / 1000}s. The model may be loading — try again in a moment.`;
      } else if (msg.includes('Cannot reach')) {
        userMsg = `${msg}. Verify the URL in Admin > Ollama Setup is reachable from this server.`;
      }
      yield { type: 'error', content: userMsg };
      fullContent = `Error: ${userMsg}`;
    } finally {
      clearTimeout(firstTokenTimer);
    }
  } else {
    // ========= CLOUD PROVIDERS (LangChain) =========
    let lcModel;
    try {
      lcModel = await createModel();
    } catch (error) {
      yield { type: 'error', content: `Failed to initialize LLM: ${error.message}. Check Admin > LLM Providers.` };
      return;
    }

    const tokenCounter = new TokenCounter();
    const lcMessages = messagesForLLM.map((m) => {
      if (m.role === 'system') return new SystemMessage(m.content);
      if (m.role === 'assistant') return new AIMessage(m.content);
      return new HumanMessage(m.content);
    });

    try {
      const stream = await lcModel.stream(lcMessages, { callbacks: [tokenCounter] });
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
        errorMsg = 'Cannot connect to LLM. Check Admin > LLM Providers.';
      }
      yield { type: 'error', content: errorMsg };
      fullContent = `Error: ${errorMsg}`;
    }
  }

  if (fullContent && !fullContent.startsWith('Error:')) {
    const savedMsg = saveMessage(chatId, 'assistant', fullContent);
    recordTokenUsage({
      chatId,
      messageId: savedMsg.id,
      provider,
      model,
      promptTokens: 0,
      completionTokens: 0,
    });
  }

  chat = getChatById(chatId);
  if (chat && chat.title === 'New Chat' && fullContent && !fullContent.startsWith('Error:')) {
    autoTitle(chatId, userMessage).catch(() => {});
  }
}

export async function autoTitle(chatId, userMessage) {
  try {
    const provider = getConfig('LLM_PROVIDER') || 'ollama';

    if (provider === 'ollama') {
      const baseUrl = getConfig('OLLAMA_BASE_URL') || 'http://localhost:11434';
      const model = getConfig('LLM_MODEL') || '';
      if (!model) return;

      let title = '';
      const stream = streamOllamaChat({
        baseUrl,
        model,
        messages: [
          { role: 'system', content: 'Generate a concise 3-6 word title. Respond with ONLY the title, no quotes.' },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
      });
      for await (const chunk of stream) {
        if (chunk.type === 'text') title += chunk.text;
      }
      title = title.trim().replace(/^["']|["']$/g, '').slice(0, 80);
      if (title) updateChatTitle(chatId, title);
      return;
    }

    const model = await createModel({ maxTokens: 100 });
    const response = await model.invoke([
      new SystemMessage('Generate a concise 3-6 word title for this conversation. Respond with ONLY the title text, no quotes or formatting.'),
      new HumanMessage(userMessage),
    ]);
    const title = (typeof response.content === 'string' ? response.content : '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .slice(0, 80);
    if (title) updateChatTitle(chatId, title);
  } catch {
    // Silent failure
  }
}

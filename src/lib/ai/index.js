import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { createModel } from './model.js';
import { streamOllamaChat, pingOllama } from './ollama-client.js';
import { setConfig } from '../config.js';
import { TokenCounter } from './token-counter.js';
import { getConfig } from '../config.js';
import { getChatById, createChat, saveMessage, updateChatTitle, getMessagesByChatId } from '../db/chats.js';
import { recordTokenUsage } from '../db/token-usage.js';
import { searchChatSummaries } from '../memory/store.js';
import { summarizeChat } from '../memory/summarize.js';

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
  console.log('[chatStream] start', { chatId, userId, msgLen: userMessage?.length });

  let chat = getChatById(chatId);
  if (!chat) {
    console.log('[chatStream] creating new chat', { chatId, userId });
    createChat(userId, 'New Chat', chatId);
  } else {
    console.log('[chatStream] existing chat', { chatId, chatUserId: chat.userId });
  }

  saveMessage(chatId, 'user', userMessage);
  console.log('[chatStream] user message saved');

  const provider = getConfig('LLM_PROVIDER') || 'ollama';
  let model = getConfig('LLM_MODEL') || '';

  // Auto-pick first installed Ollama model if none configured (eliminates "stuck" state)
  if (provider === 'ollama' && !model) {
    const baseUrl = getConfig('OLLAMA_BASE_URL') || 'http://localhost:11434';
    const ping = await pingOllama(baseUrl);
    if (ping.ok && ping.models.length > 0) {
      model = ping.models[0].name;
      setConfig('LLM_MODEL', model);
    }
  }
  const baseSystemPrompt = getConfig('SYSTEM_PROMPT') || 'You are GhostBot, a helpful AI assistant.';
  const temperature = parseFloat(getConfig('TEMPERATURE') || '0.7');

  // ========= MEMORY RETRIEVAL (RAG) =========
  // On the first message of a new chat, search past chat summaries
  // for semantically relevant context and inject it into the system
  // prompt. Fire-and-forget: failures never block the chat.
  let systemPrompt = baseSystemPrompt;
  const dbMessagesCount = (getMessagesByChatId(chatId) || []).length;
  const isFirstMessage = dbMessagesCount <= 1; // only the user msg we just saved
  if (isFirstMessage) {
    try {
      const relevant = await searchChatSummaries(userMessage, { userId, topK: 3, minScore: 0.45 });
      if (relevant.length > 0) {
        const contextBlock = relevant
          .map((s, i) => {
            const topics = (() => { try { return JSON.parse(s.keyTopics || '[]').join(', '); } catch { return ''; } })();
            return `[Memory ${i + 1}${topics ? ` — ${topics}` : ''}] ${s.summary}`;
          })
          .join('\n');
        systemPrompt = `${baseSystemPrompt}\n\nRelevant context from previous conversations:\n${contextBlock}\n\nUse this context if relevant; otherwise ignore it.`;
        console.log('[chatStream] injected', relevant.length, 'memory summaries');
      }
    } catch (err) {
      console.error('[chatStream] memory retrieval failed:', err.message);
    }
  }

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

  console.log('[chatStream] stream done', { fullContentLen: fullContent.length, isError: fullContent.startsWith('Error:') });

  if (fullContent && !fullContent.startsWith('Error:')) {
    const savedMsg = saveMessage(chatId, 'assistant', fullContent);
    console.log('[chatStream] assistant message saved', { messageId: savedMsg.id });
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

  // Auto-summarize the chat in the background once we have at least
  // one full user+assistant exchange. This writes to chat_summaries
  // with an embedding so future chats can retrieve the context.
  if (fullContent && !fullContent.startsWith('Error:')) {
    (async () => {
      try {
        const fullHistory = getMessagesByChatId(chatId) || [];
        if (fullHistory.length >= 2) {
          await summarizeChat({ chatId, userId, messages: fullHistory });
        }
      } catch (err) {
        console.error('[chatStream] auto-summarize failed:', err.message);
      }
    })();
  }
}

export async function autoTitle(chatId, userMessage) {
  // Use the first user prompt as the title (no LLM call needed).
  // Truncate to a reasonable length so the sidebar stays clean.
  try {
    const title = String(userMessage || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (title) updateChatTitle(chatId, title);
  } catch {
    // Silent failure
  }
}

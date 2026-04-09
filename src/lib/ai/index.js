import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { createModel } from './model.js';
import { streamOllamaChat, pingOllama } from './ollama-client.js';
import { setConfig } from '../config.js';
import { TokenCounter } from './token-counter.js';
import { getConfig } from '../config.js';
import { getChatById, createChat, saveMessage, updateChatTitle, getMessagesByChatId } from '../db/chats.js';
import { getProjectById, resolveProjectPath } from '../db/projects.js';
import { recordTokenUsage } from '../db/token-usage.js';
import { searchChatSummaries } from '../memory/store.js';
import { summarizeChat } from '../memory/summarize.js';
import { getMemoryContext, appendToLog } from '../memory/persistent.js';
import { getGuardrails } from './guardrails.js';
import { getChatAbortSignal } from './live-chats.js';
import fs from 'fs';
import path from 'path';

const FIRST_TOKEN_TIMEOUT_MS = 120000;  // 2 min for cold model
const MAX_HISTORY_MESSAGES = 30;

/** Strip the data URL prefix from a base64 image, returning raw base64 for Ollama. */
function stripDataUrlPrefix(dataUrl) {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

function buildHistory(clientHistory, chatId, userMessage) {
  if (Array.isArray(clientHistory) && clientHistory.length > 0) {
    return clientHistory
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content, ...(m.images ? { images: m.images } : {}) }));
  }
  const dbMessages = getMessagesByChatId(chatId) || [];
  const history = dbMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content, ...(m.images ? { images: m.images } : {}) }));
  if (!history.length || history[history.length - 1]?.content !== userMessage) {
    history.push({ role: 'user', content: userMessage });
  }
  return history;
}

export async function* chatStream(chatId, userId, userMessage, clientHistory = null, userImages = null) {
  console.log('[chatStream] start', { chatId, userId, msgLen: userMessage?.length });

  let chat = getChatById(chatId);
  if (!chat) {
    console.log('[chatStream] creating new chat', { chatId, userId });
    createChat(userId, 'New Chat', chatId);
  } else {
    console.log('[chatStream] existing chat', { chatId, chatUserId: chat.userId });
  }

  saveMessage(chatId, 'user', userMessage, null, userImages);
  console.log('[chatStream] user message saved', userImages ? `with ${userImages.length} image(s)` : '');

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

  // ========= GUARDRAILS =========
  // Always-on safety rules injected into every chat.
  const guardrails = getGuardrails();

  // ========= PERSISTENT MEMORY (Tier 1 + Tier 2) =========
  // Per-user MEMORY.md (curated facts) + today's session log.
  let persistentMemory = '';
  try {
    persistentMemory = getMemoryContext(userId);
    if (persistentMemory) {
      console.log('[chatStream] loaded persistent memory for user', userId);
    }
  } catch (err) {
    console.error('[chatStream] persistent memory load failed:', err.message);
  }

  // ========= MEMORY RETRIEVAL (RAG) =========
  // On the first message of a new chat, search past chat summaries
  // for semantically relevant context and inject it into the system
  // prompt. Fire-and-forget: failures never block the chat.
  // Respects the per-chat memoryEnabled opt-out.
  // Build system prompt: base + guardrails + persistent memory
  let systemPrompt = baseSystemPrompt + '\n\n' + guardrails;
  if (persistentMemory) {
    systemPrompt += '\n\nPersistent memory:\n' + persistentMemory;
  }
  const memoryOn = chat ? !!chat.memoryEnabled : true;
  const dbMessagesCount = (getMessagesByChatId(chatId) || []).length;
  const isFirstMessage = dbMessagesCount <= 1; // only the user msg we just saved
  if (isFirstMessage && memoryOn) {
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

  // ========= PROJECT CONTEXT (CLAUDE.md) =========
  // If the chat is connected to a project, inject the project's
  // CLAUDE.md into the system prompt so the LLM understands the
  // codebase, architecture, conventions, and current status.
  if (chat?.projectId) {
    try {
      const project = getProjectById(chat.projectId);
      if (project) {
        const claudeMdPath = path.join(resolveProjectPath(project.path), 'CLAUDE.md');
        if (fs.existsSync(claudeMdPath)) {
          const claudeMd = fs.readFileSync(claudeMdPath, 'utf-8').slice(0, 8000); // cap at 8KB
          systemPrompt += `\n\nProject: ${project.name}\n${claudeMd}`;
          console.log('[chatStream] injected project CLAUDE.md', { projectId: project.id, name: project.name });
        }
      }
    } catch (err) {
      console.error('[chatStream] project context injection failed:', err.message);
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

    // Two abort sources:
    //   1. firstTokenTimer — fires only if no token arrives in time
    //   2. userAbortSignal  — fires when the user clicks the Stop
    //                         button (POST /api/chat/cancel)
    const ctrl = new AbortController();
    let userCancelled = false;
    const firstTokenTimer = setTimeout(() => {
      if (!firstTokenReceived) ctrl.abort();
    }, FIRST_TOKEN_TIMEOUT_MS);

    const userAbortSignal = getChatAbortSignal(chatId);
    const onUserAbort = () => {
      userCancelled = true;
      try { ctrl.abort(); } catch {}
    };
    if (userAbortSignal) {
      if (userAbortSignal.aborted) onUserAbort();
      else userAbortSignal.addEventListener('abort', onUserAbort, { once: true });
    }

    try {
      // Attach images (raw base64) to messages for Ollama vision models
      const ollamaMessages = messagesForLLM.map((m) => {
        if (m.images && Array.isArray(m.images) && m.images.length) {
          return { ...m, images: m.images.map(stripDataUrlPrefix) };
        }
        return m;
      });

      const stream = streamOllamaChat({
        baseUrl,
        model,
        messages: ollamaMessages,
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
      if (userCancelled) {
        // User pressed Stop. Persist whatever text we already
        // streamed and exit cleanly — no error frame.
        if (fullContent) fullContent += '\n\n_(stopped)_';
        else fullContent = '_(stopped before any response)_';
      } else {
        let userMsg = msg;
        if (msg.includes('aborted') || msg.includes('AbortError')) {
          userMsg = `Ollama did not respond within ${FIRST_TOKEN_TIMEOUT_MS / 1000}s. The model may be loading — try again in a moment.`;
        } else if (msg.includes('Cannot reach')) {
          userMsg = `${msg}. Verify the URL in Admin > Ollama Setup is reachable from this server.`;
        }
        yield { type: 'error', content: userMsg };
        fullContent = `Error: ${userMsg}`;
      }
    } finally {
      clearTimeout(firstTokenTimer);
      if (userAbortSignal) {
        try { userAbortSignal.removeEventListener('abort', onUserAbort); } catch {}
      }
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
      // Multipart content for messages with images (vision)
      if (m.images && Array.isArray(m.images) && m.images.length) {
        return new HumanMessage({
          content: [
            { type: 'text', text: m.content || '' },
            ...m.images.map((url) => ({ type: 'image_url', image_url: { url } })),
          ],
        });
      }
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

  // ========= SESSION LOG (Tier 2) =========
  // Append a summary of this exchange to the daily log
  try {
    const msgPreview = userMessage.slice(0, 80).replace(/\n/g, ' ');
    appendToLog(userId, `Chat: "${msgPreview}${userMessage.length > 80 ? '...' : ''}" → ${fullContent.length} chars response`);
  } catch {}


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
  // Skipped if the chat has memory opt-out enabled.
  if (memoryOn && fullContent && !fullContent.startsWith('Error:')) {
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

// Direct Ollama client — no LangChain, no OpenAI compatibility layer.
// Uses Ollama's native /api/chat endpoint with newline-delimited JSON streaming.
// This is the most reliable path because there's nothing to abstract away.

export async function* streamOllamaChat({ baseUrl, model, messages, temperature = 0.7, signal }) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/chat`;

  const body = {
    model,
    messages: messages.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
      ...(Array.isArray(m.images) && m.images.length ? { images: m.images } : {}),
    })),
    stream: true,
    options: { temperature },
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw new Error(`Cannot reach Ollama at ${baseUrl}: ${err.message}`);
  }

  if (!response.ok) {
    let errText = '';
    try { errText = await response.text(); } catch {}
    throw new Error(`Ollama HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }

  if (!response.body) {
    throw new Error('Ollama returned no stream body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let obj;
        try {
          obj = JSON.parse(trimmed);
        } catch {
          continue;
        }
        if (obj.error) {
          throw new Error(`Ollama: ${obj.error}`);
        }
        const text = obj?.message?.content;
        if (text) {
          yield { type: 'text', text };
        }
        if (obj.done) {
          return;
        }
      }
    }
    // Flush any trailing buffered line
    if (buffer.trim()) {
      try {
        const obj = JSON.parse(buffer.trim());
        const text = obj?.message?.content;
        if (text) yield { type: 'text', text };
      } catch {}
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

export async function pingOllama(baseUrl, timeoutMs = 5000) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/tags`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ok: true, models: data.models || [] };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(t);
  }
}

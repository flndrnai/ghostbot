// Chat summarization — generates a 2-3 sentence recap and a
// short list of key topics for a finished conversation, then
// saves it to chat_summaries (with embedding for retrieval).

import { streamOllamaChat } from '../ai/ollama-client.js';
import { getConfig } from '../config.js';
import { saveChatSummary } from './store.js';

const SYSTEM_PROMPT = `You are a summarization assistant. Given a conversation between a user and an AI coding assistant, output a JSON object with exactly two fields:
{
  "summary": "A 2-3 sentence recap of what the conversation covered and what was decided or built.",
  "topics": ["topic1", "topic2", "topic3"]
}

The topics array should have 2-5 short lowercase tag words or phrases (e.g. "authentication", "next.js", "docker", "bug fix"). Output ONLY the JSON, no other text.`;

export async function summarizeChat({ chatId, userId, messages }) {
  if (!Array.isArray(messages) || messages.length < 2) return null;

  // Build the conversation transcript
  const transcript = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')
    .slice(0, 8000); // cap size so we don't blow context

  const provider = getConfig('LLM_PROVIDER') || 'ollama';
  if (provider !== 'ollama') {
    // For MVP we only summarize via Ollama. Cloud providers can be
    // added later using the existing LangChain createModel path.
    return null;
  }

  const baseUrl = getConfig('OLLAMA_BASE_URL') || 'http://localhost:11434';
  const model = getConfig('LLM_MODEL') || '';
  if (!model) return null;

  let fullText = '';
  try {
    const stream = streamOllamaChat({
      baseUrl,
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
    });
    for await (const chunk of stream) {
      if (chunk.type === 'text') fullText += chunk.text;
    }
  } catch (err) {
    console.error('[summarize] failed:', err.message);
    return null;
  }

  // Extract JSON from the model's response — models sometimes wrap it in markdown
  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const topics = Array.isArray(parsed.topics)
    ? parsed.topics.filter((t) => typeof t === 'string').slice(0, 8)
    : [];
  if (!summary) return null;

  const saved = await saveChatSummary({ chatId, userId, summary, keyTopics: topics });
  return { summary, topics, ...saved };
}

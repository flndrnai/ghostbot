/**
 * Agent NDJSON line mappers — pure JavaScript, no Node.js dependencies.
 * Each mapper converts agent-specific JSON output to normalized chat events.
 */

function isEmptyEvent(e) {
  if (e.type === 'text' && !e.text) return true;
  if (e.type === 'tool-call' && !e.toolName) return true;
  if (e.type === 'tool-result' && !e.toolCallId) return true;
  return false;
}

export function mapLine(line, mapper = mapClaudeCodeLine) {
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    return [{ type: 'text', text: `\n${line}\n` }];
  }
  const events = mapper(parsed);
  if (events.some((e) => e.type === 'skip')) return [];
  if (events.length === 0 || events.every(isEmptyEvent)) return [{ type: 'unknown', raw: parsed }];
  return events;
}

// ─── Claude Code ───

export function mapClaudeCodeLine(parsed) {
  const events = [];
  const { type, message, result, tool_use_result } = parsed;

  if (type === 'system') return [{ type: 'skip' }];
  if (type === 'rate_limit_event') {
    if (parsed.rate_limit_info?.status === 'allowed') return [{ type: 'skip' }];
    return [{ type: 'text', text: `Rate limited — resets at ${new Date((parsed.rate_limit_info?.resetsAt || 0) * 1000).toLocaleString()}` }];
  }

  if (type === 'assistant' && message?.content) {
    for (const block of message.content) {
      if (block.type === 'text' && block.text) events.push({ type: 'text', text: block.text });
      else if (block.type === 'tool_use') events.push({ type: 'tool-call', toolCallId: block.id, toolName: block.name, args: block.input });
    }
    if (events.length === 0) return [{ type: 'skip' }];
  } else if (type === 'user' && message?.content) {
    for (const block of message.content) {
      if (block.type === 'tool_result') {
        const resultText = tool_use_result?.stdout ?? (typeof block.content === 'string' ? block.content : Array.isArray(block.content) ? block.content.map((b) => b.text || '').join('') : JSON.stringify(block.content));
        events.push({ type: 'tool-result', toolCallId: block.tool_use_id, result: resultText });
      }
    }
    if (events.length === 0) return [{ type: 'skip' }];
  } else if (type === 'result' && result) {
    events.push({ type: 'text', text: result });
  }
  return events;
}

// ─── Pi Coding Agent ───

export function mapPiLine(parsed) {
  const events = [];
  const { type } = parsed;

  if (type === 'message_update' && parsed.assistantMessageEvent) {
    const evt = parsed.assistantMessageEvent;
    if (evt.type === 'text_delta' && evt.delta) events.push({ type: 'text', text: evt.delta });
    if (evt.type === 'toolcall_end' && evt.toolCall) {
      events.push({ type: 'tool-call', toolCallId: evt.toolCall.id, toolName: evt.toolCall.name, args: evt.toolCall.arguments || {} });
    }
  } else if (type === 'tool_execution_end') {
    const resultText = parsed.result?.content?.map((b) => b.text || '').join('') || '';
    events.push({ type: 'tool-result', toolCallId: parsed.toolCallId || '', result: resultText });
  } else if (type === 'agent_end' && parsed.messages) {
    const last = [...parsed.messages].reverse().find((m) => m.role === 'assistant');
    if (last) {
      const text = (last.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      if (text) events.push({ type: 'text', text });
    }
  }
  return events;
}

// ─── Gemini CLI ───

export function mapGeminiLine(parsed) {
  const events = [];
  const { type } = parsed;

  if (type === 'message') {
    if (parsed.role === 'user') return [{ type: 'skip' }];
    const content = typeof parsed.content === 'string' ? parsed.content : parsed.content?.text;
    if (content) events.push({ type: 'text', text: content });
  } else if (type === 'tool_use') {
    events.push({ type: 'tool-call', toolCallId: parsed.tool_id || '', toolName: parsed.tool_name || '', args: parsed.parameters || {} });
  } else if (type === 'tool_result') {
    events.push({ type: 'tool-result', toolCallId: parsed.tool_id || '', result: typeof parsed.output === 'string' ? parsed.output : JSON.stringify(parsed.output) });
  } else if (type === 'result') {
    const stats = parsed.stats;
    if (stats) events.push({ type: 'text', text: `Completed (${stats.total_tokens || 0} tokens, ${stats.tool_calls || 0} tool calls)` });
    return events.length ? events : [{ type: 'skip' }];
  } else if (type === 'error') {
    events.push({ type: 'text', text: `Error: ${parsed.message || JSON.stringify(parsed)}` });
  } else if (type === 'init') {
    return [{ type: 'skip' }];
  }
  return events;
}

// ─── Codex CLI ───

export function mapCodexLine(parsed) {
  const events = [];
  const { type, item } = parsed;

  if (type === 'item.completed' && item) {
    if (item.type === 'agent_message' && item.text) events.push({ type: 'text', text: item.text });
    else if (item.type === 'command_execution') {
      events.push({ type: 'tool-call', toolCallId: item.id || '', toolName: 'command', args: { command: item.command || '' } });
      if (item.aggregated_output !== undefined) events.push({ type: 'tool-result', toolCallId: item.id || '', result: typeof item.aggregated_output === 'string' ? item.aggregated_output : JSON.stringify(item.aggregated_output) });
    } else if (item.type === 'mcp_tool_call') {
      events.push({ type: 'tool-call', toolCallId: item.id || '', toolName: `${item.server || 'mcp'}:${item.tool || 'unknown'}`, args: item.arguments || {} });
      if (item.result) events.push({ type: 'tool-result', toolCallId: item.id || '', result: item.result.content?.map((b) => b.text || '').join('') || JSON.stringify(item.result) });
    } else if (item.type === 'file_change') {
      events.push({ type: 'tool-call', toolCallId: item.id || '', toolName: 'file_change', args: { file: item.file || '', action: item.action || 'edit' } });
    }
  } else if (type === 'turn.completed') {
    const usage = parsed.usage;
    if (usage) events.push({ type: 'text', text: `Completed (${usage.input_tokens || 0} input, ${usage.output_tokens || 0} output tokens)` });
    return events.length ? events : [{ type: 'skip' }];
  } else if (type === 'turn.failed') {
    events.push({ type: 'text', text: `Error: ${parsed.error?.message || JSON.stringify(parsed.error || parsed)}` });
  } else if (type === 'error') {
    events.push({ type: 'text', text: `Error: ${parsed.message || JSON.stringify(parsed)}` });
  } else if (type === 'thread.started' || type === 'turn.started' || type === 'item.started') {
    return [{ type: 'skip' }];
  }
  return events;
}

// ─── OpenCode ───

export function mapOpenCodeLine(parsed) {
  const events = [];
  const { type, part } = parsed;

  if (type === 'text' && part?.text) {
    events.push({ type: 'text', text: part.text });
  } else if (type === 'tool_use' && part) {
    const callId = part.callID || part.id || '';
    events.push({ type: 'tool-call', toolCallId: callId, toolName: part.tool || '', args: part.state?.input || {} });
    if (part.state?.status === 'completed' && part.state.output !== undefined) {
      events.push({ type: 'tool-result', toolCallId: callId, result: typeof part.state.output === 'string' ? part.state.output : JSON.stringify(part.state.output) });
    }
  } else if (type === 'step_start' || type === 'step_finish') {
    return [{ type: 'skip' }];
  } else if (type === 'error') {
    events.push({ type: 'text', text: `Error: ${parsed.message || JSON.stringify(parsed)}` });
  }
  return events;
}

// ─── Kimi CLI ───

export function mapKimiLine(parsed) {
  const events = [];
  const { role, content, tool_calls, tool_call_id } = parsed;

  if (role === 'assistant') {
    if (typeof content === 'string' && content) events.push({ type: 'text', text: content });
    else if (Array.isArray(content)) {
      for (const block of content) {
        if (typeof block === 'string' && block) events.push({ type: 'text', text: block });
        else if (block?.type === 'text' && block.text) events.push({ type: 'text', text: block.text });
      }
    }
    if (Array.isArray(tool_calls)) {
      for (const tc of tool_calls) {
        if (tc.type === 'function' && tc.function) {
          let args = {};
          try { args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}; } catch {}
          events.push({ type: 'tool-call', toolCallId: tc.id || '', toolName: tc.function.name || '', args });
        }
      }
    }
    if (events.length === 0) return [{ type: 'skip' }];
  } else if (role === 'tool') {
    const resultText = typeof content === 'string' ? content : Array.isArray(content) ? content.map((b) => (typeof b === 'string' ? b : b?.text || '')).join('') : JSON.stringify(content);
    events.push({ type: 'tool-result', toolCallId: tool_call_id || '', result: resultText });
  }
  return events;
}

// ─── Mapper Registry ───

export const mapperMap = {
  'claude-code': mapClaudeCodeLine,
  'pi-coding-agent': mapPiLine,
  'gemini-cli': mapGeminiLine,
  'codex-cli': mapCodexLine,
  'opencode': mapOpenCodeLine,
  'kimi-cli': mapKimiLine,
};

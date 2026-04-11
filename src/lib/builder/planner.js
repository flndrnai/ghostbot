// Builder Planner — LLM-powered plan generation
// Takes a goal + project context and produces a structured multi-step build plan.

import { getConfig } from '../config.js';
import { streamOllamaChat } from '../ai/ollama-client.js';

const PLANNER_PROMPT = `You are GhostBot's Autonomous Builder planner. Your job is to break down a build goal into clear, sequential implementation steps.

## Rules
1. Each step should be a single, well-scoped task a coding agent can execute
2. Steps should be ordered so each builds on the previous
3. Include setup/config steps first, then core logic, then integration, then polish
4. Each step's prompt should be detailed enough for the agent to execute without ambiguity
5. Include expected files that should exist after each step (for validation)
6. Keep to 3-10 steps — not too granular, not too broad

## Output Format
Return ONLY a JSON array (no markdown fences, no explanation). Each element:
{
  "title": "Short descriptive title",
  "prompt": "Detailed instructions for the coding agent. Include specific file paths, function names, and expected behavior.",
  "expectedFiles": ["path/to/expected/file.js"]
}

Example:
[
  {
    "title": "Set up project scaffolding",
    "prompt": "Create a new Next.js project with TypeScript...",
    "expectedFiles": ["package.json", "tsconfig.json", "src/app/page.tsx"]
  }
]`;

/**
 * Generate a build plan from a goal and project context.
 * Returns an array of { title, prompt, expectedFiles } objects.
 */
export async function generateBuildPlan(goal, claudeMdContent = '', fileTree = '') {
  const baseUrl = getConfig('OLLAMA_BASE_URL') || 'http://localhost:11434';
  const model = getConfig('LLM_MODEL') || '';

  if (!model) throw new Error('No LLM model configured');

  let contextBlock = '';
  if (claudeMdContent) {
    contextBlock += `\n\nCurrent project CLAUDE.md:\n${claudeMdContent.slice(0, 4000)}`;
  }
  if (fileTree) {
    contextBlock += `\n\nCurrent project file tree:\n${fileTree.slice(0, 3000)}`;
  }

  const userMessage = `Goal: ${goal}${contextBlock}\n\nGenerate the build plan as a JSON array.`;

  const messages = [
    { role: 'system', content: PLANNER_PROMPT },
    { role: 'user', content: userMessage },
  ];

  let fullResponse = '';
  try {
    const stream = streamOllamaChat({ baseUrl, model, messages, temperature: 0.3 });
    for await (const chunk of stream) {
      if (chunk.type === 'text' && chunk.text) {
        fullResponse += chunk.text;
      }
    }
  } catch (err) {
    console.error('[builder] LLM stream failed:', err?.message);
    throw new Error(`Failed to reach LLM: ${err?.message || 'connection error'}`);
  }

  // Extract JSON from the response (handle markdown fences)
  let jsonStr = fullResponse.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Find the JSON array in the response
  const arrayStart = jsonStr.indexOf('[');
  const arrayEnd = jsonStr.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
  }

  let steps;
  try {
    steps = JSON.parse(jsonStr);
  } catch (err) {
    console.error('[builder] failed to parse plan JSON:', err.message);
    console.error('[builder] raw response:', fullResponse.slice(0, 500));
    throw new Error('Failed to generate a valid build plan. The LLM returned malformed JSON.');
  }

  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('Build plan is empty. Try rephrasing your goal with more detail.');
  }

  // Validate and normalize
  return steps.map((s, i) => ({
    title: s.title || `Step ${i + 1}`,
    prompt: s.prompt || '',
    expectedFiles: Array.isArray(s.expectedFiles) ? s.expectedFiles : [],
  }));
}

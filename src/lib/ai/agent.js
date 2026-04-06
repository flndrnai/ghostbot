import path from 'path';
import fs from 'fs';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { createModel } from './model.js';
import { PROJECT_ROOT } from '../paths.js';

let agentPromise = null;

export async function getAgent() {
  if (globalThis.__ghostbotAgent) return globalThis.__ghostbotAgent;

  // Avoid concurrent initialization
  if (agentPromise) return agentPromise;

  agentPromise = (async () => {
    const checkpointDir = path.join(PROJECT_ROOT, 'data/db');
    if (!fs.existsSync(checkpointDir)) {
      fs.mkdirSync(checkpointDir, { recursive: true });
    }

    const checkpointPath = path.join(checkpointDir, 'checkpoints.sqlite');
    const checkpointer = SqliteSaver.fromConnString(checkpointPath);

    const llm = await createModel();

    const agent = createReactAgent({
      llm,
      tools: [],
      checkpointSaver: checkpointer,
    });

    globalThis.__ghostbotAgent = agent;
    agentPromise = null;
    return agent;
  })();

  return agentPromise;
}

export function resetAgent() {
  globalThis.__ghostbotAgent = null;
  agentPromise = null;
}

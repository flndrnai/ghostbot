/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: [
    'better-sqlite3',
    'drizzle-orm',
    '@langchain/core',
    '@langchain/anthropic',
    '@langchain/openai',
    '@langchain/google-genai',
    '@langchain/langgraph',
    '@langchain/langgraph-checkpoint-sqlite',
  ],
};

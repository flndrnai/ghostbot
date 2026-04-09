import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  // Owner = the very first user created at fresh install. Cannot
  // be deleted, demoted or removed by anyone — including other
  // admins. Exactly one owner per install. Stored as 0/1 integer
  // because SQLite has no native boolean.
  owner: integer('owner').notNull().default(0),
  firstName: text('first_name'),
  lastName: text('last_name'),
  country: text('country'),
  avatarDataUrl: text('avatar_data_url'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Invitations — admin-created one-time tokens that let a new user
// register by setting their own password.
export const invitations = sqliteTable('invitations', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  role: text('role').notNull().default('user'),
  invitedBy: text('invited_by').notNull(),
  expiresAt: integer('expires_at').notNull(),
  acceptedAt: integer('accepted_at'),
  createdAt: integer('created_at').notNull(),
});

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull().default('New Chat'),
  starred: integer('starred').notNull().default(0),
  chatMode: text('chat_mode').notNull().default('agent'),
  codeWorkspaceId: text('code_workspace_id'),
  projectId: text('project_id'),
  memoryEnabled: integer('memory_enabled').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  images: text('images'),
  createdAt: integer('created_at').notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  notification: text('notification').notNull(),
  payload: text('payload').notNull(),
  read: integer('read').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull(),
  channelId: text('channel_id').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const codeWorkspaces = sqliteTable('code_workspaces', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  containerName: text('container_name').unique(),
  repo: text('repo'),
  branch: text('branch'),
  featureBranch: text('feature_branch'),
  title: text('title').notNull().default('Code Workspace'),
  lastInteractiveCommit: text('last_interactive_commit'),
  starred: integer('starred').notNull().default(0),
  hasChanges: integer('has_changes').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const clusters = sqliteTable('clusters', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull().default('New Cluster'),
  systemPrompt: text('system_prompt').notNull().default(''),
  folders: text('folders'),
  enabled: integer('enabled').notNull().default(0),
  starred: integer('starred').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const clusterRoles = sqliteTable('cluster_roles', {
  id: text('id').primaryKey(),
  clusterId: text('cluster_id').notNull(),
  roleName: text('role_name').notNull(),
  role: text('role').notNull().default(''),
  prompt: text('prompt').notNull().default('Execute your role.'),
  triggerConfig: text('trigger_config'),
  maxConcurrency: integer('max_concurrency').notNull().default(1),
  cleanupWorkerDir: integer('cleanup_worker_dir').notNull().default(0),
  planMode: integer('plan_mode').notNull().default(0),
  folders: text('folders'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  createdBy: text('created_by'),
  lastUsedAt: integer('last_used_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// GhostBot-specific: Knowledge base for RAG
export const knowledgeEntries = sqliteTable('knowledge_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id'),              // which user owns this entry (null = global)
  sourceType: text('source_type').notNull(), // 'chat', 'agent_job', 'manual', 'code', 'summary'
  sourceId: text('source_id'),
  title: text('title').notNull(),
  content: text('content').notNull(),
  embedding: text('embedding'),         // JSON array of floats (Ollama nomic-embed-text = 768 dims)
  embeddingModel: text('embedding_model'), // e.g. 'nomic-embed-text'
  metadata: text('metadata'),           // JSON: topics, language, file paths, etc.
  createdAt: integer('created_at').notNull(),
});

// Token usage tracking
export const tokenUsage = sqliteTable('token_usage', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  messageId: text('message_id'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

// GhostBot-specific: Cross-chat context summaries
export const chatSummaries = sqliteTable('chat_summaries', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  userId: text('user_id'),              // redundant but lets us query without joining chats
  summary: text('summary').notNull(),
  keyTopics: text('key_topics').notNull(), // JSON array of topic strings
  embedding: text('embedding'),         // JSON array of floats
  embeddingModel: text('embedding_model'),
  createdAt: integer('created_at').notNull(),
});

// Projects — user-owned project folders for the coding agent
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  path: text('path').notNull(),
  description: text('description').default(''),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const agentJobs = sqliteTable('agent_jobs', {
  id: text('id').primaryKey(),
  chatId: text('chat_id'),              // optional — jobs can be standalone
  userId: text('user_id').notNull(),
  agent: text('agent').notNull(),       // 'aider' | 'opencode' | etc.
  image: text('image').notNull(),       // docker image tag
  prompt: text('prompt').notNull(),
  repo: text('repo').notNull(),         // owner/repo
  baseBranch: text('base_branch').notNull(),
  branch: text('branch').notNull(),     // agent-job/xxx
  status: text('status').notNull(),     // pending|running|succeeded|failed|cancelled
  output: text('output'),               // accumulated container stdout+stderr
  error: text('error'),                 // error message on failure
  prUrl: text('pr_url'),                // link if a PR was opened
  createdAt: integer('created_at').notNull(),
  startedAt: integer('started_at'),
  completedAt: integer('completed_at'),
});

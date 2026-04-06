CREATE TABLE `chat_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`summary` text NOT NULL,
	`key_topics` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT 'New Chat' NOT NULL,
	`starred` integer DEFAULT 0 NOT NULL,
	`chat_mode` text DEFAULT 'agent' NOT NULL,
	`code_workspace_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cluster_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`cluster_id` text NOT NULL,
	`role_name` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`prompt` text DEFAULT 'Execute your role.' NOT NULL,
	`trigger_config` text,
	`max_concurrency` integer DEFAULT 1 NOT NULL,
	`cleanup_worker_dir` integer DEFAULT 0 NOT NULL,
	`plan_mode` integer DEFAULT 0 NOT NULL,
	`folders` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clusters` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text DEFAULT 'New Cluster' NOT NULL,
	`system_prompt` text DEFAULT '' NOT NULL,
	`folders` text,
	`enabled` integer DEFAULT 0 NOT NULL,
	`starred` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `code_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`container_name` text,
	`repo` text,
	`branch` text,
	`feature_branch` text,
	`title` text DEFAULT 'Code Workspace' NOT NULL,
	`last_interactive_commit` text,
	`starred` integer DEFAULT 0 NOT NULL,
	`has_changes` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `code_workspaces_container_name_unique` ON `code_workspaces` (`container_name`);--> statement-breakpoint
CREATE TABLE `knowledge_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`notification` text NOT NULL,
	`payload` text NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_by` text,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`channel_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
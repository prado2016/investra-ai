CREATE TABLE `decision_events` (
	`id` text PRIMARY KEY NOT NULL,
	`decision_run_id` text NOT NULL,
	`event_id` text NOT NULL,
	`schema_version` text NOT NULL,
	`source` text DEFAULT 'runtime' NOT NULL,
	`review_session_id` text NOT NULL,
	`portfolio_id` text NOT NULL,
	`event_type` text NOT NULL,
	`created_at` text NOT NULL,
	`session_id` text,
	`cycle_id` text,
	`proposal_id` text,
	`decision_id` text,
	`execution_order_id` text,
	`position_id` text,
	`job_id` text,
	`instrument` text,
	`side` text,
	`action` text,
	`provider` text,
	`model` text,
	`requested_by_user_id` text,
	`payload_json` text NOT NULL,
	`ingested_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`decision_run_id`) REFERENCES `decision_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decision_events_event_id_idx` ON `decision_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `decision_events_run_created_idx` ON `decision_events` (`decision_run_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `decision_events_review_created_idx` ON `decision_events` (`review_session_id`,`created_at`,`event_id`);--> statement-breakpoint
CREATE TABLE `decision_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`decision_run_id` text NOT NULL,
	`portfolio_id` text NOT NULL,
	`account_id` text,
	`asset_id` text,
	`symbol` text,
	`insight_type` text NOT NULL,
	`headline` text NOT NULL,
	`summary` text NOT NULL,
	`confidence` real,
	`recommended_action` text,
	`status` text DEFAULT 'active' NOT NULL,
	`source_event_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`decision_run_id`) REFERENCES `decision_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_event_id`) REFERENCES `decision_events`(`event_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `decision_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`portfolio_id` text NOT NULL,
	`external_session_id` text,
	`request_idempotency_key` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`snapshot_hash` text NOT NULL,
	`schema_version` text DEFAULT '1.0' NOT NULL,
	`status` text DEFAULT 'pending_submission' NOT NULL,
	`requested_at` integer DEFAULT (unixepoch()) NOT NULL,
	`accepted_at` integer,
	`last_synced_at` integer,
	`sync_cursor_event_id` text,
	`sync_cursor_created_at` text,
	`completed_at` integer,
	`error_message` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decision_runs_user_idempotency_idx` ON `decision_runs` (`user_id`,`request_idempotency_key`);--> statement-breakpoint
CREATE INDEX `decision_runs_snapshot_hash_idx` ON `decision_runs` (`user_id`,`portfolio_id`,`snapshot_hash`);
CREATE TABLE `budget_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`budgeted` real DEFAULT 0 NOT NULL,
	`confirmed` real DEFAULT 0 NOT NULL,
	`paid` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`side` text NOT NULL,
	`relationship_group` text NOT NULL,
	`relation` text,
	`role` text,
	`attendance_type` text NOT NULL,
	`is_child` integer DEFAULT false NOT NULL,
	`rsvp_status` text DEFAULT 'pending' NOT NULL,
	`meal` text,
	`dietary_notes` text,
	FOREIGN KEY (`group_id`) REFERENCES `invite_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invite_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`message` text,
	`responded_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_groups_token_unique` ON `invite_groups` (`token`);--> statement-breakpoint
CREATE TABLE `quote_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`section` text NOT NULL,
	`scope` text NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`qty` integer,
	`included` integer DEFAULT false NOT NULL,
	`confirmed` integer DEFAULT false NOT NULL,
	`bond` integer DEFAULT false NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `seat_assignments` (
	`guest_id` integer PRIMARY KEY NOT NULL,
	`table_no` integer NOT NULL,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stationery_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`name` text,
	`contact` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`notes` text,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `timeline_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phase_id` integer NOT NULL,
	`label` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`phase_id`) REFERENCES `timeline_phases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `timeline_phases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`window` text,
	`sort` integer DEFAULT 0 NOT NULL
);

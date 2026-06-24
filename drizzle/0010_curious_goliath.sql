CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`body` text NOT NULL,
	`category` text DEFAULT 'General' NOT NULL,
	`entity_type` text,
	`entity_id` integer,
	`pinned` integer DEFAULT false NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer
);

CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_slug_unique` ON `users` (`slug`);
--> statement-breakpoint
INSERT OR IGNORE INTO `users` (`slug`, `name`) VALUES ('alex', 'Alex'), ('katie', 'Katie');
--> statement-breakpoint
ALTER TABLE `suppliers` RENAME TO `vendors`;
--> statement-breakpoint
ALTER TABLE `appointments` RENAME COLUMN `supplier_id` TO `vendor_id`;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `phone` text;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `email` text;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `website` text;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `address` text;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `stage` text DEFAULT 'Lead' NOT NULL;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `quoted_amount` real;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `deposit_amount` real;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `deposit_paid` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `follow_up_date` text;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `priority` integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE `vendors` ADD `description` text;
--> statement-breakpoint
UPDATE `vendors` SET `stage` = CASE `status`
	WHEN 'booked' THEN 'Booked'
	WHEN 'short' THEN 'Shortlisted'
	ELSE 'Lead' END;
--> statement-breakpoint
UPDATE `vendors` SET `deposit_paid` = 1 WHERE `status` = 'booked';
--> statement-breakpoint
ALTER TABLE `vendors` DROP COLUMN `status`;
--> statement-breakpoint
ALTER TABLE `notes` ADD `author_id` integer REFERENCES users(id);
--> statement-breakpoint
ALTER TABLE `notes` ADD `last_edited_by_id` integer REFERENCES users(id);
--> statement-breakpoint
UPDATE `notes` SET `entity_type` = 'vendor' WHERE `entity_type` = 'supplier';
--> statement-breakpoint
CREATE TABLE `note_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note_id` integer NOT NULL REFERENCES notes(id),
	`author_id` integer REFERENCES users(id),
	`body` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer REFERENCES users(id),
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer,
	`summary` text NOT NULL,
	`created_at` integer
);

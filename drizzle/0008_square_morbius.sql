CREATE TABLE `appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`time` text,
	`location` text,
	`notes` text,
	`supplier_id` integer,
	`created_at` integer,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `invite_groups` ADD `address` text;--> statement-breakpoint
ALTER TABLE `invite_groups` ADD `email` text;--> statement-breakpoint
ALTER TABLE `invite_groups` ADD `phone` text;
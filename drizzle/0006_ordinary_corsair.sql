ALTER TABLE `timeline_items` ADD `due_date` text;--> statement-breakpoint
ALTER TABLE `timeline_items` ADD `notifications_sent` text DEFAULT '' NOT NULL;
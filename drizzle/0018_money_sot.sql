CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` real NOT NULL,
	`paid_on` text,
	`note` text,
	`vendor_id` integer,
	`budget_line_id` integer,
	`created_at` integer,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`budget_line_id`) REFERENCES `budget_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `budget_lines` ADD `vendor_id` integer REFERENCES vendors(id);
--> statement-breakpoint
ALTER TABLE `budget_lines` ADD `source_type` text;
--> statement-breakpoint
ALTER TABLE `quote_lines` ADD `meal` text DEFAULT 'any' NOT NULL;
--> statement-breakpoint
INSERT INTO `payments` (`amount`, `paid_on`, `note`, `budget_line_id`, `created_at`)
SELECT `paid`, NULL, 'Opening balance (migrated)', `id`, unixepoch()
FROM `budget_lines` WHERE `paid` > 0;
--> statement-breakpoint
ALTER TABLE `budget_lines` DROP COLUMN `paid`;
--> statement-breakpoint
UPDATE `budget_lines` SET `source_type` = 'venue' WHERE `category` = 'Venue';
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`key`, `value`) VALUES ('vegGuests', '6');
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`key`, `value`) VALUES ('venueCostBasis', 'estimate');
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`key`, `value`) VALUES ('venueOriginalQuote', '17319.4');

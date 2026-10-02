ALTER TABLE `vendors` ADD `budget_line_id` integer REFERENCES budget_lines(id);
--> statement-breakpoint
ALTER TABLE `vendors` ADD `locked` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `budget_lines` ADD `locked` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `quote_lines` RENAME COLUMN `confirmed` TO `locked`;
--> statement-breakpoint
UPDATE `vendors` SET `budget_line_id` = (SELECT `id` FROM `budget_lines` WHERE `budget_lines`.`vendor_id` = `vendors`.`id`) WHERE `budget_line_id` IS NULL;
--> statement-breakpoint
ALTER TABLE `budget_lines` DROP COLUMN `vendor_id`;
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`key`, `value`) VALUES ('venueLocked', '0');

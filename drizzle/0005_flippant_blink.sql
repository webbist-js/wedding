ALTER TABLE `guests` ADD `seed_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `guests_seed_key_unique` ON `guests` (`seed_key`);--> statement-breakpoint
ALTER TABLE `invite_groups` ADD `seed_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `invite_groups_seed_key_unique` ON `invite_groups` (`seed_key`);
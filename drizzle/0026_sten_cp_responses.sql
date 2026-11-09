CREATE TABLE `sten_cp_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_key` text NOT NULL,
	`name` text NOT NULL,
	`village` text,
	`accom` text,
	`twin_ok` integer DEFAULT 0 NOT NULL,
	`budget` text,
	`offer` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sten_cp_responses_name_key_unique` ON `sten_cp_responses` (`name_key`);

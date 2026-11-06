CREATE TABLE `sten_do_ballots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voter_id` text NOT NULL,
	`name` text,
	`picks` text DEFAULT '{}' NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sten_do_ballots_voter_id_unique` ON `sten_do_ballots` (`voter_id`);

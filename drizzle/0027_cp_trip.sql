CREATE TABLE `cp_trip_consents` (
	`group_id` text PRIMARY KEY NOT NULL,
	`pledge_pence` integer,
	`approved_cj` integer,
	`approved_al` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `cp_trip_agreements` (
	`version` integer PRIMARY KEY NOT NULL,
	`contribution_cj` integer NOT NULL,
	`contribution_al` integer NOT NULL,
	`consents_json` text DEFAULT '[]' NOT NULL,
	`published_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cp_trip_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` text NOT NULL,
	`amount_pence` integer NOT NULL,
	`received_on` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cp_trip_interest` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cp_trip_interest_person_activity_unique` ON `cp_trip_interest` (`person_id`,`activity_id`);
--> statement-breakpoint
CREATE TABLE `cp_trip_notes` (
	`key` text PRIMARY KEY NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`updated_at` integer
);

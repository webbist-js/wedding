CREATE TABLE `seating_tables` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`label` text,
	`kind` text DEFAULT 'round' NOT NULL,
	`seats` integer DEFAULT 10 NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);

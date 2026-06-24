CREATE TABLE `shopping_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	`cost` real DEFAULT 0 NOT NULL,
	`bought` integer DEFAULT false NOT NULL,
	`notes` text,
	`sort` integer DEFAULT 0 NOT NULL
);

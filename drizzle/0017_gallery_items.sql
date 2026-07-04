CREATE TABLE `gallery_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`blob_url` text NOT NULL,
	`blob_pathname` text NOT NULL,
	`kind` text NOT NULL,
	`content_type` text,
	`size` integer,
	`uploader_name` text,
	`caption` text,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gallery_items_blob_pathname_unique` ON `gallery_items` (`blob_pathname`);

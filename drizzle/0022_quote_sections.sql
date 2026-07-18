CREATE TABLE `quote_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `quote_sections` (`name`, `sort`)
SELECT `section`, ROW_NUMBER() OVER (ORDER BY MIN(`sort`)) - 1
FROM `quote_lines`
GROUP BY `section`;

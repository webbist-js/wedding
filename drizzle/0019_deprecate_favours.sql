INSERT INTO `shopping_items` (`label`, `qty`, `cost`, `bought`, `notes`, `sort`)
SELECT bl.`category`, 1,
	CASE WHEN COALESCE(p.total, 0) > 0 THEN p.total
	     WHEN bl.`confirmed` > 0 THEN bl.`confirmed`
	     ELSE bl.`budgeted` END,
	CASE WHEN COALESCE(p.total, 0) > 0 THEN 1 ELSE 0 END,
	'Moved from Budget · Favours',
	900 + bl.`sort`
FROM `budget_lines` bl
LEFT JOIN (SELECT `budget_line_id`, SUM(`amount`) AS total FROM `payments` GROUP BY `budget_line_id`) p
	ON p.`budget_line_id` = bl.`id`
WHERE bl.`section` = 'Favours';
--> statement-breakpoint
DELETE FROM `payments` WHERE `budget_line_id` IN (SELECT `id` FROM `budget_lines` WHERE `section` = 'Favours');
--> statement-breakpoint
DELETE FROM `budget_lines` WHERE `section` = 'Favours';

ALTER TABLE `cp_trip_consents` ADD `approved_op` integer;
--> statement-breakpoint
ALTER TABLE `cp_trip_agreements` ADD `contribution_op` integer DEFAULT 0 NOT NULL;

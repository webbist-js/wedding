-- Run once in a transaction. Retain names and browser ownership; archive old picks.
-- The archive also acts as the idempotency marker: do not rerun if it exists.
CREATE TABLE sten_do_ballots_before_20261106 AS SELECT * FROM sten_do_ballots;
UPDATE sten_do_ballots SET picks = '{}', updated_at = unixepoch();

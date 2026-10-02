-- One-off production data fix, applied 2026-10-02 after migration 0023.
-- Files the obviously-matching suppliers under their budget lines, restores
-- the photography quote that was only ever typed on the budget line, renames
-- the duplicated DJ line to its category, and makes stage agree with a paid
-- deposit. Every statement is guarded so re-running it is a no-op. Nothing is
-- deleted. Ids are the production ids (see the design spec for the table).

UPDATE vendors SET budget_line_id = 1  WHERE id = 1  AND budget_line_id IS NULL; -- The Tithe Barn → Venue
UPDATE vendors SET budget_line_id = 15 WHERE id = 6  AND budget_line_id IS NULL; -- Dae La Roux → Music / DJ
UPDATE vendors SET budget_line_id = 3  WHERE id = 11 AND budget_line_id IS NULL; -- Forge & Lumber → Wedding rings
UPDATE vendors SET budget_line_id = 9  WHERE id = 7  AND budget_line_id IS NULL; -- Lois Cora → Hair & makeup
UPDATE vendors SET budget_line_id = 20 WHERE id = 10 AND budget_line_id IS NULL; -- The Devonshire Arms → couple's accommodation
UPDATE vendors SET budget_line_id = 18 WHERE id = 13 AND budget_line_id IS NULL; -- Yorkshire Paws → Dog handler

UPDATE vendors SET quoted_amount = 2750 WHERE id = 3 AND quoted_amount IS NULL; -- Adam Lowndes: frozen £2,750 from the old budget line

UPDATE budget_lines SET category = 'Music / DJ' WHERE id = 15 AND category = 'Dae La Roux';

UPDATE vendors SET stage = 'Booked' WHERE deposit_paid = 1 AND stage <> 'Booked';

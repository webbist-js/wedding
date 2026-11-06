-- Applied to production on 2026-10-26: 12 households verified;
-- 4 updated and 8 already matched the requested message.
-- Applies to every household containing a guest in Groom's work.
-- Re-running this leaves households already showing this message unchanged.

UPDATE invite_groups
SET personal_message = 'Now the retreat is days after, you have no excuse not to come! Looking forward to celebrating with you!'
WHERE id IN (
  SELECT group_id FROM guests WHERE relationship_group = 'Groom''s work'
)
AND personal_message IS NOT 'Now the retreat is days after, you have no excuse not to come! Looking forward to celebrating with you!'
RETURNING id;

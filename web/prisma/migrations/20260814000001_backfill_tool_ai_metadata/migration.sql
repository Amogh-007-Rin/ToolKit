-- Backfill metadata for tools saved before the AI fields were added.
UPDATE "Tool" AS tool
SET
  "description" = COALESCE(tool."description", result.item->>'description'),
  "reason" = COALESCE(tool."reason", result.item->>'reason')
FROM "Collection" AS collection
JOIN "AIChat" AS chat ON chat."userId" = collection."userId"
JOIN "AIChatMessage" AS message ON message."chatId" = chat."id"
CROSS JOIN LATERAL jsonb_array_elements(message."results") AS result(item)
WHERE tool."collectionId" = collection."id"
  AND message."results" IS NOT NULL
  AND jsonb_typeof(message."results") = 'array'
  AND result.item->>'name' = tool."name"
  AND result.item->>'link' = tool."link"
  AND (tool."description" IS NULL OR tool."reason" IS NULL);

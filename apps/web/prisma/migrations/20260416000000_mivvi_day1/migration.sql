-- Mivvi Day 1: ownerId on Group, tax/tip columns on Receipt, uniqueness on Assignment
ALTER TABLE "Group" ADD COLUMN "ownerId" TEXT;
CREATE INDEX "Group_ownerId_idx" ON "Group"("ownerId");

ALTER TABLE "Receipt" ADD COLUMN "taxCents" INTEGER;
ALTER TABLE "Receipt" ADD COLUMN "tipCents" INTEGER;

-- Dedupe before adding the unique index (safety on dev data).
DELETE FROM "Assignment" a
USING "Assignment" b
WHERE a."ctid" < b."ctid"
  AND a."itemId" = b."itemId"
  AND a."participantId" = b."participantId";

CREATE UNIQUE INDEX "Assignment_itemId_participantId_key"
  ON "Assignment"("itemId", "participantId");

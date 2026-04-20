-- Mivvi: explicit dietary / consumption preferences for auto-exclusion.
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "preferences" JSONB;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "preferences" JSONB;

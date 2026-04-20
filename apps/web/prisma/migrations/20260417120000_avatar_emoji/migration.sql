-- Mivvi: emoji-based avatars.
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "avatarEmoji" TEXT;

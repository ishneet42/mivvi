-- Mivvi: user's preferred Gemini Live voice.
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "voiceName" TEXT;

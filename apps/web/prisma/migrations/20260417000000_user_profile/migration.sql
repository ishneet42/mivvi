-- Mivvi: UserProfile for username + avatar customization.
CREATE TABLE IF NOT EXISTS "UserProfile" (
  "id"            TEXT NOT NULL,
  "clerkUserId"   TEXT NOT NULL,
  "username"      TEXT,
  "displayName"   TEXT,
  "avatarPreset"  TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_clerkUserId_key" ON "UserProfile"("clerkUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_username_key" ON "UserProfile"("username");
CREATE INDEX IF NOT EXISTS "UserProfile_clerkUserId_idx" ON "UserProfile"("clerkUserId");
CREATE INDEX IF NOT EXISTS "UserProfile_username_idx" ON "UserProfile"("username");

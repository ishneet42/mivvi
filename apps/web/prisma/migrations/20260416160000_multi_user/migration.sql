-- Mivvi multi-user: invites + group membership + participant→Clerk linkage.

-- Participant: optional link to a real Mivvi user who claimed this participant.
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "clerkUserId" TEXT;
CREATE INDEX IF NOT EXISTS "Participant_clerkUserId_idx" ON "Participant"("clerkUserId");

-- Role enum.
DO $$ BEGIN
  CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- GroupMember: (groupId, clerkUserId) is a member; optionally pinned to a participant.
CREATE TABLE IF NOT EXISTS "GroupMember" (
  "id"            TEXT NOT NULL,
  "groupId"       TEXT NOT NULL,
  "clerkUserId"   TEXT NOT NULL,
  "role"          "GroupRole" NOT NULL DEFAULT 'MEMBER',
  "participantId" TEXT,
  "joinedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GroupMember_groupId_clerkUserId_key" ON "GroupMember"("groupId", "clerkUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "GroupMember_participantId_key" ON "GroupMember"("participantId");
CREATE INDEX IF NOT EXISTS "GroupMember_clerkUserId_idx" ON "GroupMember"("clerkUserId");
CREATE INDEX IF NOT EXISTS "GroupMember_groupId_idx" ON "GroupMember"("groupId");
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL;

-- Invite: shareable token granting access to a group.
CREATE TABLE IF NOT EXISTS "Invite" (
  "id"            TEXT NOT NULL,
  "groupId"       TEXT NOT NULL,
  "token"         TEXT NOT NULL,
  "createdById"   TEXT NOT NULL,
  "email"         TEXT,
  "participantId" TEXT,
  "acceptedAt"    TIMESTAMP(3),
  "acceptedBy"    TEXT,
  "revokedAt"     TIMESTAMP(3),
  "expiresAt"     TIMESTAMP(3) NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Invite_token_key" ON "Invite"("token");
CREATE INDEX IF NOT EXISTS "Invite_groupId_idx" ON "Invite"("groupId");
CREATE INDEX IF NOT EXISTS "Invite_token_idx" ON "Invite"("token");
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE;

-- Backfill: every existing group's ownerId becomes an OWNER GroupMember.
INSERT INTO "GroupMember" ("id", "groupId", "clerkUserId", "role", "joinedAt")
SELECT gen_random_uuid()::text, g.id, g."ownerId", 'OWNER'::"GroupRole", g."createdAt"
FROM "Group" g
WHERE g."ownerId" IS NOT NULL
ON CONFLICT DO NOTHING;

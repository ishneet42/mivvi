-- Mivvi: Discord-style 6-char join codes for group invites.
-- Replaces the link-sharing flow. Existing token-based invites continue to
-- work until they expire (their code stays NULL).
ALTER TABLE "Invite"
  ADD COLUMN "code"      TEXT,
  ADD COLUMN "maxUses"   INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");
CREATE INDEX        "Invite_code_idx" ON "Invite"("code");

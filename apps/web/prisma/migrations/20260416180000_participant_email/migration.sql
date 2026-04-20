-- Mivvi: participant.email for email-first invitations and auto-claim.
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "email" TEXT;
CREATE INDEX IF NOT EXISTS "Participant_email_idx" ON "Participant"("email");

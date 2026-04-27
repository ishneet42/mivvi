-- Mivvi: human-friendly receipt names ("Dinner at Gaya's"). Optional;
-- when null the UI falls back to merchant / createdAt. Settable from
-- the snap sheet, snap page, or voice (rename_receipt tool).
ALTER TABLE "Receipt" ADD COLUMN "title" TEXT;

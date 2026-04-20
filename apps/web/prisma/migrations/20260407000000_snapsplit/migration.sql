-- SnapSplit: receipts, items, assignments
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "rawJson" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL DEFAULT 'gpt-4o-v1',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Receipt_groupId_idx" ON "Receipt"("groupId");

CREATE TABLE "ReceiptItem" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,
    "parsedConfidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReceiptItem_receiptId_idx" ON "ReceiptItem"("receiptId");
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receiptId_fkey"
    FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Assignment_itemId_idx" ON "Assignment"("itemId");
CREATE INDEX "Assignment_participantId_idx" ON "Assignment"("participantId");
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "ReceiptItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

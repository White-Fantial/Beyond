-- CreateEnum
CREATE TYPE "GiftCardTransactionType" AS ENUM ('ISSUE', 'REDEEM', 'REFUND', 'VOID');

-- CreateTable
CREATE TABLE "gift_cards" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT,
    "code" TEXT NOT NULL,
    "initialValue" INTEGER NOT NULL,
    "currentBalance" INTEGER NOT NULL,
    "issuedToEmail" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_transactions" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "type" "GiftCardTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_card_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_code_key" ON "gift_cards"("code");

-- CreateIndex
CREATE INDEX "gift_cards_tenantId_idx" ON "gift_cards"("tenantId");

-- CreateIndex
CREATE INDEX "gift_cards_storeId_idx" ON "gift_cards"("storeId");

-- CreateIndex
CREATE INDEX "gift_card_transactions_giftCardId_idx" ON "gift_card_transactions"("giftCardId");

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "gift_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: Customer Portal Phase 2 — Addresses & Notifications

-- CreateEnum
CREATE TYPE "CustomerNotificationType" AS ENUM ('ORDER_STATUS_UPDATE', 'SUBSCRIPTION_REMINDER', 'PAYMENT_ISSUE', 'GENERAL');

-- CreateTable: customer_notifications
CREATE TABLE "customer_notifications" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "type"       "CustomerNotificationType" NOT NULL DEFAULT 'GENERAL',
    "title"      TEXT NOT NULL,
    "body"       TEXT NOT NULL,
    "entityType" TEXT,
    "entityId"   TEXT,
    "readAt"     TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: customer_addresses
CREATE TABLE "customer_addresses" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "label"      TEXT NOT NULL DEFAULT 'Home',
    "line1"      TEXT NOT NULL,
    "line2"      TEXT,
    "city"       TEXT NOT NULL,
    "region"     TEXT,
    "postalCode" TEXT,
    "country"    TEXT NOT NULL DEFAULT 'NZ',
    "isDefault"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "customer_notifications_userId_createdAt_idx" ON "customer_notifications"("userId", "createdAt");
CREATE INDEX "customer_notifications_userId_readAt_idx" ON "customer_notifications"("userId", "readAt");
CREATE INDEX "customer_addresses_userId_idx" ON "customer_addresses"("userId");

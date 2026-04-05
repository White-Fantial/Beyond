-- CreateTable
CREATE TABLE "push_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orders" BOOLEAN NOT NULL DEFAULT true,
    "promotions" BOOLEAN NOT NULL DEFAULT true,
    "loyalty" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_preferences_userId_key" ON "push_preferences"("userId");

-- AddForeignKey
ALTER TABLE "push_preferences" ADD CONSTRAINT "push_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

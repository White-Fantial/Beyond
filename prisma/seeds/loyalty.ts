/**
 * Loyalty seed — Customer Portal Phase 3.
 * Seeds a sample loyalty account, transactions and referral code for the owner user.
 * Idempotent: skips if records already exist.
 */
import { prisma } from "./client";

export async function seedLoyalty() {
  // Find the first USER-role user to seed loyalty data for
  const user = await prisma.user.findFirst({
    where: { platformRole: "USER" },
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    console.log("  ⚠ No USER found — skipping loyalty seed");
    return;
  }

  // Idempotent: skip if already exists
  const existing = await prisma.loyaltyAccount.findUnique({ where: { userId: user.id } });
  if (existing) {
    console.log(`  ✓ Loyalty account already exists for ${user.email}`);
    return;
  }

  const account = await prisma.loyaltyAccount.create({
    data: {
      userId: user.id,
      points: 750,
      tier: "SILVER",
    },
  });

  await prisma.loyaltyTransaction.createMany({
    data: [
      {
        accountId: account.id,
        type: "EARN",
        pointsDelta: 500,
        description: "Welcome bonus",
      },
      {
        accountId: account.id,
        type: "EARN",
        pointsDelta: 350,
        description: "Order #001 reward",
      },
      {
        accountId: account.id,
        type: "REDEEM",
        pointsDelta: -100,
        description: "Redeemed for discount",
      },
    ],
  });

  await prisma.referralCode.create({
    data: {
      userId: user.id,
      accountId: account.id,
      code: "BEYOND100",
      rewardPoints: 100,
    },
  });

  console.log(`  ✓ Loyalty account seeded for ${user.email} (750 pts, SILVER)`);
}

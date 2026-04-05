/**
 * Push Notifications Service — manages PushSubscription records and delivery.
 */
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push/send";
import { validatePushSubscriptionInput } from "@/lib/push/subscribe";
import type { PushSubscriptionRecord, RegisterPushInput } from "@/types/push-notifications";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPushSubscriptionRecord(row: {
  id: string;
  userId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent: string | null;
  createdAt: Date;
}): PushSubscriptionRecord {
  return {
    id: row.id,
    userId: row.userId,
    endpoint: row.endpoint,
    p256dhKey: row.p256dhKey,
    authKey: row.authKey,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function registerPushSubscription(
  userId: string,
  input: RegisterPushInput
): Promise<PushSubscriptionRecord> {
  const validated = validatePushSubscriptionInput(input);
  const row = await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId, endpoint: validated.endpoint } },
    create: {
      userId,
      endpoint: validated.endpoint,
      p256dhKey: validated.p256dhKey,
      authKey: validated.authKey,
      userAgent: validated.userAgent ?? null,
    },
    update: {
      p256dhKey: validated.p256dhKey,
      authKey: validated.authKey,
      userAgent: validated.userAgent ?? null,
    },
  });
  return toPushSubscriptionRecord(row);
}

export async function unregisterPushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await sendPushNotification(sub, payload);
        sent++;
      } catch {
        failed++;
      }
    })
  );

  return { sent, failed };
}

export async function listPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
  const rows = await prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPushSubscriptionRecord);
}

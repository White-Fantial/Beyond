/**
 * Web Push sending helpers using web-push (VAPID).
 */
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBkYIhvF_o5dFW7v-Zg0";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "dummy-private-key-for-development";
const VAPID_MAILTO = process.env.VAPID_MAILTO ?? "mailto:admin@example.com";

let vapidConfigured = false;

function ensureVapid() {
  if (!vapidConfigured) {
    webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dhKey: string; authKey: string },
  payload: PushPayload
): Promise<void> {
  ensureVapid();
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dhKey,
        auth: subscription.authKey,
      },
    },
    JSON.stringify(payload)
  );
}

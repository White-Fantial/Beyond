export interface ValidatedPushInput {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent?: string;
}

export function validatePushSubscriptionInput(input: unknown): ValidatedPushInput {
  if (!input || typeof input !== "object") {
    throw new Error("Push subscription input must be an object");
  }
  const obj = input as Record<string, unknown>;
  if (typeof obj.endpoint !== "string" || !obj.endpoint) {
    throw new Error("Push subscription missing required field: endpoint");
  }
  if (typeof obj.p256dhKey !== "string" || !obj.p256dhKey) {
    throw new Error("Push subscription missing required field: p256dhKey");
  }
  if (typeof obj.authKey !== "string" || !obj.authKey) {
    throw new Error("Push subscription missing required field: authKey");
  }
  return {
    endpoint: obj.endpoint,
    p256dhKey: obj.p256dhKey,
    authKey: obj.authKey,
    userAgent: typeof obj.userAgent === "string" ? obj.userAgent : undefined,
  };
}

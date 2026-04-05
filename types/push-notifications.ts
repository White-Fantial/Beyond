export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent: string | null;
  createdAt: string;
}

export interface RegisterPushInput {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent?: string;
}

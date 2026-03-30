export interface DeliveryIntegration {
  id: string;
  storeId: string;
  platform: DeliveryPlatform;
  status: IntegrationStatus;
  externalShopId?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
}

export type DeliveryPlatform = "BAEMIN" | "COUPANG_EATS" | "YOGIYO" | "NAVER_ORDER";
export type IntegrationStatus = "CONNECTED" | "DISCONNECTED" | "ERROR" | "PENDING";

export interface PosIntegration {
  id: string;
  storeId: string;
  provider: PosProvider;
  status: IntegrationStatus;
  externalStoreId?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
}

export type PosProvider = "POSBANK" | "OKPOS" | "UNIONPOS" | "CUSTOM";
export type IntegrationStatus = "CONNECTED" | "DISCONNECTED" | "ERROR" | "PENDING";

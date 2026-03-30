export interface Store {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  phone?: string;
  status: StoreStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type StoreStatus = "ACTIVE" | "INACTIVE" | "PAUSED";

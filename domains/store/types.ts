export interface Store {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  displayName: string;
  status: StoreStatus;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode: string;
  timezone: string;
  currency: string;
  openingDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
}

export type StoreStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

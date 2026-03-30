import type { Store } from "@/domains/store/types";

export async function getStoresByTenant(_tenantId: string): Promise<Store[]> {
  return [];
}

export async function getStore(_storeId: string, _tenantId: string): Promise<Store | null> {
  return null;
}

export async function createStore(
  _tenantId: string,
  _data: Omit<Store, "id" | "tenantId" | "createdAt" | "updatedAt">
): Promise<Store> {
  throw new Error("Store service not yet implemented");
}

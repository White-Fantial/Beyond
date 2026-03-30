import { DeliveryAdapterConfig, DeliveryOrderData } from "./types";

export interface DeliveryAdapter {
  readonly platform: string;
  connect(config: DeliveryAdapterConfig): Promise<void>;
  fetchOrders(shopId: string, since?: Date): Promise<DeliveryOrderData[]>;
  updateOrderStatus(externalOrderId: string, status: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export function createDeliveryAdapter(_platform: string): DeliveryAdapter {
  throw new Error(`Delivery adapter for platform "${_platform}" is not yet implemented. Add it to adapters/delivery/`);
}

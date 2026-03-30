export interface DeliveryAdapterConfig {
  storeId: string;
  apiKey?: string;
  shopId?: string;
}

export interface DeliveryOrderData {
  externalOrderId: string;
  platform: string;
  customerName?: string;
  deliveryAddress?: string;
  items: DeliveryOrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface DeliveryOrderItem {
  externalMenuId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: { name: string; value: string; price: number }[];
}

export interface PosAdapterConfig {
  storeId: string;
  apiKey?: string;
  apiSecret?: string;
  endpoint?: string;
}

export interface PosOrderData {
  externalOrderId: string;
  items: PosOrderItem[];
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
}

export interface PosOrderItem {
  externalMenuId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

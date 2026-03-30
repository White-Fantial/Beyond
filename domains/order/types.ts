export interface Order {
  id: string;
  storeId: string;
  channelType: OrderChannelType;
  externalOrderId?: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options?: OrderItemOption[];
}

export interface OrderItemOption {
  name: string;
  value: string;
  additionalPrice: number;
}

export type OrderChannelType = "POS" | "BAEMIN" | "COUPANG_EATS" | "ONLINE" | "PHONE";
export type OrderStatus = "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "DELIVERING" | "COMPLETED" | "CANCELLED";

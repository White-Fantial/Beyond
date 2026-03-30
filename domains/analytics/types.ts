export interface DailySalesSummary {
  date: string;
  storeId: string;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  byChannel: ChannelSalesSummary[];
}

export interface ChannelSalesSummary {
  channel: string;
  revenue: number;
  orderCount: number;
}

export interface AnalyticsDateRange {
  from: Date;
  to: Date;
}
